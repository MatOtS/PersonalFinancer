export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonProps = React.ComponentProps<"button"> & { variant: ButtonVariant };

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent",
  secondary: "bg-transparent border border-control-border text-text",
  ghost: "bg-transparent text-text",
  destructive: "bg-negative text-surface",
};
const baseClasses =
  "h-9 px-4 rounded-md font-semibold text-small inline-flex items-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed";

// The classes of a variant on their own, so a link can look like a button
// (a <button> inside an <a> is not valid HTML) without copying the styles.
export const buttonClassName = (variant: ButtonVariant, className?: string) =>
  `${baseClasses} ${buttonVariants[variant]} ${className ?? ""}`;

export const Button = ({ variant, className, ...rest }: ButtonProps) => {
  return (
    <button
      type="button"
      className={buttonClassName(variant, className)}
      {...rest}
    />
  );
};
