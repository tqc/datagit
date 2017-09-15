import async from "async";

class DataHandler {
    constructor(repo, db, entityClasses) {
        this.repo = repo;
        this.entityHandlers = {};
        // default list of entities valid at root level
        this.allEntityKeys = [];
        this.db = db;
        for (let e of entityClasses) {
            let handler = new e(this);
            this.entityHandlers[handler.key] = handler;
            this.allEntityKeys.push(handler.key);
        }
    }
    connect(callback) {
        this.repo.connect(callback);
    }
    readFullEntitiesFromCommit(ref, callback) {
        this.readEntitiesFromTree(ref, (err, entities) => {
            if (err) callback(err);
            async.eachSeries(
                this.allEntityKeys,
                (ek, nextType) => {
                    let handler = this.entityHandlers[ek];
                    async.eachSeries(
                        Object.keys(entities[ek]),
                        (id, nextEntity) => {
                            handler.populateFullData(entities, entities[ek][id], nextEntity);
                        },
                        nextType
                    );
                },
                (err) => callback(err, entities)
            );
        });
    }

    // used for testing individual entity handlers.
    readEntityFromNode(treeNode, entityKey, parentEntity, shouldPopulate, callback) {
        let dh = this;
        var result = {
            source: (treeNode && treeNode.hash) || "None"
        };

        for (let i = 0; i < this.allEntityKeys.length; i++) {
            result[this.allEntityKeys[i]] = {};
        }

        if (!treeNode) {
            callback(null, result, true);
            return;
        }

        let entityHandler = this.entityHandlers[entityKey];

        if (!entityHandler) return callback("Invalid entity type " + entityKey);

        if (parentEntity) {
            if (!result[parentEntity.type]) return callback("Invalid parent entity type");
            if (!parentEntity.id) return callback("Parent entity must have id set");

            result[parentEntity.type][parentEntity.id] = parentEntity;
        }


        entityHandler.readEntityFromNode(
            treeNode,
            parentEntity,
            result,
            function(type, data) {
                if (type == entityKey && !result.rootEntity) {
                    result.rootEntity = data;
                }
                data.type = data.type || type;
                result[type][data.id] = data;
            },
            function(err) {
                if (err) return callback(err);
                if (shouldPopulate) {
                    async.eachSeries(
                        dh.allEntityKeys,
                        (ek, nextType) => {
                            let handler = dh.entityHandlers[ek];
                            async.eachSeries(
                                Object.keys(result[ek]),
                                (id, nextEntity) => {
                                    if (parentEntity && id == parentEntity.id) {
                                        // the test parent entity doesn't really exist in git, so
                                        // don't try to load it
                                        nextEntity();
                                        return;
                                    }
                                    handler.populateFullData(result, result[ek][id], nextEntity);
                                },
                                nextType
                            );
                        },
                        (err) => callback(err, result)
                    );
                }
                else {
                    callback(err, result, true);
                }
            }
        );
    }

    readEntityFromTreeRef(path, treeRef, entityKey, parentEntity, shouldPopulate, callback) {
        let dh = this;
        dh.repo.readTree(treeRef, function(err, treeNode) {
            if (err) return callback(err);

            treeNode.path = path;
            treeNode.name = path.indexOf("/") >= 0 ? path.substr(path.lastIndexOf("/") + 1) : path;

            dh.readEntityFromNode(treeNode, entityKey, parentEntity, shouldPopulate, callback);
        });
    }

    readEntityFromFileRef(path, hash, entityKey, parentEntity, shouldPopulate, callback) {
        let dh = this;

        let treeNode = {
            permissions: '100644',
            type: "blob",
            hash,
            path,
            name: path.indexOf("/") >= 0 ? path.substr(path.lastIndexOf("/") + 1) : path
        };

        dh.readEntityFromNode(treeNode, entityKey, parentEntity, shouldPopulate, callback);
    }

