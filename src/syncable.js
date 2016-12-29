import cuid from "cuid";
import async from "async";
import Chapter from "./chapter";
import Cover from "./cover";
import DataGit from "datagit";
import yamlfm from "./yamlfm";
import yaml from "js-yaml";

class Syncable {
	key = "syncable"
    constructor(dh) {
        this.dataHandler = dh;
    }
    removeIdUnderscore(o) {
        if (o._id) {
            o.id = o._id;
            delete o._id;
        }
        return o;
    }

    addIdUnderscore(o) {
        if (o.id) {
            o._id = o.id;
            delete o.id;
        }
        return o;
    }

    isClaimedNode(n) {
        return false;
    }
    // assuming claimedNode returned true, process the node
    // assumes no need for access to other nodes in parent folder
    // if that is needed, override process directly.
    readEntityFromNode(n, parentEntity, handleFoundEntity, done) {
        done("readEntityFromNode Not Implemented for "+ this.key);
    }
    // formerly known as process
    readEntitiesFromTree(parentEntity, treeNode, unclaimedNodes, handleFoundEntity, callback) {
        var remainingNodes = [];
        async.eachSeries(
            unclaimedNodes,
            (k, next) => {
                var n = treeNode.contents[k];
                if (isClaimedNode(n)) {
                    readEntityFromNode(n, parentEntity, handleFoundEntity, next);
                }
                else {
                    remainingNodes.push(k);
                    next();
                }
            },
            function(err) {
                if (err) return callback(err);
                callback(null, remainingNodes);
            });
    },
    loadFromDb(dataHandler, handleFoundEntity, callback) {
        callback("Not Implemented");
    }
    // load any additional data if a full merge is required
    populateFromDb(allEntities, entity, callback) {
        // assume that initial load included everything
        callback(null, entity);
    }
    // load full version of an entity from git. callback result
    // should correspond directly to the objects in the database.
    populateFromGit(allEntities, entity, callback) {
        // this one must be implemented to avoid saving all the git metadata to the db
        callback("Not Implemented");
    }
    populateFullData: function(allEntities, entity, callback) {
        if (allEntities.source == "db") {
            this.populateFromDb(allEntities, entity, callback);
        }
        else {
            this.populateFromGit(allEntities, entity, callback);
        }
    },
    merge(o, a, b, callback) {
        callback("Not Implemented");
    }
    applyDbUpdates(dataHandler, updates, existingEntities, handleFoundEntity, callback) {
        if (!updates.length) return callback();
        var batch = dataHandler.db[this.dbCollection].initializeUnorderedBulkOp();

        for (let i = 0; i < updates.length; i++) {
            var op = updates[i];
            if (op.op == "delete") {
                batch.find({_id: op.id}).removeOne();
            }
            if (op.op == "update") {
                batch.find({_id: op.id}).updateOne({$set: op.d});
                handleFoundEntity("story", Object.assign({}, existingEntities.treenode[op.id], op.d));
            }
            if (op.op == "insert") {
                batch.insert(addIdUnderscore(op.d));
                handleFoundEntity("story", op.d);
            }
        }
        batch.execute();
        callback();
    },
    getTreeNodesForEntity(dh, allEntities, entity, index, callback) {
        callback("Not Implemented");
    }
    sortBy = undefined;
    getTreeNodesForEntities(allEntities, filteredEntities, callback) {
        var treeNodes = [];
        if (typeof this.sortBy == "string") {
            filteredEntities = filteredEntities.sort((a, b) => a[this.sortBy] < b[this.sortBy] ? -1 : a[this.sortBy] > b[this.sortBy] ? 1 : 0),
        }
        async.eachOfSeries(
            filteredEntities,
            (o, i, next) => {
                this.getTreeNodesForEntity(allEntities, o, i, function(err, arr) {
                    if (err) return callback(err);
                    treeNodes.push.apply(treeNodes, arr);
                    next();
                });
            },
            function(err) {
                if (err) return callback(err);
                callback(null, treeNodes);
            }
        );
    }
}

export default Syncable;


export default class Story extends Syncable {
    key = "story";
    dbCollection = "Books";
    sortBy = "slug";    

