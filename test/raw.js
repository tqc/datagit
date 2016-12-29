import cuid from "cuid";
import {TreeNode, GitRunnerRepo, DataHandler} from "../src";

describe("raw data handler", function() {

    function getDataHandler() {
        let testRepo = new GitRunnerRepo({...global.testRepoConfig, id: cuid()}, global.testRepoPath);
        // todo: add repo to db

        let dh = new DataHandler(testRepo, global.testDb, [TreeNode]);
        return dh;
    }

    let namedHashes = {
        baseCommit: "initial",
        baseTree: "initial:"
// todo: full set of commits
    };
    let sharedDataHandler;
    before(function(done) {
        sharedDataHandler = getDataHandler();
        sharedDataHandler.connect((err) => {
            expect(err).to.not.exist;
            sharedDataHandler.repo.updateNamedHashes(namedHashes, done);
        });
    });

    describe("entity collection", function() {
    // test reading entity collection
        let entities = {};
        before(function(done) {
            sharedDataHandler.readFullEntitiesFromCommit(namedHashes.baseCommit, (err, d) => {
                expect(err).to.not.exist;
                entities = d;
                done();
            });
        });

        it("should find one post", function() {
            expect(entities.treenode).to.exist;
            expect(Object.keys(entities.treenode)).to.have.length(1);
        });

        it("should handle update", function(done) {
             // find entity
             // write tree
             // check hash
            done();
        });


        after(function(done) {
            done();
        });
    });


// test writing to db, lastCommitSynced, etc

    describe("db update", function() {
// test reading entity collection
        let dh;

        before(function(done) {
            dh = getDataHandler();

            dh.repo.connect((err) => {
                expect(err).to.not.exist;
                // run initial import
                // check expected lastCommitSynced
                done();
            });
        });

        // check state of item
        // call write snapshot, should be unchanged
        // apply known changes
        // write snapshot, tree should match known, check commit properties written

        after(function(done) {
            dh.removeFromDb();
            done();
        });
    });





    describe("entity collection", function() {
// new db setup, run merges of known branches
        let dh;

        before(function(done) {
            dh = getDataHandler();
            dh.connect((err) => {
                expect(err).to.not.exist;
                // run initial import
                // check expected lastCommitSynced
            });
        });

        // merge known changes, should fast forward

        // merge second set of changes, result should match manually merged branch


        after(function(done) {
            dh.removeFromDb();
            done();
        });
    });

});