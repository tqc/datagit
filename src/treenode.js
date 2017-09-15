import cuid from "cuid";
import Syncable from "./syncable";

export default class TreeNodeHandler extends Syncable {
    key = "treenode";
    dbCollection = "TreeNodes";

    isClaimedNode(n) {
        return true;
    }
    readEntityFromNode(n, parentEntity, foundEntities, handleFoundEntity, callback) {
        var e = {
            id: cuid(),
            repo: this.dataHandler.repo.options.id,
            user: this.dataHandler.repo.options.user,
            gitObjectType: n.type,
            hash: n.hash,
            name: n.name,
            path: n.path,
            size: n.size,
            permissions: n.permissions
        };
        if (parentEntity) e.parent = parentEntity.id;
        if (parentEntity) e.parentEntity = parentEntity.id;
        handleFoundEntity("treenode", e);
        callback();
    }

    loadFromDb(handleFoundEntity, done) {
        let { dataHandler, dbCollection, key } = this;
        dataHandler.db[dbCollection].find({
            repo: dataHandler.repo.options.id,
            user: dataHandler.repo.options.user
        }).each(function(err, item) {
            if (err || !item) return done(err, item);
            // todo: this probably no longer needed if gitObjectType is populated reliably
            if (!item.gitObjectType) item.gitObjectType = item.type;
            handleFoundEntity(key, item);
        });
    }
    populateFromGit(allEntities, entity, done) {
        done(null, entity);
    }
    merge(o, a, b, callback) {
        // TreeNodes always come from the remote so should never need merging;
        // this will only be called during a reset
        let changedFields = {};
        if (b.hash != a.hash) {
            changedFields.hash = b.hash;
        }
        callback(null, changedFields);
    }
    matchMergedEntityDefinite(entity, possibleMatches, idMapping) {
        for (let mk in possibleMatches) {
            let e2 = possibleMatches[mk];
            if (entity.path == e2.path) return e2;
        }
    }
    matchMergedEntityProbable(entity, possibleMatches, idMapping) {
    }
    matchMergedEntityPossible(entity, possibleMatches, idMapping) {
    }
    getTreeNodesForEntity(allEntities, entity, index, callback) {
        var treeNodes = [];

        // treenode is always a leaf, and entity is usable directly
        // child nodes are assumed to be written already so contents can be ignored
        // treenodes are only produced by importing, so hash must already be valid
        treeNodes.push({
            permissions: entity.permissions,
            type: entity.gitObjectType,
            hash: entity.hash,
            name: entity.name,
            size: entity.size
        });

        callback(null, treeNodes);
    }
}
