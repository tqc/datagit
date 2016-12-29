import "./01-init";
import "./02-initialsync";
import "./03-unchangedsave";
import "./04-editpost";

import {importTest} from "../testutils";


describe("blog initial sync", function() {
    before(function() {
        global.blogRepo.sync();
    });


let dh = new DataHandler(global.testRepo);

importTest(dh, validateImport, applyUpdate, expectedPostSaveTreeHash);

});