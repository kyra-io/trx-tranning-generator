"use client";

import { useState } from "react";

type ExerciseImage = {
  id: string;
  url: string;
};

function ImagePlaceholder() {
  return (
    <div className="flex size-full items-center justify-center bg-zinc-100 text-zinc-400">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="size-10"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 17.5 8.5 13l3 3 2-2 6.5 6M7.5 9.5h.01M5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4Z"
        />
      </svg>
    </div>
  );
}

export function ExerciseMediaGallery({
  images,
  exerciseName,
}: {
  images: ExerciseImage[];
  exerciseName: string;
}) {
  const [selectedImageId, setSelectedImageId] = useState(images[0]?.id ?? null);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());
  const selectedImage =
    images.find((image) => image.id === selectedImageId) ?? images[0];
  const hasSelectedImageFailed = selectedImage
    ? failedImageIds.has(selectedImage.id)
    : false;

  function markImageAsFailed(id: string) {
    setFailedImageIds((current) => new Set(current).add(id));
  }

  return (
    <section className="mt-7 min-w-0" aria-label="Exercise media">
      <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
        {selectedImage && !hasSelectedImageFailed ? (
          // Image sources are persisted dynamically and have no configured host contract.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selectedImage.url}
            alt={exerciseName}
            onError={() => markImageAsFailed(selectedImage.id)}
            className="size-full object-cover"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>

      {images.length > 1 ? (
        <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="Choose exercise image">
          {images.map((image, index) => {
            const isSelected = image.id === selectedImage?.id;
            const hasFailed = failedImageIds.has(image.id);

            return (
              <button
                key={image.id}
                type="button"
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedImageId(image.id)}
                className={`size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${
                  isSelected ? "border-emerald-700" : "border-transparent"
                }`}
              >
                {hasFailed ? (
                  <ImagePlaceholder />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.url}
                    alt=""
                    onError={() => markImageAsFailed(image.id)}
                    className="size-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
