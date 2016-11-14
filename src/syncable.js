class Syncable {
    constructor() {
        this.key = "syncable";
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

    process(dataHandler, parentEntity, treeNode, unclaimedNodes, handleFoundEntity, callback) {
        callback("Not Implemented");
    }
    loadFromDb(dataHandler, handleFoundEntity, callback) {
        callback("Not Implemented");
    }
    populateFullData(dataHandler, allEntities, entity, callback) {
        callback("Not Implemented");
    }
    merge(o, a, b, callback) {
        callback("Not Implemented");
    }
    applyDbUpdates(dataHandler, updates, existingEntities, handleFoundEntity, callback) {
        callback("Not Implemented");
    }
    getTreeNodesForEntity(dh, allEntities, entity, index, callback) {
        callback("Not Implemented");
    }
    getTreeNodesForEntities(dh, allEntities, filteredEntities, callback) {
        callback("Not Implemented");
    }
}

export default Syncable;