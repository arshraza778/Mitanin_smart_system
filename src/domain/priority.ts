export type CaseState =
  | 'SCREENED'
  | 'CONSULT_REQUESTED'
  | 'CONSULT_REPLIED'
  | 'REFERRAL_CREATED'
  | 'REMINDER_SENT'
  | 'REACHED_FACILITY'
  | 'OUTCOME_RECORDED';

export type PriorityReason =
  | 'danger signs'
  | 'overdue referral'
  | 'overdue follow-up'
  | 'routine';

export interface PriorityResult {
  rank: 1 | 2 | 3 | 4;
  reason: PriorityReason;
}

export interface CaseLike {
  id?: string;
  hasDangerSigns?: boolean;
  dangerSigns?: boolean | string[];
  symptoms?: string | { en?: string; hi?: string };
  symptomFlags?: string[];
  type?: 'referral' | 'followup' | 'screening' | 'consult' | string;
  isReferral?: boolean;
  isFollowup?: boolean;
  status?: string;
  dueAt?: string | number | null;
  reason?: string | { en?: string; hi?: string };
  priority?: string;
  state?: CaseState | string;
}

const DANGER_KEYWORDS = [
  'danger',
  'unable to feed',
  'unable to drink',
  'fits',
  'convulsion',
  'vomiting everything',
  'lethargic',
  'unconscious',
  'stridor',
  'chest indrawing',
  'very sleepy',
  'pale palms',
];

export function hasDangerSigns(c: CaseLike): boolean {
  if (c.hasDangerSigns === true) return true;
  if (c.dangerSigns === true) return true;
  if (Array.isArray(c.dangerSigns) && c.dangerSigns.length > 0) return true;
  if (Array.isArray(c.symptomFlags)) {
    const dangerSymptomIndices = ['drink', 'fits', 'sleepy', 'palm'];
    if (c.symptomFlags.some((flag) => dangerSymptomIndices.includes(flag))) {
      return true;
    }
  }
  const symptomText =
    typeof c.symptoms === 'string'
      ? c.symptoms
      : `${c.symptoms?.en || ''} ${c.symptoms?.hi || ''}`;
  const lowerSymptom = symptomText.toLowerCase();
  for (const kw of DANGER_KEYWORDS) {
    if (lowerSymptom.includes(kw)) return true;
  }
  return false;
}

export function isOverdueCheck(
  dueAt?: string | number | null,
  now: number = Date.now()
): boolean {
  if (!dueAt) return false;
  const time = typeof dueAt === 'number' ? dueAt : new Date(dueAt).getTime();
  if (Number.isNaN(time)) return false;
  return time < now;
}

/**
 * Returns {rank, reason} in the order:
 * 1. danger signs
 * 2. overdue referral
 * 3. overdue follow-up
 * 4. routine
 */
export function priority(
  caseItem: CaseLike,
  now: number = Date.now()
): PriorityResult {
  // 1. Danger signs (highest priority)
  if (hasDangerSigns(caseItem)) {
    return { rank: 1, reason: 'danger signs' };
  }

  const isOverdue =
    caseItem.status === 'overdue' || isOverdueCheck(caseItem.dueAt, now);

  const reasonText =
    typeof caseItem.reason === 'string'
      ? caseItem.reason.toLowerCase()
      : (caseItem.reason?.en || '').toLowerCase();

  const isFollowup =
    caseItem.type === 'followup' ||
    caseItem.isFollowup === true ||
    reasonText.includes('follow-up') ||
    reasonText.includes('followup');

  const isReferral =
    caseItem.type === 'referral' ||
    caseItem.isReferral === true ||
    caseItem.state === 'REFERRAL_CREATED' ||
    reasonText.includes('referral') ||
    (!isFollowup && Boolean(caseItem.dueAt));

  // 2. Overdue referral
  if (isReferral && isOverdue) {
    return { rank: 2, reason: 'overdue referral' };
  }

  // 3. Overdue follow-up
  if (isFollowup && isOverdue) {
    return { rank: 3, reason: 'overdue follow-up' };
  }

  // Overdue fallback if general overdue status
  if (isOverdue) {
    return { rank: 2, reason: 'overdue referral' };
  }

  // 4. Routine
  return { rank: 4, reason: 'routine' };
}
