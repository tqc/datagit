import async from "async";

/**
 * @class GitRepo
 * Base class to handle low level / standard git operations
 **/
class GitRepo {
     /**
     * @param options
     * @param options.id unique id for the repo
     * @param options.user user id
     * @param options.remoteUrl ssh clone url for the remote
     * @param options.userSettings settings copied from the user record
     * @param options.userSettings.name display name used for commits
     * @param options.userSettings.email email used for commits
     * @param options.userSettings.privateKey optional private key if needed for ssh fetch/push
      **/
    constructor(options) {
        this.options = options;
    }
    /**
     * Must be called before any other functions. Ensures that the local git repo exists and is ready for other commands.
     **/
    connect(callback, progress) {
        callback("Not Implemented");
    }
    /**
     * fetch all remote refs
     **/
    fetch(callback, progress) {
        callback("Not Implemented");
    }
    /**
     * get a full tree structure for the given commit
     **/
    readTree(commit, callback, progress) {
        callback("Not Implemented");
    }
    /**
     * read a blob and return it as a string
     **/
    readString(hash, callback, progress) {
        callback("Not Implemented");
    }
    /**
     * read a blob and return it as a Buffer
     **/
    readImage(hash, callback, progress) {
        callback("Not Implemented");
    }
    /**
     * @param localRef,
     * @param remoteRef,
     * @param callback {function} called with (err, concestorRef, localRef, remoteRef);
     **/
    getCommitsForMerge(localRef, remoteRef, callback, progress) {
        callback("Not Implemented");
    }
    /**
     * Write a string as a blob and return the hash
     * @param fileContents {string}
     **/
    writeTextFile(fileContents, callback, progress) {
        callback("Not Implemented");
    }
    /**
     * Given an array of tree nodes, write a tree to git
     * and return the hash.
     * @param treeNodes {array}
     **/
    writeTree(treeNodes, callback, progress) {
        callback("Not Implemented");
    }
    /**
     * Create a commit for a given tree ref
     * @param treeRef
     * @param parentCommits array of parent commit hashes
     * @param message
     * @param done {function}
     * @param progress {function}
     **/
    writeCommit(treeRef, parentCommits, message, callback, progress) {
        callback("Not Implemented");
    }
    /**
     * Push to remote.
     **/
    push(branchname, ref, callback, progress) {
        callback("Not Implemented");
    }
    /**
     * Get the object hash at a given path. Mostly used for testing
     * @param refPath see git rev-parse. "master" for commit. "master:" for root tree, "master:README.md" for blob.
     **/
    getPathHash(refPath, callback) {
        callback("Not Implemented");
    }
    /**
     * get multiple named references - for convenient use in tests
     **/
    updateNamedHashes(namedHashes, done) {
        async.each(Object.keys(namedHashes),
            (k, next) => {
                this.getPathHash(namedHashes[k],
                (err, hash) => {
                    namedHashes[k] = hash;
                    next(err);
                });
           },
           (err) => {
               done(err, namedHashes);
           }
       );
    }
}

export default GitRepo;