

# Redesign do AppointmentModal

## Overview

The `AppointmentModal.tsx` still contains legacy hardcoded colors and duplicated form JSX. This plan cleans it up to match the design system, deduplicates the form, and enhances the dialog header.

## What Changes

### 1. Remove all hardcoded legacy colors

Replace across both form copies (which will become one after deduplication):

| Old Class | New Class |
|---|---|
| `bg-slate-900 border-slate-700` (DialogContent) | remove (use default DialogContent styling) |
| `text-white` (DialogTitle) | `text-foreground` |
| `text-slate-300` (all Labels) | `text-muted-foreground` |
| `bg-slate-800 border-slate-600 text-white` (all Inputs, Textareas, SelectTriggers, Comboboxes) | remove (use default component styling) |
| `border-slate-600 text-slate-300 hover:bg-slate-800` (Cancel button) | remove (use default `variant="outline"`) |

### 2. Deduplicate the form

Currently there are two identical form blocks (lines 169-273 and lines 290-394) -- one for the controlled modal (no trigger) and one for the trigger-based modal. Extract the form into a shared `formContent` variable used in both branches.

### 3. Enhance the Dialog header

Replace the plain `DialogTitle` with a styled header containing an icon box and subtitle:

```
[calendar icon]  Novo Agendamento
                 Preencha os dados do agendamento
```

Or when `initialDate` is provided:

```
[calendar icon]  Agendar para 20 de fevereiro
                 Preencha os dados do agendamento
```

### 4. Keep all logic untouched

No changes to:
- `handleSubmit`, `handleInputChange`
- `useSupabaseAppointments`, `useClients`, `usePolicies`, `useCompanyNames`
- `RecurrenceConfig`
- Form field structure (native date/time inputs kept as-is for reliability)
- `clientOptions`, `policyOptions` derivation logic

## Files Modified

- `src/components/appointments/AppointmentModal.tsx` -- single file change

## Technical Details

The deduplicated structure will look like:

```
const formContent = (
  <form onSubmit={handleSubmit} className="space-y-4">
    {/* All fields with cleaned classes */}
    {/* Buttons */}
  </form>
);

if (!triggerButton) {
  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>...</DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}

return (
  <Dialog open={modalOpen} onOpenChange={setModalOpen}>
    <DialogTrigger asChild>{triggerButton}</DialogTrigger>
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>...</DialogHeader>
      {formContent}
    </DialogContent>
  </Dialog>
);
```

This reduces ~200 lines of duplicated JSX to a single shared block, making future maintenance straightforward.
