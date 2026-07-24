/** Obscure frontend portal paths (not API). Clients keep /cabinet. */
export const PORTAL_ADMIN = '/x7Km2pQ9vR4nW8hL'
export const PORTAL_STAFF = '/b3Fh6tY1cJ9sD5uA'

export function isPortalPath(pathname: string) {
  return (
    pathname === PORTAL_ADMIN ||
    pathname.startsWith(`${PORTAL_ADMIN}/`) ||
    pathname === PORTAL_STAFF ||
    pathname.startsWith(`${PORTAL_STAFF}/`)
  )
}
