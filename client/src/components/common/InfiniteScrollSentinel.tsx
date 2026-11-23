import React, { useState, useEffect, useRef, useMemo } from 'react';

interface UseInfiniteSliceOptions {
  initialCount?: number;
  step?: number;
  resetKey?: string | number;
}

/**
 * Incrementally reveals slices of a list for infinite scrolling without
 * mounting all batch cards/tables at once.
 */
export function useInfiniteSlice<T>(
  items: T[],
  { initialCount = 8, step = 8, resetKey }: UseInfiniteSliceOptions = {}
) {
  const [visibleCount, setVisibleCount] = useState<number>(initialCount);

  useEffect(() => {
    setVisibleCount(initialCount);
  }, [resetKey, initialCount]);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount]
  );

  const hasMore = visibleCount < items.length;
  const loadMore = () => setVisibleCount(prev => Math.min(items.length, prev + step));

  return {
    visibleItems,
    hasMore,
    loadMore,
    visibleCount: visibleItems.length,
    totalCount: items.length
  };
}

interface InfiniteScrollSentinelProps {
  hasMore: boolean;
  onLoadMore: () => void;
  visibleCount: number;
  totalCount: number;
  itemLabel?: string;
  scrollRootRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Observes scroll position via IntersectionObserver and triggers `onLoadMore`
 * automatically as the user approaches the bottom of a batch list.
 */
export const InfiniteScrollSentinel: React.FC<InfiniteScrollSentinelProps> = ({
  hasMore,
  onLoadMore,
  visibleCount,
  totalCount,
  itemLabel = 'batches',
  scrollRootRef
}) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreRef.current();
        }
      },
      {
        root: scrollRootRef?.current || null,
        rootMargin: '240px',
        threshold: 0.01
      }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, visibleCount, scrollRootRef]);

  if (totalCount === 0) return null;

  return (
    <div
      ref={sentinelRef}
      className="py-2.5 px-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 border-t border-slate-100 bg-slate-50/50 rounded-xl"
    >
      <span className="font-mono font-semibold">
        Showing <strong className="text-slate-800">{visibleCount}</strong> of{' '}
        <strong className="text-slate-800">{totalCount}</strong> {itemLabel}
      </span>

      {hasMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
        >
          <span className="material-symbols-outlined text-[14px]">expand_more</span>
          <span>Load More ({totalCount - visibleCount} remaining)</span>
        </button>
      ) : (
        totalCount > 8 && (
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            <span>All {totalCount} {itemLabel} loaded</span>
          </span>
        )
      )}
    </div>
  );
};
