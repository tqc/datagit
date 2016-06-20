
describe("init", function() {
    it("should have a new repository", function() {
        expect(global.testRepo).to.exist;
        var status = global.testRepo.status();
        expect(status.status).to.equal("Uninitialized");
    });

    it("ensureExists should clone the test repo", function() {
        global.testRepo.ensureExists();
        var status = global.testRepo.status();
        expect(status.repoCommit).to.equal("5f67a055d759fed862546e379794958b5ef65a2d");
        expect(status.status).to.equal("Unsynced");
    });

});