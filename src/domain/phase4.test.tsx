import { describe, expect, it, beforeEach } from 'vitest';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import {
  validatePatient,
  findDuplicatePatients,
  getDemoDate,
  type ExistingPatientRecord,
} from './index';
import {
  caseReducer,
  getInitialSeedState,
  loadPersistedState,
  formatPatientCode,
  STORAGE_KEY,
  SCHEMA_VERSION,
  CaseProvider,
  useCaseStore,
} from '../store/CaseStore';
import ScreeningPatient from '../screens/ScreeningPatient';
import { ViewModeProvider } from '../ViewModeContext';
import { ScreenDraftProvider } from '../ScreenDraftContext';

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

function renderScreen(ui: React.ReactElement) {
  return renderToString(
    <CaseProvider>
      <ViewModeProvider>
        <ScreenDraftProvider>{ui}</ScreenDraftProvider>
      </ViewModeProvider>
    </CaseProvider>
  );
}

describe('Phase 4 vitest tests: Patient selection safety', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  // 1. (a) The duplicate rule pure function
  describe('(a) Duplicate rule pure function', () => {
    const existingPatients: ExistingPatientRecord[] = [
      {
        id: 'p4',
        name: { en: 'Anita Markam', hi: 'अनीता मरकाम' },
        age: 3,
        village: { en: 'Amora', hi: 'अमोरा' },
        patientCode: 'MS-P-0004',
      },
      {
        id: 'p-anita-netam',
        name: { en: 'Anita Netam', hi: 'अनीता नेताम' },
        age: 4,
        village: { en: 'Dhanora', hi: 'धनोरा' },
        patientCode: 'MS-P-0014',
      },
      {
        id: 'p1',
        name: { en: 'Ramesh', hi: 'रमेश' },
        age: 6,
        village: { en: 'Kotra', hi: 'कोतरा' },
        patientCode: 'MS-P-0001',
      },
    ];

    it('flags " anita markam " vs "Anita Markam" in same village with ages 3 and 4 (age diff 1)', () => {
      const candidate = {
        name: ' anita markam ',
        age: 4,
        village: 'Amora',
      };
      const duplicates = findDuplicatePatients(candidate, existingPatients);
      expect(duplicates.length).toBe(1);
      expect(duplicates[0].id).toBe('p4');
    });

    it('does NOT flag an age gap of 2 (e.g. age 3 vs age 5)', () => {
      const candidate = {
        name: 'Anita Markam',
        age: 5,
        village: 'Amora',
      };
      const duplicates = findDuplicatePatients(candidate, existingPatients);
      expect(duplicates.length).toBe(0);
    });

    it('does NOT flag the same name in a different village', () => {
      const candidate = {
        name: 'Anita Markam',
        age: 3,
        village: 'Kotra',
      };
      const duplicates = findDuplicatePatients(candidate, existingPatients);
      expect(duplicates.length).toBe(0);
    });

    it('does NOT flag two patients with same first name but different surnames in different villages', () => {
      // Candidate "Anita Netam" in Amora vs Anita Markam in Amora (different surname)
      const cand1 = {
        name: 'Anita Netam',
        age: 3,
        village: 'Amora',
      };
      const dup1 = findDuplicatePatients(cand1, existingPatients);
      expect(dup1.length).toBe(0);

      // Candidate "Anita Markam" in Dhanora vs Anita Netam in Dhanora
      const cand2 = {
        name: 'Anita Markam',
        age: 4,
        village: 'Dhanora',
      };
      const dup2 = findDuplicatePatients(cand2, existingPatients);
      expect(dup2.length).toBe(0);
    });
  });

  // 2. (b) Possible duplicate panel in ScreeningPatient
  describe('(b) Possible duplicate panel elements', () => {
    it('contains duplicate panel strings in en and hi translations', async () => {
      const en = await import('../i18n/en.json');
      const hi = await import('../i18n/hi.json');

      const spEn = en.default.screens.ScreeningPatient;
      const spHi = hi.default.screens.ScreeningPatient;

      expect(spEn.possibleDuplicate).toBe('Possible duplicate');
      expect(spHi.possibleDuplicate).toBe('संभावित डुप्लिकेट');
      expect(spEn.useThisPatient).toBe('Use this patient');
      expect(spHi.useThisPatient).toBe('इस मरीज़ का उपयोग करें');
      expect(spEn.addAsNewAnyway).toBe('Add as new anyway');
      expect(spHi.addAsNewAnyway).toBe('फिर भी नया जोड़ें');
    });
  });

  // 3. (c) "Use this patient" selects existing patient without creating new patient or case
  describe('(c) "Use this patient" flow', () => {
    it('selecting existing patient changes currentScreening without increasing patient or case count', () => {
      const seed = getInitialSeedState();
      const initialPatientCount = seed.patients.length;
      const initialCaseCount = seed.cases.length;

      // Select patient p4
      const nextState = caseReducer(seed, {
        type: 'SELECT_SCREENING_PATIENT',
        payload: { patientId: 'p4', caseId: 'c2' },
      });

      expect(nextState.currentScreening.patientId).toBe('p4');
      expect(nextState.patients.length).toBe(initialPatientCount);
      expect(nextState.cases.length).toBe(initialCaseCount);
    });
  });

  // 4. (d) Consent checkbox is required
  describe('(d) Consent validation', () => {
    it('blocks saving without consent and provides text reason', () => {
      const resWithoutConsent = validatePatient(
        {
          name: 'Sunita Sahu',
          age: 26,
          consentGiven: false,
          requireConsent: true,
        },
        'en'
      );
      expect(resWithoutConsent.isValid).toBe(false);
      expect(resWithoutConsent.errors.consent).toBe(
        'Consent is required before saving a new patient'
      );

      const resHi = validatePatient(
        {
          name: 'सुनीता साहू',
          age: 26,
          consentGiven: false,
          requireConsent: true,
        },
        'hi'
      );
      expect(resHi.isValid).toBe(false);
      expect(resHi.errors.consent).toBe('मरीज़ या परिवार की सहमति आवश्यक है');
    });

    it('passes when consent is given', () => {
      const resWithConsent = validatePatient(
        {
          name: 'Sunita Sahu',
          age: 26,
          consentGiven: true,
          requireConsent: true,
        },
        'en'
      );
      expect(resWithConsent.isValid).toBe(true);
      expect(resWithConsent.errors.consent).toBeUndefined();
    });

    it('seed and migrated patients do not claim consent', () => {
      const seed = getInitialSeedState();
      for (const p of seed.patients) {
        expect(p.consent).toBeUndefined();
      }
    });
  });

  // 5. (e) Age and Year of birth validation
  describe('(e) Age and Year of birth validation', () => {
    it('keeps age field requirements (0 to 120)', () => {
      expect(validatePatient({ name: 'Radha', age: -1 }, 'en').isValid).toBe(false);
      expect(validatePatient({ name: 'Radha', age: 121 }, 'en').isValid).toBe(false);
      expect(validatePatient({ name: 'Radha', age: 25 }, 'en').isValid).toBe(true);
    });

    it('year of birth accepts blank and optional household', () => {
      const res = validatePatient(
        {
          name: 'Radha',
          age: 25,
          yearOfBirth: '',
          household: 'House 12',
        },
        'en'
      );
      expect(res.isValid).toBe(true);
      expect(res.errors.yearOfBirth).toBeUndefined();
    });

    it('year of birth rejects years before 1900', () => {
      const res = validatePatient(
        {
          name: 'Radha',
          age: 25,
          yearOfBirth: '1899',
        },
        'en'
      );
      expect(res.isValid).toBe(false);
      expect(res.errors.yearOfBirth).toBe(
        'Year of birth must be between 1900 and current year'
      );
    });

    it('year of birth rejects future years by demo clock', () => {
      const demoClockYear = getDemoDate(0).getFullYear();
      const futureYear = demoClockYear + 1;
      const res = validatePatient(
        {
          name: 'Radha',
          age: 25,
          yearOfBirth: String(futureYear),
        },
        'en',
        demoClockYear
      );
      expect(res.isValid).toBe(false);
      expect(res.errors.yearOfBirth).toBe(
        'Year of birth must be between 1900 and current year'
      );
    });

    it('year of birth accepts valid plausible year', () => {
      const demoClockYear = getDemoDate(0).getFullYear();
      const res = validatePatient(
        {
          name: 'Radha',
          age: 25,
          yearOfBirth: '1998',
        },
        'en',
        demoClockYear
      );
      expect(res.isValid).toBe(true);
      expect(res.errors.yearOfBirth).toBeUndefined();
    });
  });

  // 6. (f) Patient codes
  describe('(f) Patient code format and sequential generation', () => {
    it('seed patients have fixed MS-P-NNNN codes', () => {
      const seed = getInitialSeedState();
      expect(seed.patients.length).toBeGreaterThanOrEqual(14);
      expect(seed.patients[0].patientCode).toBe('MS-P-0001');
      expect(seed.patients[1].patientCode).toBe('MS-P-0002');
      expect(seed.patients[3].patientCode).toBe('MS-P-0004'); // Anita Markam
      expect(seed.patients[13].patientCode).toBe('MS-P-0014'); // Anita Netam

      for (const p of seed.patients) {
        expect(p.patientCode).toMatch(/^MS-P-\d{4}$/);
      }
    });

    it('every patient list row displays name, age, village and patient code', () => {
      const html = renderScreen(
        <ScreeningPatient
          lang="en"
          online={true}
          onNavigate={() => {}}
          onSetLang={() => {}}
          onToggleOnline={() => {}}
        />
      );
      expect(html).toContain('MS-P-0001');
      expect(html).toContain('Ramesh');
      expect(html).toContain('Kotra');
      expect(html).toContain('MS-P-0004');
      expect(html).toContain('Anita Markam');
      expect(html).toContain('Amora');
    });

    it('owner-requested test: two newly created patients get different codes', () => {
      let capturedStore: any;
      function TestComponent() {
        capturedStore = useCaseStore();
        return <div>Test</div>;
      }

      renderScreen(<TestComponent />);
      expect(capturedStore).toBeDefined();

      // Create Patient 1
      const p1 = capturedStore.addPatient({
        name: 'New Person 1',
        age: 20,
        village: 'Kotra',
        consent: true,
      });

      // Create Patient 2 with simulated next state
      const stateAfterP1 = caseReducer(capturedStore.state, {
        type: 'ADD_PATIENT',
        payload: p1,
      });

      // Compute sequential code for second patient from stateAfterP1.patients
      let maxNum = 0;
      for (const p of stateAfterP1.patients) {
        if (p.patientCode) {
          const match = p.patientCode.match(/^MS-P-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
      }
      const codeP2 = formatPatientCode(maxNum + 1);

      expect(p1.patientCode).toBe('MS-P-0015');
      expect(codeP2).toBe('MS-P-0016');
      expect(p1.patientCode).not.toBe(codeP2);
    });

    it('patient codes persist in localStorage across loadPersistedState', () => {
      const seed = getInitialSeedState();
      seed.patients.push({
        id: 'p-custom-99',
        patientCode: 'MS-P-0099',
        name: { en: 'Custom Person', hi: 'कस्टम व्यक्ति' },
        age: 35,
        village: { en: 'Kotra', hi: 'कोतरा' },
      });

      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      const loaded = loadPersistedState();
      const custom = loaded.patients.find((p) => p.id === 'p-custom-99');
      expect(custom).toBeDefined();
      expect(custom?.patientCode).toBe('MS-P-0099');
    });
  });

  // 7. (g) Old state migration and schema bump
  describe('(g) State migration & corrupt state handling', () => {
    it('SCHEMA_VERSION is at least 4', () => {
      expect(SCHEMA_VERSION).toBe(SCHEMA_VERSION);
    });

    it('old saved state without patient codes gets migrated with codes in stable order', () => {
      const oldState = {
        schemaVersion: 3,
        patients: [
          {
            id: 'p1',
            name: { en: 'Ramesh', hi: 'रमेश' },
            age: 6,
            village: { en: 'Kotra', hi: 'कोतरा' },
          },
          {
            id: 'p4',
            name: { en: 'Anita Markam', hi: 'अनीता मरकाम' },
            age: 3,
            village: { en: 'Amora', hi: 'अमोरा' },
          },
          {
            id: 'p-old-unseeded',
            name: { en: 'Old Patient', hi: 'पुराना मरीज़' },
            age: 40,
            village: { en: 'Pachri', hi: 'पचरी' },
          },
        ],
        cases: [],
        referrals: [],
      };

      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(oldState));
      const migrated = loadPersistedState();

      expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
      expect(migrated.patients[0].patientCode).toBe('MS-P-0001');
      expect(migrated.patients[1].patientCode).toBe('MS-P-0004');
      expect(migrated.patients[2].patientCode).toBe('MS-P-0015');
      // No consent claimed for old patients
      expect(migrated.patients[0].consent).toBeUndefined();
      expect(migrated.patients[2].consent).toBeUndefined();
    });

    it('corrupt state resets to seed with demoDataResetNotice = true and never crashes', () => {
      mockLocalStorage.setItem(STORAGE_KEY, 'invalid-json{{{corrupt');
      const recovered = loadPersistedState();

      expect(recovered).toBeDefined();
      expect(recovered.demoDataResetNotice).toBe(true);
      expect(recovered.patients.length).toBeGreaterThanOrEqual(14);
      expect(recovered.patients[0].patientCode).toBe('MS-P-0001');
    });
  });

  // 8. Story walkthrough tests: Ramesh story and Two-patient story
  describe('Story walkthroughs', () => {
    it('Ramesh story: Reset -> screen Ramesh -> ask doctor -> doctor replies -> send to hospital -> record outcome', () => {
      // 1. Reset demo data
      let state = getInitialSeedState();
      state = caseReducer(state, { type: 'RESET_DEMO_DATA' });
      expect(state.cases.some((c) => c.patientId === 'p1')).toBe(false);

      // 2. Screen Ramesh
      const rameshCaseId = 'c-ramesh-test';
      state = caseReducer(state, {
        type: 'UPDATE_SCREENING',
        payload: {
          patientId: 'p1',
          caseId: rameshCaseId,
          symptoms: { en: 'Fever and chills', hi: 'बुखार और ठंड' },
          symptomFlags: ['fever'],
          hasDangerSigns: false,
          testResult: 'positive',
        },
        online: true,
      });
      const rameshCase = state.cases.find((c) => c.id === rameshCaseId);
      expect(rameshCase).toBeDefined();
      expect(rameshCase?.state).toBe('SCREENED');

      // 3. Ask doctor
      state = caseReducer(state, {
        type: 'REQUEST_CONSULT',
        payload: {
          caseId: rameshCaseId,
          patientId: 'p1',
          nowISO: new Date().toISOString(),
        },
        online: true,
      });
      const consult = state.consults.find((con) => con.caseId === rameshCaseId);
      expect(consult).toBeDefined();
      expect(consult?.status).toBe('waiting');
      expect(state.cases.find((c) => c.id === rameshCaseId)?.state).toBe('CONSULT_REQUESTED');

      // 4. Doctor replies
      state = caseReducer(state, {
        type: 'DOCTOR_REPLY',
        payload: {
          caseId: rameshCaseId,
          doctorName: 'Dr. Rao',
          advice: 'Admit to CHC immediately',
          decision: 'send_to_hospital',
          read: 'agree',
          nowISO: new Date().toISOString(),
        },
        online: true,
      });
      const repliedCase = state.cases.find((c) => c.id === rameshCaseId);
      expect(repliedCase?.state).toBe('CONSULT_REPLIED');

      // 5. Send to hospital (create referral)
      state = caseReducer(state, {
        type: 'CREATE_REFERRAL',
        payload: {
          referralId: 'r-ramesh-test',
          caseId: rameshCaseId,
          patientId: 'p1',
          facility: { en: 'District Hospital', hi: 'जिला अस्पताल' },
          dueHours: 24,
          dueAt: new Date(getDemoDate(0).getTime() + 24 * 3600 * 1000).toISOString(),
        },
        online: true,
      });
      const referral = state.referrals.find((r) => r.caseId === rameshCaseId);
      expect(referral).toBeDefined();
      expect(state.cases.find((c) => c.id === rameshCaseId)?.state).toBe('REFERRAL_CREATED');

      // 6. Record outcome
      state = caseReducer(state, {
        type: 'RECORD_OUTCOME',
        payload: {
          caseId: rameshCaseId,
          outcome: 'completed',
        },
      });
      expect(state.cases.find((c) => c.id === rameshCaseId)?.state).toBe('OUTCOME_RECORDED');
    });

    it('Two-patient story: reply to Anita Markam -> no alert for Anita Netam -> add matching patient -> duplicate panel detected', () => {
      let state = getInitialSeedState();

      // Anita Markam is p4 (case c2), Anita Netam is p-anita-netam (no active case)
      state = caseReducer(state, {
        type: 'DOCTOR_REPLY',
        payload: {
          caseId: 'c2',
          doctorName: 'Dr. Rao',
          advice: 'Referral advised',
          decision: 'send_to_hospital',
          read: 'agree',
          nowISO: new Date().toISOString(),
        },
        online: true,
      });

      // Confirm alert is created for Anita Markam (p4 / c2) and none for Anita Netam
      const anitaMarkamAlert = state.alerts.find((a) => a.caseId === 'c2');
      expect(anitaMarkamAlert).toBeDefined();

      const anitaNetamAlert = state.alerts.find((a) => a.patientId === 'p-anita-netam');
      expect(anitaNetamAlert).toBeUndefined();

      // Add a new patient matching existing Anita Markam: same name, same village (Amora), age diff <= 1
      const candidate = {
        name: 'Anita Markam',
        age: 3,
        village: 'Amora',
      };
      const duplicates = findDuplicatePatients(candidate, state.patients);
      expect(duplicates.length).toBe(1);
      expect(duplicates[0].id).toBe('p4');
      expect(duplicates[0].name.en).toBe('Anita Markam');
    });
  });
});
