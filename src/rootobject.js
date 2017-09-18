import Syncable from "./syncable";

// this is a root type - basically adding fields from a config file to the repo record

export default class RootObject extends Syncable {
    key = "rootobject";
    dbCollection = "Repos";
    sortBy = "slug";
    configFileBodyField = "description";
    configFileSkippedKeys = ["id", "user", "repo", "contentHash", "temp"];
    configFileKeyOrder = ["title", "summary"];

    // return true if this node will be handled as this entity type
    // do we need to pass any other parameters?
    isClaimedNode(node, parentEntity, foundEntities) {
        if (node.path == "" && !parentEntity) return true;
        return false;
    }

    // assuming claimedNode returned true, process the node
    // assumes no need for access to other nodes in parent folder
    // if that is needed, override process directly.
    readEntityFromNode(n, parentEntity, foundEntities, handleFoundEntity, done) {
        let e = {
            // include all the standard repo properties so merge doesn't think they are being deleted
            ...this.dataHandler.repo.options,
            contentHash: n.hash,
            treeNode: n,
            title: this.dataHandler.repo.options.title || this.dataHandler.repo.options.remoteUrl
        };
        delete e.userSettings;

        handleFoundEntity("rootobject", e);

        this.dataHandler.processTreeNode(n, e, this.dataHandler.allEntityKeys, foundEntities, handleFoundEntity, function(err) {

            done(err);
        });
    }

    // load full version of an entity from git. callback result
    // should correspond directly to the objects in the database.
    populateFromGit(allEntities, entity, callback) {
        return callback(null, entity);
    }

    loadFromDb(handleFoundEntity, done) {
        let { dataHandler, dbCollection, key } = this;
        dataHandler.db[dbCollection].find({
            id: dataHandler.repo.options.id,
            user: dataHandler.repo.options.user
        }).each(function(err, item) {
            if (err || !item) return done(err, item);
            handleFoundEntity(key, item);
        });
    }

    matchMergedEntityDefinite(entity, possibleMatches, idMapping) {
        // there is always exactly one root entity in a repo, so it must match
        for (let mk in possibleMatches) {
            let e2 = possibleMatches[mk];
            return e2;
        }
    }


    getTreeNodesForEntity(allEntities, entity, index, callback) {
        let { dataHandler } = this;

        dataHandler.getTreeNodesForEntities(allEntities, entity, function(err, treeNodes) {
            if (err) return callback(err);
            callback(null, treeNodes);
        });

    }
}