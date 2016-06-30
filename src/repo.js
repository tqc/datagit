import fs from "fs";

export class Repo {
    constructor(config, db, git) {
        this.path = config.path;
        this.db = db;
        this.git = git;
        this.config = config;
        this.cloneUrl = config.cloneUrl;
    }
    ensureExists() {
        if (!fs.existsSync(this.path)) {
            this.git.run(process.cwd(), {
                params: ["clone", this.cloneUrl, this.path]
            });
        }
    }
    status() {
        if (!fs.existsSync(this.path)) {
            return {
                status: "Uninitialized"
            };
        }

        var status = {
            status: "Unknown",
            dbChanged: !!this.config.dbChanged,
            dbCommit: this.config.lastCommitSynced,
            repoCommit: this.git.currentHead(this.path)
        };

        if (!status.dbCommit) status.status = "Unsynced";
        else if (status.dbCommit == status.repoCommit) status.status = "Clean";
        else if (status.dbCommit != status.repoCommit) status.status = "Needs Sync (repo changes)";
        else if (status.dbChanged) status.status = "Needs Sync (db changes)";

        return status;
    }
    readString(sha) {
        return this.git.show(this.path, sha);
    }
    tree(commit) {
        return this.git.tree(this.path, commit);
    }
    sync() {
        var repoCommit = this.git.currentHead(this.path);
        var dbCommit = this.config.lastCommitSynced;
        var dbChanged = !!this.config.dbChanged;

        if (repoCommit == dbCommit && !dbChanged) return;

        // todo: implement properly

        // assuming initial sync, just have to read root object from repo

        // get trees from repo for merge

        var tree = this.tree(repoCommit);

        this.Root.merge(this, null, null, tree);


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


        this.config.lastCommitSynced = repoCommit;
    }
}