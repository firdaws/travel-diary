// Shared Tailwind class strings so buttons and fields look the same everywhere.
export const field =
  "w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

export const btnPrimary =
  "cursor-pointer rounded bg-black px-3 py-2 text-white transition hover:bg-zinc-700 active:scale-[0.98] active:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:bg-white dark:text-black dark:hover:bg-zinc-300 dark:active:bg-zinc-400";

export const btnGhost =
  "cursor-pointer rounded border border-zinc-300 px-3 py-2 transition hover:bg-zinc-100 active:scale-[0.98] active:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:active:bg-zinc-700";

export const btnSmall = btnGhost.replace("px-3 py-2", "px-2 py-1 text-sm");
