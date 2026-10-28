import { describe, expect, it, beforeEach } from 'vitest';
import {
  caseReducer,
  getInitialSeedState,
  generateCaseId,
  loadPersistedState,
  STORAGE_KEY,
  SCHEMA_VERSION,
  type CaseStoreState,
  type CaseRecord,
} from '../store/CaseStore';

declare const require: any;
declare const process: any;
const fs = require('node:fs');
const path = require('node:path');

// Node localStorage mock shim
const memStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => memStore[key] ?? null,
  setItem: (key: string, val: string) => {
    memStore[key] = String(val);
  },
  removeItem: (key: string) => {
    delete memStore[key];
  },
  clear: () => {
    for (const k in memStore) delete memStore[k];
  },
};

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = globalThis;
}
if (!(globalThis as any).window.localStorage) {
  (globalThis as any).window.localStorage = mockLocalStorage;
}
if (!globalThis.localStorage) {
  (globalThis as any).localStorage = mockLocalStorage;
}

describe('Phase 2 vitest tests: Case identity & removal of p1/c1 fallbacks', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  // (a) reply to Anita Markam creates 1 alert, none for Anita Netam (add Anita Netam to seed as a fictional patient in Dhanora)
  it('(a) reply to Anita Markam creates 1 alert, none for Anita Netam', () => {
    const seed = getInitialSeedState();

    // Verify Anita Netam exists in seed patients in Dhanora
    const anitaNetam = seed.patients.find((p) => p.name?.en === 'Anita Netam');
    expect(anitaNetam).toBeDefined();
    expect(anitaNetam?.village).toEqual({ en: 'Dhanora', hi: 'धनोरा' });

    // Anita Markam is p4 with case c2
    const anitaMarkam = seed.patients.find((p) => p.name?.en === 'Anita Markam');
    expect(anitaMarkam).toBeDefined();

    const caseC2 = seed.cases.find((c) => c.id === 'c2');
    expect(caseC2).toBeDefined();
    expect(caseC2?.patientId).toBe(anitaMarkam?.id);

    // Doctor replies to Anita Markam's case (c2)
    const stateAfterReply = caseReducer(seed, {
      type: 'DOCTOR_REPLY',
      payload: {
        caseId: 'c2',
        advice: 'Take medication and follow up in 24 hours',
        decision: 'treat_locally',
        read: 'positive',
      },
      online: true,
    });

    // Exactly 1 new alert created for c2 / Anita Markam
    const alertsForC2 = stateAfterReply.alerts.filter((a) => a.caseId === 'c2');
    expect(alertsForC2.length).toBe(1);
    expect(alertsForC2[0].patientId).toBe(anitaMarkam?.id);

    // ZERO alerts for Anita Netam
    const alertsForAnitaNetam = stateAfterReply.alerts.filter(
      (a) => a.patientId === anitaNetam?.id
    );
    expect(alertsForAnitaNetam.length).toBe(0);
  });

  // (b) screening the same patient twice makes two separate cases
  it('(b) screening the same patient twice makes two separate cases', () => {
    const seed = getInitialSeedState();
    const patientId = 'p1'; // Ramesh

    const caseId1 = generateCaseId();
    const caseId2 = generateCaseId();
    expect(caseId1).not.toBe(caseId2);

    // First screening
    const state1 = caseReducer(seed, {
      type: 'UPDATE_SCREENING',
      payload: {
        patientId,
        caseId: caseId1,
        symptoms: { en: 'Fever', hi: 'बुखार' },
        symptomFlags: ['fever'],
        testResult: 'positive',
        state: 'SCREENED',
      },
      online: true,
    });

    // Second screening for the SAME patient
    const state2 = caseReducer(state1, {
      type: 'UPDATE_SCREENING',
      payload: {
        patientId,
        caseId: caseId2,
        symptoms: { en: 'Vomiting and fever', hi: 'उल्टी और बुखार' },
        symptomFlags: ['fever'],
        testResult: 'negative',
        state: 'SCREENED',
      },
      online: true,
    });

    const c1 = state2.cases.find((c) => c.id === caseId1);
    const c2 = state2.cases.find((c) => c.id === caseId2);

    expect(c1).toBeDefined();
    expect(c2).toBeDefined();
    expect(c1?.id).not.toBe(c2?.id);
    expect(c1?.patientId).toBe(patientId);
    expect(c2?.patientId).toBe(patientId);
    expect(c1?.testResult).toBe('positive');
    expect(c2?.testResult).toBe('negative');

    // Filter all cases for Ramesh: both exist simultaneously
    const rameshCases = state2.cases.filter((c) => c.patientId === patientId);
    expect(rameshCases.some((c) => c.id === caseId1)).toBe(true);
    expect(rameshCases.some((c) => c.id === caseId2)).toBe(true);
    expect(rameshCases.length).toBeGreaterThanOrEqual(2);
  });

  // (c) unknown caseId creates nothing
  it('(c) unknown caseId creates nothing', () => {
    const seed = getInitialSeedState();
    const unknownCaseId = 'c-unknown-9999';

    // 1. REQUEST_CONSULT with unknown caseId
    const afterReq = caseReducer(seed, {
      type: 'REQUEST_CONSULT',
      payload: {
        caseId: unknownCaseId,
        patientId: 'p1',
      },
      online: true,
    });
    expect(afterReq.cases.find((c) => c.id === unknownCaseId)).toBeUndefined();
    expect(afterReq.consults.find((c) => c.caseId === unknownCaseId)).toBeUndefined();

    // 2. DOCTOR_REPLY with unknown caseId
    const afterReply = caseReducer(seed, {
      type: 'DOCTOR_REPLY',
      payload: {
        caseId: unknownCaseId,
        advice: 'Advice for unknown',
        decision: 'treat_locally',
      },
      online: true,
    });
    expect(afterReply.cases.find((c) => c.id === unknownCaseId)).toBeUndefined();
    expect(afterReply.alerts.find((a) => a.caseId === unknownCaseId)).toBeUndefined();

    // 3. CREATE_REFERRAL with unknown caseId
    const afterRef = caseReducer(seed, {
      type: 'CREATE_REFERRAL',
      payload: {
        caseId: unknownCaseId,
        patientId: 'p1',
      },
      online: true,
    });
    expect(afterRef.referrals.find((r) => r.caseId === unknownCaseId)).toBeUndefined();

    // 4. RECORD_OUTCOME with unknown caseId
    const afterOutcome = caseReducer(seed, {
      type: 'RECORD_OUTCOME',
      payload: {
        caseId: unknownCaseId,
        outcome: 'completed',
      },
    });
    expect(afterOutcome.cases.find((c) => c.id === unknownCaseId)).toBeUndefined();
  });

  // (d) syncing twice applies a queued action once
  it('(d) syncing twice applies a queued action once', () => {
    const seed = getInitialSeedState();
    const caseId = 'c-sync-test';
    const patientId = 'p1';

    // Create a screened case first
    let state = caseReducer(seed, {
      type: 'UPDATE_SCREENING',
      payload: {
        patientId,
        caseId,
        state: 'SCREENED',
      },
      online: true,
    });

    // Create referral offline with a specific syncItemId
    const syncItemId = 'sync-ref-offline-1';
    state = caseReducer(state, {
      type: 'CREATE_REFERRAL',
      payload: {
        caseId,
        patientId,
        syncItemId,
      },
      online: false,
    });

    expect(state.syncQueue.length).toBe(1);
    expect(state.syncQueue[0].status).toBe('waiting_to_send');
    expect(state.referrals.filter((r) => r.caseId === caseId).length).toBe(1);

    // First SYNC_NOW: processes the queued item and marks it sent
    state = caseReducer(state, { type: 'SYNC_NOW' });
    expect(state.syncQueue[0].status).toBe('sent');
    expect(state.processedActionIds).toContain(syncItemId);
    expect(state.referrals.filter((r) => r.caseId === caseId).length).toBe(1);

    // Second SYNC_NOW: no waiting items, processedActionIds prevents duplicate execution
    state = caseReducer(state, { type: 'SYNC_NOW' });
    expect(state.syncQueue.filter((q) => q.status === 'waiting_to_send').length).toBe(0);
    expect(state.referrals.filter((r) => r.caseId === caseId).length).toBe(1);

    // Replay the exact same action: should no-op because syncItemId is in processedActionIds
    const replayState = caseReducer(state, {
      type: 'CREATE_REFERRAL',
      payload: {
        caseId,
        patientId,
        syncItemId,
      },
      online: false,
    });
    expect(replayState).toBe(state);
  });

  // (e) grep-style test ensuring no non-test, non-seed file contains quoted literals 'p1', "p1", 'c1', "c1", or c-${
  it('(e) grep-style test ensuring no non-test, non-seed file contains quoted literals p1, c1, or c-${', () => {
    const rootDir = path.join(process.cwd(), 'src');
    const violations: { file: string; line: number; text: string }[] = [];

    function walkDir(dir: string): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const item of list) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          results = results.concat(walkDir(full));
        } else {
          results.push(full);
        }
      }
      return results;
    }

    const allFiles = walkDir(rootDir);
    const searchTargets = [
      "'" + "p1" + "'",
      '"' + "p1" + '"',
      "'" + "c1" + "'",
      '"' + "c1" + '"',
      'c-' + '${',
    ];

    for (const filePath of allFiles) {
      const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

      // Allowlist src/data/*.json
      if (relPath.startsWith('data/') && relPath.endsWith('.json')) {
        continue;
      }
      // Allowlist test files (*.test.ts, *.test.tsx)
      if (relPath.includes('.test.')) {
        continue;
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n');

      let inSeedRegion = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('SEED-DATA-START')) {
          inSeedRegion = true;
        }
        if (line.includes('SEED-DATA-END')) {
          inSeedRegion = false;
          continue;
        }

        if (!inSeedRegion) {
          for (const target of searchTargets) {
            if (line.includes(target)) {
              violations.push({
                file: relPath,
                line: i + 1,
                text: line.trim(),
              });
            }
          }
        }
      }
    }

    if (violations.length > 0) {
      console.error('Found prohibited p1/c1/c-${ references in non-test, non-seed files:', violations);
    }
    expect(violations).toEqual([]);
  });

  // Step 3 verification: stored state migrations & corrupt reset
  it('Step 3: migrates stored state missing caseId and missing processedActionIds without crashing', () => {
    const legacyState = {
      schemaVersion: 2,
      patients: [{ id: 'p-legacy-1', name: { en: 'Legacy', hi: 'लीगेसी' }, age: 20, village: 'Kotra' }],
      currentScreening: { patientId: 'p-legacy-1' }, // missing caseId
      cases: [],
      referrals: [],
      consults: [],
      alerts: [],
      syncQueue: [],
      // missing processedActionIds
    };

    mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(legacyState));
    const loaded = loadPersistedState();

    expect(loaded).toBeDefined();
    expect(loaded.schemaVersion).toBe(SCHEMA_VERSION);
    expect(loaded.currentScreening).toEqual({
      patientId: 'p-legacy-1',
      caseId: '',
    });
    expect(Array.isArray(loaded.processedActionIds)).toBe(true);
    expect(loaded.processedActionIds).toEqual([]);
    expect(loaded.demoDataResetNotice).toBe(false);
  });

  it('Step 3: corrupt stored state resets to seed with demoDataResetNotice: true without crashing', () => {
    // 1. Invalid JSON
    mockLocalStorage.setItem(STORAGE_KEY, '{ invalid json');
    let loaded = loadPersistedState();
    expect(loaded).toBeDefined();
    expect(loaded.demoDataResetNotice).toBe(true);

    // 2. Wrong types
    mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 3, cases: 'not an array' }));
    loaded = loadPersistedState();
    expect(loaded).toBeDefined();
    expect(loaded.demoDataResetNotice).toBe(true);
  });

  it('Step 3: screening Ramesh then screening Anita Netam gives distinct case IDs', () => {
    const rameshCaseId = generateCaseId();
    const anitaNetamCaseId = generateCaseId();

    expect(rameshCaseId).not.toBe(anitaNetamCaseId);
    expect(rameshCaseId.startsWith('c-')).toBe(true);
    expect(anitaNetamCaseId.startsWith('c-')).toBe(true);
  });

  // STEP 2: Ramesh's Full Story End-to-End
  it('Step 2: runs Ramesh full story through phone and web modes and verifies single referral on double sync', () => {
    let state = getInitialSeedState();

    // Ramesh starts with no case, consult, referral, or alert
    expect(state.cases.some((c) => c.patientId === 'p1')).toBe(false);
    expect(state.referrals.some((r) => r.patientId === 'p1')).toBe(false);
    expect(state.alerts.some((a) => a.patientId === 'p1')).toBe(false);

    // 1. Phone mode: pick Ramesh, generate case ID
    const rameshCaseId = generateCaseId();
    state = caseReducer(state, {
      type: 'SELECT_SCREENING_PATIENT',
      payload: { patientId: 'p1', caseId: rameshCaseId },
    });
    expect(state.currentScreening.patientId).toBe('p1');
    expect(state.currentScreening.caseId).toBe(rameshCaseId);

    // 2. Start screening, tick fever
    state = caseReducer(state, {
      type: 'UPDATE_SCREENING',
      payload: {
        patientId: 'p1',
        caseId: rameshCaseId,
        symptoms: { en: 'Fever for more than 2 days', hi: '2 दिन से ज़्यादा बुखार' },
        symptomFlags: ['fever'],
        hasDangerSigns: false,
        state: 'SCREENED',
      },
      online: true,
    });
    let rameshCase = state.cases.find((c) => c.id === rameshCaseId);
    expect(rameshCase).toBeDefined();
    expect(rameshCase?.symptomFlags).toEqual(['fever']);

    // 3. Attach test photo (positive result)
    state = caseReducer(state, {
      type: 'UPDATE_SCREENING',
      payload: {
        patientId: 'p1',
        caseId: rameshCaseId,
        photo: true,
        photoData: 'data:image/jpeg;base64,ramesh-demo-photo',
        photoIsDemo: true,
        testResult: 'positive',
        state: 'SCREENED',
      },
      online: true,
    });
    rameshCase = state.cases.find((c) => c.id === rameshCaseId);
    expect(rameshCase?.testResult).toBe('positive');

    // 4. Ask doctor
    state = caseReducer(state, {
      type: 'REQUEST_CONSULT',
      payload: {
        caseId: rameshCaseId,
        patientId: 'p1',
      },
      online: true,
    });
    rameshCase = state.cases.find((c) => c.id === rameshCaseId);
    expect(rameshCase?.state).toBe('CONSULT_REQUESTED');
    const consult = state.consults.find((c) => c.caseId === rameshCaseId);
    expect(consult).toBeDefined();
    expect(consult?.status).toBe('waiting');

    // 5. Web mode: Doctor inbox, reply 'Send to hospital' with 'Urgent: severe malaria'
    state = caseReducer(state, {
      type: 'DOCTOR_REPLY',
      payload: {
        caseId: rameshCaseId,
        advice: 'Urgent: severe malaria',
        decision: 'send_to_hospital',
        read: 'positive',
      },
      online: true,
    });
    rameshCase = state.cases.find((c) => c.id === rameshCaseId);
    expect(rameshCase?.state).toBe('CONSULT_REPLIED');

    // 6. Back to phone: open Alerts, tap the alert, check it opens Ramesh's case
    const rameshAlerts = state.alerts.filter((a) => a.caseId === rameshCaseId);
    expect(rameshAlerts.length).toBe(1);
    const alert = rameshAlerts[0];
    expect(alert.advice).toBe('Urgent: severe malaria');
    expect(alert.decision).toBe('send_to_hospital');

    // Simulating tapping alert: opens Ramesh's case
    state = caseReducer(state, {
      type: 'SET_CURRENT_CASE_ID',
      payload: { caseId: alert.caseId! },
    });
    expect(state.currentCaseId).toBe(rameshCaseId);

    // 7. Create referral (offline or online)
    state = caseReducer(state, {
      type: 'CREATE_REFERRAL',
      payload: {
        caseId: rameshCaseId,
        patientId: 'p1',
        facility: { en: 'District hospital', hi: 'ज़िला अस्पताल' },
        dueHours: 24,
        syncItemId: 'sync-ramesh-ref-1',
      },
      online: false,
    });
    expect(state.referrals.filter((r) => r.caseId === rameshCaseId).length).toBe(1);

    // 8. Sync twice
    state = caseReducer(state, { type: 'SYNC_NOW' });
    state = caseReducer(state, { type: 'SYNC_NOW' });

    // Check sync queue has no waiting items, and only one referral was created
    expect(state.syncQueue.filter((q) => q.status === 'waiting_to_send').length).toBe(0);
    const finalReferrals = state.referrals.filter((r) => r.caseId === rameshCaseId);
    expect(finalReferrals.length).toBe(1);
    expect(finalReferrals[0].patientId).toBe('p1');
    expect(finalReferrals[0].caseId).toBe(rameshCaseId);
  });
});
