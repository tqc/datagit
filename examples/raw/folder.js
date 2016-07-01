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

    writeTree(dbTree) {
        var nodes = [];
        return nodes;
    }

    readProperties(repo, tree) {
        var result = {};
        if (!tree) return result;
        result.name = tree.name;
        return result;
    }
    applyProperties(repo, p) {
        this.name = p.name;
    }
    properties() {
        return {
            name: this.name
        };
    }
}