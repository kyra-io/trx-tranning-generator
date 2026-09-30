"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { useLocale, useTranslations } from "@/lib/i18n/translations-provider";
import type { TranslationSchema } from "@/lib/i18n/translations/en";
import { getProfileWorkoutCreationPath } from "@/lib/profiles/profile-routes";

type ErrorKey = keyof TranslationSchema["errors"];

const serverValidationErrorKeys: Record<string, ErrorKey> = {
  "Profile name is required": "profile_name_invalid",
  "Profile name must be at most 100 characters": "profile_name_invalid",
  "Expected a string": "profile_name_invalid",
  "Expected a JSON object": "profile_name_invalid",
};

export function CreateProfileForm() {
  const router = useRouter();
  const language = useLocale();
  const t = useTranslations();
  const submissionInFlight = useRef(false);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function messageForErrorKey(key: ErrorKey) {
    return t.messages.errors[key];
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInFlight.current) return;

    submissionInFlight.current = true;
    setIsCreating(true);
    setError(null);
    let isNavigating = false;

    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = await response.json().catch(() => null) as {
        id?: unknown;
        error?: unknown;
        details?: Array<{ message?: unknown }>;
      } | null;

      if (!response.ok) {
        if (response.status === 409) {
          setError(messageForErrorKey("profile_name_conflict"));
        } else if (response.status === 400) {
          const message = result?.details?.find(
            (detail) => typeof detail.message === "string",
          )?.message;
          const errorKey =
            typeof message === "string"
              ? serverValidationErrorKeys[message] ?? "profile_name_invalid"
              : "profile_name_invalid";
          setError(messageForErrorKey(errorKey));
        } else {
          setError(messageForErrorKey("profile_create_failed"));
        }
        return;
      }

      if (typeof result?.id !== "string") {
        throw new Error("Profile response is missing an id");
      }

      router.push(getProfileWorkoutCreationPath(language, result.id));
      isNavigating = true;
    } catch {
      setError(messageForErrorKey("profile_create_failed"));
    } finally {
      if (!isNavigating) {
        submissionInFlight.current = false;
        setIsCreating(false);
      }
    }
  }

  return (
    <CreateProfileFormView
      name={name}
      isCreating={isCreating}
      error={error}
      onNameChange={setName}
      onSubmit={handleSubmit}
    />
  );
}

export function CreateProfileFormView({
  name,
  isCreating,
  error,
  onNameChange,
  onSubmit,
}: {
  name: string;
  isCreating: boolean;
  error: string | null;
  onNameChange: (name: string) => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
}) {
  const t = useTranslations();

  return (
    <form onSubmit={onSubmit} aria-busy={isCreating} className="space-y-6">
      <div>
        <label htmlFor="profile-name" className="mb-2 block text-sm font-semibold text-zinc-900">
          {t.messages.profile_form.name_label}
        </label>
        <input
          id="profile-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={100}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          disabled={isCreating}
          aria-describedby={error ? "profile-error" : undefined}
          className="min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
          placeholder={t.messages.profile_form.name_placeholder}
        />
      </div>
      {error ? (
        <p id="profile-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isCreating}
        className="min-h-12 w-full rounded-xl bg-primary-hover px-5 text-base font-semibold text-white outline-none hover:bg-primary-strong focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
      >
        {isCreating
          ? t.messages.profile_form.submitting
          : t.messages.common.create_profile}
      </button>
    </form>
  );
}
