// babel doesn't seem to handle this syntax
// import "./test1";

require("./test1");

before(function(done) {
    console.log("set up test run");
    done();
});

after(function(done) {
    console.log("end test run");
    done();
});