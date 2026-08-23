export const yardChromeBarClass =
  "pointer-events-auto flex items-center gap-0.5 rounded-lg border border-white/10 bg-black/70 p-0.5 shadow-lg backdrop-blur-md";

export const yardChromeCardClass =
  "pointer-events-auto rounded-lg border border-white/10 bg-black/70 shadow-lg backdrop-blur-md";

export const yardChromeIconButtonClass =
  "relative flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent text-zinc-300 transition hover:border-white/15 hover:bg-white/5 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 disabled:cursor-not-allowed disabled:opacity-40";

export const yardChromeIconButtonActiveClass =
  "border-amber-300/50 bg-amber-200/10 text-amber-100";

/** Small popover anchored to a toolbar icon — opens upward so it stays above the nav readout. */
export const yardChromePopoverClass =
  "pointer-events-auto absolute bottom-full right-0 z-30 mb-2 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/75 shadow-2xl backdrop-blur-xl";

/** Docked panel in the top-right column flow — sits below toolbar + nav, never covers them. */
export const yardChromeDockedPanelClass =
  "pointer-events-auto z-10 flex max-h-[min(24rem,calc(100dvh-10rem))] w-[min(calc(100vw-2rem),20rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-black/75 shadow-2xl backdrop-blur-xl";

/** @deprecated Use yardChromePopoverClass or yardChromeDockedPanelClass instead. */
export const yardChromePanelClass = yardChromeDockedPanelClass;
