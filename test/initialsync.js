
describe("initial sync", function() {
    before(function() {
        global.testRepo.sync();
    });

    it("should sync db and repo commits", function() {
        var status = global.testRepo.status();
        expect(status.status).to.equal("Clean");
    });

    it("should populate the database", function() {
        var files = global.testRepo.db.Files.list();
        expect(files).to.exist;
        expect(files).to.have.length(3);
    });


});