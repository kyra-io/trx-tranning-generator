"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { TranslationSchema } from "@/lib/i18n/translations/en";
import { useLocale, useTranslations } from "@/lib/i18n/translations-provider";
import { getProfilePath } from "@/lib/profiles/profile-routes";

type ErrorKey = keyof TranslationSchema["errors"];

type Difficulty = "too_easy" | "good" | "too_hard";

type Feedback = {
  difficulty: string;
  notes: string | null;
};

export function WorkoutDetailActions({
  profileId,
  workoutId,
  initialStatus,
  initialFeedback,
  children,
}: {
  profileId: string;
  workoutId: string;
  initialStatus: string;
  initialFeedback: Feedback | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const language = useLocale();
  const t = useTranslations();
  const m = t.messages;
  const [status, setStatus] = useState(initialStatus);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [notes, setNotes] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasJustCompleted, setHasJustCompleted] = useState(false);
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);
  const feedbackHeadingRef = useRef<HTMLLegendElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const difficultyOptions: Array<{ value: Difficulty; label: string }> = [
    { value: "too_easy", label: m.enums.difficulty.too_easy },
    { value: "good", label: m.enums.difficulty.good },
    { value: "too_hard", label: m.enums.difficulty.too_hard },
  ];

  useEffect(() => {
    if (isFeedbackOpen) {
      feedbackHeadingRef.current?.focus();
    }
  }, [isFeedbackOpen]);

  useEffect(() => {
    if (hasJustCompleted) {
      statusRef.current?.focus();
    }
  }, [hasJustCompleted]);

  async function handleComplete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isDeleting) {
      return;
    }

    if (!difficulty) {
      setErrorKey("difficulty_required");
      return;
    }

    setErrorKey(null);
    setIsCompleting(true);

    try {
      const response = await fetch(`/api/profiles/${encodeURIComponent(profileId)}/workouts/${encodeURIComponent(workoutId)}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          difficulty,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not complete workout");
      }

      const completedWorkout = (await response.json()) as {
        status: string;
        feedback: Feedback | null;
      };

      setStatus(completedWorkout.status);
      setFeedback(completedWorkout.feedback);
      setIsFeedbackOpen(false);
      setHasJustCompleted(true);
      router.refresh();
    } catch {
      setErrorKey("complete_failed");
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(m.workout_detail.delete_confirm)) {
      return;
    }

    setErrorKey(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/profiles/${encodeURIComponent(profileId)}/workouts/${encodeURIComponent(workoutId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Could not delete workout");
      }

      router.push(getProfilePath(language, profileId));
      router.refresh();
    } catch {
      setErrorKey("delete_failed");
      setIsDeleting(false);
    }
  }

  const isCompleted = status === "completed";
  const statusLabel = (m.enums.status as Record<string, string>)[status] ?? status.replaceAll("_", " ");
  const error = errorKey ? m.errors[errorKey] : null;

  return (
    <>
      <div
        ref={statusRef}
        role="status"
        aria-live="polite"
        tabIndex={-1}
        className="mt-4 outline-none"
      >
        <span
          className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-medium ${
            isCompleted
              ? "bg-emerald-50 text-emerald-800"
              : "bg-primary-soft text-primary-hover"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {children}

      <section className="mt-8 border-t border-zinc-200 pt-6">
        {isCompleted && feedback ? (
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              {m.workout_detail.feedback_heading}
            </h2>
            <p className="mt-2 text-sm font-medium text-zinc-700">
              {(m.enums.difficulty as Record<string, string>)[feedback.difficulty] ??
                feedback.difficulty}
            </p>
            {feedback.notes ? (
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                &ldquo;{feedback.notes}&rdquo;
              </p>
            ) : null}
          </div>
        ) : null}

        {!isCompleted ? (
          <div className={feedback ? "mt-6" : undefined}>
            {!isFeedbackOpen ? (
              <button
                type="button"
                onClick={() => {
                  setErrorKey(null);
                  setIsFeedbackOpen(true);
                }}
                disabled={isDeleting}
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-primary-hover px-5 text-sm font-semibold text-white outline-none hover:bg-primary-strong focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                {m.workout_detail.complete_action}
              </button>
            ) : (
              <form
                onSubmit={handleComplete}
                className="rounded-2xl border border-zinc-200 bg-white p-4"
              >
                <fieldset>
                  <legend
                    ref={feedbackHeadingRef}
                    tabIndex={-1}
                    className="font-semibold text-zinc-900 outline-none"
                  >
                    {m.workout_detail.feedback_question}
                  </legend>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {difficultyOptions.map((option) => {
                      const isSelected = difficulty === option.value;

                      return (
                        <label
                          key={option.value}
                          className={`min-h-11 rounded-xl border px-2 text-sm font-medium outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${
                            isSelected
                              ? "border-primary bg-primary-soft text-primary-hover"
                              : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="difficulty"
                            value={option.value}
                            checked={isSelected}
                            onChange={() => {
                              setDifficulty(option.value);
                              setErrorKey(null);
                            }}
                            disabled={isCompleting || isDeleting}
                            className="sr-only"
                          />
                          <span className="flex min-h-11 items-center justify-center">
                            {option.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <label
                  htmlFor="workout-feedback-notes"
                  className="mt-5 block text-sm font-medium text-zinc-700"
                >
                  {m.workout_detail.notes_label}{" "}
                  <span className="font-normal text-zinc-400">
                    {m.common.optional}
                  </span>
                </label>
                <textarea
                  id="workout-feedback-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  disabled={isCompleting || isDeleting}
                  placeholder={m.workout_detail.feedback_placeholder}
                  className="mt-2 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-3 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-primary focus:ring-1 focus:ring-primary"
                />

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorKey(null);
                      setIsFeedbackOpen(false);
                    }}
                    disabled={isCompleting || isDeleting}
                    className="min-h-11 flex-1 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
                  >
                    {m.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isCompleting || isDeleting}
                    className="min-h-11 flex-1 rounded-xl bg-primary-hover px-4 text-sm font-semibold text-white outline-none hover:bg-primary-strong focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isCompleting ? m.workout_detail.completing : m.common.complete}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting || isCompleting}
          className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-medium text-zinc-500 outline-none hover:bg-zinc-100 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
        >
          {isDeleting ? m.workout_detail.deleting : m.workout_detail.delete_action}
        </button>
      </section>
    </>
  );
}
