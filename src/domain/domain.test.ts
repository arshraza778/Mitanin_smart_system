import { describe, expect, it } from 'vitest';
import { priority, hasDangerSigns, isOverdueCheck } from './priority';
import { loopClosureRate, isCaseClosed } from './loopClosure';
import { validatePatient } from './patientValidation';
import {
  downscaleDimensions,
  handleRetake,
  isCaptureDisabled,
  getVisibleView,
  createCassetteJpeg,
} from './photoUtils';

describe('domain: priority(case)', () => {
  const baseTime = 1700000000000;

  it('ranks danger signs as rank 1', () => {
    const caseDanger = {
      id: 'c-danger-1',
      hasDangerSigns: true,
      dueAt: baseTime - 10000, // even if overdue
      type: 'referral' as const,
    };
    const res = priority(caseDanger, baseTime);
    expect(res).toEqual({ rank: 1, reason: 'danger signs' });
  });

  it('detects danger signs from symptoms text', () => {
    const caseDanger = {
      id: 'c-danger-2',
      symptoms: { en: 'Unable to feed, very sleepy', hi: 'दूध नहीं पी रही' },
    };
    const res = priority(caseDanger, baseTime);
    expect(res.rank).toBe(1);
    expect(res.reason).toBe('danger signs');
  });

  it('detects danger signs from symptom flags', () => {
    const caseDanger = {
      id: 'c-danger-3',
      symptomFlags: ['fits'],
    };
    const res = priority(caseDanger, baseTime);
    expect(res.rank).toBe(1);
  });

  it('ranks overdue referral as rank 2', () => {
    const caseOverdueRef = {
      id: 'c-ref-1',
      type: 'referral' as const,
      dueAt: baseTime - 3600000, // 1 hour ago
    };
    const res = priority(caseOverdueRef, baseTime);
    expect(res).toEqual({ rank: 2, reason: 'overdue referral' });
  });

  it('ranks overdue referral by status and reason', () => {
    const caseOverdue = {
      id: 'c-ref-2',
      status: 'overdue',
      reason: { en: 'Referral not confirmed, 2 days', hi: '' },
    };
    const res = priority(caseOverdue, baseTime);
    expect(res).toEqual({ rank: 2, reason: 'overdue referral' });
  });

  it('ranks overdue follow-up as rank 3', () => {
    const caseOverdueFollowup = {
      id: 'c-fu-1',
      type: 'followup' as const,
      dueAt: baseTime - 1000,
    };
    const res = priority(caseOverdueFollowup, baseTime);
    expect(res).toEqual({ rank: 3, reason: 'overdue follow-up' });
  });

  it('ranks overdue follow-up by reason and status', () => {
    const caseOverdueFollowup = {
      id: 'c-fu-2',
      status: 'overdue',
      reason: 'Follow-up overdue for 1 day',
    };
    const res = priority(caseOverdueFollowup, baseTime);
    expect(res).toEqual({ rank: 3, reason: 'overdue follow-up' });
  });

  it('ranks routine cases as rank 4', () => {
    const caseRoutine = {
      id: 'c-routine-1',
      symptoms: { en: 'Mild cold', hi: 'हल्की सर्दी' },
      dueAt: baseTime + 86400000, // tomorrow, not overdue
      type: 'followup' as const,
    };
    const res = priority(caseRoutine, baseTime);
    expect(res).toEqual({ rank: 4, reason: 'routine' });
  });

  it('respects exact order: danger signs > overdue referral > overdue follow-up > routine', () => {
    // Both danger signs and overdue referral
    const bothDangerAndRef = {
      dangerSigns: true,
      type: 'referral' as const,
      dueAt: baseTime - 1000,
    };
    expect(priority(bothDangerAndRef, baseTime).rank).toBe(1);

    // Overdue referral should rank before overdue follow-up
    const overdueRef = {
      type: 'referral' as const,
      dueAt: baseTime - 1000,
    };
    const overdueFollowup = {
      type: 'followup' as const,
      dueAt: baseTime - 1000,
    };
    expect(priority(overdueRef, baseTime).rank).toBe(2);
    expect(priority(overdueFollowup, baseTime).rank).toBe(3);

    // Routine should rank last
    const routine = {
      type: 'routine' as const,
    };
    expect(priority(routine, baseTime).rank).toBe(4);
  });
});

describe('domain: loopClosureRate(cases, windowHours)', () => {
  const baseTime = 1700000000000;

  it('returns 0 for empty array', () => {
    expect(loopClosureRate([])).toBe(0);
  });

  it('computes 1.0 when all cases are closed', () => {
    const cases = [
      { id: '1', state: 'OUTCOME_RECORDED' },
      { id: '2', state: 'REACHED_FACILITY' },
      { id: '3', closed: true },
    ];
    expect(loopClosureRate(cases)).toBe(1);
  });

  it('computes rate accurately for mixed cases', () => {
    const cases = [
      { id: '1', state: 'OUTCOME_RECORDED' },
      { id: '2', state: 'REACHED_FACILITY' },
      { id: '3', state: 'SCREENED' },
      { id: '4', state: 'CONSULT_REQUESTED' },
    ];
    // 2 out of 4 closed = 0.5
    expect(loopClosureRate(cases)).toBe(0.5);
  });

  it('filters by windowHours when provided', () => {
    const oneHour = 3600000;
    const cases = [
      // Within last 24 hours: 1 closed, 1 open
      { id: '1', state: 'OUTCOME_RECORDED', createdAt: baseTime - 2 * oneHour },
      { id: '2', state: 'SCREENED', createdAt: baseTime - 4 * oneHour },
      // Older than 24 hours: 1 closed (should be excluded)
      { id: '3', state: 'OUTCOME_RECORDED', createdAt: baseTime - 30 * oneHour },
    ];

    // Window 24 hours: only cases 1 and 2 count -> 1 closed out of 2 = 0.5
    expect(loopClosureRate(cases, 24, baseTime)).toBe(0.5);

    // Window 48 hours: all 3 count -> 2 closed out of 3 = 0.67
    expect(loopClosureRate(cases, 48, baseTime)).toBe(0.67);
  });
});

