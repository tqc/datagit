
describe("blog initial sync", function() {
    before(function() {
        global.blogRepo.sync();
    });

    it("should sync db and repo commits", function() {
        var status = global.blogRepo.status();
        expect(status.status).to.equal("Clean");
    });


    it("should load one post", function() {
        var posts = global.blogRepo.Root.posts;
        expect(posts).to.exist;
        expect(posts).to.have.length(1);
    });

    it("should load post content", function() {
        var post = global.blogRepo.Root.posts[0];
        expect(post).to.exist;
        expect(post.content.trim()).to.equal("# Test post 1");
    });

    it("should load config", function() {
        var blog = global.blogRepo.Root;
        expect(blog).to.exist;
        expect(blog.title).to.equal("Test blog");
    });

    it.skip("should not write new commit", function() {
    });


});