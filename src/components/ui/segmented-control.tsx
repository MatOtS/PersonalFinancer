export type SegmentedOption = { value: string; label: string };
type SegmentedControlProps = {
  name: string;
  label: string;
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
};

export const SegmentedControl = ({
  name,
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps) => {
  return (
    <fieldset className="bg-raised border border-border rounded-full p-1 inline-flex gap-0.5">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="rounded-full px-3.5 py-1.5 text-small font-semibold text-text-muted cursor-pointer has-[:checked]:bg-accent has-[:checked]:text-on-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-offset-2"
        >
          {option.label}
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
        </label>
      ))}
    </fieldset>
  );
};
