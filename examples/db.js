


exports.open = function(options, callback) {
    // always mocked in this example, so no need to import the real thing
    var Mongo = exports.Mongo = global.Mongo; // ||  require('mongodb');
    exports.ObjectID = Mongo.ObjectID;
    var dbopts = {
        server: {
            "auto_reconnect": true,
            poolSize: 10
        }
    };
    var url = process.env.MONGODB_URL || "mongodb://localhost:27017/mocked";

    Mongo.MongoClient.connect(url, dbopts, function(err, db) {
        if (err) throw err;
        db.ObjectID = Mongo.ObjectID;
        exports.db = db;
        exports.Users = db.collection("Users");
        exports.Repos = db.collection("Repos");
        exports.Posts = db.collection("Posts");
        exports.TreeNodes = db.collection("TreeNodes");
        callback(null, db);
    });
};


exports.generateUUID = function() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random() * 16) % 16 | 0; // eslint-disable-line no-bitwise
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16); // eslint-disable-line no-bitwise
    });
    return uuid;
};