    // return true if this node will be handled as this entity type
    // do we need to pass any other parameters?
    isClaimedNode(node) {
        if (node.type != "tree") return false;
        if (node.contents["story.md"]) return true;
        return false;
    }
    
writeConfigFile(object, callback) {

    var skippedKeys = ["id", "chapters", "description", "slug", "user", "repo", "contentHash"];

    var cfg = {};
    for (let k in object) {
        if (skippedKeys.indexOf(k) >= 0) continue;
        cfg[k] = object[k];
    }

    var fm = yaml.dump(cfg, {});
    var fc = "---\n" + fm + "---\n" + object.description;
    console.log(fc);
    this.dataHandler.repo.writeTextFile(fc, callback);
}    
    // assuming claimedNode returned true, process the node
    // assumes no need for access to other nodes in parent folder
    // if that is needed, override process directly.
    readEntityFromNode(n, parentEntity, handleFoundEntity, done) {
                    // return story entity based on story.md, look for chapters in folder
                    var e = {
                        id: cuid(),
                        slug: n.name,
                        contentHash: n.hash,
                        treeNode: n,
                        repo: dataHandler.repo.options.id,
                        user: dataHandler.repo.options.user
                    };

                    handleFoundEntity("story", e);
                    // need to look up instances of these classes - or maybe just pass in keys
                    this.dataHandler.processTreeNode(n, e, ["chapter", "cover", "treenode"], handleFoundEntity, next);    
    }
    // load all entities from the database. only need to load enough data for comparison with
    // entities loaded from git tree nodes
    loadFromDb(dataHandler, handleFoundEntity, callback) {
        dataHandler.db.Books.find({
            repo: dataHandler.repo.options.id,
            user: dataHandler.repo.options.user
        }).each(function(err, item) {
            if (err || !item) return callback(err, item);
            handleFoundEntity("story", removeIdUnderscore(item));
        });
    }
    // load full version of an entity from git. callback result
    // should correspond directly to the objects in the database.
    populateFromGit(allEntities, entity, callback) {
            // load story.md from git
            var configHash = entity.treeNode.contents["story.md"].hash;
            dataHandler.repo.readString(configHash, function(err, contents) {
                if (err) callback(err);
                //console.log(contents);
                let cfg = yamlfm.parse(contents, "description");
                //console.log(cfg);
                cfg.contentHash = entity.contentHash;
                entity.fullData = cfg;
                cfg._id = entity.id;
                cfg.user = entity.user;
                cfg.repo = entity.repo;
                cfg.slug = entity.slug;
                cfg.chapters = Object.keys(allEntities.chapter)
                    .map(k => allEntities.chapter[k])
                    .filter(c => c.story == entity.id)
                    .sort((a, b) => {
                        if (a.slug < b.slug) return -1;
                        else if (a.slug > b.slug) return 1;
                        else return 0;
                    })
                    .map(e => e.id);
                //console.log(cfg);
                callback(null, entity.fullData);
            });    
    }

    merge(o, a, b, callback) {
        // all three objects will be set and populated with full data at this point.
        var changedFields = {};
        callback(null, changedFields);
    },
    getTreeNodesForEntity(dh, allEntities, entity, index, callback) {
        var treeNodes = [];

        // first, process chapters
        this.dataHandler.getTreeNodesForEntities(allEntities, entity, function(err, arr) {
            if (err) return callback(err);
            console.log(arr);
            treeNodes.push.apply(treeNodes, arr);

            // then add story.md

            this.writeConfigFile(dh, entity, function(err, configHash) {
                if (err) return callback(err);
                treeNodes.push({
                    permissions: "100644",
                    type: "blob",
                    hash: configHash,
                    name: "story.md"
                });
                // then write the updated tree to git

                dh.repo.writeTree(treeNodes, function(err, hash) {
                    if (err) return callback(err);

                    var slugIndex = ("000" + (index + 1)).slice(-3);
                    var slugTitle = (entity.title || "Untitled").replace(/[^\w\s]/, "");

                    var fn = {
                        type: "tree",
                        permissions: "040000",
                        hash: hash,
                        name: slugIndex + " " + slugTitle
                    };

                    callback(null, [fn]);

                });
            });
        });

    }
};

export default Story;