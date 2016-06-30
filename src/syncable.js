// an object which can be synced with git
export class Syncable {
    mergeProperties(repo, concestorTree, dbTree, repoTree) {
        // todo: add shortcuts for unchanged trees

        var o = this.readProperties(repo, concestorTree);
        // this should really just read from the object
        var a = this.readProperties(repo, dbTree);
        var b = this.readProperties(repo, repoTree);

        var result = {};

        var allKeys = Object.keys(o)
            .concat(Object.keys(a))
            .concat(Object.keys(b))
            .filter((v, i, arr) => arr.indexOf(v) === i);

        for (let k of allKeys) {
            if (a[k] === b[k]) result[k] = a[k];
            else if (a[k] === o[k]) result[k] = b[k];
            else if (b[k] === o[k]) result[k] = a[k];
            else {
                // conflict
                if (a[k] === undefined || a[k] === null || a[k] == "") result[k] = b[k];
                else if (b[k] === undefined || b[k] === null || b[k] == "") result[k] = a[k];
                else result[k] = this.resolveConflict(k, o[k], a[k], b[k]);
            }
        }
        return result;
    }
    static mergeMatchedNodes(concestorFolders, dbFolders, repoFolders, dbObjects) {
        var changesets = [];
        // now we need to turn these lists into a change set:
        // v1, v2, v3; where blank implies new/deleted
        for (let i = 0; i < repoFolders.length; i++) {
            if (concestorFolders.length == 0 && dbFolders.length == 0) {
                // special case first read
                changesets.push({
                    concestor: null,
                    local: null,
                    remote: repoFolders[i]
                });
            }
        }
        return changesets;
    }
    mergeChildItems(repo, concestorTree, dbTree, repoTree) {
        if (!this.ChildTypes || !this.ChildTypes.length) return;
        for (let i = 0; i < this.ChildTypes.length; i++) {
            let T = this.ChildTypes[i];
            var concestorFolders = T.findAll(concestorTree);
            var dbFolders = T.findAll(dbTree);
            var repoFolders = T.findAll(repoTree);

            var collection = this.childTypeCollections[i];
            var mmn = T.mergeMatchedNodes || Syncable.mergeMatchedNodes;
            var changesets = mmn(concestorFolders, dbFolders, repoFolders, collection);
            for (let cs of changesets) {
                var dbitem;
                if (!cs.local && !cs.remote) {
                    // removed from both - ignore
                    continue;
                }
                else if (cs.concestor && cs.local && !cs.remote) {
                    // deleted remotely
                    if (cs.local.node.hash == cs.concestor.node.hash) {
                        // todo: delete from db
                    }
                    else {
                        // changed locally - ignore deletion
                    }
                }
                else if (!cs.local && cs.remote) {
                    // new version - read from remote
                    dbitem = new T(this.repo);
                    dbitem.merge(repo, null, null, cs.remote.node);
                    collection.push(dbitem);
                }
                else if (cs.local && cs.remote) {
                    // both exist; need to compare to concestor
                    dbitem = cs.local.dbitem;
                    dbitem.merge(repo, cs.concestor && cs.concestor.node, cs.local.node, cs.remote.node);
                }
            }
        }
    }
    readProperties(repo, tree) {
        var result = {};
        return result;
    }
    applyProperties(repo, p) {

    }
    resolveConflict(k, o, a, b) {
        // this can be overridden differently for specific keys
        return a;
    }
    merge(repo, concestorTree, dbTree, repoTree) {
        var result = [];
        var p = this.mergeProperties(repo, concestorTree, dbTree, repoTree);
        this.applyProperties(repo, p);
        this.mergeChildItems(repo, concestorTree, dbTree, repoTree);

        return result;
    }
}