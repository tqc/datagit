import {repoTest, repoFetchTest} from "./testutils";
import cuid from "cuid";
import path from "path";
import {GitRunnerRepo} from "./src";

describe("GitRunnerRepo", () => {

    let sharedRepo = new GitRunnerRepo({...global.testRepoSettings, id: cuid()}, global.testRepoPath);
    repoTest(sharedRepo);

    let newRepo = new GitRunnerRepo({...global.testRepo.options, id: cuid()}, path.resolve(__dirname, "../build/test/:repoId"));

    repoFetchTest(newRepo);

});
