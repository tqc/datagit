import cuid from "cuid";
import Syncable from "./syncable";

export default class TreeNodeHandler extends Syncable {
    key = "treenode";
    dbCollection = "TreeNodes";

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
    populateFromGit(allEntities, entity, done) {
        done(null, entity);
    }
    merge(o, a, b, callback) {
        // all three objects will be set and populated with full data at this point.
        var changedFields = {};
        callback(null, changedFields);
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
