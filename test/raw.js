import cuid from "cuid";
import {TreeNode} from "../src";
import {importTest} from "./testutils";


describe("raw data handler", function() {
    var testRepo;

    function getDataHandler() {
        let testRepo = new GitRunnerRepo({...global.testRepoConfig, id:cuid()}, global.testRepoPath);
        // todo: add repo to db
        
        let dh = new DataHandler(testRepo, db, [TreeNode]);
        return dh;
    };

    let namedHashes = {
        validCommit: "master:",
        validTree: "master:/",
    };
    let sharedDataHandler = getDataHandler();
    before(function(done) {            
        sharedDataHandler.connect((err)=> {
            sharedDataHandler.repo.updateNamedHashes(namedHashes, done);
        });
    });

    describe("entity collection", function() {
    // test reading entity collection
        let entities = {};
        before(function(done) {            
                 sharedDataHandler.readFullEntitiesFromCommit(namedHashes.baseCommit, (err, d)=> {
                expect(err).should.not.exist;
                entities = d;
                done();
            });
        });

	     it("should find one post", function() {});
	 
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
    let dh = getDataHandler();

        before(function(done) {            
            dh.repo.connect((err)=> {
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
    let dh = getDataHandler();

        before(function(done) {            
            dh.connect((err)=> {
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



    // set up known hashes
    
    before(function(done) {
        testRepo = new GitRunnerRepo({...global.testRepoConfig, id:cuid()}, global.testRepoPath);
       testRepo.getPathHash("master", "/", function(err, hash) {
           expectedPostSaveTreeHash = hash;
           done(err);
       }
    });

	 importTest(dh, function(entities) {
	 });


    importTest(dh, validateImport, applyUpdate, () => expectedPostSaveTreeHash);

});