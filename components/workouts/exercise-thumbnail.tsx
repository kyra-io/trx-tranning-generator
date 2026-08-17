"use client";

import { useState } from "react";

export function ExerciseThumbnail({
  imageUrl,
  exerciseName,
}: {
  imageUrl: string | null;
  exerciseName: string;
}) {
  const [hasImageError, setHasImageError] = useState(false);

  return (
    <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 text-zinc-400">
      {imageUrl && !hasImageError ? (
        // Sources are stored dynamically and are not restricted to configured image hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={exerciseName}
          onError={() => setHasImageError(true)}
          className="size-full object-cover"
        />
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="size-7"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 17.5 8.5 13l3 3 2-2 6.5 6M7.5 9.5h.01M5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4Z"
          />
        </svg>
      )}
    </div>
  );
}
