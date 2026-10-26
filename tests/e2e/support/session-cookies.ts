import { readFileSync } from "node:fs";
import { userAStatePath } from "./users";

// Fake session cookies to check that the server does not trust what the
// browser sends. They are built from the real session of userA that
// auth.setup.ts saved, so they have the shape the app expects.
//
// The local authentication service signs its tokens with a private key we do
// not have, so a correctly signed token that is already expired cannot be made.
// The "expired" cookie therefore has a past expiry AND an invalid signature and
// refresh token; what is checked is the outcome that matters: the server does
// not accept it and shows nothing protected.

type SavedSession = { access_token: string; refresh_token: string } & Record<
  string,
  unknown
>;

const encode = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
const decode = (value: string) =>
  JSON.parse(Buffer.from(value, "base64url").toString());

// Read when a test runs, not when the file loads: the saved session does not
// exist until auth.setup.ts has run.
function savedSessionCookie() {
  const state = JSON.parse(readFileSync(userAStatePath, "utf-8"));
  const cookie = state.cookies.find((c: { name: string }) =>
    /^sb-.+-auth-token$/.test(c.name),
  );
  if (!cookie) throw new Error("userA has no saved session cookie");
  const session: SavedSession = decode(cookie.value.replace("base64-", ""));
  return { name: cookie.name as string, session };
}

const asCookieHeader = (name: string, session: object) =>
  `${name}=base64-${encode(session)}`;

// A real session whose token was edited: the signature no longer matches.
export function tamperedSessionCookie() {
  const { name, session } = savedSessionCookie();
  const [header, payload] = session.access_token.split(".");
  return asCookieHeader(name, {
    ...session,
    access_token: `${header}.${payload}.${"A".repeat(86)}`,
  });
}

// A token that expired an hour ago, with a refresh token that does not exist.
export function expiredSessionCookie() {
  const { name, session } = savedSessionCookie();
  const [header, payload] = session.access_token.split(".");
  const hourAgo = Math.floor(Date.now() / 1000) - 3600;
  const expiredPayload = { ...decode(payload!), exp: hourAgo };
  return asCookieHeader(name, {
    ...session,
    access_token: `${header}.${encode(expiredPayload)}.${"A".repeat(86)}`,
    refresh_token: "revoked-refresh-token",
    expires_at: hourAgo,
  });
}
