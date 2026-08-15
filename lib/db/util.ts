export function one<T>(rows: T[], message = "Not found"): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error(message);
  }
  return row;
}
