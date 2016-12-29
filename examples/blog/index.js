// import Blog from "./blog";
import path from "path";
import {GitRunnerRepo, DataHandler, TreeNode} from "../../src";
import Post from "./post";
import Blog from "./blog";

import Mongo from "mongo-mock";

import * as DB from "../examples/db";

global.Mongo = Mongo;

DB.open({}, function(err, db) {
    if (err) throw err;


    let repoSettings = {
        id: "repoId",
        user: "userId",
        userSettings: {
            name: "Test User",
            email: "testuser@example.com",
            privateKey: undefined
        }

    };

    let repo = new GitRunnerRepo(repoSettings, path.resolve(__dirname, "../../build/data/"));

    var entities = [Blog, Post, TreeNode];
    var dh = new DataHandler(repo, db, entities);

    dh.connect(function(err, result, isComplete) {
        if (err) throw err;
        // todo: run an import
    });

});

export default {};
