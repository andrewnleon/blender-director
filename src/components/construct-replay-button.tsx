"use client";

type ConstructReplayButtonProps = {
  isPlaying: boolean;
  onReplay: () => void;
};

function PlayIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-3.5"
      fill="currentColor"
    >
      <path d="M5 3.4v9.2c0 .5.55.8.97.58l7.4-4.6a.66.66 0 0 0 0-1.16l-7.4-4.6A.66.66 0 0 0 5 3.4Z" />
    </svg>
  );
}

export function ConstructReplayButton({
  isPlaying,
  onReplay,
}: ConstructReplayButtonProps) {
  return (
    <button
      type="button"
      aria-label={isPlaying ? "Playing construction animation" : "Play"}
      aria-pressed={isPlaying}
      onClick={onReplay}
      className={`pointer-events-auto inline-flex size-9 items-center justify-center rounded-lg border backdrop-blur-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 ${
        isPlaying
          ? "border-amber-300/60 bg-amber-200/15 text-amber-100"
          : "border-white/10 bg-black/55 text-zinc-200 hover:border-white/20 hover:bg-black/65"
      }`}
    >
      <PlayIcon />
    </button>
  );
}
