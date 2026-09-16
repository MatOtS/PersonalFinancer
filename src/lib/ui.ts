/**
 * The shared vocabulary of the interface.
 *
 * Before this existed the same input class string was pasted in 33 places, so
 * a change to a field meant 33 edits and they had already drifted apart. These
 * are plain strings rather than components on purpose: the elements stay native
 * `<input>`/`<select>`, which is what the server-action forms rely on.
 */

/** Text inputs, selects and textareas. */
export const field =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-50";

/** The same, for a field that sits inside a dense row. */
export const fieldCompact =
  "w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25";

/**
 * The small capitalised label that sits above a number or a field. Reading a
 * dashboard is scanning, and a quiet label over a loud figure scans faster than
 * two lines of the same size.
 */
export const microLabel =
  "font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-[0.08em]";

/** Label wrapping a form control. */
export const fieldLabel = "flex flex-col gap-1.5 font-medium text-sm";

/** A bordered surface: the app's one container shape. */
export const panel = "rounded-lg border border-border bg-card";

/** Section inside a settings-style page. */
export const section = "space-y-4 rounded-lg border border-border bg-card p-5";

/** Column heading inside a table. */
export const tableHead =
  "font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-[0.08em]";
