/** Safe to import in production: no local filesystem or credential dependency. */
export class PreviewError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
