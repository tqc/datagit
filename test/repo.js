import {repoTest, remoteRepoTest} from "./testutil/repo";
import cuid from "cuid";
import path from "path";
import GitRunnerRepo from "../src/gitrunnerrepo";

describe("GitRunnerRepo", () => {
    var sharedRepo, newRepo;
    before(() => {
        sharedRepo = new GitRunnerRepo(
            {...global.testRepoConfig, id: cuid()},
            global.testRepoPath
            );
        newRepo = new GitRunnerRepo(
            {...global.testRepoConfig, id: cuid()},
            path.resolve(__dirname, "../build/test/:repoId")
            );
    });

    repoTest(() => sharedRepo);

    remoteRepoTest(() => newRepo);

});
