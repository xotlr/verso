import { useSensor, useSensors, PointerSensor, KeyboardSensor, TouchSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * Common DnD sensors configuration for panel lists.
 * - PointerSensor: 5px distance for mouse drag
 * - TouchSensor: 200ms delay for touch long-press, 5px tolerance
 * - KeyboardSensor: Arrow key navigation
 */
export function usePanelDndSensors() {
  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
}
