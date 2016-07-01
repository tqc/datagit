
describe("blog unchanged save", function() {
    before(function() {
    });

    it("should produce original tree", function() {
        var dbTree = global.blogRepo.tree(global.blogRepo.config.lastCommitSynced);
        var nodes = global.blogRepo.Root.commit(global.blogRepo, dbTree);
        expect(nodes).to.have.length(1);
        expect(nodes[0].type).to.equal("tree");
        expect(nodes[0].hash).to.equal(global.trees.initial);
    });

});