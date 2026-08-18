type Option = {
  label: string;
  value: string;
};

type OptionGroupProps = {
  name: string;
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
  name,
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
          const id = `${name}-${option.value}`;

          return (
            <label
              key={option.value}
              htmlFor={id}
              className="cursor-pointer rounded-xl outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              <span className="flex min-h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-center text-sm font-medium text-zinc-600 transition-colors peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary-hover">
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
