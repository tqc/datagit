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


function progressCallback(logArray) {
    return function(progress) {
        logArray.push(progress);
    };
}


// test lower level git functions for a repo implementation
// assumes an existing synced git repo
export function repoTest(getRepo) {
    describe("low level repo operations", function() {
        var repo;
        let namedHashes = {
            validCommit: "master",
            validTree: "master:",
            invalidHash: "notarealhash",
            textFile: "master:folder/file.md",
            binaryFile: "master:folder/file.md",
            modifiedCommit: "modified",
            unrelatedCommit: "samples",
            simpleFolder: "master:folder",
            fileInFolder: "master:folder/file.md"
        };

        before(function(done) {
            repo = getRepo();
            repo.connect((err) => {
                expect(err).to.not.exist;
                repo.updateNamedHashes(namedHashes, done);
            });
        });

        describe("get path hash", function() {

            it("should get hash", function(done) {
                repo.getPathHash("initial:", function(err, hash) {
                    expect(err).to.not.exist;
                    expect(hash).to.equal("358590579df64fded36d7e81e11e7adb6d6b4616");
                    done();
                });
            });

        });



        describe("read tree", function() {

            it("should read valid tree", function(done) {
                let log = [];
                repo.readTree(namedHashes.validCommit, function(err, tree) {
                    expect(err).to.not.exist;
                // todo: check values
                    done();
                }, progressCallback(log));
            });

        });


        describe("read string", function() {

            it("should read valid file", function(done) {
                repo.readString(namedHashes.textFile, function(err, contents) {
                    expect(err).to.not.exist;
                    // todo: check values
                    done();
                });
            });

            it("should not read invalid file", function(done) {
                repo.readString(namedHashes.invalidHash, function(err, contents) {
                    expect(err).to.exist;
                    // todo: check values
                    done();
                });
            });

        });


        describe("read image", function() {

            it("should read valid file", function(done) {
                repo.readImage(namedHashes.binaryFile, function(err, contents) {
                    expect(err).to.not.exist;
                // todo: check values
                    done();
                });
            });

            it("should not read invalid file", function(done) {
                repo.readImage(namedHashes.invalidHash, function(err, contents) {
                    expect(err).to.exist;
                    // todo: check values
                    done();
                });
            });

        });


        describe("get commits for merge", function() {

            it("should handle remote update", function(done) {
                repo.getCommitsForMerge(namedHashes.validCommit, namedHashes.modifiedCommit, function(err, a, b, c) {
                    expect(err).to.not.exist;
                    expect(a).to.equal(namedHashes.validCommit);
                    expect(b).to.equal(namedHashes.validCommit);
                    expect(c).to.equal(namedHashes.modifiedCommit);
                    done();
                });
            });

        });


        describe("write text file", function() {

            it("should write file", function(done) {
                repo.writeTextFile("# Test file\n\nThis is a file in a folder.", function(err, hash) {
                    expect(err).to.not.exist;
                    expect(hash).to.equal(namedHashes.textFile);
                    done();
                });
            });

        });


        describe("write tree", function() {

            it("should write simple tree", function(done) {
                let treeNodes = [
                    {
                        type: "blob",
                        permissions: "100644",
                        name: "file.md",
                        hash: namedHashes.fileInFolder
                    }
                ];
                repo.writeTree(treeNodes, function(err, hash) {
                    expect(err).to.not.exist;
                    expect(hash).to.equal(namedHashes.simpleFolder);
                    done();
                });
            });

        });

        describe("write commit", function() {

            it("should not fail", function(done) {
                repo.writeCommit(namedHashes.validTree, [namedHashes.validCommit], "Test Commit", function(err, hash) {
                    expect(err).to.not.exist;
                    // todo: check values. tricky when date prevents
                    // hash being predictable.
                    done();
                });
            });

        });

    });
}

// test lower level git functions for a repo implementation
// integration tests that test fetch/push functionality
export function remoteRepoTest(getRepo) {
    describe("repo remote ops integration test", function() {
        var repo;
        before(function() {
            repo = getRepo();
            // run connect
        });

        // run fetch, call getPathHash
        it("should get repo", () => {
            expect(repo).to.exist;
        });
        // write test commit, push to remote with id branch
        // check that it shows up in fetch refs
        // delete remote test branch

        after(function() {
            // delete local folder
        });
    });
}

