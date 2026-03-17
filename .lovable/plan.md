

# Fix: Full-height layout for DealDetailsModal Sheet

## Analysis

The current code is structurally close but has two issues:

1. **`TabsContent` for "details"** (line 319) uses `flex-1 overflow-auto` but lacks `data-[state=active]:flex data-[state=active]:flex-col` — Radix `TabsContent` renders as a block element, so `flex-1` alone may not stretch correctly inside the flex parent.

2. **Radix `TabsContent` default behavior** — inactive tabs are still in the DOM. Without explicit `data-[state=inactive]:hidden`, they can interfere with flex sizing.

## Changes

**Single file: `src/components/crm/DealDetailsModal.tsx`**

### Line 319 — Details TabsContent
Change:
```
className="flex-1 overflow-auto px-6 pb-6 mt-0"
```
To:
```
className="flex-1 overflow-auto px-6 pb-6 mt-0 data-[state=active]:flex data-[state=active]:flex-col"
```
This ensures the details tab stretches vertically when active.

### Line 521 — History TabsContent  
Already has `flex-1 flex flex-col min-h-0` which is correct, but add the same `data-[state=active]` guard:
```
className="flex-1 flex flex-col min-h-0 px-6 pb-6 mt-0 data-[state=active]:flex"
```

### Also update the base `TabsContent` component (`src/components/ui/tabs.tsx` line 39)
Add `data-[state=inactive]:hidden` to prevent inactive tabs from affecting flex layout:
```
className="mt-2 ring-offset-background focus-visible:outline-none ... data-[state=inactive]:hidden"
```

These three surgical class changes will make the content fill 100% of the Sheet height with scroll only inside the active tab content area.

