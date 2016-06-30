import * as DataGit from "../../src";

export class File extends DataGit.Syncable {
    constructor() {
        super();
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
}