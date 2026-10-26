// The session cookie is only ever read by the server: the app signs in and out
// through server actions and does not use Supabase's browser client. So it is
// HttpOnly, and a script injected into the page cannot read it. If a browser
// client is ever added, it needs a readable cookie and this must be revisited.
export const sessionCookieOptions = { httpOnly: true };
