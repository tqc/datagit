import {repoTest, repoFetchTest} from "./testutils";

describe("GitRunnerRepo", () => { 

let sharedRepo = new GitRunnerRepo({...global.testRepoSettings, id: cuid()}, global.testRepoPath);
repoTest(sharedRepo);

let newRepo = new GitRunnerRepo({...global.testRepo.options, id: cuid()}, path.resolve(__dirname, "../build/test/:repoId");

repoFetchTest(newRepo);

});