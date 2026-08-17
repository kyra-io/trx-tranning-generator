"use client";

import { useState } from "react";

import { OptionGroup } from "@/components/generate/option-group";

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

export function WorkoutGeneratorForm() {
  const [goal, setGoal] = useState("strength");
  const [duration, setDuration] = useState("30");
  const [level, setLevel] = useState("intermediate");
  const [focus, setFocus] = useState("full_body");
  const [intensity, setIntensity] = useState(6);

  return (
    <form className="space-y-7">
      <OptionGroup
        label="Goal"
        options={goals}
        value={goal}
        onChange={setGoal}
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
        onChange={setLevel}
        columns={3}
      />
      <OptionGroup
        label="Focus"
        options={focuses}
        value={focus}
        onChange={setFocus}
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

      {/* Generation will be connected to the existing API in a later phase. */}
      <button
        type="button"
        className="min-h-13 w-full rounded-xl bg-emerald-700 px-5 py-3.5 text-base font-semibold text-white outline-none transition-colors hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 active:bg-emerald-900"
      >
        Generate workout
      </button>
    </form>
  );
}
