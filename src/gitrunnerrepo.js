// Handles low level / standard git operations
import fs from "fs-extra";
import path from "path";
import BaseRepo from "./baserepo";
import {Async as git} from "gitrunner";

/**
 * @class GitRunnerRepo
 * @extends GitRepo
 **/
class GitRunnerRepo extends BaseRepo {
/**
 * @param options see GitRepo
 * @param gitPathTemplate template for the path eg /basepath/:userId/:repoId
 **/
    constructor(options, gitRootTemplate) {
        super(options);
        this.repoPath = gitRootTemplate
            .replace(/:userId/, options.user)
            .replace(/:repoId/, options.id);
    }
    ensureLocalRepo(callback, progress) {
        var repo = this;
        var repoPath = this.repoPath;
        if (!repoPath) return callback("Git path not set");

        var userPath = path.resolve(repoPath, "..");

        if (!fs.existsSync(userPath)) fs.mkdirsSync(userPath);

        var user = repo.options.userSettings;

        // todo: should fail if key missing, but using system key is appropriate for test
        var keyPath = path.resolve(userPath, "id_rsa");
        let kp = repo.options.userSettings.privateKey ? " -i " + keyPath : "";
        if (repo.options.userSettings.privateKey && !fs.existsSync(keyPath)) {
            fs.writeFileSync(keyPath, user.privateKey, { encoding: "utf-8", mode: 0o600 });
        }

        this.spawnOptions = {
            cwd: repoPath,
            env: {
                GIT_AUTHOR_NAME: user.name,
                GIT_AUTHOR_EMAIL: user.email,
                GIT_COMMITTER_NAME: user.name,
                GIT_COMMITTER_EMAIL: user.email,
                // avoid prompt for host key
                // use user specific client key
                // ignore any system config file
                GIT_SSH_COMMAND: "ssh -o StrictHostKeyChecking=no" + kp + " -F /dev/null"
            }
        };

        // todo: this isn't valid if git init failed - need to properly test for valid repo
        if (fs.existsSync(repoPath)) return callback();
        fs.mkdirsSync(repoPath);
        git.run(repo.spawnOptions,
            [{
                params: (options) => ['init', '--bare']
            },
            {
                params: (options) => ['remote', 'add', 'origin', repo.options.remoteUrl]
            }],
            {},
            callback);

    }
    connect(callback, progress) {
        console.log("Attempt setup of git repo");

        this.ensureLocalRepo(function(err) {
            if (err) return callback(err);

            var result = {
                message: "Connecting",
                remoteCommit: "1234",
                localCommit: "2345",
                remoteChanges: 1,
                localChanges: 2,
                uncommittedLocalChanges: true
            };


            callback(null, result, true);
        });
    }
    fetch(callback, progress) {
        var repo = this;
        console.log("Attempt fetch of git repo");
        var result = {
            message: "Fetching",
            remoteCommit: "1234",
            localCommit: "2345",
            remoteChanges: 1,
            localChanges: 2,
            uncommittedLocalChanges: true
        };

        callback(null, result, false);
        git.run(repo.spawnOptions, [{
            params: (options) => ['fetch', 'origin']
        },
        {
            params: (options) => ['rev-parse', 'origin/master'],
            process: function(res, code, output) {
                if (code === 0) {
                    res.branch = output.substr(0, output.indexOf("\n"));
                } else {
                    // new repo with no branches defined yet
                }
                return result;
            }
        }], {}, function(err, res) {
            if (err) return callback(err);
            result.message = "Fetched";
            result.remoteCommit = res.branch;
            callback(null, result, true);
        });
    }
    readTree(commit, callback, progress) {
        var repo = this;
        git.tree(repo.spawnOptions, commit, function(err, tree) {
            console.log(commit);
            console.log(err);
            console.log(tree);
            callback(err, tree);
        });
    }
    readString(hash, callback, progress) {
        var repo = this;
        git.show(repo.spawnOptions, hash, callback);
    }
    readImage(hash, callback, progress) {
        var repo = this;
        git.show({
            ...repo.spawnOptions,
            encoding: "binary",
            maxBuffer: 5000 * 1024
        }, hash, callback);
    }
    getCommitsForMerge(localRef, remoteRef, callback, progress) {
        var repo = this;
        // not used directly to read tree, only for finding concestor
        var a = localRef;
        var b = remoteRef;
        var o;
        if (!a || !b) return callback(null, o, a, b);
        else if (a == b) return callback(null, a, a, b);

        git.run(
            repo.spawnOptions,
            [{
                params: (options, result) => ['merge-base', a, b],
                process: function(result, code, output) {
                    result.baseRef = output.substr(0, output.indexOf("\n"));
                }
            }],
            {},
            function(err, res) {
                if (err) return callback(err);
                callback(null, res.baseRef, a, b);
            }
        );
    }
    writeTextFile(s, callback, progress) {
        var repo = this;
        git.run(
            repo.spawnOptions,
            [{
                params: (options, result) => ["hash-object", "-w", "--stdin"],
                provideInput: function(stdin) {
                    stdin.setEncoding("utf-8");
                    stdin.write(s);
                    stdin.end();
                },
                process: function(result, code, output) {
                    if (code != 0) {
                        console.log(output);
                        throw new Error("Unexpected exit code " + code);
                    }
                    result.fileRef = output.substr(0, output.indexOf("\n"));
                }
            }],
            {},
            function(err, res) {
                if (err) return callback(err);
                callback(null, res.fileRef);
            }
        );

    }
    writeTree(treeNodes, callback, progress) {
        var sortedNodes = treeNodes.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
        console.log(sortedNodes);
        var repo = this;
        git.run(
            repo.spawnOptions,
            [{
                params: (options, result) => ['mktree'],
                provideInput: function(stdin) {
                    stdin.setEncoding("utf-8");
                    for (var i = 0; i < sortedNodes.length; i++) {
                        var n = sortedNodes[i];
                        stdin.write(n.permissions + " " + n.type + " " + n.hash + "\t" + n.name + "\n");
                    }
                    stdin.end();
                },
                process: function(result, code, output) {
                    if (code != 0) {
                        console.log(output);
                        throw new Error("Unexpected exit code " + code);
                    }
                    result.treeRef = output.substr(0, output.indexOf("\n"));
                }
            }],
            {},
            function(err, res) {
                if (err) return callback(err);
                callback(null, res.treeRef);
            }
        );

    }
    writeCommit(treeRef, parentCommits, message, callback, progress) {
        var repo = this;

        var params = ["commit-tree", treeRef];
        for (var i = 0; i < parentCommits.length; i++) {
            params = params.concat(["-p", parentCommits[i].substr(parentCommits[i].indexOf(":") + 1)]);
        }
        git.run(
            repo.spawnOptions,
            [{
                params: (options, result) => params,
                provideInput: function(stdin) {
                    stdin.setEncoding("utf-8");
                    stdin.write(message);
                    stdin.end();
                },
                process: function(result, code, output) {
                    if (code != 0) {
                        console.log(output);
                        throw new Error("Unexpected exit code " + code);
                    }
                    result.commitRef = output.substr(0, output.indexOf("\n"));
                }
            }],
            {},
            function(err, res) {
                if (err) return callback(err);
                callback(null, res.commitRef);
            }
        );

    }
    push(callback, progress) {
        // todo: check that branches to be pushed are valid
        // todo: handle rejected push
        var repo = this;

        var result = {
            message: "Pushing",
            remoteCommit: repo.options.remoteCommit,
            lastCommitSynced: repo.lastCommitSynced,
            remoteChanges: 1,
            localChanges: 2,
            uncommittedLocalChanges: true
        };

        callback(null, result, false);

        var params = ["push", "origin", repo.options.lastCommitSynced + ":" + repo.options.branch];
        git.run(
            repo.spawnOptions,
            [{
                params: (options, result) => params
            }],
            {},
            function(err, res) {
                if (err) return callback(err);
                result.message = "Pushed";
                result.remoteCommit = repo.options.lastCommitSynced;
                callback(null, result, true);
            }
        );
    }
    // used for testing
    getPathHash(refPath, callback) {
        var repo = this;
        git.revParse(repo.spawnOptions, refPath, function(err, hash) {
            console.log(refPath);
            console.log(err);
            console.log(hash);
            callback(err, hash);
        });
    }
}

export default GitRunnerRepo;
