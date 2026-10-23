export type ButtonVariant =
  "primary" | "secondary" | "ghost" | "ghost-destructive" | "destructive";
type ButtonProps = React.ComponentProps<"button"> & { variant: ButtonVariant };

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent",
  secondary: "bg-transparent border border-control-border text-text",
  ghost: "bg-transparent text-text hover:bg-accent-soft",
  // A quiet button for an action that ends something (signing out): it looks
  // like ghost, but warns in `negative` on hover.
  "ghost-destructive":
    "bg-transparent text-text hover:bg-negative/10 hover:text-negative",
  destructive: "bg-negative text-surface",
};
const baseClasses =
  "h-9 px-4 rounded-md font-semibold text-small inline-flex items-center gap-2 transition-colors duration-150 disabled:opacity-45 disabled:cursor-not-allowed";

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
