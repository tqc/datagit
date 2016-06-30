
describe("init", function() {
    it("should have a new repository", function() {
        expect(global.testRepo).to.exist;
        var status = global.testRepo.status();
        expect(status.status).to.equal("Uninitialized");
    });

    it("ensureExists should clone the test repo", function() {
        global.testRepo.ensureExists();
        var status = global.testRepo.status();
        expect(status.repoCommit).to.equal("7cd4197623b4154d7ac1c37012b3a048f8fc5256");
        expect(status.status).to.equal("Unsynced");
    });

    it("should get the expected tree", function() {
        var tree = global.testRepo.tree("7cd4197623b4154d7ac1c37012b3a048f8fc5256");
        expect(Object.keys(tree.contents)).to.have.length(4);
        expect(Object.keys(tree.contents["folder"].contents)).to.have.length(1);
    });

});