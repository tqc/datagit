
describe("file unchanged save", function() {
    before(function() {
    });

    it("should produce original tree", function() {
        var dbTree = global.testRepo.tree(global.testRepo.config.lastCommitSynced);
        var nodes = global.testRepo.Root.commit(global.testRepo, dbTree);
        expect(nodes).to.have.length(1);
        expect(nodes[0].type).to.equal("tree");
        expect(nodes[0].hash).to.equal(global.trees.initial);
    });

});