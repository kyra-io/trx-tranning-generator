type Option = {
  label: string;
  value: string;
};

type OptionGroupProps = {
  label: string;
  options: readonly Option[];
  value: string;
  onChange: (value: string) => void;
  columns?: 2 | 3 | 4;
};

const columnClasses = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

export function OptionGroup({
  label,
  options,
  value,
  onChange,
  columns = 2,
}: OptionGroupProps) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-zinc-900">
        {label}
      </legend>
      <div className={`grid gap-2 ${columnClasses[columns]}`}>
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`min-h-11 rounded-xl border px-2.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${
                selected
                  ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
