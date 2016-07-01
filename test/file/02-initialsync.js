
describe("initial sync", function() {
    before(function() {
        global.testRepo.sync();
    });

    it("should sync db and repo commits", function() {
        var status = global.testRepo.status();
        expect(status.status).to.equal("Clean");
    });


    it("should load one root level file", function() {
        var files = global.testRepo.Root.files;
        expect(files).to.exist;
        expect(files).to.have.length(2);
    });

    it("should load two folders", function() {
        var folders = global.testRepo.Root.folders;
        expect(folders).to.exist;
        expect(folders).to.have.length(2);
    });

    it("should load one file in folder", function() {
        var folder = global.testRepo.Root.folders[1];
        expect(folder).to.exist;
        expect(folder.name).to.equal("folder");
        var files = folder.files;
        expect(files).to.exist;
        expect(files).to.have.length(1);
    });


});