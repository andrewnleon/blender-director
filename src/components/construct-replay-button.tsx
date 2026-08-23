"use client";

type ConstructReplayButtonProps = {
  isPlaying: boolean;
  onReplay: () => void;
};

export function ConstructReplayButton({
  isPlaying,
  onReplay,
}: ConstructReplayButtonProps) {
  return (
    <button
      type="button"
      aria-label="Animation"
      aria-pressed={isPlaying}
      onClick={onReplay}
      className="pointer-events-auto rounded-lg border border-white/10 bg-black/55 px-3 py-2 text-xs text-zinc-200 backdrop-blur-md transition hover:border-white/20 hover:bg-black/65"
    >
      Animation
    </button>
  );
}
