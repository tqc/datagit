import {Syncable} from "./syncable";

export class File extends Syncable {
    constructor(repo) {
        super(repo);

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
    merge(concestor, remote) {
        // merge in remote changes for this item and all child items

        // parameters are lightweight item details returned from getItems

        // if a change is not needed, just return current file list.

        // update the main file - eg text merge of content fields

        // call getitems/mergelist for each collection

        // merge each child collection

        // add the merge results to the file list, optionally in tree form.

        // like commit, this returns a list of items to be added to the parent folder.

        return {
            "01 Test.md": "sha1hash"
        };
    }
}