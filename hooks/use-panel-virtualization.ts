'use client';

import { useRef, useCallback } from 'react';
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';

export interface UsePanelVirtualizationOptions<T> {
  /** Items to virtualize */
  items: T[];
  /** Estimated height of each item in pixels */
  estimateSize?: number;
  /** Number of items to render outside of the visible area */
  overscan?: number;
  /** Function to get unique key for each item */
  getItemKey?: (item: T, index: number) => string | number;
  /** Minimum number of items before virtualization kicks in */
  minItemsForVirtualization?: number;
  /** Whether virtualization is enabled */
  enabled?: boolean;
}

export interface UsePanelVirtualizationReturn<T> {
  /** Ref to attach to the scroll container */
  parentRef: React.RefObject<HTMLDivElement | null>;
  /** Whether virtualization is active */
  isVirtualized: boolean;
  /** Virtual items to render (null if not virtualized) */
  virtualItems: VirtualItem[] | null;
  /** Total height of the virtualized container */
  totalSize: number;
  /** Get the item at a virtual index */
  getItem: (virtualItem: VirtualItem) => T;
  /** All items (for non-virtualized rendering) */
  allItems: T[];
  /** Measure element for dynamic sizing (optional) */
  measureElement: ((node: Element | null) => void) | undefined;
}

/**
 * Hook for virtualizing panel lists using @tanstack/react-virtual.
 * Provides automatic fallback for small lists.
 *
 * @example
 * ```tsx
 * const {
 *   parentRef,
 *   isVirtualized,
 *   virtualItems,
 *   totalSize,
 *   getItem,
 *   allItems
 * } = usePanelVirtualization({
 *   items: characters,
 *   estimateSize: 52,
 *   getItemKey: (char) => char.id,
 * });
 *
 * return (
 *   <div ref={parentRef} className="overflow-auto h-full">
 *     {isVirtualized ? (
 *       <div style={{ height: totalSize, position: 'relative' }}>
 *         {virtualItems.map((virtualItem) => {
 *           const item = getItem(virtualItem);
 *           return (
 *             <div
 *               key={virtualItem.key}
 *               style={{
 *                 position: 'absolute',
 *                 top: 0,
 *                 left: 0,
 *                 width: '100%',
 *                 transform: `translateY(${virtualItem.start}px)`,
 *               }}
 *             >
 *               <ItemComponent item={item} />
 *             </div>
 *           );
 *         })}
 *       </div>
 *     ) : (
 *       allItems.map((item) => <ItemComponent key={item.id} item={item} />)
 *     )}
 *   </div>
 * );
 * ```
 */
export function usePanelVirtualization<T>({
  items,
  estimateSize = 44,
  overscan = 5,
  getItemKey,
  minItemsForVirtualization = 20,
  enabled = true,
}: UsePanelVirtualizationOptions<T>): UsePanelVirtualizationReturn<T> {
  const parentRef = useRef<HTMLDivElement>(null);

  const shouldVirtualize = enabled && items.length >= minItemsForVirtualization;

  // Store items in ref to avoid recreating getItemKey callback
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Stable callback for getScrollElement - parentRef is stable
  const getScrollElement = useCallback(() => parentRef.current, []);

  // Stable callback for estimateSize - only recreate if estimateSize prop changes
  const estimateSizeFn = useCallback(() => estimateSize, [estimateSize]);

  // Store getItemKey in ref to avoid dependency issues
  const getItemKeyRef = useRef(getItemKey);
  getItemKeyRef.current = getItemKey;

  // Stable callback for getItemKey - uses refs to access current values
  const stableGetItemKey = useCallback((index: number) => {
    const keyFn = getItemKeyRef.current;
    if (!keyFn) return index;
    return keyFn(itemsRef.current[index], index);
  }, []);

  // Always call useVirtualizer unconditionally (React Rules of Hooks)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement,
    estimateSize: estimateSizeFn,
    overscan,
    getItemKey: getItemKey ? stableGetItemKey : undefined,
  });

  // Only use virtualizer results when virtualization is needed
  const virtualItems = shouldVirtualize ? virtualizer.getVirtualItems() : null;
  const totalSize = shouldVirtualize ? virtualizer.getTotalSize() : 0;

  const getItem = useCallback(
    (virtualItem: VirtualItem) => itemsRef.current[virtualItem.index],
    []
  );

  return {
    parentRef,
    isVirtualized: shouldVirtualize,
    virtualItems,
    totalSize,
    getItem,
    allItems: items,
    measureElement: shouldVirtualize ? virtualizer.measureElement : undefined,
  };
}
