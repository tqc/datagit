import {Syncable} from "./syncable";
import {File} from "./file";

export class Folder extends Syncable {
    constructor(repo) {
        super(repo);
        this.ChildTypes = [File, Folder];
    }
    getChildItems() {
        // given a tree,
    }
}