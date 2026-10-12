import { ListSkeleton, Skeleton } from '@/components/Skeleton';

export default function UsersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <ListSkeleton rows={5} />
    </div>
  );
}