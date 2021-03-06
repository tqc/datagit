import "./repo";
import "./raw";


import fs from "fs-extra";
import path from "path";
import Mongo from "mongo-mock";
import cuid from "cuid";

import * as DB from "../examples/db";
//import {TestRepo} from "../examples/raw";
//import {BlogRepo} from "../examples/blog";
import * as GitRunner from "gitrunner";
import chai from "chai";
var git = GitRunner.Sync;

global.Mongo = Mongo;

global.expect = chai.expect;

before(function(done) {
    console.log("set up test run");
    // allow time for git clone to run if needed
    this.timeout(30000);
    // make sure the test repo exists
    var testDir = path.resolve(__dirname, "../build/test");
    var testRepoDir = path.resolve(testDir, "repo");
    fs.ensureDirSync(testDir);

    if (!fs.existsSync(testRepoDir)) {
        // repo is a bare clone of git@bitbucket.org:tqc/datagit-test.git
        git.run(testDir, {
            params: ["clone", "--bare", "git@github.com:tqc/datagit-test.git", "repo"]
        });
    }


    DB.open({}, function(err, db) {
        if (err) throw err;
        global.testDb = db;

        global.testRepoConfig = {
            id: cuid(),
            user: "testUserId",
            remoteUrl: "git@bitbucket.org:tqc/datagittest.git",
            userSettings: {
                name: "Test User",
                email: "testuser@example.com",
                privateKey: undefined
            }
        };

        global.testRepoPath = path.resolve(testDir, "repo");

        done();
    });
});




after(function(done) {
    console.log("end test run");

    console.log("deleting test files");

    //fs.removeSync(global.testRepo.path);
    //fs.removeSync(global.blogRepo.path);

    done();
});