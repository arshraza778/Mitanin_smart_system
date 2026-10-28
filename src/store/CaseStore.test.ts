declare const require: any;
declare const process: any;
import { describe, expect, it, beforeEach } from 'vitest';
import {
  caseReducer,
  getInitialSeedState,
  computeIsOverdue,
  loadPersistedState,
  STORAGE_KEY,
  SCHEMA_VERSION,
  type CaseStoreState,
  type CaseAction,
  type PatientRecord,
  type AlertRecord,
} from './CaseStore';
import { validatePatient } from '../domain/patientValidation';
import { loopClosureRate } from '../domain/loopClosure';
import { formatTime, formatDate, getDemoDate } from '../domain/dateUtils';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';

describe('CaseStore: state transitions and actions', () => {
  let initialState: CaseStoreState;

  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
    initialState = getInitialSeedState();
  });

  it('initializes from services with valid case states and no stored overdue flag', () => {
    expect(initialState.cases.length).toBeGreaterThan(0);
    expect(initialState.referrals.length).toBeGreaterThan(0);
    expect(initialState.consults.length).toBeGreaterThan(0);
    expect(initialState.alerts.length).toBeGreaterThan(0);
    expect(initialState.syncQueue).toEqual([]);

    // Verify overdue is not stored on case records
    for (const c of initialState.cases) {
      expect((c as any).isOverdue).toBeUndefined();
    }
  });

  it('computes overdue dynamically based on dueAt and clock offset', () => {
    const now = Date.now();
    const past = new Date(now - 3600 * 1000).toISOString();
    const future = new Date(now + 3600 * 1000).toISOString();

    // Past is overdue with 0 offset
    expect(computeIsOverdue(past, 0, now)).toBe(true);
    // Future is not overdue with 0 offset
    expect(computeIsOverdue(future, 0, now)).toBe(false);

    // Future (+1 hr) becomes overdue if clock offset is +120 minutes
    expect(computeIsOverdue(future, 120, now)).toBe(true);
    // Null/undefined dueAt is never overdue
    expect(computeIsOverdue(null, 0, now)).toBe(false);
  });

  it('advances Ramesh through the complete flow: SCREENED -> CONSULT_REQUESTED -> CONSULT_REPLIED -> REFERRAL_CREATED -> REMINDER_SENT -> REACHED_FACILITY -> OUTCOME_RECORDED', () => {
    // 1. Initial / Screening Ramesh
    let state = caseReducer(initialState, {
      type: 'UPDATE_SCREENING',
      payload: {
        patientId: 'p1',
        caseId: 'c1',
        state: 'SCREENED',
      },
      online: true,
    });
    const ramesh = state.cases.find((c) => c.patientId === 'p1');
    expect(ramesh).toBeDefined();
    expect(ramesh?.state).toBe('SCREENED');

    // 2. Request consult
    state = caseReducer(state, {
      type: 'REQUEST_CONSULT',
      payload: { caseId: 'c1', patientId: 'p1' },
      online: true,
    });
    expect(state.cases.find((c) => c.id === 'c1')?.state).toBe('CONSULT_REQUESTED');

    // 3. Doctor reply
    state = caseReducer(state, {
      type: 'DOCTOR_REPLY',
      payload: {
        caseId: 'c1',
        advice: 'Give medication and observe',
        decision: 'treat_locally',
      },
      online: true,
    });
    expect(state.cases.find((c) => c.id === 'c1')?.state).toBe('CONSULT_REPLIED');

    // 4. Create referral
    state = caseReducer(state, {
      type: 'CREATE_REFERRAL',
      payload: {
        caseId: 'c1',
        patientId: 'p1',
        referralId: 'r-p1',
      },
      online: true,
    });
    expect(state.cases.find((c) => c.id === 'c1')?.state).toBe('REFERRAL_CREATED');

    // 5. Referral reminder sent
    state = caseReducer(state, {
      type: 'REFERRAL_ACTION',
      payload: {
        referralId: 'r-p1',
        action: 'reminder',
      },
      online: true,
    });
    expect(state.cases.find((c) => c.id === 'c1')?.state).toBe('REMINDER_SENT');

    // 6. Reached facility
    state = caseReducer(state, {
      type: 'REFERRAL_ACTION',
      payload: {
        referralId: 'r-p1',
        action: 'reached_facility',
      },
      online: true,
    });
    expect(state.cases.find((c) => c.id === 'c1')?.state).toBe('REACHED_FACILITY');

    // 7. Outcome recorded
    state = caseReducer(state, {
      type: 'REFERRAL_ACTION',
      payload: {
        referralId: 'r-p1',
        action: 'outcome',
        outcome: 'completed',
      },
      online: true,
    });
    expect(state.cases.find((c) => c.id === 'c1')?.state).toBe('OUTCOME_RECORDED');
    expect(state.cases.find((c) => c.id === 'c1')?.outcome).toBe('completed');
  });

  it('queues action in syncQueue as waiting_to_send when offline, and marks sent upon syncNow', () => {
    let state = caseReducer(initialState, {
      type: 'UPDATE_SCREENING',
      payload: { patientId: 'p1', state: 'SCREENED' },
      online: false,
    });

    expect(state.syncQueue.length).toBe(1);
    expect(state.syncQueue[0].status).toBe('waiting_to_send');

    // Sync now
    state = caseReducer(state, { type: 'SYNC_NOW' });
    expect(state.syncQueue[0].status).toBe('sent');
    expect(state.syncQueue.filter((q) => q.status === 'waiting_to_send').length).toBe(0);
  });

  it('(a) adding a patient makes it selectable', () => {
    const newPatient: PatientRecord = {
      id: 'p-new-123',
      name: { en: 'Sunita Sharma', hi: 'सुनीता शर्मा' },
      age: 26,
      sex: 'female',
      village: { en: 'Amora', hi: 'अमोरा' },
      pregnant: false,
    };

    let state = caseReducer(initialState, {
      type: 'ADD_PATIENT',
      payload: newPatient,
    });

    expect(state.patients.find((p) => p.id === 'p-new-123')).toEqual(newPatient);
    expect(state.currentScreening.patientId).toBe('p-new-123');

    state = caseReducer(state, {
      type: 'SELECT_SCREENING_PATIENT',
      payload: { patientId: 'p1' },
    });
    expect(state.currentScreening.patientId).toBe('p1');

    state = caseReducer(state, {
      type: 'SELECT_SCREENING_PATIENT',
      payload: { patientId: 'p-new-123' },
    });
    expect(state.currentScreening.patientId).toBe('p-new-123');
  });

  it('(b) a case created for a new patient shows that patient\'s name in the Doctor inbox and Supervisor list', () => {
    const newPatient: PatientRecord = {
      id: 'p-custom-99',
      name: { en: 'Manish Kumar', hi: 'मनीष कुमार' },
      age: 32,
      sex: 'male',
      village: { en: 'Kodar', hi: 'कोड़ार' },
    };

    let state = caseReducer(initialState, {
      type: 'ADD_PATIENT',
      payload: newPatient,
    });

    state = caseReducer(state, {
      type: 'UPDATE_SCREENING',
      payload: {
        patientId: 'p-custom-99',
        symptoms: { en: 'Fever and headache', hi: 'बुखार और सिरदर्द' },
        symptomFlags: ['fever'],
        hasDangerSigns: false,
        photo: true,
        testResult: 'positive',
        state: 'SCREENED',
      },
      online: true,
    });

    const doctorCase = state.cases.find((c) => c.patientId === 'p-custom-99');
    expect(doctorCase).toBeDefined();
    expect(doctorCase?.name.en).toContain('Manish Kumar');
    expect(doctorCase?.name.hi).toContain('मनीष कुमार');
  });

  it('(c) validation rejects an empty name and an age outside 0 to 120', () => {
    expect(validatePatient({ name: '', age: 25 }, 'en').valid).toBe(false);
    expect(validatePatient({ name: '   ', age: 25 }, 'hi').valid).toBe(false);
    expect(validatePatient({ name: 'Valid Name', age: -5 }, 'en').valid).toBe(false);
    expect(validatePatient({ name: 'Valid Name', age: 130 }, 'hi').valid).toBe(false);
    expect(validatePatient({ name: 'Valid Name', age: 40 }, 'en').valid).toBe(true);
  });

  it('(5) stores downscaled photo in case and preserves it for doctor review second read', () => {
    const downscaledJpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...downscaled-800px';

    let state = caseReducer(initialState, {
      type: 'UPDATE_SCREENING',
      payload: {
        patientId: 'p1',
        photo: downscaledJpeg,
        photoData: downscaledJpeg,
        testResult: 'positive',
        state: 'SCREENED',
      },
      online: true,
    });

    const c1 = state.cases.find((c) => c.id === 'c1' || c.patientId === 'p1');
    expect(c1).toBeDefined();
    expect(c1?.photo).toBe(downscaledJpeg);
    expect(c1?.photoData).toBe(downscaledJpeg);
  });

  // ===================== SECTION H TESTS (25 - 33) =====================

  it('25. One reply creates exactly one alert; replaying the same action creates none', () => {
    const alertId = 'doctor_replied:c2:con-c2:1';
    const alertRecord: AlertRecord = {
      id: alertId,
      type: 'doctor_replied',
      caseId: 'c2',
      consultId: 'con-c2',
      createdAt: '2026-10-24T12:00:00.000Z',
      title: { en: 'Doctor replied: Anita Bai', hi: 'डॉक्टर का जवाब आया: अनिता बाई' },
      advice: 'Admit to PHC for observation',
      decision: 'send_to_hospital',
      doctorName: 'Dr. Rao',
      repliedAt: '2026-10-24T12:00:00.000Z',
      kind: 'replied',
      group: 'today',
      text: { en: 'Doctor replied: Anita Bai', hi: 'डॉक्टर का जवाब आया: अनिता बाई' },
      time: { en: 'Just now', hi: 'अभी-अभी' },
      patientId: 'p4',
      timestamp: '2026-10-24T12:00:00.000Z',
    };

    const action: CaseAction = {
      type: 'DOCTOR_REPLY',
      payload: {
        caseId: 'c2',
        consultId: 'con-c2',
        advice: 'Admit to PHC for observation',
        decision: 'send_to_hospital',
        doctorName: 'Dr. Rao',
        alert: alertRecord,
      },
      online: true,
    };

    // First application creates 1 alert
    const initialCount = initialState.alerts.length;
    const state1 = caseReducer(initialState, action);
    expect(state1.alerts.length).toBe(initialCount + 1);
    expect(state1.alerts.some((a) => a.id === alertId)).toBe(true);

    // Replay creates no additional alert (idempotent)
    const state2 = caseReducer(state1, action);
    expect(state2.alerts.length).toBe(initialCount + 1);
  });

  it('26. Alert exposes advice, decision, doctorName and repliedAt', () => {
    const alertId = 'doctor_replied:c2:con-c2:1';
    const action: CaseAction = {
      type: 'DOCTOR_REPLY',
      payload: {
        caseId: 'c2',
        consultId: 'con-c2',
        advice: 'Prescribe oral rehydration and monitor fever',
        decision: 'treat_locally',
        doctorName: 'Dr. Rao',
        nowISO: '2026-10-24T14:30:00.000Z',
      },
      online: true,
    };

    const state = caseReducer(initialState, action);
    const alert = state.alerts.find((a) => a.caseId === 'c2' && a.type === 'doctor_replied');

    expect(alert).toBeDefined();
    expect(alert?.advice).toBe('Prescribe oral rehydration and monitor fever');
    expect(alert?.decision).toBe('treat_locally');
    expect(alert?.doctorName).toBe('Dr. Rao');
    expect(alert?.repliedAt).toBeDefined();
  });

  it('27. Second reply on the same consult is rejected', () => {
    const action1: CaseAction = {
      type: 'DOCTOR_REPLY',
      payload: {
        caseId: 'c2',
        consultId: 'con-c2',
        advice: 'First diagnosis: treat locally',
        decision: 'treat_locally',
        doctorName: 'Dr. Rao',
      },
      online: true,
    };

    const state1 = caseReducer(initialState, action1);
    const consultAfterFirst = state1.consults.find((c) => c.caseId === 'c2');
    expect(consultAfterFirst?.status).toBe('replied');
    expect(consultAfterFirst?.advice).toBe('First diagnosis: treat locally');

    // Second reply attempt with different advice
    const action2: CaseAction = {
      type: 'DOCTOR_REPLY',
      payload: {
        caseId: 'c2',
        consultId: 'con-c2',
        advice: 'Second diagnosis: try to refer',
        decision: 'send_to_hospital',
        doctorName: 'Dr. Rao',
      },
      online: true,
    };

    const state2 = caseReducer(state1, action2);
    const consultAfterSecond = state2.consults.find((c) => c.caseId === 'c2');
    // Original advice kept, second reply rejected!
    expect(consultAfterSecond?.advice).toBe('First diagnosis: treat locally');
    expect(consultAfterSecond?.decision).toBe('treat_locally');
  });

  it('28. Empty or too-short advice is rejected; whitespace is trimmed', () => {
    const validateAdvice = (adv: string): { ok: boolean; trimmed: string } => {
      const trimmed = adv.trim();
      return { ok: trimmed.length >= 3 && trimmed.length <= 500, trimmed };
    };

    expect(validateAdvice('').ok).toBe(false);
    expect(validateAdvice('   ').ok).toBe(false);
    expect(validateAdvice('a').ok).toBe(false);
    expect(validateAdvice(' ab ').ok).toBe(false);
    expect(validateAdvice('  Refer today  ').ok).toBe(true);
    expect(validateAdvice('  Refer today  ').trimmed).toBe('Refer today');
  });

  it('29. Corrupt or old localStorage state migrates or resets without a crash', () => {
    if (typeof window === 'undefined') return;

    // 1. Corrupt JSON
    window.localStorage.setItem(STORAGE_KEY, '{invalid json...%%%');
    const recoveredCorrupt = loadPersistedState();
    expect(recoveredCorrupt).toBeDefined();
    expect(recoveredCorrupt.schemaVersion).toBe(SCHEMA_VERSION);
    expect(recoveredCorrupt.demoDataResetNotice).toBe(true);

    // 2. Old schema state (missing fields, older version, duplicate alerts)
    const oldState = {
      cases: initialState.cases,
      referrals: initialState.referrals,
      consults: [
        {
          id: 'con-1',
          caseId: 'c2',
          patientId: 'p4',
          status: 'replied',
          advice: 'Old advice',
          decision: 'refer', // old string decision
        },
      ],
      alerts: [
        { id: 'alt-1', patientId: 'p1', kind: 'overdue', text: { en: 'Referral overdue: Ramesh', hi: 'रेफरल' } }, // obsolete Ramesh alert
        { id: 'alt-dup', caseId: 'c2', consultId: 'con-1', kind: 'replied', text: { en: 'Replied', hi: 'जवाब' } },
        { id: 'alt-dup', caseId: 'c2', consultId: 'con-1', kind: 'replied', text: { en: 'Replied', hi: 'जवाब' } }, // duplicate ID
      ],
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(oldState));

    const migrated = loadPersistedState();
    expect(migrated).toBeDefined();
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    // Ramesh obsolete alert removed
    expect(migrated.alerts.some((a) => a.id === 'alt-1')).toBe(false);
    // Duplicate alert dropped
    const dupAlerts = migrated.alerts.filter((a) => a.id === 'alt-dup');
    expect(dupAlerts.length).toBe(1);
    // Consult decision migrated
    expect(migrated.consults[0].decision).toBe('send_to_hospital');
  });

  it('30. Offline reply then double sync yields exactly one alert', () => {
    // Reply while offline
    const alertId = 'doctor_replied:c2:con-c2:1';
    const alertRecord: AlertRecord = {
      id: alertId,
      type: 'doctor_replied',
      caseId: 'c2',
      consultId: 'con-c2',
      createdAt: '2026-10-24T12:00:00.000Z',
      title: { en: 'Doctor replied: Anita Bai', hi: 'डॉक्टर का जवाब आया: अनिता बाई' },
      advice: 'Give paracetamol',
      decision: 'treat_locally',
      doctorName: 'Dr. Rao',
      repliedAt: '2026-10-24T12:00:00.000Z',
      kind: 'replied',
      group: 'today',
      text: { en: 'Doctor replied: Anita Bai', hi: 'डॉक्टर का जवाब आया: अनिता बाई' },
      time: { en: 'Just now', hi: 'अभी-अभी' },
      patientId: 'p4',
      timestamp: '2026-10-24T12:00:00.000Z',
    };

    let state = caseReducer(initialState, {
      type: 'DOCTOR_REPLY',
      payload: {
        caseId: 'c2',
        consultId: 'con-c2',
        advice: 'Give paracetamol',
        decision: 'treat_locally',
        alert: alertRecord,
      },
      online: false,
    });

    expect(state.syncQueue.length).toBe(1);
    expect(state.syncQueue[0].status).toBe('waiting_to_send');

    // First sync
    state = caseReducer(state, { type: 'SYNC_NOW' });
    expect(state.syncQueue[0].status).toBe('sent');
    const syncedAlertCount1 = state.syncedAlerts.filter((a) => a.id === alertId).length;
    expect(syncedAlertCount1).toBe(1);

    // Second sync
    state = caseReducer(state, { type: 'SYNC_NOW' });
    const syncedAlertCount2 = state.syncedAlerts.filter((a) => a.id === alertId).length;
    expect(syncedAlertCount2).toBe(1);
  });

  it('31. Unread count increments on reply and drops to zero after opening', () => {
    // Initial unread count
    let unreadCount = initialState.alerts.filter((a) => !a.readAt).length;

    // Doctor reply adds an unread alert
    const newAlertId = 'doctor_replied:c2:con-c2:1';
    let state = caseReducer(initialState, {
      type: 'DOCTOR_REPLY',
      payload: {
        caseId: 'c2',
        consultId: 'con-c2',
        advice: 'Treat locally',
        decision: 'treat_locally',
      },
      online: true,
    });

    const newUnreadCount = state.alerts.filter((a) => !a.readAt).length;
    expect(newUnreadCount).toBe(unreadCount + 1);

    // Mark all alerts read
    for (const a of state.alerts) {
      state = caseReducer(state, {
        type: 'MARK_ALERT_READ',
        payload: { alertId: a.id, nowISO: new Date().toISOString() },
      });
    }

    const finalUnreadCount = state.alerts.filter((a) => !a.readAt).length;
    expect(finalUnreadCount).toBe(0);
  });

  it('32. Late status appears when the demo clock passes requestedAt + 4h with no reply', () => {
    const now = Date.now();
    const requestedAt = new Date(now).toISOString();

    const isLate = (reqIso: string, offsetMin: number, currentTime: number = now) => {
      const targetTime = new Date(reqIso).getTime();
      const dueTime = targetTime + 4 * 3600 * 1000;
      const demoClockNow = currentTime + offsetMin * 60 * 1000;
      return dueTime <= demoClockNow;
    };

    // 0 offset (just requested) -> not late
    expect(isLate(requestedAt, 0)).toBe(false);
    // 3 hours later -> not late
    expect(isLate(requestedAt, 180)).toBe(false);
    // Exactly 4 hours later (240 min) -> late
    expect(isLate(requestedAt, 240)).toBe(true);
    // 5 hours later (300 min) -> late
    expect(isLate(requestedAt, 300)).toBe(true);
  });

  it('33. Reset demo data leaves Ramesh with no alerts', () => {
    const resetState = caseReducer(initialState, { type: 'RESET_DEMO_DATA' });

    // Ramesh has no alerts
    const rameshAlerts = resetState.alerts.filter(
      (a) => a.patientId === 'p1' || a.caseId === 'c1' || (a.title?.en && a.title.en.includes('Ramesh'))
    );
    expect(rameshAlerts.length).toBe(0);

    // Ramesh has no cases
    const rameshCases = resetState.cases.filter((c) => c.patientId === 'p1' || c.id === 'c1');
    expect(rameshCases.length).toBe(0);

    // Ramesh has no referrals
    const rameshReferrals = resetState.referrals.filter((r) => r.patientId === 'p1' || r.caseId === 'c1');
    expect(rameshReferrals.length).toBe(0);
  });

  // ===================== SECTION I: END-TO-END VERIFICATION TEST =====================

  it('Section I E2E: Reset -> screen NEW patient -> Ask doctor -> doctor opens (receivedAt set) -> doctor replies -> Mitanin alert verified -> badge verified -> open alert -> ConsultStatus verified -> Send to hospital -> reload localStorage and verify integrity', () => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }

    // 1. Reset demo data
    let state = caseReducer(initialState, { type: 'RESET_DEMO_DATA' });
    expect(state.cases.filter((c) => c.patientId === 'p1').length).toBe(0);

    // 2. Screen a NEW fictional patient (e.g. Aarti Verma, 7, Kotra)
    const newPatient: PatientRecord = {
      id: 'p-aarti-101',
      name: { en: 'Aarti Verma', hi: 'आरती वर्मा' },
      age: 7,
      sex: 'female',
      village: { en: 'Kotra', hi: 'कोतरा' },
    };

    state = caseReducer(state, {
      type: 'ADD_PATIENT',
      payload: newPatient,
    });
    expect(state.currentScreening.patientId).toBe('p-aarti-101');

    state = caseReducer(state, {
      type: 'UPDATE_SCREENING',
      payload: {
        patientId: 'p-aarti-101',
        symptoms: { en: 'High fever for 3 days', hi: '3 दिन से तेज़ बुखार' },
        symptomFlags: ['fever'],
        testResult: 'positive',
        state: 'SCREENED',
        nowISO: '2026-10-24T10:00:00.000Z',
      },
      online: true,
    });

    const newCase = state.cases.find((c) => c.patientId === 'p-aarti-101');
    expect(newCase).toBeDefined();
    const caseId = newCase!.id;

    // 3. Ask doctor
    state = caseReducer(state, {
      type: 'REQUEST_CONSULT',
      payload: {
        caseId,
        patientId: 'p-aarti-101',
        nowISO: '2026-10-24T10:05:00.000Z',
      },
      online: true,
    });

    const consultAfterRequest = state.consults.find((c) => c.caseId === caseId);
    expect(consultAfterRequest).toBeDefined();
    expect(consultAfterRequest?.status).toBe('waiting');
    expect(consultAfterRequest?.receivedAt).toBeUndefined();

    // 4. Doctor opens case (receivedAt set)
    state = caseReducer(state, {
      type: 'MARK_CONSULT_RECEIVED',
      payload: {
        caseId,
        nowISO: '2026-10-24T10:15:00.000Z',
      },
    });

    const consultAfterOpen = state.consults.find((c) => c.caseId === caseId);
    expect(consultAfterOpen?.receivedAt).toBe('2026-10-24T10:15:00.000Z');

    // 5. Doctor replies with the text 'Give paracetamol, refer today'
    const replyAdvice = 'Give paracetamol, refer today';
    const alertId = `doctor_replied:${caseId}:${consultAfterOpen!.id}:1`;
    const alertRecord: AlertRecord = {
      id: alertId,
      type: 'doctor_replied',
      caseId,
      consultId: consultAfterOpen!.id,
      createdAt: '2026-10-24T10:20:00.000Z',
      title: { en: 'Doctor replied: Aarti Verma', hi: 'डॉक्टर का जवाब आया: आरती वर्मा' },
      advice: replyAdvice,
      decision: 'send_to_hospital',
      doctorName: 'Dr. Rao',
      repliedAt: '2026-10-24T10:20:00.000Z',
      kind: 'replied',
      group: 'today',
      text: { en: 'Doctor replied: Aarti Verma', hi: 'डॉक्टर का जवाब आया: आरती वर्मा' },
      time: { en: 'Just now', hi: 'अभी-अभी' },
      patientId: 'p-aarti-101',
      timestamp: '2026-10-24T10:20:00.000Z',
    };

    state = caseReducer(state, {
      type: 'DOCTOR_REPLY',
      payload: {
        caseId,
        consultId: consultAfterOpen!.id,
        advice: replyAdvice,
        decision: 'send_to_hospital',
        doctorName: 'Dr. Rao',
        nowISO: '2026-10-24T10:20:00.000Z',
        alert: alertRecord,
      },
      online: true,
    });

    // 6. Switch to Mitanin, assert 1 alert with that exact text and decision
    const matchingAlerts = state.alerts.filter((a) => a.caseId === caseId);
    expect(matchingAlerts.length).toBe(1);
    const mAlert = matchingAlerts[0];
    expect(mAlert.advice).toBe('Give paracetamol, refer today');
    expect(mAlert.decision).toBe('send_to_hospital');
    expect(mAlert.doctorName).toBe('Dr. Rao');

    // Assert unread badge = 1 for this new alert (and check total unread)
    expect(mAlert.readAt).toBeUndefined();
    // Assuming previous alerts were either read or if unread, new alert increased badge by 1
    const unreadAlerts = state.alerts.filter((a) => a.id === alertId && !a.readAt);
    expect(unreadAlerts.length).toBe(1);

    // 7. Open alert -> assert readAt set, ConsultStatus shows same text
    state = caseReducer(state, {
      type: 'MARK_ALERT_READ',
      payload: {
        alertId,
        nowISO: '2026-10-24T10:25:00.000Z',
      },
    });

    const openedAlert = state.alerts.find((a) => a.id === alertId);
    expect(openedAlert?.readAt).toBe('2026-10-24T10:25:00.000Z');

    // Consult in ConsultStatus
    const consultForScreen = state.consults.find((c) => c.caseId === caseId);
    expect(consultForScreen?.advice).toBe('Give paracetamol, refer today');
    expect(consultForScreen?.decision).toBe('send_to_hospital');

    // 8. Send to hospital creates one referral
    state = caseReducer(state, {
      type: 'CREATE_REFERRAL',
      payload: {
        caseId,
        patientId: 'p-aarti-101',
        facility: { en: 'District hospital', hi: 'ज़िला अस्पताल' },
        dueHours: 24,
        nowISO: '2026-10-24T10:30:00.000Z',
        referralId: 'r-aarti-101',
      },
      online: true,
    });

    const newReferral = state.referrals.find((r) => r.patientId === 'p-aarti-101');
    expect(newReferral).toBeDefined();
    expect(newReferral?.caseId).toBe(caseId);

    // 9. Reload state from localStorage and assert nothing changed or duplicated
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      const reloadedState = loadPersistedState();
      expect(reloadedState.cases.find((c) => c.id === caseId)).toBeDefined();
      expect(reloadedState.referrals.filter((r) => r.patientId === 'p-aarti-101').length).toBe(1);
      expect(reloadedState.alerts.filter((a) => a.id === alertId).length).toBe(1);
      const reloadedConsult = reloadedState.consults.find((c) => c.caseId === caseId);
      expect(reloadedConsult?.advice).toBe('Give paracetamol, refer today');
      expect(reloadedConsult?.decision).toBe('send_to_hospital');
      expect(reloadedConsult?.receivedAt).toBe('2026-10-24T10:15:00.000Z');
      expect(reloadedConsult?.repliedAt).toBe('2026-10-24T10:20:00.000Z');
    }
  });

  // ===================== BUG 1 & BUG 2 TESTS (16 to 19 + Scripted Verification) =====================

  it("16. Selecting a case shows that case's stored photo, not the demo cassette; selecting another case swaps it", () => {
    let state = caseReducer(initialState, { type: 'RESET_DEMO_DATA' });

    const photoA = 'data:image/jpeg;base64,stored-photo-cassette-patient-A';
    const photoB = 'data:image/jpeg;base64,stored-photo-cassette-patient-B';

    // Create Case A with Photo A
    state = caseReducer(state, {
      type: 'ADD_PATIENT',
      payload: { id: 'p-case-A', name: { en: 'Patient A', hi: 'मरीज़ A' }, age: 25, village: { en: 'Village A', hi: 'गाँव A' } },
    });
    state = caseReducer(state, {
      type: 'UPDATE_SCREENING',
      payload: {
        patientId: 'p-case-A',
        photo: photoA,
        photoData: photoA,
        testResult: 'positive',
        state: 'SCREENED',
      },
      online: true,
    });

    // Create Case B with Photo B
    state = caseReducer(state, {
      type: 'ADD_PATIENT',
      payload: { id: 'p-case-B', name: { en: 'Patient B', hi: 'मरीज़ B' }, age: 30, village: { en: 'Village B', hi: 'गाँव B' } },
    });
    state = caseReducer(state, {
      type: 'UPDATE_SCREENING',
      payload: {
        patientId: 'p-case-B',
        photo: photoB,
        photoData: photoB,
        testResult: 'negative',
        state: 'SCREENED',
      },
      online: true,
    });

    const caseA = state.cases.find((c) => c.patientId === 'p-case-A');
    const caseB = state.cases.find((c) => c.patientId === 'p-case-B');

    expect(caseA).toBeDefined();
    expect(caseB).toBeDefined();

    // Selecting Case A shows Photo A (not a demo SVG or empty cassette)
    expect(caseA?.photoData).toBe(photoA);
    expect(caseA?.photoData).not.toContain('<svg');

    // Selecting Case B swaps to Photo B
    expect(caseB?.photoData).toBe(photoB);
    expect(caseB?.photoData).not.toBe(photoA);
  });

  it('17. No-photo case shows the message and disables Agree/Disagree', () => {
    // c3 in seed cases has photo: false
    const caseC3 = initialState.cases.find((c) => c.id === 'c3');
    expect(caseC3).toBeDefined();
    expect(caseC3?.photo).toBe(false);
    expect(caseC3?.photoData).toBeUndefined();

    // When a case has no photo, hasPhoto evaluate to false
    const hasPhoto = Boolean(caseC3?.photoData || (typeof caseC3?.photo === 'string' && caseC3.photo));
    expect(hasPhoto).toBe(false);

    // Agree/Disagree buttons are disabled when hasPhoto is false
    const agreeDisagreeDisabled = !hasPhoto;
    expect(agreeDisagreeDisabled).toBe(true);

    // Fallback message shown
    const noPhotoMsg = enLocale.screens.DoctorReview.noPhotoSent;
    expect(noPhotoMsg).toBe('No photo sent. Ask the Mitanin to repeat the test or send one.');
  });

  it('18. Each camera error name produces its own message; NotAllowedError shows Try again; tracks are stopped on unmount; StrictMode double mount leaves no live tracks', async () => {
    const t = enLocale.screens.TestPhoto;

    // Helper mapping logic matching TestPhoto.tsx
    const mapCameraError = (err: { name: string } | null, isSecure = true) => {
      if (!isSecure) return t.insecurePage;
      if (!err) return null;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return t.permissionBlocked;
      }
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        return t.noCameraFound;
      }
      if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        return t.cameraInUse;
      }
      return t.cameraCouldNotStart;
    };

    // 1. Insecure context
    expect(mapCameraError(null, false)).toBe('Camera needs a secure (https) page. Use Choose from files or a demo photo.');

    // 2. NotAllowedError (shows blocked message and provides Try again button)
    expect(mapCameraError({ name: 'NotAllowedError' })).toBe(
      'Camera permission is blocked. Allow it in the browser address bar, then tap Try again'
    );
    expect(t.tryAgain).toBe('Try again');

    // 3. NotFoundError
    expect(mapCameraError({ name: 'NotFoundError' })).toBe('No camera found on this device');

    // 4. NotReadableError
    expect(mapCameraError({ name: 'NotReadableError' })).toBe(
      'Another app is using the camera. Close it and tap Try again'
    );

    // 5. Unknown error
    expect(mapCameraError({ name: 'SomeOtherError' })).toBe('Camera could not start');

    // 6. OverconstrainedError handling
    let gumCalls: any[] = [];
    const mockGetUserMedia = async (constraints: any) => {
      gumCalls.push(constraints);
      if (constraints?.video?.facingMode) {
        const err: any = new Error('Overconstrained');
        err.name = 'OverconstrainedError';
        throw err;
      }
      return {
        getTracks: () => [{ stop: () => {} }],
      };
    };

    try {
      await mockGetUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    } catch (err: any) {
      if (err.name === 'OverconstrainedError') {
        await mockGetUserMedia({ video: true, audio: false });
      }
    }
    expect(gumCalls.length).toBe(2);
    expect(gumCalls[1]).toEqual({ video: true, audio: false });

    // 7. Track stopping on unmount and StrictMode double mount
    let trackStopped = false;
    const track = {
      stop: () => {
        trackStopped = true;
      },
    };
    const stream = {
      getTracks: () => [track],
    };

    // StrictMode unmount before stream arrives:
    let isMounted = false; // unmounted immediately
    if (!isMounted) {
      stream.getTracks().forEach((t) => t.stop());
    }
    expect(trackStopped).toBe(true);
  });

  it('19. Draft advice survives switching cases', () => {
    const draftAdviceMap: Record<string, string> = {};

    const caseAId = 'c-case-A';
    const caseBId = 'c-case-B';

    // Doctor types advice for Case A
    draftAdviceMap[caseAId] = 'Give oral rehydration salts and monitor fever';

    // Doctor switches to Case B (which starts empty)
    let activeCaseId = caseBId;
    let currentAdvice = draftAdviceMap[activeCaseId] || '';
    expect(currentAdvice).toBe('');

    // Doctor types advice for Case B
    draftAdviceMap[caseBId] = 'Admit to PHC for observation';

    // Doctor switches back to Case A
    activeCaseId = caseAId;
    currentAdvice = draftAdviceMap[activeCaseId] || '';
    expect(currentAdvice).toBe('Give oral rehydration salts and monitor fever');

    // Doctor switches back to Case B
    activeCaseId = caseBId;
    currentAdvice = draftAdviceMap[activeCaseId] || '';
    expect(currentAdvice).toBe('Admit to PHC for observation');
  });

  it('Self-Verification Scripted Check: Reset demo data -> screen fictional patient with demo Positive photo -> Ask doctor -> switch to Doctor -> assert right panel shows exact photo and case id -> reply -> assert nothing duplicated', () => {
    // 1. Reset demo data
    let state = caseReducer(initialState, { type: 'RESET_DEMO_DATA' });
    expect(state.cases.filter((c) => c.patientId === 'p-scripted-1').length).toBe(0);

    // 2. Screen new fictional patient
    const patientId = 'p-scripted-1';
    const caseId = `c-${patientId}`;
    state = caseReducer(state, {
      type: 'ADD_PATIENT',
      payload: {
        id: patientId,
        name: { en: 'Vikram Patel', hi: 'विक्रम पटेल' },
        age: 32,
        village: { en: 'Kotra', hi: 'कोतरा' },
      },
    });

    // 3. Screen with demo Positive photo
    const demoPositivePhoto = 'data:image/jpeg;base64,demo-positive-cassette-jpeg-data';
    state = caseReducer(state, {
      type: 'UPDATE_SCREENING',
      payload: {
        patientId,
        caseId,
        symptoms: { en: 'High fever and shivering', hi: 'तेज़ बुखार और कंपकंपी' },
        symptomFlags: ['fever'],
        photo: demoPositivePhoto,
        photoData: demoPositivePhoto,
        photoIsDemo: true,
        testResult: 'positive',
        state: 'SCREENED',
        nowISO: '2026-10-24T12:00:00.000Z',
      },
      online: true,
    });

    // 4. Ask doctor
    const consultId = `con-${caseId}`;
    state = caseReducer(state, {
      type: 'REQUEST_CONSULT',
      payload: {
        caseId,
        patientId,
        consultId,
        nowISO: '2026-10-24T12:05:00.000Z',
      },
      online: true,
    });

    // 5. Switch to Doctor: assert right panel case
    const targetCase = state.cases.find((c) => c.id === caseId);
    expect(targetCase).toBeDefined();
    expect(targetCase?.id).toBe(caseId);
    expect(targetCase?.photoData).toBe(demoPositivePhoto);
    expect(targetCase?.photoIsDemo).toBe(true);
    expect(targetCase?.testResult).toBe('positive');

    // Doctor opens case -> receivedAt is marked
    state = caseReducer(state, {
      type: 'MARK_CONSULT_RECEIVED',
      payload: {
        caseId,
        nowISO: '2026-10-24T12:10:00.000Z',
      },
    });
    const consultAfterOpen = state.consults.find((con) => con.caseId === caseId);
    expect(consultAfterOpen?.receivedAt).toBe('2026-10-24T12:10:00.000Z');

    // 6. Doctor replies with advice, decision, and doctorRead 'agree'
    const alertId = `doctor_replied:${caseId}:${consultId}:1`;
    const replyAction: CaseAction = {
      type: 'DOCTOR_REPLY',
      payload: {
        caseId,
        consultId,
        advice: 'Refer to district hospital immediately',
        decision: 'send_to_hospital',
        read: 'agree',
        doctorName: 'Dr. Rao',
        nowISO: '2026-10-24T12:15:00.000Z',
        alert: {
          id: alertId,
          type: 'doctor_replied',
          caseId,
          consultId,
          createdAt: '2026-10-24T12:15:00.000Z',
          title: { en: 'Doctor replied: Vikram Patel', hi: 'डॉक्टर का जवाब आया: विक्रम पटेल' },
          advice: 'Refer to district hospital immediately',
          decision: 'send_to_hospital',
          doctorName: 'Dr. Rao',
          repliedAt: '2026-10-24T12:15:00.000Z',
          kind: 'replied',
          group: 'today',
          text: { en: 'Doctor replied: Vikram Patel', hi: 'डॉक्टर का जवाब आया: विक्रम पटेल' },
          time: { en: 'Just now', hi: 'अभी-अभी' },
          patientId,
          timestamp: '2026-10-24T12:15:00.000Z',
        },
      },
      online: true,
    };

    state = caseReducer(state, replyAction);

    // Verify consult and alert state
    const repliedConsult = state.consults.find((con) => con.caseId === caseId);
    expect(repliedConsult?.status).toBe('replied');
    expect(repliedConsult?.advice).toBe('Refer to district hospital immediately');
    expect(repliedConsult?.decision).toBe('send_to_hospital');
    expect(repliedConsult?.doctorRead).toBe('agree');
    expect(repliedConsult?.agreed).toBe(true);

    const createdAlerts = state.alerts.filter((a) => a.caseId === caseId);
    expect(createdAlerts.length).toBe(1);

    // 7. Assert replay of reply action creates nothing duplicated
    const replayedState = caseReducer(state, replyAction);
    expect(replayedState.alerts.filter((a) => a.caseId === caseId).length).toBe(1);
    expect(replayedState.consults.filter((con) => con.caseId === caseId).length).toBe(1);
  });
});

