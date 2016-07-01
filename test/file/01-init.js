
describe("init", function() {
    it("should have a new repository", function() {
        expect(global.testRepo).to.exist;
        var status = global.testRepo.status();
        expect(status.status).to.equal("Uninitialized");
    });

    it("ensureExists should clone the test repo", function() {
        global.testRepo.ensureExists();
        var status = global.testRepo.status();
        expect(status.repoCommit).to.equal(global.commits.initial);
        expect(status.status).to.equal("Unsynced");
    });

    it("should get the expected tree", function() {
        var tree = global.testRepo.tree(global.commits.initial);
        expect(Object.keys(tree.contents)).to.have.length(4);
        expect(Object.keys(tree.contents["folder"].contents)).to.have.length(1);
    });

});