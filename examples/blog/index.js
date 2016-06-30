import {Blog} from "./blog";
import * as DataGit from "../../src";


export class BlogRepo extends DataGit.Repo {
    constructor(config, db, git) {
        super(config, db, git);
        // normally this will be read from the db.
        // default constructor returns [] - ie no files
        this.Root = config.root || new Blog(this);
    }
    static loadFromDb(db, id) {
        // call db.stores.get(id)
    }
    static create(db, git) {
        // creates a new repo and db object
    }
    saveToDb(db) {
        // saves the store config
    }
    persist() {
        // create the git folder if necessary
        // save details to mongo
    }
    merge() {
        // get local, remote and concestor commits.
        var newTree = this.Root.merge();
        if (newTree.length != 1) {
            // no valid tree
        }

        // if newTree[0] matches local, do nothing
        // if newTree[0] matches remote, just update the branch metadata
        // otherwise, create a new commit.

    }
}