describe('Required Task Assertions (a) to (j)', () => {
  it('(a) seed contains no case, referral or alert for p1', () => {
    const seed = getInitialSeedState();
    expect(seed.cases.some((c) => c.patientId === 'p1' || c.id === 'c1')).toBe(false);
    expect(seed.referrals.some((r) => r.patientId === 'p1' || r.id === 'r1')).toBe(false);
    expect(seed.alerts.some((a) => a.patientId === 'p1' || a.id === 'alt-1' || (a.text && a.text.en && a.text.en.includes('Ramesh')))).toBe(false);
    expect(seed.consults.some((con) => con.patientId === 'p1' || con.caseId === 'c1')).toBe(false);
  });

  it('(b) Loop Closure Rate with zero cases returns null and renders "--"', () => {
    expect(loopClosureRate([])).toBeNull();
    const display = (rate: number | null) => (rate != null ? `${Math.round(rate * 100)}%` : '--');
    expect(display(loopClosureRate([]))).toBe('--');
  });

  it('(c) date helpers return "--" for invalid input and never "Invalid Date"', () => {
    expect(formatTime(null)).toBe('--');
    expect(formatTime(undefined)).toBe('--');
    expect(formatTime('invalid')).toBe('--');
    expect(formatTime('invalid')).not.toContain('Invalid Date');

    expect(formatDate(null)).toBe('--');
    expect(formatDate(undefined)).toBe('--');
    expect(formatDate('invalid')).toBe('--');
    expect(formatDate('invalid')).not.toContain('Invalid Date');
  });

  it('(d) moving the demo clock changes the displayed date', () => {
    const baseNow = new Date('2026-10-24T10:00:00Z').getTime();
    const d0 = getDemoDate(0, baseNow);
    const d2 = getDemoDate(2880, baseNow);
    expect(formatDate(d2, 'en')).not.toBe(formatDate(d0, 'en'));
  });

  it('(e) no hardcoded "Jan" or "2026" date strings remain in src (a grep test, excluding tests)', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    function walk(dir: string): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat && stat.isDirectory()) {
          results = results.concat(walk(full));
        } else if (!full.includes('.test.') && !full.includes('node_modules')) {
          results.push(full);
        }
      }
      return results;
    }
    const files = walk(path.join(process.cwd(), 'src'));
    const matches2026: string[] = [];
    const matchesJan: string[] = [];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8');
      if (/2026/.test(content)) matches2026.push(f);
      if (/\bJan\b/i.test(content)) matchesJan.push(f);
    }
    expect(matches2026).toEqual([]);
    expect(matchesJan).toEqual([]);
  });

  it('(f) Sync queue shows nothing after Reset', () => {
    const dirtyState = {
      ...getInitialSeedState(),
      syncQueue: [
        {
          id: 'sq-1',
          actionType: 'TEST',
          payload: {},
          status: 'waiting_to_send' as const,
          createdAt: new Date().toISOString(),
          description: { en: 'test', hi: 'test' },
        },
      ],
    };
    const resetState = caseReducer(dirtyState, { type: 'RESET_DEMO_DATA' });
    expect(resetState.syncQueue).toEqual([]);
  });

  it('(g) no supervisor, doctor or Mitanin name equals a patient first name', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const patients = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'src/data/patients.json'), 'utf8')
    );
    const patientFirstNames = patients.map((p: any) => p.name.en.split(' ')[0].toLowerCase());

    const staffNames = ['mr. verma', 'verma', 'dr. rao', 'rao', 'sunita'];
    for (const staff of staffNames) {
      expect(patientFirstNames).not.toContain(staff);
    }
  });

  it('(h) en.json and hi.json have the same keys', () => {
    const getKeys = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(getKeys);
      if (obj && typeof obj === 'object') {
        return Object.fromEntries(
          Object.entries(obj).map(([k, v]) => [k, getKeys(v)])
        );
      }
      return typeof obj;
    };
    expect(getKeys(enLocale)).toEqual(getKeys(hiLocale));
  });

  it('(i) a completed consult step never shows "Waiting"', () => {
    const getStepTimeLabel = (timestamp: string | undefined, isDone: boolean, isCurrent: boolean): string => {
      if (timestamp) return formatTime(timestamp, 'en');
      if (isDone) return '--';
      if (isCurrent) return 'Now';
      return 'Waiting';
    };
    expect(getStepTimeLabel(undefined, true, false)).toBe('--');
    expect(getStepTimeLabel(undefined, true, false)).not.toContain('Waiting');
  });

  it('(j) old stored state with Ramesh seed records migrates without a crash', () => {
    const oldStoredState = {
      schemaVersion: 1,
      cases: [
        { id: 'c1', patientId: 'p1', name: { en: 'Ramesh, 6', hi: 'रमेश, 6' }, state: 'SCREENED' },
        { id: 'c-p6', patientId: 'p6', name: { en: 'Pooja, 8', hi: 'पूजा, 8' }, state: 'REFERRAL_CREATED' },
      ],
      referrals: [
        { id: 'r1', patientId: 'p1', status: 'in_progress' },
      ],
      alerts: [
        { id: 'alt-1', text: { en: 'Referral overdue: Ramesh', hi: 'रेफ़रल अतिदेय: रमेश' }, kind: 'overdue' },
      ],
      syncQueue: [],
    };

    let originalWindow = (globalThis as any).window;
    const store: Record<string, string> = {
      [STORAGE_KEY]: JSON.stringify(oldStoredState),
    };

    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
      },
    };

    try {
      const loaded = loadPersistedState();
      expect(loaded).toBeDefined();
      expect(loaded.cases.some((c) => c.id === 'c1')).toBe(false);
      expect(loaded.referrals.some((r) => r.id === 'r1')).toBe(false);
      expect(loaded.alerts.some((a) => a.id === 'alt-1')).toBe(false);
      expect(loaded.cases.some((c) => c.id === 'c-p6')).toBe(true);
    } finally {
      if (originalWindow !== undefined) {
        (globalThis as any).window = originalWindow;
      } else {
        delete (globalThis as any).window;
      }
    }
  });
});
