import {repoTest, repoFetchTest} from "./testutil";
import cuid from "cuid";
import path from "path";
import {GitRunnerRepo} from "../src";

describe("GitRunnerRepo", () => {
    var sharedRepo, newRepo;
    before(()=>{
        let sharedRepo = new GitRunnerRepo(
            {...global.testRepoSettings, id: cuid()},
            global.testRepoPath
            );
        let newRepo = new GitRunnerRepo(
            {...global.testRepo.options, id: cuid()},
            path.resolve(__dirname, "../build/test/:repoId")
            );
     });

    repoTest(() => sharedRepo);

    repoFetchTest(() => newRepo);

});
