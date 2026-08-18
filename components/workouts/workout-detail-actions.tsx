"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Difficulty = "too_easy" | "good" | "too_hard";

type Feedback = {
  difficulty: string;
  notes: string | null;
};

const labels: Record<string, string> = {
  generated: "Generated",
  in_progress: "In progress",
  completed: "Completed",
  too_easy: "Too easy",
  good: "Good",
  too_hard: "Too hard",
};

const difficultyOptions: Array<{ value: Difficulty; label: string }> = [
  { value: "too_easy", label: "Too easy" },
  { value: "good", label: "Good" },
  { value: "too_hard", label: "Too hard" },
];

export function WorkoutDetailActions({
  workoutId,
  initialStatus,
  initialFeedback,
  children,
}: {
  workoutId: string;
  initialStatus: string;
  initialFeedback: Feedback | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [notes, setNotes] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasJustCompleted, setHasJustCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const feedbackHeadingRef = useRef<HTMLLegendElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

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
      setError("Choose how the workout felt.");
      return;
    }

    setError(null);
    setIsCompleting(true);

    try {
      const response = await fetch(`/api/workouts/${workoutId}/complete`, {
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
      setError("Could not complete workout. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this workout? This cannot be undone.")) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/workouts/${workoutId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Could not delete workout");
      }

      router.push("/workouts");
      router.refresh();
    } catch {
      setError("Could not delete workout. Please try again.");
      setIsDeleting(false);
    }
  }

  const isCompleted = status === "completed";

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
          {labels[status] ?? status.replaceAll("_", " ")}
        </span>
      </div>

      {children}

      <section className="mt-8 border-t border-zinc-200 pt-6">
        {isCompleted && feedback ? (
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Your feedback
            </h2>
            <p className="mt-2 text-sm font-medium text-zinc-700">
              {labels[feedback.difficulty] ?? feedback.difficulty}
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
                  setError(null);
                  setIsFeedbackOpen(true);
                }}
                disabled={isDeleting}
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-primary-hover px-5 text-sm font-semibold text-white outline-none hover:bg-primary-strong focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                Complete workout
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
                    How was it?
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
                              setError(null);
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
                  Notes <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <textarea
                  id="workout-feedback-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  disabled={isCompleting || isDeleting}
                  placeholder="How did the workout feel?"
                  className="mt-2 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-3 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-primary focus:ring-1 focus:ring-primary"
                />

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setIsFeedbackOpen(false);
                    }}
                    disabled={isCompleting || isDeleting}
                    className="min-h-11 flex-1 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCompleting || isDeleting}
                    className="min-h-11 flex-1 rounded-xl bg-primary-hover px-4 text-sm font-semibold text-white outline-none hover:bg-primary-strong focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isCompleting ? "Completing..." : "Complete"}
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
          {isDeleting ? "Deleting..." : "Delete workout"}
        </button>
      </section>
    </>
  );
}
