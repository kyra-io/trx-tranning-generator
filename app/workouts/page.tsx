import { WorkoutList } from "@/components/workouts/workout-list";

export default function WorkoutsPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Workouts
        </h1>
        <p className="mt-2 text-base text-zinc-500">Your training history</p>
      </header>
      <WorkoutList />
    </div>
  );
}
