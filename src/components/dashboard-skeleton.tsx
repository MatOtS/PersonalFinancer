import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 py-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div
        className={cn(
          "grid grid-cols-2 gap-px border bg-border lg:grid-cols-3",
          "*:min-h-36 *:w-full *:bg-background"
        )}
      >
        <div />
        <div />
        <div />
        <div className="col-span-2 min-h-80! lg:col-span-3" />
      </div>
      <div
        className={cn(
          "grid grid-cols-2 gap-px border bg-border lg:grid-cols-2",
          "*:min-h-64 *:w-full *:bg-background"
        )}
      >
        <div />
        <div />
      </div>
    </div>
  );
}
