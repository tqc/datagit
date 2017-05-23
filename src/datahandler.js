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
            async.each(
                this.allEntityKeys,
                (ek, nextType) => {
                    let handler = this.entityHandlers[ek];
                    async.each(
                        Object.keys(entities[ek]),
                        (id, nextEntity) => {
                            handler.populateFromGit(entities, entities[ek][id], nextEntity);
                        },
                        nextType
                    );
                },
                (err) => callback(err, entities)
            );
        });
    }
    readEntitiesFromTree(commit, callback) {
        var dh = this;
        console.log("Read from tree");
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
            // console.log(tree);
            dh.processTreeNode(
                tree,
                null,
                dh.allEntityKeys,
                result,
                function(type, data) {
                    // console.log("Found entity of type " + type);
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
        console.log("Read from db");
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
                console.log("Looking for " + entity.key);
                entity.loadFromDb(
                    function(type, data) {
                        // console.log("Found entity of type " + type);
                        result.message = "Found " + type;
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
        async.eachSeries(
            dh.entityHandlers,
            function(entity, nextType) {
                // iterate files
                console.log("Looking for " + entity.key);
                var parentKey = entity.parentKey || "parent";
                var allKeys = Object.keys(allEntities[entity.key]);
                var filteredKeys = allKeys.filter(k => allEntities[entity.key][k][parentKey] == parentId);
                entity.getTreeNodesForEntities(allEntities, filteredKeys.map(k => allEntities[entity.key][k]), function(err, arr) {
                    if (err) return callback(err);
                    treeNodes.push.apply(treeNodes, arr);
                    nextType();
                });
            },
            function(err) {
                if (err) return callback(err);
                callback(null, treeNodes, true);
            }
        );

    }
    commitEntities(dbEntities, parentCommits, message, callback) {
        var dh = this;
        dh.repo.readCommit(parentCommits[0], function(err, parentCommit) {
            if (err) return callback(err);
            dh.getTreeNodesForEntities(dbEntities, null, function(err, arr) {
                if (err) return callback(err);
                console.log(arr);

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


        async.eachSeries(
            dh.entityHandlers,
            function(entity, nextType) {
                console.log("Merging " + entity.key);
                let ok = new Set(Object.keys(concestorEntities[entity.key]));
                let ak = new Set(Object.keys(dbEntities[entity.key]));
                let bk = new Set(Object.keys(remoteEntities[entity.key]));
                let allKeys = Array.from(new Set([...ak, ...bk, ...ok]));
                async.eachSeries(
                    allKeys,
                    function(k, nextKey) {
                        console.log("Checking merge for " + entity.key + " " + k);
                        let o = concestorEntities[entity.key][k];
                        let a = dbEntities[entity.key][k];
                        let b = remoteEntities[entity.key][k];

                        if (a && b && a.contentHash == b.contentHash) {
                            // db and remote are the same - do nothing
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
                                //console.log(d);
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
                            throw new Error("Same id added twice");
                        }
                        else if (o && a && b && o.contentHash == a.contentHash) {
                            // db unchanged - overwrite with data from git
                            entity.populateFullData(dh, remoteEntities, b, function(err, d) {
                                if (err) {
                                    console.log(err);
                                    return nextKey(err);
                                }
                                //console.log(d);
                                result[entity.key].push({
                                    op: "update",
                                    id: b.id,
                                    d: d
                                });
                                return nextKey();
                            });
                        }
                        else if (o && a && b && o.contentHash == b.contentHash) {
                            // remote unchanged - do nothing
                            return nextKey();
                        }
                        else if (o && a && b && o.contentHash != a.contentHash && o.contentHash != b.contentHash) {
                            // both changed - we need to populate all three and run the custom merge code
                            entity.populateFullData(dh, concestorEntities, o, function(err, d) {
                                if (err) return nextKey(err);
                                entity.populateFullData(dh, dbEntities, a, function(err, d) {
                                    if (err) return nextKey(err);
                                    entity.populateFullData(dh, remoteEntities, b, function(err, d) {
                                        if (err) return nextKey(err);
                                        entity.merge(o, a, b, function() {
                                            result[entity.key].push({
                                                op: "update",
                                                id: b.id,
                                                d: d
                                            });
                                            return nextKey();
                                        });
                                    });
                                });
                            });
                        }
                        else {
                            throw new Error("Unhandled merge condition");
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
        var dh = this;
        var unclaimedNodes = Object.keys(treeNode.contents);
        async.eachSeries(
            expectedEntityKeys || dh.allEntityKeys,
            function(entityKey, next) {
                // iterate files
                let entity = dh.entityHandlers[entityKey];
                console.log("Looking for " + entity.key +" in tree");
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
}

export default DataHandler;
