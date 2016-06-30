import "./01-init";
import "./02-initialsync";
import "./03-blog";

import fs from "fs-extra";
import path from "path";
import * as DB from "../examples/db";
import {TestRepo} from "../examples/raw";
import {BlogRepo} from "../examples/blog";
import * as GitRunner from "gitrunner";
import chai from "chai";
var git = GitRunner.Sync;

global.expect = chai.expect;


before(function(done) {
    console.log("set up test run");
    // make sure the test repo exists
    var testDir = path.resolve(__dirname, "../build/test");
    var testRepoDir = path.resolve(testDir, "repo");
    fs.ensureDirSync(testDir);

    if (!fs.existsSync(testRepoDir)) {
        // repo is a bare clone of git@bitbucket.org:tqc/datagit-test.git
        // git clone --bare git@bitbucket.org:tqc/datagit-test.git repo
        git.run(testDir, {
            params: ["clone", "--bare", "git@bitbucket.org:tqc/datagit-test.git", "repo"]
        });
    }

    // generate a unique id for the test run

    global.testId = DB.generateUUID();

    DB.open({}, function(err, db) {
        if (err) throw err;
/*
        db.Stores.add({
        });
*/
        var storeConfig1 = global.storeConfig = {
            id: global.testId,
            cloneUrl: path.resolve(testDir, "repo"),
            path: path.resolve(testDir, global.testId),
            branch: "master",
            lastSyncedCommit: undefined
        };


        var storeConfig2 = global.storeConfig = {
            id: global.testId,
            cloneUrl: path.resolve(testDir, "repo"),
            path: path.resolve(testDir, global.testId),
            branch: "master",
            lastSyncedCommit: undefined
        };



        global.testRepo = new TestRepo(storeConfig1, db, git);
        global.blogRepo = new BlogRepo(storeConfig2, db, git);


        // this just creates a link to the repo which may or may not already exist
        // if the folder does not exist, it is created with git init.
        // if (!git.repoExists(path)) git.init(path)
        // git.setRemote("origin", testRepoDir);
        // git.fetch(origin);

        // git.reset("")

        // db contains any files previously loaded, under a store object which includes
        // the last synced commit id - undefined for a new repo.

        // can create a file at this point
        // db.Files.add({storeId: global.TestId, name:"foo.txt", contents: "Text here"});
        // repo.Sync()
        // this will write all changed files and generate a new commit

        // or reset to a remote branch
        // repo.resetToCommit("origin/master")
        // this deletes the db objects, runs git reset --hard and recreates all the db objects.

        // should the working tree exist?
        // probably best that it doesn't to simplify renaming etc
        // can still avoid loading files completely into db by using git hashes rather
        // than filenames - eg
        //    {
        //      fileId: dbid,
        //      title: "file name",
        //      files: [{
        //          commitPath: "/folder/file.txt",
        //          commitHash: "0123456789abcdef0123",
        //          currentHash: "0123456789abcdef0123"
        //          }]
        //    }
        // A db change can either write the file to git immediately, updating the hash,
        // or clear the hash so it will be written and recalculated on sync.
        //
        // Changes need to be tracked so that a complete traverse is not
        // needed to create a commit.
        // files do not necessarily store parentId.
        // write commit path to a changes list. This can also be derived by
        // searching for currentHash != commitHash
        // expand changes list, use to skip unchanged objects.

        //global.testRepo.ensureCreated();
        // create a working tree
        done();
    });
});

after(function(done) {
    console.log("end test run");

    console.log("deleting test files");

   // fs.removeSync(global.testRepo.path);

    done();
});