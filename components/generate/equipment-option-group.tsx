import type { WorkoutEquipment } from '@/lib/workouts/workout-equipment';

type EquipmentOption = {
  label: string;
  value: WorkoutEquipment;
};

export function getEquipmentSelectionError(
  equipment: readonly WorkoutEquipment[],
) {
  return equipment.length === 0 ? 'Select at least one equipment option.' : null;
}

export function EquipmentOptionGroup({
  options,
  value,
  onChange,
  errorId,
}: {
  options: readonly EquipmentOption[];
  value: readonly WorkoutEquipment[];
  onChange: (value: WorkoutEquipment[]) => void;
  errorId?: string;
}) {
  const selected = new Set(value);

  return (
    <fieldset
      aria-describedby={errorId}
      aria-invalid={errorId ? true : undefined}
    >
      <legend className="mb-3 text-sm font-semibold text-zinc-900">
        Equipment
      </legend>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const checked = selected.has(option.value);
          const id = `workout-equipment-${option.value}`;

          return (
            <label
              key={option.value}
              htmlFor={id}
              className="h-full cursor-pointer rounded-xl"
            >
              <input
                id={id}
                type="checkbox"
                name="workout-equipment"
                value={option.value}
                checked={checked}
                onChange={() => {
                  const nextValue = checked
                    ? value.filter((item) => item !== option.value)
                    : [...value, option.value];
                  onChange(nextValue);
                }}
                className="peer sr-only"
              />
              <span className="flex min-h-11 h-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2 py-2 text-center text-sm font-medium text-zinc-600 transition-colors peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary-hover peer-focus-visible:ring-2 peer-focus-visible:ring-inset peer-focus-visible:ring-primary">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className={`size-4 shrink-0 ${checked ? 'opacity-100' : 'opacity-0'}`}
                >
                  <path
                    d="m4 10 4 4 8-9"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.25"
                  />
                </svg>
                <span>{option.label}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
