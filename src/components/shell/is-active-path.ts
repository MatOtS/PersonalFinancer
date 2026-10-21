// A sidebar item is active on its own page and on pages inside its section.
// Home ("/") is only active on "/", otherwise it would match every page.
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
