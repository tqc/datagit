import cuid from "cuid";
import async from "async";
import Syncable from "./Syncable";

function removeIdUnderscore(o) {
    if (o._id) {
        o.id = o._id;
        delete o._id;
    }
    return o;
}

function addIdUnderscore(o) {
    if (o.id) {
        o._id = o.id;
        delete o.id;
    }
    return o;
}

class TreeNodeHandler extends Syncable {
    constructor() {
        super();
        this.key = "treenode";
    }
    process(dataHandler, parentEntity, treeNode, unclaimedNodes, handleFoundEntity, callback) {
        for (var i = 0; i < unclaimedNodes.length; i++) {
            var n = treeNode.contents[unclaimedNodes[i]];
            var e = Object.assign({},
                {
                    id: cuid(),
                    repo: dataHandler.repo.options.id,
                    user: dataHandler.repo.options.user
                },
                n);
            if (parentEntity) e.parent = parentEntity.id;
            delete e.contents;
            if (parentEntity) e.parentEntity = parentEntity.id;
            handleFoundEntity("treenode", e);
        }
        callback(null, []);
    }
    loadFromDb(dataHandler, handleFoundEntity, callback) {
        dataHandler.db.TreeNodes.find({
            repo: dataHandler.repo.options.id,
            user: dataHandler.repo.options.user
        }).each(function(err, item) {
            if (err || !item) return callback(err, item);
            handleFoundEntity("treenode", removeIdUnderscore(item));
        });
    }
    populateFullData(dataHandler, allEntities, entity, callback) {
        callback(null, entity);
    }
    merge(o, a, b, callback) {
        // all three objects will be set and populated with full data at this point.
        var changedFields = {};
        callback(null, changedFields);
    }
    applyDbUpdates(dataHandler, updates, existingEntities, handleFoundEntity, callback) {
        if (!updates.length) return callback();
        var batch = dataHandler.db.TreeNodes.initializeUnorderedBulkOp();

        for (let i = 0; i < updates.length; i++) {
            var op = updates[i];
            if (op.op == "delete") {
                batch.find({_id: op.id}).removeOne();
            }
            if (op.op == "update") {
                batch.find({_id: op.id}).updateOne({$set: op.d});
                handleFoundEntity("treenode", Object.assign({}, existingEntities.treenode[op.id], op.d));
            }
            if (op.op == "insert") {
                batch.insert(op.d);
                handleFoundEntity("treenode", addIdUnderscore(op.d));
            }
        }
        batch.execute();
        callback();
    }
    getTreeNodesForEntity(dh, allEntities, entity, index, callback) {
        var treeNodes = [];

        // treenode is always a leaf, and entity is usable directly
        // child nodes are assumed to be written already so contents can be ignored
        // treenodes are only produced by importing, so hash must already be valid
        treeNodes.push({
            permissions: entity.permissions,
            type: entity.type,
            hash: entity.hash,
            name: entity.name
        });

        callback(null, treeNodes);
    }
    getTreeNodesForEntities(dh, allEntities, filteredEntities, callback) {
        var tnh = this;
        var treeNodes = [];
        async.eachOfSeries(
            filteredEntities,
            function(o, i, next) {
                tnh.getTreeNodesForEntity(dh, allEntities, o, i, function(err, arr) {
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

var TreeNode = new TreeNodeHandler();
export default TreeNode;