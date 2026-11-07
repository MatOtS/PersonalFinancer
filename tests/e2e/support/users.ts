// The three fake users created by supabase/seed.sql in the local database.
// These credentials are fake and only work against the local stack.
export const userA = { email: "a@example.test", password: "test-password-a" };
export const userB = { email: "b@example.test", password: "test-password-b" };
// Nobody uses C except the "new user" tests, which run in series. The local
// database is reset at the start of every `npm run test:e2e`, so C is new then.
export const userC = { email: "c@example.test", password: "test-password-c" };

// Where the signed-in state of userA is saved by auth.setup.ts. It holds the
// session cookies, so the folder is git-ignored.
export const userAStatePath = "tests/e2e/.auth/userA.json";
