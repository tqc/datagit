// import Blog from "./blog";
import path from "path";
import {GitRunnerRepo, DataHandler} from "../../src";


let repoSettings = {
				id: "repoId"
				user: "userId",
            userSettings: {
                name: user.displayName,
                email: user.email,
                privateKey: privateKey
            }

};

let repo = new GitRunnerRepo(repoSettings, path.resolve(__dirname,"../../build/data/");

            var entities = [Blog, Post, DataGit.TreeNode];
            var dh = new DataHandler(repo, db, entities);
process.env.GIT_BASE_PATH;process.env.GIT_BASE_PATH;
            // makes sure the local repo exists
            // connection returned includes data handler details

            dh.connect(function(err, result, isComplete) {
                callback(err, result, dh, isComplete);
            });


export default {};
