export class ReadOnlyStoreError extends Error {
  constructor(message = "Storage is currently read-only in this environment.") {
    super(message);
    this.name = "ReadOnlyStoreError";
  }
}
