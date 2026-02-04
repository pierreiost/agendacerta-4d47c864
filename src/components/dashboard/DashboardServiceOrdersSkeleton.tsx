import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DashboardServiceOrdersSkeleton() {
  return (
    <div className="space-y-8">
      {/* Métricas Skeleton */}
      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status Chart Skeleton */}
        <Card className="border-border shadow-soft lg:col-span-1">
          <CardHeader className="border-b bg-muted/30 py-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-[130px]" />
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-center justify-center h-[200px]">
              <Skeleton className="h-36 w-36 rounded-full" />
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders Skeleton */}
        <Card className="border-border shadow-soft lg:col-span-2">
          <CardHeader className="border-b bg-muted/30 py-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-[130px]" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
