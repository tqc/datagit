import * as DataGit from "../../src";
import {File} from "./file";

export class Folder extends DataGit.Syncable {
    constructor() {
        super();
        this.ChildTypes = [
            File,
            Folder
        ];
        this.files = [];
        this.folders = [];
        this.childTypeCollections = [
            this.files,
            this.folders
        ];
    }
    static findAll(treeNode) {
        if (!treeNode) return [];
        var result = [];
        for (let k in treeNode.contents) {
            let node = treeNode.contents[k];
            if (node.claimed) continue;
            if (node.type == "tree") {
                node.claimed = true;
                result.push({
                    claimedFiles: [k],
                    name: k,
                    hash: node.hash,
                    node: node
                });
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
    writeTree(dbTree) {
        var nodes = [];
        return nodes;
    }
    merge(concestorTree, dbTree, repoTree) {
        var result = [];

        for (let i = 0; i < this.ChildTypes.length; i++) {
            let T = this.ChildTypes[i];
            var concestorFolders = T.findAll(concestorTree);
            var dbFolders = T.findAll(dbTree);
            var repoFolders = T.findAll(repoTree);

            var collection = this.childTypeCollections[i];

            var changesets = T.mergeMatchedNodes(concestorFolders, dbFolders, repoFolders, collection);

            for (let j = 0; j < changesets.length; j++) {
                var cs = changesets[j];
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
                    dbitem.merge(null, null, cs.remote.node);
                    collection.push(dbitem);
                }
                else if (cs.local && cs.remote) {
                    // both exist; need to compare to concestor
                    dbitem = cs.local.dbitem;
                    dbitem.merge(cs.concestor && cs.concestor.node, cs.local.node, cs.remote.node);
                }
            }

        }


        return result;
    }
}