    readEntitiesFromTree(commit, callback) {
        var dh = this;
        var result = {
            source: commit
        };
        for (let i = 0; i < this.allEntityKeys.length; i++) {
            result[this.allEntityKeys[i]] = {};
        }

        if (!commit) {
            callback(null, result, true);
            return;
        }
        dh.repo.readTree(commit, function(err, tree) {
            if (err) return callback(err);

            let outerTree = {
                contents: {
                    ["" + ""]: tree
                }
            };

            dh.processTreeNode(
                outerTree,
                null,
                dh.allEntityKeys,
                result,
                function(type, data) {
                    data.type = data.type || type;
                    result[type][data.id] = data;
                },
                function(err) {
                    callback(err, result, true);
                });
        });
        // given a result from repo.readTree, return an entity set
    }
    readEntitiesFromDb(callback) {
        var dh = this;
        var result = {
            source: "db"
        };
        for (let i = 0; i < this.allEntityKeys.length; i++) {
            result[this.allEntityKeys[i]] = {};
        }
        result.message = "Reading from db";

        async.eachSeries(
            dh.entityHandlers,
            function(entity, next) {
                // iterate files
                entity.loadFromDb(
                    function(type, data) {
                        result[type][data.id] = data;
                        if (data.modified) result.modified = true;
                        callback(null, result, false);
                    },
                    function(err, remainingNodes) {
                        if (err) return next(err);
                        next();
                    });
            },
            function(err) {
                if (err) return callback(err);
                callback(null, result, true);
            }
        );

        // given a result from repo.readTree, return an entity set
    }
    getTreeNodesForEntities(allEntities, parentEntity, callback) {
        var dh = this;
        var parentId = parentEntity ? parentEntity.id : null;
        console.log("Processing child entities for " + parentId);
        // given a set of entities, write objects to git and return an array of
        // tree nodes to be added to the parent e
        var treeNodes = [];
        var groupedTreeNodes = {};
        for (let i = 0; i < this.allEntityKeys.length; i++) {
            groupedTreeNodes[this.allEntityKeys[i]] = [];
        }

        async.eachSeries(
            dh.entityHandlers,
            function(entity, nextType) {
                // iterate files
                var parentKey = entity.parentKey || "parent";
                var allKeys = Object.keys(allEntities[entity.key]);
                var filteredKeys = allKeys.filter(k => allEntities[entity.key][k][parentKey] == parentId);
                if (parentEntity && parentEntity[entity.parentCollectionKey]) {
                    filteredKeys = parentEntity[entity.parentCollectionKey];
                }
                entity.getTreeNodesForEntities(allEntities, filteredKeys.map(k => allEntities[entity.key][k]).filter(o => !!o), function(err, arr) {
                    if (err) return callback(err);
                    [].push.apply(treeNodes, arr);
                    [].push.apply(groupedTreeNodes[entity.key], arr);
                    nextType();
                });
            },
            function(err) {
                if (err) return callback(err);
                callback(null, treeNodes, groupedTreeNodes);
            }
        );

    }

    fileNode(name, hash) {
        return {
            permissions: "100644",
            type: "blob",
            hash,
            name
        };
    }

    wrapTreeNodes(name, treeNodes, callback) {
        let dataHandler = this;

        if (!treeNodes || !treeNodes.length) {
            return callback();
        }

        dataHandler.repo.writeTree(treeNodes, function(err, hash) {
            if (err) return callback(err);
            var fn = {
                type: "tree",
                permissions: "040000",
                hash: hash,
                name: name,
                contents: {}
            };
            for (let n of treeNodes) {
                fn.contents[n.name] = n;
            }
            callback(null, fn);

        });

    }

