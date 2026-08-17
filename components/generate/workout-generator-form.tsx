"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { OptionGroup } from "@/components/generate/option-group";
import type {
  GenerateWorkoutInput,
  WorkoutFocus,
  WorkoutGoal,
  WorkoutLevel,
} from "@/lib/workouts/workout-generator.service";

const goals = [
  { label: "Strength", value: "strength" },
  { label: "Hypertrophy", value: "hypertrophy" },
  { label: "General fitness", value: "general_fitness" },
] as const;

const durations = [15, 30, 45, 60].map((duration) => ({
  label: duration === 60 ? "60 min" : String(duration),
  value: String(duration),
}));

const levels = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
] as const;

const focuses = [
  { label: "Full body", value: "full_body" },
  { label: "Upper body", value: "upper_body" },
  { label: "Lower body", value: "lower_body" },
  { label: "Core", value: "core" },
] as const;

const safeGenerationErrors = new Set([
  "No exercises available",
  "No compatible exercises available",
]);

export function WorkoutGeneratorForm() {
  const router = useRouter();
  const submissionInFlight = useRef(false);
  const [goal, setGoal] = useState<WorkoutGoal>("strength");
  const [duration, setDuration] = useState("30");
  const [level, setLevel] = useState<WorkoutLevel>("intermediate");
  const [focus, setFocus] = useState<WorkoutFocus>("full_body");
  const [intensity, setIntensity] = useState(6);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submissionInFlight.current) {
      return;
    }

    submissionInFlight.current = true;
    setIsGenerating(true);
    setError(null);

    const input: GenerateWorkoutInput = {
      goal,
      durationMinutes: Number(duration),
      level,
      focus,
      intensity,
    };
    let isNavigating = false;

    try {
      const response = await fetch("/api/workouts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = (await response.json().catch(() => null)) as {
        id?: unknown;
        error?: unknown;
      } | null;

      if (!response.ok) {
        if (response.status === 400) {
          setError("Please check your workout preferences.");
        } else if (
          response.status === 422 &&
          typeof result?.error === "string" &&
          safeGenerationErrors.has(result.error)
        ) {
          setError(result.error);
        } else {
          setError("Could not generate workout. Please try again.");
        }

        return;
      }

      if (typeof result?.id !== "string" || result.id.length === 0) {
        throw new Error("Generated workout response is missing an id");
      }

      router.push(`/workouts/${encodeURIComponent(result.id)}`);
      isNavigating = true;
    } catch {
      setError("Could not generate workout. Please try again.");
    } finally {
      if (!isNavigating) {
        submissionInFlight.current = false;
        setIsGenerating(false);
      }
    }
  }

  return (
    <form
      className="space-y-7"
      onSubmit={handleSubmit}
      aria-busy={isGenerating}
    >
      <OptionGroup
        label="Goal"
        options={goals}
        value={goal}
        onChange={(value) => setGoal(value as WorkoutGoal)}
        columns={3}
      />
      <OptionGroup
        label="Duration"
        options={durations}
        value={duration}
        onChange={setDuration}
        columns={4}
      />
      <OptionGroup
        label="Level"
        options={levels}
        value={level}
        onChange={(value) => setLevel(value as WorkoutLevel)}
        columns={3}
      />
      <OptionGroup
        label="Focus"
        options={focuses}
        value={focus}
        onChange={(value) => setFocus(value as WorkoutFocus)}
        columns={2}
      />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <label
            htmlFor="intensity"
            className="text-sm font-semibold text-zinc-900"
          >
            Intensity
          </label>
          <output
            htmlFor="intensity"
            className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-800"
          >
            {intensity}
          </output>
        </div>
        <input
          id="intensity"
          type="range"
          min="1"
          max="10"
          step="1"
          value={intensity}
          onChange={(event) => setIntensity(Number(event.target.value))}
          className="h-11 w-full cursor-pointer accent-emerald-700 outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        />
        <div
          aria-hidden="true"
          className="flex justify-between text-xs text-zinc-500"
        >
          <span>1</span>
          <span>10</span>
        </div>
      </div>

      {error ? (
        <p
          id="generation-error"
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isGenerating}
        aria-describedby={error ? "generation-error" : undefined}
        className="min-h-13 w-full rounded-xl bg-emerald-700 px-5 py-3.5 text-base font-semibold text-white outline-none transition-colors hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 active:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
      >
        {isGenerating ? "Generating..." : "Generate workout"}
      </button>
    </form>
  );
}
