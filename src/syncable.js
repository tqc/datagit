// an object which can be synced with git
export class Syncable {
    merge(concestor, local, remote) {
        // given three tree nodes, merge into the db.
        // for initial load, concestor and local may be null
        throw new Error("Merge not implemented");
    }
}