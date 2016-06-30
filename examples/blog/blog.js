import * as DataGit from "../../src";
import {Post} from "./post";

export class Blog extends DataGit.Syncable {
    constructor() {
        super();
        this.ChildTypes = [
            Post
        ];
        this.posts = [];
        this.childTypeCollections = [
            this.posts
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
        if (!tree.contents["config.json"]) return result;
        tree.contents["config.json"].claimed = true;
        var repoContents = JSON.parse(repo.readString(tree.contents["config.json"].hash));
        result.title = repoContents.title;
        return result;
    }
    resolveConflict(k, o, a, b) {
        // this can be overridden differently for specific keys
        return a;
    }
    applyProperties(repo, p) {
        this.title = p.title;
    }
}