    commitEntities(dbEntities, parentCommits, message, callback) {
        var dh = this;
        dh.repo.readCommit(parentCommits[0], function(err, parentCommit) {
            if (err) return callback(err);
            dh.getTreeNodesForEntities(dbEntities, null, function(err, arr) {
                if (err) return callback(err);

                dh.repo.writeTree(arr, function(err, hash) {
                    if (err) return callback(err);
                    if (parentCommits.length == 1 && hash == parentCommit.treeRef) {
                        // nothing to commit
                        return callback(null);
                    }
                    dh.repo.writeCommit(hash, parentCommits, message, function(err, commitHash) {
                        if (err) return callback(err);
                        callback(null, commitHash);
                    });
                });
            });
        });
    }
    mergeEntities(concestorEntities, dbEntities, remoteEntities, callback) {
        var dh = this;
        // parameters are raw results from converting a git tree
        // none of the ids will match.




        var result = {};
        for (let i = 0; i < this.allEntityKeys.length; i++) {
            result[this.allEntityKeys[i]] = [];
        }

        let dbIdToConcestorId = {};
        let concestorIdToRemoteId = {};
        let remoteIdToConcestorId = {};
        let concestorIdToDbId = {};
        let remoteIdToDbId = {};

        // populate mappings
        for (let ek of dh.allEntityKeys) {
            let entity = dh.entityHandlers[ek];
            console.log("Merging " + entity.key);

            // populate dbId to concestor id

            entity.mergeMatch(dbEntities[entity.key], concestorEntities[entity.key], dbIdToConcestorId, concestorIdToDbId);

            // populate concestor id to remote id
            entity.mergeMatch(concestorEntities[entity.key], remoteEntities[entity.key], concestorIdToRemoteId, remoteIdToConcestorId);

            for (let k in remoteEntities[entity.key]) {
                remoteIdToDbId[k] = concestorIdToDbId[remoteIdToConcestorId[k] || k] || k;
            }
        }

        // update id references in git entities to mapped values
        for (let ek of dh.allEntityKeys) {
            let entity = dh.entityHandlers[ek];
            for (let ok in concestorEntities[entity.key]) {
                let o = concestorEntities[entity.key][ok];
                for (let k in o) {
                    if (typeof o[k] == "string" && concestorIdToDbId[o[k]]) {
                        o[k] = concestorIdToDbId[o[k]];
                    }
                    else if (Array.isArray(o[k])) {
                        for (let i = 0; i < o[k].length; i++) {
                            if (typeof o[k][i] == "string" && concestorIdToDbId[o[k][i]]) {
                                o[k][i] = concestorIdToDbId[o[k][i]];
                            }
                        }
                    }
                }
            }
            for (let rk in remoteEntities[entity.key]) {
                let b = remoteEntities[entity.key][rk];
                for (let k in b) {
                    if (typeof b[k] == "string" && remoteIdToDbId[b[k]]) {
                        b[k] = remoteIdToDbId[b[k]];
                    }
                    else if (Array.isArray(b[k])) {
                        for (let i = 0; i < b[k].length; i++) {
                            if (typeof b[k][i] == "string" && remoteIdToDbId[b[k][i]]) {
                                b[k][i] = remoteIdToDbId[b[k][i]];
                            }
                        }
                    }
                }
            }
        }


        async.eachSeries(
            dh.allEntityKeys,
            function(entityKey, nextType) {
                let entity = dh.entityHandlers[entityKey];
                console.log("Merging (2)" + entity.key);

                let ok = new Set(Object.keys(concestorEntities[entity.key]));
                let ak = new Set(Object.keys(dbEntities[entity.key]));
                let bk = new Set(Object.keys(remoteEntities[entity.key]));
                let allKeysSet = new Set([...ak, ...bk, ...ok]);

                // remove any remote or concestor keys that appear in the mappings

                for (let k of ak) {
                    if (dbIdToConcestorId[k] && dbIdToConcestorId[k] != k) allKeysSet.delete(dbIdToConcestorId[k]);
                }

                for (let k of ok) {
                    if (concestorIdToRemoteId[k] && concestorIdToRemoteId[k] != k) allKeysSet.delete(concestorIdToRemoteId[k]);
                }
                let allKeys = Array.from(allKeysSet);

                async.eachSeries(
                    allKeys,
                    function(id, nextKey) {
                        console.log("Checking merge for " + entity.key + " " + id);
                        let o = concestorEntities[entity.key][dbIdToConcestorId[id] || id];
                        let a = dbEntities[entity.key][id];
                        let b = remoteEntities[entity.key][concestorIdToRemoteId[dbIdToConcestorId[id] || id] || id];

                        if (a && b && a.contentHash == b.contentHash && concestorEntities.source != "db") {
                            // db and remote are the same - do nothing regardless of concestor state
                            // both came from git (unless doing a reset), so a contentHash check is reliable
                            return nextKey();
                        }
                        else if (o && a && !b) {
                            // deleted remotely
                            result[entity.key].push({
                                op: "delete",
                                id: a.id
                            });
                            return nextKey();
                        }
                        else if (o && !a) {
                            // deleted locally - ignore remote value
                            return nextKey();
                        }
                        else if (!o && !a && b) {
                            // new item in git - load from file and add an insert op
                            entity.populateFullData(remoteEntities, b, function(err, d) {
                                if (err) {
                                    console.log(err);
                                    return nextKey(err);
                                }
                                result[entity.key].push({
                                    op: "insert",
                                    d: d
                                });
                                return nextKey();
                            });

                        }
                        else if (!o && a && !b) {
                            // new item in db - no need to do anything
                            return nextKey();
                        }
                        else if (!o && a && b) {
                            // new item in both - should never happen unless the id processing
                            // breaks as a and b would not get matching ids
                            return nextKey("Same id added twice");
                        }
                        else if (o && a && b && o.contentHash == b.contentHash && concestorEntities.source != "db") {
                            // remote unchanged - do nothing
                            return nextKey();
                        }
                        else if (o && a && b && (o.contentHash != b.contentHash || concestorEntities.source == "db")) {
                            // if both changed - we need to populate all three and run the custom merge code
                            // note that o == a is possible here - saving b directly would work, but this
                            // way only changed fields get saved.
                            entity.populateFullData(concestorEntities, o, function(err) {
                                if (err) return nextKey(err);
                                entity.populateFullData(dbEntities, a, function(err) {
                                    if (err) return nextKey(err);
                                    entity.populateFullData(remoteEntities, b, function(err) {
                                        if (err) return nextKey(err);
                                        entity.merge(o, a, b, function(err, updates) {
                                            if (err) return nextKey(err);
                                            if (updates && Object.keys(updates).length > 0) {
                                                result[entity.key].push({
                                                    op: "update",
                                                    id: a.id,
                                                    d: updates
                                                });
                                            }
                                            return nextKey();
                                        });
                                    });
                                });
                            });
                        }
                        else {
                            return nextKey("Unhandled merge condition");
                        }
                    },
                    function(err) {
                        if (err) return nextType(err);
                        nextType();
                    }
                );
            },
            function(err) {
                if (err) return callback(err);
                global.setTimeout(() => callback(null, result), 0);
            }
        );
    }
    merge(lastCommitSynced, dbEntities, remoteCommit) {

    }
    // read all entities from a given tree node
    processTreeNode(treeNode, parentEntity, expectedEntityKeys, foundEntities, handleFoundEntity, done) {
        if (!treeNode) {
            // this makes it easier to call with optional nodes
            done();
            return;
        }
        var dh = this;
        var unclaimedNodes = Object.keys(treeNode.contents);
        async.eachSeries(
            expectedEntityKeys || dh.allEntityKeys,
            function(entityKey, next) {
                // iterate files
                let entity = dh.entityHandlers[entityKey];
                entity.readEntitiesFromTree(parentEntity, treeNode,
                    unclaimedNodes,
                    foundEntities,
                    handleFoundEntity,
                    function(err, remainingNodes) {
                        if (err) return next(err);
                        unclaimedNodes = remainingNodes;
                        next();
                    });
            },
            function(err) {
                if (err) return done(err);
                done();
            }
        );

        // get list of child nodes
        // iterate over entity handlers, removing items from tree list as they are claimed
        // remaining items are handled as non-editable file/folder
    }
    applyDbUpdates(updates, existingEntities, handleFoundEntity, done) {
        var dh = this;
        async.eachSeries(
            dh.entityHandlers,
            function(entity, next) {
                // iterate files
                console.log("Updating db for " + entity.key);
                entity.applyDbUpdates(
                    updates[entity.key],
                    existingEntities,
                    handleFoundEntity,
                    next
                );
            },
            function(err) {
                if (err) return done(err);
                done();
            }
        );
    }

    getChildEntityKeys(foundEntities, childEntityKey, parentId) {
        let childEntityHandler = this.entityHandlers[childEntityKey];
        return Object.keys(foundEntities[childEntityKey])
            .filter(ok => foundEntities[childEntityKey][ok][childEntityHandler.parentKey || "parent"] == parentId)
            .sort((a, b) => {
                a = foundEntities[childEntityKey][a].treeNode.name;
                b = foundEntities[childEntityKey][b].treeNode.name;
                if (a < b) return -1;
                if (a > b) return 1;
                return 0;
            });
    }
}

export default DataHandler;
