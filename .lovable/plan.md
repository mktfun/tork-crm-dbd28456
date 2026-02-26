
# Fix Reports.tsx Build Error + Refactor PortalMobileStart.tsx

## Task 1: Fix Duplicate Imports in Reports.tsx

The file has two identical Carousel import blocks (lines 4-10 and lines 34-40). The second block was added when restoring the Carousel but the original import was never removed.

**Fix:** Remove the duplicate import block at lines 34-40.

**File:** `src/pages/Reports.tsx`

---

## Task 2: Refactor PortalMobileStart.tsx to List-Based UX

Replace the text input + search button with a preloaded list of brokerages that users can tap to select.

**Data Source:** Query `brokerages` table (since `organizations` table doesn't exist -- the existing `useOrganizations` hook already maps brokerages to organizations). Fetch `id, name, logo_url, slug` where `portal_enabled = true` using the Supabase anon key (public access may require an RPC or adjusting the query). Since the portal user is not authenticated at this point, we'll use the existing `get_brokerage_by_slug` RPC pattern or query brokerages directly if RLS allows anonymous access. Given RLS restricts brokerages to authenticated users, we'll need a different approach -- likely a new RPC function or querying via the existing public endpoint. For simplicity and security, we'll create a lightweight edge function or use an RPC that returns the public list.

**Revised approach:** Since we can't query `brokerages` directly without auth (RLS blocks it), we'll fetch all brokerages by attempting the query and falling back gracefully. Alternatively, we can create a simple database function `get_public_brokerages()` that returns only `id, name, logo_url, slug` for portal-enabled brokerages.

### Database Change

Create a new RPC function `get_public_brokerages` that returns a list of brokerages with `portal_enabled = true`, exposing only safe public fields (id, name, logo_url, slug). This runs with `SECURITY DEFINER` to bypass RLS.

### Component Rewrite

**File:** `src/pages/portal/PortalMobileStart.tsx`

- **State:** `searchQuery` (string for local filter), `brokerages` (array), `isLoading`, `error`
- **On mount:** Call `supabase.rpc('get_public_brokerages')` to fetch all active brokerages
- **Keep:** The `useEffect` that checks `localStorage` for saved slug and auto-redirects
- **Header:** Keep the Shield icon, "Portal do Cliente" title, update subtitle to "Selecione sua corretora para comecar"
- **Bottom Sheet:** Replace form with:
  - Search Input with `Search` icon (filters list locally by name)
  - `ScrollArea` with `max-h-[50vh]` containing brokerage cards
  - Each card: rounded logo (or `Building2` fallback), brokerage name, chevron right indicator
  - On tap: save slug to localStorage, navigate to `/{slug}/portal`
- **Styling:** `bg-card`, `hover:bg-muted/50`, `animate-in` transitions, `safe-area-pt`/`safe-area-pb` preserved

### Technical Details

| Aspect | Decision |
|--------|----------|
| Data fetch | New `get_public_brokerages` RPC (SECURITY DEFINER, returns public fields only) |
| Local filter | `useDebounce` hook with 200ms delay on search input |
| Image fallback | `onError` handler on `<img>` swaps to `Building2` icon |
| Loading state | `Loader2` spinner centered in the list area |
| Empty state | "Nenhuma corretora encontrada" message when filter yields 0 results |
| Scroll | Radix `ScrollArea` component already in project |

### Execution Order

1. Fix duplicate imports in Reports.tsx (instant)
2. Create `get_public_brokerages` SQL migration
3. Rewrite `PortalMobileStart.tsx`
