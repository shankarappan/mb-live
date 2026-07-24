/** Fractional ordering helpers for setlist_items.position */

export function positionAfter(last: number | null | undefined): number {
  if (last == null || Number.isNaN(last)) return 1000;
  return last + 1000;
}

export function positionBetween(
  before: number | null | undefined,
  after: number | null | undefined
): number {
  if (before == null && after == null) return 1000;
  if (before == null) return (after as number) / 2;
  if (after == null) return before + 1000;
  return (before + after) / 2;
}

/** Recompute positions from ordered ids using gaps of 1000. */
export function rebalancePositions(orderedIds: string[]): { id: string; position: number }[] {
  return orderedIds.map((id, index) => ({
    id,
    position: (index + 1) * 1000,
  }));
}
