import async from "async";

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
        done("readEntityFromNode Not Implemented for " + this.key);
    }
    // formerly known as process
    readEntitiesFromTree(parentEntity, treeNode, unclaimedNodes, handleFoundEntity, callback) {
        var remainingNodes = [];
        async.eachSeries(
            unclaimedNodes,
            (k, next) => {
                var n = treeNode.contents[k];
                if (this.isClaimedNode(n)) {
                    this.readEntityFromNode(n, parentEntity, handleFoundEntity, next);
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
    }
    loadFromDb(dataHandler, handleFoundEntity, done) {
        done("loadFromDb Not Implemented for " + this.key);
    }
    // load any additional data if a full merge is required
    populateFromDb(allEntities, entity, callback) {
        // assume that initial load included everything
        callback(null, entity);
    }
    // load full version of an entity from git. callback result
    // should correspond directly to the objects in the database.
    populateFromGit(allEntities, entity, done) {
        // this one must be implemented to avoid saving all the git metadata to the db
        done("populateFromGit Not Implemented for " + this.key);
    }
    populateFullData(allEntities, entity, callback) {
        if (allEntities.source == "db") {
            this.populateFromDb(allEntities, entity, callback);
        }
        else {
            this.populateFromGit(allEntities, entity, callback);
        }
    }
    merge(o, a, b, done) {
        done("merge Not Implemented for " + this.key);
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
                batch.insert(this.addIdUnderscore(op.d));
                handleFoundEntity("story", op.d);
            }
        }
        batch.execute();
        callback();
    }
    getTreeNodesForEntity(dh, allEntities, entity, index, done) {
        done("getTreeNodesForEntity Not Implemented for " + this.key);
    }
    sortBy = undefined;
    getTreeNodesForEntities(allEntities, filteredEntities, callback) {
        var treeNodes = [];
        if (typeof this.sortBy == "string") {
            filteredEntities = filteredEntities.sort((a, b) => a[this.sortBy] < b[this.sortBy] ? -1 : a[this.sortBy] > b[this.sortBy] ? 1 : 0);
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
