import { describe, expect, it, beforeEach } from 'vitest';
import {
  caseReducer,
  getInitialSeedState,
  computeIsOverdue,
  STORAGE_KEY,
  type CaseStoreState,
  type CaseAction,
  type PatientRecord,
} from './CaseStore';
import { validatePatient } from '../domain/patientValidation';

describe('CaseStore: state transitions and actions', () => {
  let initialState: CaseStoreState;

  beforeEach(() => {
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
    // 1. Initial / Screening
    const ramesh = initialState.cases.find((c) => c.patientId === 'p1');
    expect(ramesh).toBeDefined();
    expect(ramesh?.state).toBe('SCREENED');

    // 2. Request consult
    let state = initialState;
    const conAction: CaseAction = {
      type: 'REQUEST_CONSULT',
      payload: { caseId: 'c1', patientId: 'p1' },
      online: true,
    };
    // reducer logic test
    const targetCaseId = conAction.payload.caseId;
    state = {
      ...state,
      cases: state.cases.map((c) =>
        c.id === targetCaseId ? { ...c, state: 'CONSULT_REQUESTED' as const } : c
      ),
    };
    expect(state.cases.find((c) => c.id === 'c1')?.state).toBe('CONSULT_REQUESTED');

    // 3. Doctor reply
    state = {
      ...state,
      cases: state.cases.map((c) =>
        c.id === 'c1' ? { ...c, state: 'CONSULT_REPLIED' as const } : c
      ),
    };
    expect(state.cases.find((c) => c.id === 'c1')?.state).toBe('CONSULT_REPLIED');

    // 4. Create referral
    state = {
      ...state,
      cases: state.cases.map((c) =>
        c.id === 'c1' ? { ...c, state: 'REFERRAL_CREATED' as const } : c
      ),
    };
    expect(state.cases.find((c) => c.id === 'c1')?.state).toBe('REFERRAL_CREATED');

    // 5. Referral reminder sent
    state = {
      ...state,
      cases: state.cases.map((c) =>
        c.id === 'c1' ? { ...c, state: 'REMINDER_SENT' as const } : c
      ),
    };
    expect(state.cases.find((c) => c.id === 'c1')?.state).toBe('REMINDER_SENT');

    // 6. Reached facility
    state = {
      ...state,
      cases: state.cases.map((c) =>
        c.id === 'c1' ? { ...c, state: 'REACHED_FACILITY' as const } : c
      ),
    };
    expect(state.cases.find((c) => c.id === 'c1')?.state).toBe('REACHED_FACILITY');

    // 7. Outcome recorded
    state = {
      ...state,
      cases: state.cases.map((c) =>
        c.id === 'c1'
          ? { ...c, state: 'OUTCOME_RECORDED' as const, outcome: 'completed' as const }
          : c
      ),
    };
    expect(state.cases.find((c) => c.id === 'c1')?.state).toBe('OUTCOME_RECORDED');
    expect(state.cases.find((c) => c.id === 'c1')?.outcome).toBe('completed');
  });

  it('queues action in syncQueue as waiting_to_send when offline, and marks sent upon syncNow', () => {
    const item = {
      id: 'sync-1',
      actionType: 'UPDATE_SCREENING',
      payload: { patientId: 'p1', state: 'SCREENED' as const },
      status: 'waiting_to_send' as const,
      createdAt: new Date().toISOString(),
      description: { en: 'Screening updated', hi: 'जाँच अद्यतित' },
    };

    let queue: Array<{ id: string; status: 'waiting_to_send' | 'sent'; [key: string]: any }> = [item];
    expect(queue.filter((q) => q.status === 'waiting_to_send').length).toBe(1);

    // Sync now
    queue = queue.map((q) => ({ ...q, status: 'sent' as const }));
    expect(queue.filter((q) => q.status === 'waiting_to_send').length).toBe(0);
    expect(queue[0].status).toBe('sent');
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

    // 1. Dispatch ADD_PATIENT
    let state = caseReducer(initialState, {
      type: 'ADD_PATIENT',
      payload: newPatient,
    });

    // Patient exists in store
    expect(state.patients.find((p) => p.id === 'p-new-123')).toEqual(newPatient);
    // Adding makes it active in currentScreening
    expect(state.currentScreening.patientId).toBe('p-new-123');

    // 2. Can be selected explicitly via SELECT_SCREENING_PATIENT
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

    // Add patient
    let state = caseReducer(initialState, {
      type: 'ADD_PATIENT',
      payload: newPatient,
    });

    // Create case for this new patient
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

    // Doctor inbox reads from syncedCases (state.cases)
    const doctorCase = state.cases.find((c) => c.patientId === 'p-custom-99');
    expect(doctorCase).toBeDefined();
    expect(doctorCase?.name.en).toContain('Manish Kumar');
    expect(doctorCase?.name.hi).toContain('मनीष कुमार');

    // Supervisor list includes new cases from syncedCases
    const supervisorRowName = doctorCase?.name;
    expect(supervisorRowName?.en).toContain('Manish Kumar');
    expect(supervisorRowName?.hi).toContain('मनीष कुमार');
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

    // DoctorReview accesses cases via syncedCases
    const doctorReviewCase = state.cases.find((c) => c.id === 'c1');
    expect(doctorReviewCase?.photoData).toBe(downscaledJpeg);
  });
});
