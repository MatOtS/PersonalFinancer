import { randomBytes } from "node:crypto";

// A name nobody else uses, so tests that run at the same time on the same
// user do not collide. Short enough for the 50 characters a name allows.
export const uniqueName = (label: string) =>
  `${label} ${randomBytes(3).toString("hex")}`;
