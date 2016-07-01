
describe.skip("edit post", function() {
    before(function() {
        global.blogRepo.Root.posts[0].content = "# Test post 1\n\nEdited content...";
    });

    it("should produce expected tree", function() {
        var dbTree = global.blogRepo.tree(global.blogRepo.config.lastCommitSynced);
        var nodes = global.blogRepo.Root.commit(global.blogRepo, dbTree);
        expect(nodes).to.have.length(1);
        expect(nodes[0].type).to.equal("tree");
        expect(nodes[0].hash).to.equal(global.trees.editedpost);
    });

});