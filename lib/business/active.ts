import { cache } from "react";
import { listMemberBusinesses } from "./queries";

// React's cache() dedupes this within a single request/render tree, so the
// layout and a page can both call it without doubling the query.
export const getActiveBusiness = cache(async (userId: string) => {
  const businesses = await listMemberBusinesses(userId);
  return businesses[0] ?? null;
});
