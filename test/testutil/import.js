// test basic import for a specific data handler setup.
// Repo is assumed to already exist and be synced.

export function importTest(dh, validateImport, applyUpdate, expectedPostSaveTreeHash) {

    describe("importTest", function() {


        let namedHashes = {
            validCommit: "master",
            validTree: "master:"
        };

        before(function(done) {
            dh.repo.connect(done);
        });

        describe("import", function() {
            before((done) => {
                dh.readEntitiesFromTree(namedHashes.validCommit,
               function(err, entities) {
                   done(err);
               });
            });
            it("should validate", function() {
                validateImport();
            });
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
}

