import { cn } from "@/lib/utils";

/**
 * The block's signature panel: a single bordered surface whose children are
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
    <div className="overflow-hidden rounded-none border">
      <div className={cn("grid grid-cols-1 gap-px bg-border lg:grid-cols-3", className)}>
        {children}
      </div>
    </div>
  );
}

export function DashboardHeading({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-xl leading-tight">{title}</h1>
        {subtitle && <p className="text-base text-muted-foreground">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
