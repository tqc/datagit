import async from "async";
import {diff} from "./diff3";
import levenshtein from 'fast-levenshtein';
import yaml from "js-yaml";
import {dump, foldString} from "./yamldumper";

export class MergeError extends Error {
    constructor(conflictData) {
        super();
        this.message = "Merge Conflict";
        this.conflictData = conflictData;
    }
}

class Syncable {
    key = "syncable"
    constructor(dh) {
        this.dataHandler = dh;
        this.mergeConflictHandlers = {};
    }

    isClaimedNode(n, parentEntity, foundEntities) {
        return false;
    }
    // assuming claimedNode returned true, process the node
    // assumes no need for access to other nodes in parent folder
    // if that is needed, override process directly.
    readEntityFromNode(n, parentEntity, foundEntities, handleFoundEntity, done) {
        done("readEntityFromNode Not Implemented for " + this.key);
    }
    // formerly known as process
    readEntitiesFromTree(parentEntity, treeNode, unclaimedNodes, foundEntities, handleFoundEntity, callback) {
        var remainingNodes = [];
        async.eachSeries(
            unclaimedNodes,
            (k, next) => {
                var n = treeNode.contents[k];
                if (this.isClaimedNode(n, parentEntity, foundEntities)) {
                    this.readEntityFromNode(n, parentEntity, foundEntities, handleFoundEntity, next);
                }
                else {
                    remainingNodes.push(k);
                    global.setTimeout(next, 0);
                }
            },
            function(err) {
                if (err) return callback(err);
                callback(null, remainingNodes);
            });
    }
    loadFromDb(handleFoundEntity, done) {
        let { dataHandler, dbCollection, key } = this;
        dataHandler.db[dbCollection].find({
            repo: dataHandler.repo.options.id,
            user: dataHandler.repo.options.user
        }).each(function(err, item) {
            if (err || !item) return done(err, item);
            handleFoundEntity(key, item);
        });
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


    resolveConflictLocal(k, o, a, b) {
        return a;
    }

    resolveConflictArray(k, o, a, b) {
        let diffResult = diff.diff3Merge(a, o, b);
        // todo: if all elements match a, return a directly
        let arr = [];
        function pushNew(ids) {
            arr.push.apply(arr, ids.filter(v => v !== undefined && arr.indexOf(v) < 0));
        }
        for (let hunk of diffResult) {
            if (hunk.ok) {
                pushNew(hunk.ok);
            }
            else if (hunk.conflict) {
                let len = Math.max(hunk.conflict.o.length, hunk.conflict.a.length, hunk.conflict.b.length);
                for (let i = 0; i < len; i++) {
                    // todo: does o need to be included here?
                    pushNew([hunk.conflict.a[i], hunk.conflict.b[i]]);
                }
            }
        }

        // just in case anything got lost
        pushNew(a.concat(b));
        return arr;
    }

    resolveConflictText(k, o, a, b) {
        let diffResult = diff.diff3Merge(a, o, b);

        if (diffResult.length == 1 && diffResult[0].ok) {
            // no conflicts
            return diffResult[0].join("");
        }

        if (a.length <= 40 && b.length <= 40) {
            // for short fields, pick a change to use
            // 40 happens to be the length of a git object hash
            return levenshtein.get(o, a) >= levenshtein.get(o, b) ? a : b;
        }

        let result = "";
        let conflicts = [];
        for (let hunk of diffResult) {
            if (hunk.ok) {
                result += hunk.ok.join("");
            }
            else if (hunk.conflict && hunk.conflict.a == hunk.conflict.b) {
                // same change made on both sides
                result += hunk.conflict.a;
            }
            else if (hunk.conflict) {
                let conflict = {
                    resultIndex: result.length,
                    oLength: hunk.conflict.o.length
                };

                if (hunk.conflict.oIndex < 30) {
                    conflict.context = o.substr(0, hunk.conflict.oIndex + hunk.conflict.o.length + 30);
                    conflict.contextIndex = hunk.conflict.oIndex;
                }
                else {
                    conflict.context = o.substr(hunk.conflict.oIndex - 30, 30 + hunk.conflict.o.length + 30);
                    conflict.contextIndex = 30;
                }

                // apply the change with most added characters and record the other as an unapplied change
                if (hunk.conflict.a.length >= hunk.conflict.b.length) {
                    result += hunk.conflict.a;
                    conflict.update = hunk.conflict.b;
                }
                else {
                    result += hunk.conflict.b;
                    conflict.update = hunk.conflict.a;
                }
                conflicts.push(conflict);
            }
        }
        if (conflicts.length > 0) {
            throw new MergeError({
                result: result,
                conflicts: conflicts
            });
        }
        return result;
    }

    eq(a, b) {
        if (a == b) return true;
        if (Array.isArray(a) && Array.isArray(b)) {
            return a.concat(b).filter(v => a.indexOf(v) != b.indexOf(v)).length == 0;
        }
        return false;
    }
    empty(a) {
        if (!a) return true;
        if (a.length === 0) return true;
        return false;
    }
    mergeValue(k, o, a, b) {
        if (this.eq(a, b)) return a;
        else if (this.eq(a, o) && !this.eq(b, o)) return b;
        else if (!this.eq(a, o) && !this.eq(b, o)) {
            // both changed
            // ignore deletion in favor of updated value
            if (this.empty(a)) return b;
            if (this.empty(b)) return a;

            if (this.mergeConflictHandlers[k]) return this.mergeConflictHandlers[k](k, o, a, b);

            // for numbers, just use the local value
            if (typeof a == "number") return a;

            if (Array.isArray(a)) return this.resolveConflictArray(k, o, a, b);

            if (typeof a == "string") {
                return this.resolveConflictText(k, o, a, b);
            }

            // now we have conflicting values
            // resolution will depend on the field
            // for main text, attempt a text merge. if failing, store conflict data.

            // for id arrays, run array merge, ensuring no items are lost

            // for minor text field, use the most changed value, longest value, or the local value


        }
    }

    merge(o, a, b, callback) {
        // all three objects will be set and populated with full data at this point.
        var changedFields = {};

        let allKeys = new Set([...Object.keys(o), ...Object.keys(a), ...Object.keys(b)]);
        allKeys.delete("treeNode");
        allKeys.delete("repo");
        allKeys.delete("user");
        allKeys.delete("type");

        // todo: contentHash may need some special handling here
        // if all changes came from b, ok to use hash from b
        // if any changes came from a (ie are not in o) reset it as db content hash is probably outdated.
        allKeys.delete("contentHash");


        for (let k of allKeys) {
            try {
                let val = this.mergeValue(k, o[k], a[k], b[k]);
                if (!this.eq(val, a[k])) changedFields[k] = val;
            }
            catch (e) {
                console.log(JSON.stringify(o[k]));
                console.log(JSON.stringify(a[k]));
                console.log(JSON.stringify(b[k]));
                return callback(e.message + " " + k);
                // todo: for conflicting text, record the conflicts
            }
        }

        // remove invalid git hashes from the db
        // not always necessary, but good enough for now.
        if (Object.keys(changedFields).length > 0) {
            changedFields.contentHash = null;
        }

        callback(null, changedFields);
    }

    applyDbUpdates(updates, existingEntities, handleFoundEntity, callback) {
        let {dataHandler} = this;
        if (!updates.length) return callback();


        for (let i = 0; i < updates.length; i++) {
            let op = updates[i];
            if (op.d) {
                // avoid saving metadata
                op.d = {...op.d};
                delete op.d.type;
                delete op.d.treeNode;
            }
            if (op.op == "update") {
                handleFoundEntity(this.key, Object.assign({}, existingEntities.treenode[op.id], op.d));
            }
            if (op.op == "insert") {
                handleFoundEntity(this.key, op.d);
            }
        }

        let collection = dataHandler.db[this.dbCollection];

        collection.applyUpdates(updates, callback);

    }

    getTreeNodesForEntity(allEntities, entity, index, done) {
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

    mergeMatch(fromEntities, toEntities, mapping, inverseMapping) {
        let unmatchedFrom = {...fromEntities};
        let unmatchedTo = {...toEntities};

        for (let k in unmatchedFrom) {
            let match = this.matchMergedEntityDefinite(unmatchedFrom[k], unmatchedTo, mapping);
            if (match) {
                mapping[k] = match.id;
                inverseMapping[match.id] = k;
                delete unmatchedTo[match.id];
                delete unmatchedFrom[k];
            }
        }

        for (let k in unmatchedFrom) {
            let match = this.matchMergedEntityProbable(unmatchedFrom[k], unmatchedTo, mapping);
            if (match) {
                mapping[k] = match.id;
                inverseMapping[match.id] = k;
                delete unmatchedTo[match.id];
                delete unmatchedFrom[k];
            }
        }

        for (let k in unmatchedFrom) {
            let match = this.matchMergedEntityPossible(unmatchedFrom[k], unmatchedTo, mapping);
            if (match) {
                mapping[k] = match.id;
                inverseMapping[match.id] = k;
                delete unmatchedTo[match.id];
                delete unmatchedFrom[k];
            }
        }

    }

    matchMergedEntityDefinite(entity, possibleMatches, idMapping) {
        // only match parent id and slug match
        for (let mk in possibleMatches) {
            let e2 = possibleMatches[mk];
            if (this.parentKey) {
                // only match items with the same parent entity
                // would need a second pass to allow matching items moved to another section
                if (idMapping[entity[this.parentKey]] == e2[this.parentKey]) {
                    if (entity.slug == e2.slug) return e2;
                }
            }
            else {
                if (entity.slug == e2.slug) return e2;
            }
        }
    }

    matchMergedEntityProbable(entity, possibleMatches, idMapping) {
        // match on title
        for (let mk in possibleMatches) {
            let e2 = possibleMatches[mk];
            if (this.parentKey) {
                // only match items with the same parent entity
                // would need a second pass to allow matching items moved to another section
                if (idMapping[entity[this.parentKey]] == e2[this.parentKey]) {
                    if (entity.slug && e2.slug && entity.slug.substr(3).toLowerCase() == e2.slug.substr(3).toLowerCase()) return e2;
                }
            }
            else {
                if (entity.slug && e2.slug && entity.slug.substr(3).toLowerCase() == e2.slug.substr(3).toLowerCase()) return e2;
            }
        }

    }

    matchMergedEntityPossible(entity, possibleMatches, idMapping) {
        // match on title, ignoring parent entity
        for (let mk in possibleMatches) {
            let e2 = possibleMatches[mk];
            if (entity.slug && e2.slug && entity.slug.substr(3).toLowerCase() == e2.slug.substr(3).toLowerCase()) return e2;
        }

    }



    parseConfigYaml(text) {
        if (!text) return {};

        var re = /^(-{3}(?:\n|\r)([\w\W]+?)(?:\n|\r)-{3}\r?\n?)?([\w\W]*)*/,
            results = re.exec(text),
            conf = {},
            yamlOrJson,
            contentBlock = "";

        let mdm = text.match(/^\n*(# ([\S ]*)\n)\n*((> ((.*\n)(.+\n)*)))?\n*([\s\S]*)/);
        let ymlm = text.match(/^(#.*\n|\n)*(\w+:.*\n)/);


        if (results && text.indexOf("---") == 0) {
            yamlOrJson = results[2];
            contentBlock = results[3];
        }
        else if (text[0] == "{") {
            // json
            yamlOrJson = text;
        }
        else if (ymlm) {
            // yaml
            yamlOrJson = text;
        }
        else if (mdm) {
            // md with title
            conf = {
                title: mdm[2]
            };
            if (mdm[5]) conf.summary = mdm[5]
                .replace(/\n> ?\n/g, "\n\n")
                .replace(/\n> /g, "\n")
                .replace(/ +/g, " ")
                .trim();
            contentBlock = (mdm[8] || "").trim();
        }
        else {
            // this probably shouldn't be reachable
            console.log(text);
            throw new Error("Unexpected file content");
        }

        if (yamlOrJson) {
            if (yamlOrJson.charAt(0) === '{') {
                conf = JSON.parse(yamlOrJson);
            } else {

                // allow a text block to start with " or '
                // not technically valid yaml, but allowing it prevents user confusion

                yamlOrJson = yamlOrJson
                    .replace(/(\w+:)(\n {2}["'])/g, "$1 >$2");

                // these fields are always just folded text - make sure they aren't
                // treated as broken lists
                for (let k of ["summary", "notes", "description"]) {
                    yamlOrJson = yamlOrJson
                    .replace("\n" + k + ":\n", "\n" + k + ": >\n");
                }

                conf = yaml.load(yamlOrJson);

                for (let k in conf) {
                    let val = conf[k];
                    if (!val) continue;
                    if (typeof val == "string" && val.indexOf("\n") >= 0) {
                        // clear trailing whitespace
                        val = val.replace(/([^\S\n])+\n/g, "\n");

                        // assume this is a markdown field
                        // double the newlines
                        val = val.replace(/\n/g, "\n\n");

                        conf[k] = val;
                    }
                }

            }
        }


        if (this.configFileBodyField && (contentBlock || !conf[this.configFileBodyField])) {
            let val = contentBlock || '';
            // clear trailing whitespace
            val = val.replace(/([^\S\n])+\n/g, "\n");
            conf[this.configFileBodyField] = val;
        }

        for (let k in conf) {
            let val = conf[k];
            if (!val) continue;
            if (typeof val == "string" && (val.trim().indexOf("<") == 0)) {
                // fix some old files that contain html instead of md

                val = val
                    .replace(/<p>#<\/p>/gi, "") // fix the result of an old import script bug
                    .replace(/&nbsp;/gi, " ")
                    .replace(/<p[^>]*>/gi, "\n\n")
                    .replace(/<br>/gi, "\n")
                    .replace(/<\/p>/gi, "")
                    .replace(/<div[^>]*>/gi, "\n\n")
                    .replace(/<\/div>/gi, "")
                    .replace(/<\/?meta[^>]*>/gi, "")
                    .replace(/<\/?html[^>]*>/gi, "")
                    .replace(/<\/?body[^>]*>/gi, "")

                    .replace(/<style[^>]*>[^>]*<\/style>/gi, "")

                    .replace(/<head[^>]*>[^>]*<\/head>/gi, "")

                    .replace(/<span[^>]*>/gi, "")
                    .replace(/<\/span>/gi, "")
                    .replace(/<text:span[^>]*>#<\/text:span>/gi, "")
                    .replace(/<text:span[^>]*>/gi, "")
                    .replace(/<\/text:span>/gi, "")
                    .replace(/&quot;/gi, "\"")
                    .replace(/&#39;/gi, "'")
                    .replace(/<\/?annotation[^>]*>/gi, "\n")
                    .replace(/\n\n+\n/gi, "\n\n")
                    .replace(/\n[^\S\n]+\n/gi, "\n\n")
                    .trim();

                // fix the result of an old import script bug
                if (val == "#") val = "";

                if (typeof val == "string") {
                    val = val
                        // clear trailing whitespace
                        .replace(/\n[^\S\n]+\n/gi, "\n\n")
                        .trim();
                }

                if (!val) continue;

                conf[k] = val;
            }
        }
        if (!conf) {
            console.log(text);
            throw new Error("Conf not set");
        }
        return conf;
    }

    getWritableConfigObject(object) {
        let {configFileBodyField, configFileSkippedKeys, configFileKeyOrder} = this;
        if (!configFileSkippedKeys) configFileSkippedKeys = [];
        if (!configFileKeyOrder) configFileKeyOrder = [];

        var cfg = {};
        for (let k in object) {
            if (configFileSkippedKeys.indexOf(k) >= 0) continue;
            if (["id", "user", "repo", "contentHash", "treeNode", "parent", "type"].indexOf(k) >= 0) continue;
            if (k == configFileBodyField) continue;
            let val = object[k];
            if (!val) continue;
            if (Array.isArray(val) && val.length === 0) continue;
            if (typeof val == "object" && Object.keys(val).length == 0) continue;
            if (typeof val == "string" && val.indexOf("\n") >= 0) {
                // assume that all fields containing newlines are markdown - ie only
                // double newlines matter
                // change back to single newlines, which will make the dumper output
                // the same spacing as the original md

                val = val
                    .replace(/\n[^\S\n]+\n/g, "\n\n")
                    .replace(/(\S)\n([\S])/g, "$1 $2")
                    .replace(/([^\n])\n([^\n])/g, "$1$2")
                    .replace(/\n{2}/g, "\n");
                if (val.trim().length > 0 && val[val.length - 1] != "\n") val += "\n";
            }
            if (!val) continue;
            cfg[k] = val;
        }

        if (this.configFileBodyField) {
            let val = object[this.configFileBodyField] || "";

            val = val
                .replace(/\n[^\S\n]+\n/g, "\n\n")
                .replace(/(\S)\n([\S])/g, "$1 $2")
                .replace(/([^\n])\n([^\n])/g, "$1$2")
                .replace(/\n{2}/g, "\n");

            val = foldString(val, 80)
                // in case folding added trailing spaces
                .replace(/\n[^\S\n]+\n/gi, "\n\n")
                .trim();

            if (val.trim().length > 0 && val[val.length - 1] != "\n") val += "\n";
            cfg.configFileBody = val;
        }

        return cfg;

    }

    writeConfigYaml(cfg, callback) {
        let {configFileKeyOrder} = this;
        if (!configFileKeyOrder) configFileKeyOrder = [];

        let configFileBody = cfg.configFileBody;
        delete cfg.configFileBody;

        let fc = "";

        let customKeys = Object.keys(cfg).filter(k => k != "title" && k != "summary");
        if (customKeys.length == 0) {
            // we can use plain markdown;
            if (cfg.title) {
                fc += "# " + cfg.title + "\n\n";
            }
            if (cfg.summary) {
                let val = foldString(cfg.summary, 76)
                    // in case folding added trailing spaces
                    .replace(/\n[^\S\n]+\n/gi, "\n\n")
                    // add > to each line
                    .trim()
                    .replace(/\n/g, "\n> ")
                    .replace(/ \n/g, "\n")
                    .trim();
                fc += "> " + val + "\n\n";
            }
        }
        else {
            // we have custom content - use a front matter block
            var fm = dump(cfg, {
                sortKeys: function sortKeys(a, b) {
                    let ai = configFileKeyOrder.indexOf(a);
                    if (ai < 0) ai = 1000;
                    let bi = configFileKeyOrder.indexOf(b);
                    if (bi < 0) bi = 1000;
                    if (ai < bi) return -1;
                    if (ai > bi) return 1;
                    if (a < b) return -1;
                    if (a > b) return 1;
                    return 0;
                }
            });
            fc = "---\n" + fm + "---\n";
        }

        if (configFileBody) {
            fc += configFileBody;
        }

        return fc;
    }

    writeConfigFile(object, callback) {
        let cfg = this.getWritableConfigObject(object);

        let fc = this.writeConfigYaml(cfg);
        this.dataHandler.repo.writeTextFile(fc, (err, hash) => callback(err, hash, Object.keys(cfg)));
    }

}

export default Syncable;
