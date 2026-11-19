import { useId } from "react";

export type SegmentedOption = { value: string; label: string };
type SegmentedControlProps = {
  name: string;
  label: string;
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  // Shows the label above the options (by default it is only for screen
  // readers, as in the theme control, whose options already say what they do).
  visibleLabel?: boolean;
  // Marks the options in red with no text.
  invalid?: boolean;
  // Marks them in red and shows this text under them, linked for screen readers.
  error?: string;
};

export const SegmentedControl = ({
  name,
  label,
  options,
  value,
  onChange,
  visibleLabel,
  invalid,
  error,
}: SegmentedControlProps) => {
  const errorId = `${useId()}-error`;
  const marked = Boolean(invalid || error);
  const control = (
    <fieldset
      aria-invalid={marked ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      className={`bg-raised border rounded-full p-1 inline-flex w-fit gap-0.5 ${
        marked ? "border-negative" : "border-border"
      }`}
    >
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="rounded-full px-2 py-1.5 text-small font-semibold text-text-muted cursor-pointer has-[:checked]:bg-accent has-[:checked]:text-on-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-offset-2"
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

  if (!error && !visibleLabel) return control;
  return (
    <div className="flex flex-col items-start gap-1.5">
      {visibleLabel && (
        <span aria-hidden="true" className="text-small font-semibold">
          {label}
        </span>
      )}
      {control}
      {error && (
        <p id={errorId} className="text-small text-negative">
          {error}
        </p>
      )}
    </div>
  );
};
