export function one<T>(
  rows: T[],
  message = "Not found",
  ErrorClass: new (message: string) => Error = Error,
): T {
  const row = rows[0];
  if (row === undefined) {
    throw new ErrorClass(message);
  }
  return row;
}
