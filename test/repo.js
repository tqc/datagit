import {repoTest, repoFetchTest} from "./testutil";
import cuid from "cuid";
import path from "path";
import {GitRunnerRepo} from "../src";

describe("GitRunnerRepo", () => {
    var sharedRepo, newRepo;
    before(() => {
        sharedRepo = new GitRunnerRepo(
            {...global.testRepoSettings, id: cuid()},
            global.testRepoPath
            );
        newRepo = new GitRunnerRepo(
            {...global.testRepo.options, id: cuid()},
            path.resolve(__dirname, "../build/test/:repoId")
            );
    });

    repoTest(() => sharedRepo);

    repoFetchTest(() => newRepo);

});
