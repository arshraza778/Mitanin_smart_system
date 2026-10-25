export interface LoopClosureCase {
  id?: string;
  state?: string;
  status?: string;
  closed?: boolean;
  outcome?: string;
  createdAt?: string | number;
  timestamp?: string | number;
  [key: string]: any;
}

export function isCaseClosed(c: LoopClosureCase): boolean {
  if (c.closed === true) return true;
  if (c.outcome != null && c.outcome !== '') return true;
  if (c.state === 'OUTCOME_RECORDED' || c.state === 'REACHED_FACILITY') {
    return true;
  }
  if (
    c.status === 'completed' ||
    c.status === 'reached' ||
    c.status === 'closed'
  ) {
    return true;
  }
  return false;
}

/**
 * Computes loop closure rate for a set of cases within a given time window (in hours).
 * Returns rate as a float between 0 and 1, or null when there are no eligible cases.
 */
export function loopClosureRate(
  cases: LoopClosureCase[],
  windowHours?: number,
  now: number = Date.now()
): number | null {
  if (!cases || cases.length === 0) return null;

  let eligible = cases;
  if (windowHours != null && windowHours > 0) {
    const windowMs = windowHours * 60 * 60 * 1000;
    eligible = cases.filter((c) => {
      const t = c.createdAt ?? c.timestamp;
      if (t == null) return true;
      const timeMs = typeof t === 'number' ? t : new Date(t).getTime();
      if (Number.isNaN(timeMs)) return true;
      return now - timeMs <= windowMs;
    });
  }

  if (eligible.length === 0) return null;

  const closedCount = eligible.filter(isCaseClosed).length;
  const rate = closedCount / eligible.length;
  return Math.round(rate * 100) / 100;
}
