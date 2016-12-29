import {repoTest, remoteRepoTest} from "./testutil";
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
            {...global.testRepoSettings, id: cuid()},
            path.resolve(__dirname, "../build/test/:repoId")
            );
    });

    repoTest(() => sharedRepo);

    remoteRepoTest(() => newRepo);

});
