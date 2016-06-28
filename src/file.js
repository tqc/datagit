import {Syncable} from "./syncable";

export class File extends Syncable {
    constructor(repo) {
        super(repo);

    }
    static findAll(treeNode) {
        if (!treeNode) return [];
        var result = [];
        for (let k in treeNode.contents) {
            let node = treeNode.contents[k];
            if (node.claimed) continue;
            if (node.type == "blob") {
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
    static mergeMatchedNodes(concestorFolders, dbFolders, repoFolders) {
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
    static getById(repo, id) {
        // load from mongo
    }
    static getItems(treehash) {
        // Given a listing of the parent folder, work out what items of this type
        // should exist.

        var list = this.repo.getFolderList(treehash);
        // Start with a known list, so already persisted items can be reused and updated
        // if necesary.

        return list.filter(o => o.type == "blob").map(o => ({
            title: o.name,
            sha: o.sha,
            claims: [o.name]
        }));

        // Each item claims one or more records in the folder, to allow for fallback to
        // generic file/folder type.

        /*
        return [
            {
                id: 1,
                title: "Test",
                sha: "sha1hash",
                claims: ["01 Test.md"]
            }
        ]*/

    }
    static mergeList(concestorItems, localItems, remoteItems) {
        // given the three lists, create a new one combining them at item level

        // for a default file, matching is simply those with the same name.

        // more complex strategies are possible, for example matching on title only or
        // on the closest available item not claimed as an exact match for something else.

        return [
            {
                concestor: {},
                local: {},
                remote: {}
            }
        ];
    }
    commit() {
        // write a snapshot of this object to git and update the object list
        // a commit is always created before any merge operation.

        // commit is called for each child item collection.
        // a base class method sorts the child lists and writes a tree.

        // index in parent collection is a parameter, allowing the numeric filename prefix.


        // returns a list of files to be written to the parent folder
        return [
            {
                name: "01 Test.md",
                sha: "sha1hash",
                type: "blob"
            }
        ];
    }
    merge(concestor, local, remote) {
        // given file nodes, update the properties of the db object.
    }
}