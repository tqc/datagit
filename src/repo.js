export class Repo {
    constructor(options) {
        this.path = options.path;
        this.db = options.db;
        this.git = options.git;
    }
}