import { Skeleton } from "@/components/ui/skeleton";

// Shown instantly while any page under (app) loads its data. Next.js swaps in the real page when ready.
export default function Loading() {
  return (
    <div role="status" aria-label="Loading page" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
