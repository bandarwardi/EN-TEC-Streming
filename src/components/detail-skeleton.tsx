import { Skeleton } from "@/components/skeleton";

export function DetailSkeleton() {
  return (
    <div className="relative min-h-screen animate-pulse">
      <div className="absolute inset-x-0 top-0 h-[60vh] -z-10 bg-surface" />
      <div className="flex items-center gap-3 px-5 pt-5">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="px-5 pt-6 lg:flex lg:gap-8">
        <Skeleton className="mx-auto aspect-[2/3] w-52 rounded-2xl lg:mx-0 lg:w-64" />
        <div className="mt-6 flex-1 space-y-4 lg:mt-0">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full max-w-2xl" />
          <Skeleton className="h-7 w-40" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 max-w-2xl">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </div>
      </div>
      <div className="mt-10 px-5">
        <Skeleton className="mb-4 h-5 w-24" />
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-56 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
