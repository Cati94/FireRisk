export class SimulationSnapshotStore {
  constructor({ limit = 25 } = {}) {
    this.limit = limit;
    this.snapshots = [];
  }

  add(snapshot) {
    this.snapshots.unshift(snapshot);
    this.snapshots = this.snapshots.slice(0, this.limit);
    return snapshot;
  }

  list() {
    return [...this.snapshots];
  }

  latest() {
    return this.snapshots[0];
  }
}
