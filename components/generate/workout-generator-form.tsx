"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  EquipmentOptionGroup,
  hasEquipmentSelectionError,
} from "@/components/generate/equipment-option-group";
import { OptionGroup } from "@/components/generate/option-group";
import type { TranslationSchema } from "@/lib/i18n/translations/en";
import { useLocale, useTranslations } from "@/lib/i18n/translations-provider";
import { getProfileWorkoutPath } from "@/lib/profiles/profile-routes";
import type {
  GenerateWorkoutInput,
  WorkoutFocus,
  WorkoutGoal,
  WorkoutLevel,
} from "@/lib/workouts/workout-generator.service";
import type { WorkoutEquipment } from "@/lib/workouts/workout-equipment";

type ErrorKey = keyof TranslationSchema["errors"];

const generationErrorKeys: Partial<Record<string, ErrorKey>> = {
  "No exercises available": "no_exercises",
  "No compatible exercises available": "no_compatible_exercises",
};

export function WorkoutGeneratorForm({ profileId }: { profileId: string }) {
  const router = useRouter();
  const language = useLocale();
  const t = useTranslations();
  const m = t.messages;
  const submissionInFlight = useRef(false);
  const [goal, setGoal] = useState<WorkoutGoal>("strength");
  const [duration, setDuration] = useState("30");
  const [level, setLevel] = useState<WorkoutLevel>("intermediate");
  const [focus, setFocus] = useState<WorkoutFocus>("full_body");
  const [intensity, setIntensity] = useState(6);
  const [equipment, setEquipment] = useState<WorkoutEquipment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);

  const goals = [
    { label: m.enums.goal.strength, value: "strength" },
    { label: m.enums.goal.hypertrophy, value: "hypertrophy" },
    { label: m.enums.goal.general_fitness, value: "general_fitness" },
  ] as const;

  const durations = [15, 30, 45, 60].map((value) => ({
    label:
      value === 60
        ? `60 ${m.common.minutes_abbreviation}`
        : String(value),
    value: String(value),
  }));

  const levels = [
    { label: m.enums.level.beginner, value: "beginner" },
    { label: m.enums.level.intermediate, value: "intermediate" },
    { label: m.enums.level.advanced, value: "advanced" },
  ] as const;

  const focuses = [
    { label: m.enums.focus.full_body, value: "full_body" },
    { label: m.enums.focus.upper_body, value: "upper_body" },
    { label: m.enums.focus.lower_body, value: "lower_body" },
    { label: m.enums.focus.core, value: "core" },
  ] as const;

  const equipmentOptions = [
    { label: m.enums.equipment.suspension_trainer, value: "suspension_trainer" },
    { label: m.enums.equipment.dumbbell, value: "dumbbell" },
    { label: m.enums.equipment.bodyweight, value: "bodyweight" },
  ] as const;

  const error = errorKey ? m.errors[errorKey] : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (hasEquipmentSelectionError(equipment)) {
      setErrorKey("equipment_required");
      return;
    }

    if (submissionInFlight.current) {
      return;
    }

    submissionInFlight.current = true;
    setIsGenerating(true);
    setErrorKey(null);

    const input: GenerateWorkoutInput = {
      goal,
      durationMinutes: Number(duration),
      level,
      focus,
      intensity,
      equipment,
    };
    let isNavigating = false;

    try {
      const response = await fetch(
        `/api/profiles/${encodeURIComponent(profileId)}/workouts/generate`,
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        },
      );
      const result = (await response.json().catch(() => null)) as {
        id?: unknown;
        error?: unknown;
      } | null;

      if (!response.ok) {
        if (response.status === 400) {
          setErrorKey("invalid_preferences");
        } else if (
          response.status === 422 &&
          typeof result?.error === "string" &&
          generationErrorKeys[result.error]
        ) {
          setErrorKey(generationErrorKeys[result.error] ?? "generate_failed");
        } else {
          setErrorKey("generate_failed");
        }

        return;
      }

      if (typeof result?.id !== "string" || result.id.length === 0) {
        throw new Error("Generated workout response is missing an id");
      }

      router.push(getProfileWorkoutPath(language, profileId, result.id));
      isNavigating = true;
    } catch {
      setErrorKey("generate_failed");
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
        name="workout-goal"
        label={m.workout_generator.goal_label}
        options={goals}
        value={goal}
        onChange={(value) => setGoal(value as WorkoutGoal)}
        columns={3}
      />
      <OptionGroup
        name="workout-duration"
        label={m.workout_generator.duration_label}
        options={durations}
        value={duration}
        onChange={setDuration}
        columns={4}
      />
      <OptionGroup
        name="workout-level"
        label={m.workout_generator.level_label}
        options={levels}
        value={level}
        onChange={(value) => setLevel(value as WorkoutLevel)}
        columns={3}
      />
      <OptionGroup
        name="workout-focus"
        label={m.workout_generator.focus_label}
        options={focuses}
        value={focus}
        onChange={(value) => setFocus(value as WorkoutFocus)}
        columns={2}
      />
      <EquipmentOptionGroup
        legend={m.workout_generator.equipment_label}
        options={equipmentOptions}
        value={equipment}
        onChange={(value) => {
          setEquipment(value);
          if (value.length > 0 && errorKey === "equipment_required") {
            setErrorKey(null);
          }
        }}
        errorId={errorKey === "equipment_required" ? "generation-error" : undefined}
      />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <label
            htmlFor="intensity"
            className="text-sm font-semibold text-zinc-900"
          >
            {m.workout_generator.intensity_label}
          </label>
          <output
            htmlFor="intensity"
            className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-hover"
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
          className="h-11 w-full cursor-pointer accent-primary outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
        className="min-h-13 w-full rounded-xl bg-primary-hover px-5 py-3.5 text-base font-semibold text-white outline-none transition-colors hover:bg-primary-strong focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:bg-primary-strong disabled:cursor-wait disabled:opacity-60"
      >
        {isGenerating
          ? m.workout_generator.generating
          : m.workout_generator.generate}
      </button>
    </form>
  );
}
