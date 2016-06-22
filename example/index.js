import * as DataGit from "../src";
//import db from "./db";
import fs from "fs";


export class TestRepo extends DataGit.Repo {
    constructor(storeConfig, db, git) {
        super({
            path: storeConfig.localPath,
            db: db,
            git: git
        });
        // normally this will be read from the db.
        // default constructor returns [] - ie no files
        this.Root = new DataGit.Folder(this);
        this.storeConfig = storeConfig;
        this.db = db;
        this.git = git;
    }
    ensureExists() {
        if (!fs.existsSync(this.storeConfig.localPath)) {
            this.git.run(process.cwd(), {
                params: ["clone", this.storeConfig.cloneUrl, this.storeConfig.localPath]
            });
        }
    }
    status() {
        if (!fs.existsSync(this.storeConfig.localPath)) {
            return {
                status: "Uninitialized"
            };
        }

        var status = {
            status: "Unknown",
            dbChanged: !!this.storeConfig.dbChanged,
            dbCommit: this.storeConfig.lastCommitSynced,
            repoCommit: this.git.currentHead(this.storeConfig.localPath)
        };

        if (!status.dbCommit) status.status = "Unsynced";
        else if (status.dbCommit == status.repoCommit) status.status = "Clean";
        else if (status.dbCommit != status.repoCommit) status.status = "Needs Sync (repo changes)";
        else if (status.dbChanged) status.status = "Needs Sync (db changes)";

        return status;
    }
    sync() {
        var repoCommit = this.git.currentHead(this.storeConfig.localPath);
        var dbCommit = this.storeConfig.lastCommitSynced;
        var dbChanged = !!this.storeConfig.dbChanged;

        if (repoCommit == dbCommit && !dbChanged) return;

        // todo: implement properly

        // assuming initial sync, just have to read root object from repo

        // get trees from repo for merge

        // there are no local changes outside the db; we are always merging with a remote tracking branch.
        // possible exception when there are unpushed commits

        // git.getTrees(a, b) // returns trees for each branch and their concestor; optimized to share refs for
        // common nodes


        //var dbRoot = {};
        //var lastSyncedTree = undefined;
        //var dbTree = git.tree(this.storeConfig.localPath, repoCommit);

        // walk the tree
        //dbRoot.claimNodes(dbTree, repoTree, concestor)

        //dbRoot.merge(dbTree, repoTree, concestor)

        // var repoTree =


        this.storeConfig.lastCommitSynced = repoCommit;
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

//var repo = new TestRepo({
//    db: db
//});

//repo.merge();