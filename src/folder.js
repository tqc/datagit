import {Syncable} from "./syncable";
import {File} from "./file";

export class Folder extends Syncable {
    constructor(repo) {
        super(repo);
        this.ChildTypes = [File, Folder];
    }
    readAll(treeNode) {
        var result = [];
        // loop through unclaimed nodes; add any folders
        // this allows for claiming multiple files in the parent node
        for (var k in treeNode) {
            if (treeNode[k].type == "tree") {
                var f = new Folder(this.repo);
                result.push(f.readFromTree(treeNode[k]));
            }
        }
        return result;
    }
    readFromTree(treeNode) {
        this.claim(treeNode["index.json"]);

        this.files = File.readAll(treeNode);
        this.folders = Folder.readAll(treeNode);

    }
    getChildItems() {
        // given a tree,
    }
    merge(concestorTree, dbTree, repoTree) {

    }
}