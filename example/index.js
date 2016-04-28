import DataGit from "../src";
import db from "./db";

DataGit.test();

export class TestRepo extends DataGit.Repo {
    constructor(options) {
        super(options);
        // normally this will be read from the db.
        // default constructor returns [] - ie no files
        this.Root = new DataGit.Folder(this);
        this.repoPath = options.repoPath;
        this.db = options.db;
        this.git = options.db;
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

var repo = new TestRepo({
    db: db
});

repo.merge();