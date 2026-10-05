import { cn } from "@/lib/utils";
import { microLabel } from "@/lib/ui";

/**
 * The app's signature panel: a single bordered surface whose children are
 * separated by hairlines (`gap-px` over a border-colored background) instead
 * of each card drawing its own border.
 */
export function DashboardGrid({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className={cn("grid grid-cols-1 gap-px bg-border lg:grid-cols-3", className)}>
        {children}
      </div>
    </div>
  );
}

/**
 * Page heading. The eyebrow carries the section name so the title itself can be
 * the specific thing on the page rather than repeating the navigation.
 */
export function DashboardHeading({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        {eyebrow && <span className={microLabel}>{eyebrow}</span>}
        <h1 className="font-semibold text-2xl leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Heading for a block inside a page, above a panel that has no header of its own. */
export function SectionHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-semibold text-base tracking-tight">{title}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
