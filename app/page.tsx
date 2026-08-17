import { WorkoutGeneratorForm } from "@/components/generate/workout-generator-form";

export default function GeneratePage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Create workout
        </h1>
        <p className="mt-2 text-base text-zinc-500">Configure your session</p>
      </header>
      <WorkoutGeneratorForm />
    </div>
  );
}
