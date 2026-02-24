

# Fix: Portal Login "Cliente nao encontrado" on Mobile

## Problem
On mobile devices, the portal login fails with "Cliente nao encontrado para esta corretora" even though the same credentials work on PC. 

## Root Cause
Mobile browsers and keyboards often auto-capitalize the first letter of text in the URL bar. The slug in the URL (e.g., `jjamorim-11`) may become `Jjamorim-11` on mobile.

The `identify_portal_client` database function compares the slug with **exact case matching**:
```sql
WHERE b.slug = p_brokerage_slug  -- case-sensitive!
```

The `PortalLogin.tsx` code passes the slug directly from the URL without normalizing it:
```typescript
p_brokerage_slug: brokerageSlug  // no .toLowerCase()
```

If the slug arrives as `Jjamorim-11` but is stored as `jjamorim-11`, the query finds no brokerage, returns no user_id, and therefore returns zero clients.

## Fix (2 changes, 1 file)

### File: `src/pages/portal/PortalLogin.tsx`

1. **Line 77** — Normalize slug in `get_brokerage_by_slug` call:
   - Change `p_slug: brokerageSlug` to `p_slug: brokerageSlug.toLowerCase()`

2. **Line 135** — Normalize slug in `identify_portal_client` call:
   - Change `p_brokerage_slug: brokerageSlug` to `p_brokerage_slug: brokerageSlug.toLowerCase()`

These two one-line changes ensure the slug is always lowercase before hitting the database, regardless of what the mobile browser does to the URL.

## Why This Only Affects Mobile
- On PC, users typically click a link or type in lowercase — the slug stays `jjamorim-11`
- On mobile, the keyboard auto-capitalizes the first character → `Jjamorim-11`
- The database stores slugs in lowercase, so the case-sensitive comparison fails only on mobile

## No Other Files Affected
- `usePortalContext.ts` already uses `.toLowerCase()` (line 60) — no change needed
- No database changes required
- No logic changes — just adding `.toLowerCase()` to two RPC parameter values

