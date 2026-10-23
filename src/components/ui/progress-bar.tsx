// Indeterminate progress bar: it says "working" without a percentage.
export const ProgressBar = ({ label }: { label: string }) => {
  return (
    <div
      role="progressbar"
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-border"
    >
      <div className="h-full w-1/3 animate-indeterminate rounded-full bg-accent" />
    </div>
  );
};
