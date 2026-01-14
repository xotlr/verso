import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the character relationships graph page.
 */
export default function GraphLoading() {
  return (
    <div className="flex h-full">
      {/* Left sidebar - character list */}
      <div className="w-72 border-r bg-card/50 flex flex-col">
        <div className="h-12 border-b px-4 flex items-center">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="p-3">
          <Skeleton className="h-9 w-full rounded-lg mb-3" />
        </div>
        <div className="flex-1 px-3 space-y-2 overflow-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Main graph area */}
      <div className="flex-1 flex flex-col">
        <div className="h-12 border-b px-4 flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-card/20">
          {/* Graph placeholder - circular arrangement of nodes */}
          <div className="relative w-96 h-96">
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
              const x = 50 + 35 * Math.cos((angle * Math.PI) / 180);
              const y = 50 + 35 * Math.sin((angle * Math.PI) / 180);
              return (
                <div
                  key={i}
                  className="absolute"
                  style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
              );
            })}
            {/* Center node */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Skeleton className="h-16 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