describe('domain: validatePatient (c)', () => {
  it('validation rejects an empty name and an age outside 0 to 120', () => {
    // Empty name
    const emptyNameRes = validatePatient({ name: '', age: 25 }, 'en');
    expect(emptyNameRes.valid).toBe(false);
    expect(emptyNameRes.errors.name).toBeTruthy();

    const whitespaceRes = validatePatient({ name: '   ', age: 25 }, 'hi');
    expect(whitespaceRes.valid).toBe(false);
    expect(whitespaceRes.errors.name).toBeTruthy();

    // Age outside 0 to 120
    const negAgeRes = validatePatient({ name: 'Aarav', age: -1 }, 'en');
    expect(negAgeRes.valid).toBe(false);
    expect(negAgeRes.errors.age).toBeTruthy();

    const highAgeRes = validatePatient({ name: 'Aarav', age: 121 }, 'hi');
    expect(highAgeRes.valid).toBe(false);
    expect(highAgeRes.errors.age).toBeTruthy();

    const nullAgeRes = validatePatient({ name: 'Aarav', age: null }, 'en');
    expect(nullAgeRes.valid).toBe(false);
    expect(nullAgeRes.errors.age).toBeTruthy();

    // Valid cases pass
    expect(validatePatient({ name: 'Aarav', age: 0 }, 'en').valid).toBe(true);
    expect(validatePatient({ name: 'आरव', age: 28 }, 'hi').valid).toBe(true);
    expect(validatePatient({ name: 'Budhram', age: 120 }, 'en').valid).toBe(true);
  });
});

describe('domain: photoUtils & retake behavior (4 & 5)', () => {
  it('downscaleDimensions constrains longest side to 800px and preserves aspect ratio', () => {
    // Landscape: 1600x1200 -> 800x600
    const landscape = downscaleDimensions(1600, 1200, 800);
    expect(landscape.width).toBe(800);
    expect(landscape.height).toBe(600);

    // Portrait: 1200x1600 -> 600x800
    const portrait = downscaleDimensions(1200, 1600, 800);
    expect(portrait.width).toBe(600);
    expect(portrait.height).toBe(800);

    // Square: 2000x2000 -> 800x800
    const square = downscaleDimensions(2000, 2000, 800);
    expect(square.width).toBe(800);
    expect(square.height).toBe(800);

    // Smaller than max: remains unchanged
    const small = downscaleDimensions(640, 480, 800);
    expect(small.width).toBe(640);
    expect(small.height).toBe(480);
  });

  it('generates demo cassette JPEG for sample types', () => {
    const pos = createCassetteJpeg('positive');
    expect(pos).toBeTruthy();
    expect(pos.startsWith('data:image/jpeg')).toBe(true);

    const neg = createCassetteJpeg('negative');
    expect(neg).toBeTruthy();
    expect(neg.startsWith('data:image/jpeg')).toBe(true);

    const inv = createCassetteJpeg('invalid');
    expect(inv).toBeTruthy();
    expect(inv.startsWith('data:image/jpeg')).toBe(true);
  });

  it('retake clears photo, clears result, re-enables capture, and visibly replaces preview with camera or unavailable message', () => {
    // Scenario 1: Camera unavailable mode with demo photo selected
    const stateWithDemo = {
      photo: 'data:image/jpeg;base64,sample-photo-data',
      result: 'positive' as const,
      quality: [true, true, true] as [boolean, boolean, boolean],
      camState: 'unavailable' as const,
    };

    // Before retake: photo preview is visible, capture button is disabled
    expect(getVisibleView(stateWithDemo)).toBe('preview');
    expect(isCaptureDisabled(stateWithDemo)).toBe(true);
    expect(stateWithDemo.result).toBe('positive');

    // Perform retake
    const stateAfterRetake1 = handleRetake(stateWithDemo);

    // Assert visible state change: preview disappears, returns visibly to unavailable message
    expect(stateAfterRetake1.photo).toBeNull();
    expect(stateAfterRetake1.result).toBeNull();
    expect(getVisibleView(stateAfterRetake1)).toBe('unavailable_message');
    expect(isCaptureDisabled(stateAfterRetake1)).toBe(false); // capture is re-enabled

    // Scenario 2: Live camera mode with captured photo
    const stateWithLive = {
      photo: 'data:image/jpeg;base64,captured-camera-frame',
      result: 'negative' as const,
      quality: [true, true, true] as [boolean, boolean, boolean],
      camState: 'ready' as const,
    };

    // Before retake: preview is visible
    expect(getVisibleView(stateWithLive)).toBe('preview');
    expect(isCaptureDisabled(stateWithLive)).toBe(true);

    // Perform retake
    const stateAfterRetake2 = handleRetake(stateWithLive);

    // Assert visible state change: preview disappears, returns visibly to live video stream
    expect(stateAfterRetake2.photo).toBeNull();
    expect(stateAfterRetake2.result).toBeNull();
    expect(getVisibleView(stateAfterRetake2)).toBe('video');
    expect(isCaptureDisabled(stateAfterRetake2)).toBe(false); // capture is re-enabled
  });
});
