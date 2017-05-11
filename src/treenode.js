import cuid from "cuid";
import Syncable from "./syncable";

export default class TreeNodeHandler extends Syncable {
    key = "treenode";
    isClaimedNode(n) {
        return true;
    }
    readEntityFromNode(n, parentEntity, foundEntities, handleFoundEntity, callback) {
        var e = Object.assign({},
            {
                id: cuid(),
                repo: this.dataHandler.repo.options.id,
                user: this.dataHandler.repo.options.user
            },
                n);
        if (parentEntity) e.parent = parentEntity.id;
        delete e.contents;
        if (parentEntity) e.parentEntity = parentEntity.id;
        handleFoundEntity("treenode", e);
        callback();
    }
    loadFromDb(handleFoundEntity, callback) {
        let {dataHandler} = this;
        dataHandler.db.TreeNodes.find({
            repo: dataHandler.repo.options.id,
            user: dataHandler.repo.options.user
        }).each((err, item) => {
            if (err || !item) return callback(err, item);
            handleFoundEntity("treenode", this.removeIdUnderscore(item));
        });
    }
    populateFullData(allEntities, entity, callback) {
        callback(null, entity);
    }
    populateFromGit(allEntities, entity, done) {
        done(null, entity);
    }
    merge(o, a, b, callback) {
        // all three objects will be set and populated with full data at this point.
        var changedFields = {};
        callback(null, changedFields);
    }
    applyDbUpdates(updates, existingEntities, handleFoundEntity, callback) {
        let {dataHandler} = this;
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
                handleFoundEntity("treenode", this.addIdUnderscore(op.d));
            }
        }
        batch.execute();
        callback();
    }
    getTreeNodesForEntity(allEntities, entity, index, callback) {
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
}
