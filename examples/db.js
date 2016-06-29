export function open(options, callback) {
    var data = {
        Stores: {},
        Files: {},
        Folders: {}
    };

    var db = {
        Stores: {
            get(x) { return data.Stores[x]; },
            set(x, o) { data.Stores[x] = o; }
        },
        Files: {
            get(x) { return data.Files[x]; },
            set(x, o) { data.Files[x] = o; },
            list() { return []; }
        },
        Folders: {}
    };
    callback(null, db);
}

export function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random() * 16) % 16 | 0; // eslint-disable-line no-bitwise
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16); // eslint-disable-line no-bitwise
    });
    return uuid;
}