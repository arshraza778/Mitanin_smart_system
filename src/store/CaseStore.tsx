import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react';
import { priority, loopClosureRate, getDemoDate, type CaseState } from '../domain';
import { createCassetteJpeg } from '../domain/photoUtils';
import { dataService } from '../services';

export type { CaseState };

export const STORAGE_KEY = 'ms-state-v1';
export const SCHEMA_VERSION = 4;

export function formatPatientCode(num: number): string {
  return `MS-P-${String(num).padStart(4, '0')}`;
}

export function generateCaseId(): string {
  const rand = Math.random().toString(36).substring(2, 8);
  return 'c-' + Date.now().toString(36) + '-' + rand;
}

export interface PatientRecord {
  id: string; // patient ID
  patientCode?: string; // e.g. "MS-P-0001"
  name: { en: string; hi: string };
  age: number | null;
  village: { en: string; hi: string } | string;
  caseId?: string;
  sex?: 'female' | 'male' | 'other';
  pregnant?: boolean;
  yearOfBirth?: number | null;
  household?: string;
  consent?: boolean;
}

export interface CaseRecord {
  id: string; // case ID
  patientId: string; // patient ID
  name: { en: string; hi: string };
  village: { en: string; hi: string } | string;
  symptoms: { en: string; hi: string };
  symptomFlags?: string[];
  waitingMin: number;
  photo: boolean | string;
  photoData?: string;
  photoIsDemo?: boolean;
  testResult?: 'positive' | 'negative' | 'invalid';
  state: CaseState;
  dueAt?: string; // ISO date string. NOTE: Overdue is ALWAYS computed from dueAt vs now, NEVER stored.
  createdAt: string;
  updatedAt: string;
  type?: 'referral' | 'followup' | 'screening' | 'consult';
  hasDangerSigns?: boolean;
  doctorAdvice?: string;
  doctorDecision?: string;
  doctorRead?: string;
  outcome?: 'completed' | 'rescheduled' | 'refused';
  mitanin?: string;
  reason?: { en: string; hi: string } | string;
}

export interface ReferralRecord {
  id: string; // e.g. "r1"
  patientId: string;
  caseId?: string;
  facility: { en: string; hi: string };
  owner: { en: string; hi: string };
  status: 'in_progress' | 'reached' | 'completed'; // Never store 'overdue'!
  stage: number; // 1: created, 2: reminder sent, 3: reached facility, 4: outcome recorded
  dueHours: number;
  dueAt: string; // ISO date string. Overdue is computed dynamically.
  createdAt: string;
  outcome?: 'completed' | 'rescheduled' | 'refused';
  notes?: string;
}

export interface ConsultRecord {
  id: string;
  caseId: string;
  patientId: string;
  requestedAt: string;
  receivedAt?: string;
  repliedAt?: string;
  advice: string;
  decision: 'treat_locally' | 'send_to_hospital';
  doctorName: string;
  status: 'waiting' | 'replied';
  testRead?: string;
  doctorRead?: 'agree' | 'disagree';
  agreed?: boolean;
}

export interface AlertRecord {
  id: string; // deterministic: `${type}:${caseId}:${consultId or referralId || 'none'}:${sequence}`
  type: 'doctor_replied' | 'overdue' | 'followup';
  caseId: string;
  consultId?: string;
  referralId?: string;
  createdAt: string;
  readAt?: string;
  title: { en: string; hi: string };
  advice?: string;
  decision?: 'treat_locally' | 'send_to_hospital';
  doctorName?: string;
  repliedAt?: string;
  // UI helper fields
  kind: 'overdue' | 'replied' | 'followup';
  group: 'today' | 'earlier';
  text: { en: string; hi: string };
  time: { en: string; hi: string };
  patientId?: string;
  timestamp: string;
}

export interface SyncItem {
  id: string;
  actionType: string;
  payload: any;
  status: 'waiting_to_send' | 'sent';
  createdAt: string;
  sentAt?: string;
  description: { en: string; hi: string };
}

export interface CaseStoreState {
  schemaVersion: number;
  patients: PatientRecord[];
  currentScreening: { patientId: string; caseId: string };
  currentCaseId?: string;
  cases: CaseRecord[];
  referrals: ReferralRecord[];
  consults: ConsultRecord[];
  alerts: AlertRecord[];
  syncQueue: SyncItem[];
  processedActionIds: string[];
  demoClockOffsetMinutes: number;
  syncedCases: CaseRecord[];
  syncedReferrals: ReferralRecord[];
  syncedConsults: ConsultRecord[];
  syncedAlerts: AlertRecord[];
  demoDataResetNotice?: boolean;
}

export function computeIsOverdue(
  dueAt?: string | number | null,
  offsetMinutes: number = 0,
  now: number = Date.now()
): boolean {
  if (!dueAt) return false;
  const target = typeof dueAt === 'number' ? dueAt : new Date(dueAt).getTime();
  if (Number.isNaN(target)) return false;
  const current = now + offsetMinutes * 60 * 1000;
  return target < current;
}

// SEED-DATA-START
export const LEGACY_RAMESH_PATIENT_ID = 'p1';
export const LEGACY_RAMESH_CASE_ID = 'c1';

export function getInitialSeedState(): CaseStoreState {
  const rawPatients: PatientRecord[] = [
    ...(dataService.getPatients() as any[]),
    {
      id: 'p-anita-netam',
      name: { en: 'Anita Netam', hi: 'अनीता नेताम' },
      age: 4,
      village: { en: 'Dhanora', hi: 'धनोरा' },
    },
  ].map((p, idx) => ({
    ...p,
    patientCode: p.patientCode || formatPatientCode(idx + 1),
  }));
  const rawCases = dataService.getCases();
  const rawReferrals = dataService.getReferrals();
  const rawAlerts = dataService.getAlerts();
  const rawSupervisor = dataService.getSupervisorRows();
  const now = Date.now();

  // Ramesh c1 / p1 must start with NO case, consult, referral, or alert (Item 23)
  const initialCases: CaseRecord[] = rawCases
    .filter((rc: any) => rc.patientId !== 'p1' && rc.id !== 'c1')
    .map((rc: any) => {
      const isPooja = rc.patientId === 'p6' || rc.id === 'c4';
      const isAnita = rc.patientId === 'p4' || rc.id === 'c2';

      const dueTime = isPooja ? new Date(now - 24 * 3600 * 1000).toISOString() : undefined;

      const caseState: CaseState = isAnita
        ? 'CONSULT_REQUESTED'
        : isPooja
        ? 'REFERRAL_CREATED'
        : 'SCREENED';

      return {
        id: rc.id,
        patientId: rc.patientId,
        name: rc.name,
        village: rc.village,
        symptoms: rc.symptoms || { en: '', hi: '' },
        symptomFlags: isAnita ? ['sleepy', 'drink'] : [],
        waitingMin: rc.waitingMin ?? 0,
        photo: rc.photo ?? false,
        photoData: isAnita ? createCassetteJpeg('positive') : undefined,
        photoIsDemo: isAnita ? true : false,
        testResult: isAnita ? 'positive' : undefined,
        state: caseState,
        dueAt: dueTime,
        createdAt: new Date(now - (rc.waitingMin ?? 60) * 60 * 1000).toISOString(),
        updatedAt: new Date(now - (rc.waitingMin ?? 60) * 60 * 1000).toISOString(),
        type: isPooja ? 'referral' : 'consult',
        hasDangerSigns: isAnita,
        mitanin: 'Sunita',
      };
    });

  // Add Budhram Sahu (follow-up due tomorrow) from supervisor rows if not in cases
  const budhramRow = rawSupervisor.find((r: any) => r.patientId === 'p13');
  if (budhramRow && !initialCases.some((c) => c.patientId === 'p13')) {
    initialCases.push({
      id: 'c-p13',
      patientId: 'p13',
      name: budhramRow.name,
      village: budhramRow.village,
      symptoms: { en: 'Cough, follow-up', hi: 'खाँसी, फ़ॉलो-अप' },
      waitingMin: 0,
      photo: false,
      state: 'SCREENED',
      dueAt: new Date(now + 24 * 3600 * 1000).toISOString(), // tomorrow
      createdAt: new Date(now - 48 * 3600 * 1000).toISOString(),
      updatedAt: new Date(now - 48 * 3600 * 1000).toISOString(),
      type: 'followup',
      hasDangerSigns: false,
      mitanin: 'Geeta',
      reason: budhramRow.reason,
    });
  }

  // 3 completed historical cases to establish baseline loop closure rate (~72%)
  const historicalClosedCases: CaseRecord[] = [
    {
      id: 'c-hist-1',
      patientId: 'p2',
      name: { en: 'Meena Bai, 28', hi: 'मीना बाई, 28' },
      village: { en: 'Kotra', hi: 'कोतरा' },
      symptoms: { en: 'High fever', hi: 'तेज़ बुखार' },
      waitingMin: 0,
      photo: true,
      state: 'OUTCOME_RECORDED',
      outcome: 'completed',
      createdAt: new Date(now - 12 * 3600 * 1000).toISOString(),
      updatedAt: new Date(now - 4 * 3600 * 1000).toISOString(),
      type: 'referral',
    },
    {
      id: 'c-hist-2',
      patientId: 'p3',
      name: { en: 'Devki Sahu, 40', hi: 'देवकी साहू, 40' },
      village: { en: 'Amora', hi: 'अमोरा' },
      symptoms: { en: 'Diarrhea', hi: 'दस्त' },
      waitingMin: 0,
      photo: false,
      state: 'OUTCOME_RECORDED',
      outcome: 'completed',
      createdAt: new Date(now - 18 * 3600 * 1000).toISOString(),
      updatedAt: new Date(now - 6 * 3600 * 1000).toISOString(),
      type: 'referral',
    },
    {
      id: 'c-hist-3',
      patientId: 'p8',
      name: { en: 'Sohan Lal, 5', hi: 'सोहन लाल, 5' },
      village: { en: 'Kodar', hi: 'कोड़ार' },
      symptoms: { en: 'Fever and chills', hi: 'बुखार और ठंड' },
      waitingMin: 0,
      photo: true,
      state: 'REACHED_FACILITY',
      createdAt: new Date(now - 20 * 3600 * 1000).toISOString(),
      updatedAt: new Date(now - 8 * 3600 * 1000).toISOString(),
      type: 'referral',
    },
  ];

  const allCases = [...initialCases, ...historicalClosedCases];

  // Initial referrals (no Ramesh; Pooja has an active referral)
  const initialReferrals: ReferralRecord[] = [
    {
      id: 'r-p6',
      patientId: 'p6',
      caseId: 'c4',
      facility: { en: 'District hospital', hi: 'ज़िला अस्पताल' },
      owner: { en: 'Sunita', hi: 'सुनीता' },
      status: 'in_progress', // Never store overdue
      stage: 1,
      dueHours: 24,
      dueAt: new Date(now - 24 * 3600 * 1000).toISOString(),
      createdAt: new Date(now - 48 * 3600 * 1000).toISOString(),
    },
  ];

  // Initial consults (no Ramesh)
  const initialConsults: ConsultRecord[] = [
    {
      id: 'con-c2',
      caseId: 'c2',
      patientId: 'p4',
      status: 'waiting',
      requestedAt: new Date(now - 140 * 60 * 1000).toISOString(),
      advice: '',
      decision: 'treat_locally',
      doctorName: 'Dr. Rao',
    },
    {
      id: 'con-c3',
      caseId: 'c3',
      patientId: 'p5',
      status: 'waiting',
      requestedAt: new Date(now - 75 * 60 * 1000).toISOString(),
      advice: '',
      decision: 'treat_locally',
      doctorName: 'Dr. Rao',
    },
  ];

  // Initial alerts (remove seeded 'Referral overdue: Ramesh' alt-1 per Item 21)
  const initialAlerts: AlertRecord[] = rawAlerts
    .filter((al: any) => al.id !== 'alt-1' && al.patientId !== 'p1' && !(al.text?.en && al.text.en.includes('Ramesh')))
    .map((al: any, idx: number) => {
      const alertType: 'doctor_replied' | 'overdue' | 'followup' =
        al.kind === 'replied' ? 'doctor_replied' : al.kind;
      const caseId = al.caseId || (alertType === 'doctor_replied' ? 'c-geeta' : alertType === 'overdue' ? 'c4' : 'c-p13');
      const consultId = alertType === 'doctor_replied' ? (al.consultId || 'con-geeta') : undefined;
      const referralId = alertType === 'overdue' ? (al.referralId || 'r-p6') : undefined;
      return {
        id: `${alertType}:${caseId}:${consultId || referralId || 'none'}:${idx + 1}`,
        type: alertType,
        caseId,
        consultId,
        referralId,
        createdAt: new Date(now - 30 * 60 * 1000).toISOString(),
        readAt: undefined,
        title: al.text,
        kind: al.kind,
        group: al.group,
        text: al.text,
        time: al.time,
        timestamp: new Date().toISOString(),
        patientId: al.patientId,
      };
    });

  return {
    schemaVersion: SCHEMA_VERSION,
    patients: rawPatients,
    currentScreening: { patientId: 'p1', caseId: '' },
    currentCaseId: undefined,
    cases: allCases,
    referrals: initialReferrals,
    consults: initialConsults,
    alerts: initialAlerts,
    syncQueue: [],
    processedActionIds: [],
    demoClockOffsetMinutes: 0,
    syncedCases: allCases,
    syncedReferrals: initialReferrals,
    syncedConsults: initialConsults,
    syncedAlerts: initialAlerts,
    demoDataResetNotice: false,
  };
}
// SEED-DATA-END

export type CaseAction =
  | { type: 'RESET_DEMO_DATA' }
  | { type: 'DISMISS_RESET_NOTICE' }
  | { type: 'SET_CURRENT_CASE_ID'; payload: { caseId: string } }
  | { type: 'SELECT_SCREENING_PATIENT'; payload: { patientId: string; caseId?: string } }
  | { type: 'ADD_PATIENT'; payload: PatientRecord }
  | {
      type: 'UPDATE_SCREENING';
      payload: {
        patientId: string;
        caseId?: string;
        symptoms?: { en: string; hi: string };
        symptomFlags?: string[];
        hasDangerSigns?: boolean;
        photo?: boolean | string;
        photoData?: string;
        photoIsDemo?: boolean;
        testResult?: 'positive' | 'negative' | 'invalid';
        state?: CaseState;
        nowISO?: string;
        syncItemId?: string;
      };
      online: boolean;
    }
  | {
      type: 'REQUEST_CONSULT';
      payload: {
        caseId: string;
        patientId: string;
        nowISO?: string;
        consultId?: string;
        syncItemId?: string;
      };
      online: boolean;
    }
  | {
      type: 'MARK_CONSULT_RECEIVED';
      payload: {
        caseId: string;
        nowISO?: string;
      };
    }
  | {
      type: 'DOCTOR_REPLY';
      payload: {
        caseId: string;
        consultId?: string;
        advice: string;
        decision: 'treat_locally' | 'send_to_hospital';
        read?: string;
        doctorName?: string;
        nowISO?: string;
        alert?: AlertRecord;
        syncItemId?: string;
      };
      online: boolean;
    }
  | {
      type: 'MARK_ALERT_READ';
      payload: {
        alertId: string;
        nowISO?: string;
      };
    }
  | {
      type: 'CREATE_REFERRAL';
      payload: {
        caseId: string;
        patientId: string;
        facility?: { en: string; hi: string };
        dueHours?: number;
        nowISO?: string;
        referralId?: string;
        dueAt?: string;
        syncItemId?: string;
      };
      online: boolean;
    }
  | {
      type: 'RECORD_OUTCOME';
      payload: {
        caseId: string;
        outcome?: 'completed' | 'rescheduled' | 'refused';
        nowISO?: string;
      };
    }
  | {
      type: 'REFERRAL_ACTION';
      payload: {
        referralId: string;
        action: 'reminder' | 'reached_facility' | 'outcome';
        outcome?: 'completed' | 'rescheduled' | 'refused';
        notes?: string;
        nowISO?: string;
        syncItemId?: string;
      };
      online: boolean;
    }
  | { type: 'SYNC_NOW'; nowISO?: string }
  | { type: 'SET_CLOCK_OFFSET'; payload: { offsetMinutes: number } };

export function caseReducer(state: CaseStoreState, action: CaseAction): CaseStoreState {
  switch (action.type) {
    case 'RESET_DEMO_DATA': {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch (err) {
        console.warn('Failed to clear localStorage', err);
      }
      return getInitialSeedState();
    }

    case 'DISMISS_RESET_NOTICE': {
      return {
        ...state,
        demoDataResetNotice: false,
      };
    }

    case 'SET_CURRENT_CASE_ID': {
      return {
        ...state,
        currentCaseId: action.payload.caseId,
      };
    }

    case 'SELECT_SCREENING_PATIENT': {
      return {
        ...state,
        currentScreening: {
          patientId: action.payload.patientId,
          caseId: action.payload.caseId || (state.currentScreening?.patientId === action.payload.patientId ? state.currentScreening.caseId : ''),
        },
      };
    }

    case 'ADD_PATIENT': {
      const newPatient = action.payload;
      const nextPatients = [newPatient, ...state.patients];
      return {
        ...state,
        patients: nextPatients,
        currentScreening: { patientId: newPatient.id, caseId: '' },
      };
    }

    case 'UPDATE_SCREENING': {
      const { payload, online } = action;
      if (payload.syncItemId && state.processedActionIds.includes(payload.syncItemId)) {
        return state;
      }
      const nowISO = payload.nowISO || new Date().toISOString();
      const existingIdx = payload.caseId
        ? state.cases.findIndex((c) => c.id === payload.caseId)
        : -1;

      const patient = state.patients.find((p) => p.id === payload.patientId) || dataService.getPatient(payload.patientId);
      const patientName = patient
        ? {
            en: `${patient.name.en}${patient.age == null ? '' : `, ${patient.age}`}`,
            hi: `${patient.name.hi}${patient.age == null ? '' : `, ${patient.age}`}`,
          }
        : { en: 'Patient', hi: 'मरीज़' };

      const patientVillage = patient
        ? (typeof patient.village === 'string' ? { en: patient.village, hi: patient.village } : patient.village)
        : { en: 'Kotra', hi: 'कोतरा' };

      const caseId =
        existingIdx >= 0
          ? state.cases[existingIdx].id
          : payload.caseId || generateCaseId();

      const targetCase: CaseRecord =
        existingIdx >= 0
          ? {
              ...state.cases[existingIdx],
              ...(payload.symptoms ? { symptoms: payload.symptoms } : {}),
              ...(payload.symptomFlags ? { symptomFlags: payload.symptomFlags } : {}),
              ...(payload.hasDangerSigns !== undefined ? { hasDangerSigns: payload.hasDangerSigns } : {}),
              ...(payload.photo !== undefined ? { photo: payload.photo } : {}),
              ...(payload.photoData !== undefined ? { photoData: payload.photoData } : {}),
              ...(payload.photoIsDemo !== undefined ? { photoIsDemo: payload.photoIsDemo } : {}),
              ...(payload.testResult !== undefined ? { testResult: payload.testResult } : {}),
              state: payload.state || state.cases[existingIdx].state,
              updatedAt: nowISO,
            }
          : {
              id: caseId,
              patientId: payload.patientId,
              name: patientName,
              village: patientVillage,
              symptoms: payload.symptoms || { en: '', hi: '' },
              symptomFlags: payload.symptomFlags || [],
              waitingMin: 0,
              photo: payload.photo ?? false,
              photoData: payload.photoData,
              photoIsDemo: payload.photoIsDemo,
              testResult: payload.testResult,
              state: payload.state || 'SCREENED',
              createdAt: nowISO,
              updatedAt: nowISO,
              type: 'referral',
              mitanin: 'Sunita',
            };

      const nextCases =
        existingIdx >= 0
          ? state.cases.map((c, i) => (i === existingIdx ? targetCase : c))
          : [targetCase, ...state.cases];

      const syncItem: SyncItem | null = !online
        ? {
            id: payload.syncItemId || `sync-screening-${caseId}`,
            actionType: 'UPDATE_SCREENING',
            payload,
            status: 'waiting_to_send',
            createdAt: nowISO,
            description: {
              en: `Screening updated for ${patientName.en} (${payload.state || 'SCREENED'})`,
              hi: `${patientName.hi} की जाँच अद्यतित (${payload.state || 'जाँच पूर्ण'})`,
            },
          }
        : null;

      const nextSyncQueue = syncItem ? [syncItem, ...state.syncQueue] : state.syncQueue;
      const nextProcessedActionIds = payload.syncItemId
        ? [...state.processedActionIds, payload.syncItemId].slice(-500)
        : state.processedActionIds;

      return {
        ...state,
        cases: nextCases,
        currentScreening: { patientId: payload.patientId, caseId },
        syncedCases: online ? nextCases : state.syncedCases,
        syncQueue: nextSyncQueue,
        processedActionIds: nextProcessedActionIds,
      };
    }

    case 'REQUEST_CONSULT': {
      const { payload, online } = action;
      if (payload.syncItemId && state.processedActionIds.includes(payload.syncItemId)) {
        return state;
      }
      const nowISO = payload.nowISO || new Date().toISOString();
      const targetCaseId = payload.caseId;
      const targetCase = state.cases.find((c) => c.id === targetCaseId);
      if (!targetCase) {
        return state;
      }
      const patient = state.patients.find((p) => p.id === payload.patientId) || dataService.getPatient(payload.patientId);
      const patientNameEn = patient?.name?.en || 'Patient';
      const patientNameHi = patient?.name?.hi || 'मरीज़';

      const nextCases = state.cases.map((c) =>
        c.id === targetCaseId
          ? { ...c, state: 'CONSULT_REQUESTED' as CaseState, updatedAt: nowISO }
          : c
      );

      const consultId = payload.consultId || `con-${targetCaseId}`;
      const existingConsult = state.consults.find((con) => con.caseId === targetCaseId);

      const newConsult: ConsultRecord = existingConsult
        ? {
            ...existingConsult,
            status: 'waiting',
            requestedAt: nowISO,
          }
        : {
            id: consultId,
            caseId: targetCaseId,
            patientId: payload.patientId,
            status: 'waiting',
            requestedAt: nowISO,
            advice: '',
            decision: 'treat_locally',
            doctorName: 'Dr. Rao',
          };

      const nextConsults = [
        newConsult,
        ...state.consults.filter((con) => con.caseId !== targetCaseId),
      ];

      const syncItem: SyncItem | null = !online
        ? {
            id: payload.syncItemId || `sync-con-${targetCaseId}`,
            actionType: 'REQUEST_CONSULT',
            payload,
            status: 'waiting_to_send',
            createdAt: nowISO,
            description: {
              en: `Doctor consult requested for ${patientNameEn}`,
              hi: `${patientNameHi} के लिए डॉक्टर परामर्श का अनुरोध`,
            },
          }
        : null;

      const nextSyncQueue = syncItem ? [syncItem, ...state.syncQueue] : state.syncQueue;
      const nextProcessedActionIds = payload.syncItemId
        ? [...state.processedActionIds, payload.syncItemId].slice(-500)
        : state.processedActionIds;

      return {
        ...state,
        cases: nextCases,
        consults: nextConsults,
        syncedCases: online ? nextCases : state.syncedCases,
        syncedConsults: online ? nextConsults : state.syncedConsults,
        syncQueue: nextSyncQueue,
        processedActionIds: nextProcessedActionIds,
      };
    }

    case 'MARK_CONSULT_RECEIVED': {
      const { payload } = action;
      const nowISO = payload.nowISO || new Date().toISOString();
      const nextConsults = state.consults.map((con) => {
        if (con.caseId === payload.caseId) {
          // Sets receivedAt once, never overwritten (Item 9)
          if (!con.receivedAt) {
            return { ...con, receivedAt: nowISO };
          }
        }
        return con;
      });

      return {
        ...state,
        consults: nextConsults,
        syncedConsults: nextConsults,
      };
    }

    case 'DOCTOR_REPLY': {
      const { payload, online } = action;
      if (payload.syncItemId && state.processedActionIds.includes(payload.syncItemId)) {
        return state;
      }
      const nowISO = payload.nowISO || new Date().toISOString();
      const targetCaseId = payload.caseId;

      const targetCase = state.cases.find((c) => c.id === targetCaseId);
      if (!targetCase) {
        return state;
      }

      // Item 6: One consult allows exactly one reply. If already 'replied', reject/ignore.
      const existingConsult = state.consults.find(
        (con) => con.caseId === targetCaseId || (payload.consultId && con.id === payload.consultId)
      );
      if (existingConsult && existingConsult.status === 'replied') {
        return state;
      }

      const patient = state.patients.find((p) => p.id === targetCase.patientId) ||
        (targetCase.patientId ? dataService.getPatient(targetCase.patientId) : undefined);
      const patientNameEn = patient?.name?.en || targetCase.name?.en || 'Patient';
      const patientNameHi = patient?.name?.hi || targetCase.name?.hi || 'मरीज़';
      const doctorName = payload.doctorName || 'Dr. Rao';
      const consultId = payload.consultId || existingConsult?.id || `con-${targetCaseId}`;

      const nextCases = state.cases.map((c) =>
        c.id === targetCaseId
          ? {
              ...c,
              state: 'CONSULT_REPLIED' as CaseState,
              doctorAdvice: payload.advice,
              doctorDecision: payload.decision,
              doctorRead: payload.read,
              updatedAt: nowISO,
            }
          : c
      );

      const doctorAgreed = payload.read === 'agree' ? true : payload.read === 'disagree' ? false : undefined;
      const doctorReadVal: ('agree' | 'disagree') | undefined = payload.read === 'agree' || payload.read === 'disagree' ? payload.read : undefined;

      const updatedConsult: ConsultRecord = existingConsult
        ? {
            ...existingConsult,
            status: 'replied' as const,
            repliedAt: nowISO,
            doctorName,
            advice: payload.advice,
            decision: payload.decision,
            testRead: payload.read,
            doctorRead: doctorReadVal,
            agreed: doctorAgreed,
          }
        : {
            id: consultId,
            caseId: targetCaseId,
            patientId: targetCase.patientId,
            status: 'replied' as const,
            requestedAt: nowISO,
            repliedAt: nowISO,
            doctorName,
            advice: payload.advice,
            decision: payload.decision,
            testRead: payload.read,
            doctorRead: doctorReadVal,
            agreed: doctorAgreed,
          };

      const nextConsults = [
        updatedConsult,
        ...state.consults.filter((con) => con.id !== updatedConsult.id && con.caseId !== targetCaseId),
      ];

      // Item 4: Deterministic alert id: `${type}:${caseId}:${consultId}:${sequence}`
      const alertToAdd: AlertRecord = payload.alert || {
        id: `doctor_replied:${targetCaseId}:${consultId}:1`,
        type: 'doctor_replied' as const,
        caseId: targetCaseId,
        consultId,
        createdAt: nowISO,
        title: {
          en: `Doctor replied: ${patientNameEn}`,
          hi: `डॉक्टर का जवाब आया: ${patientNameHi}`,
        },
        advice: payload.advice,
        decision: payload.decision,
        doctorName,
        repliedAt: nowISO,
        kind: 'replied' as const,
        group: 'today' as const,
        text: {
          en: `Doctor replied: ${patientNameEn}`,
          hi: `डॉक्टर का जवाब आया: ${patientNameHi}`,
        },
        time: {
          en: 'Just now',
          hi: 'अभी-अभी',
        },
        patientId: targetCase.patientId,
        timestamp: nowISO,
      };

      // Item 4 & 7: Check if alert already exists by ID or by (type, caseId, consultId)
      const alertAlreadyExists = state.alerts.some(
        (a) =>
          a.id === alertToAdd.id ||
          (a.type === 'doctor_replied' && a.caseId === targetCaseId && a.consultId === consultId)
      );

      const nextAlerts = alertAlreadyExists ? state.alerts : [alertToAdd, ...state.alerts];

      const syncItem: SyncItem | null = !online
        ? {
            id: payload.syncItemId || `sync-reply-${targetCaseId}-${consultId}`,
            actionType: 'DOCTOR_REPLY',
            payload,
            status: 'waiting_to_send',
            createdAt: nowISO,
            description: {
              en: `Doctor reply sent for ${patientNameEn}`,
              hi: `${patientNameHi} के लिए डॉक्टर का जवाब भेजा गया`,
            },
          }
        : null;

      const nextSyncQueue = syncItem ? [syncItem, ...state.syncQueue] : state.syncQueue;
      const nextProcessedActionIds = payload.syncItemId
        ? [...state.processedActionIds, payload.syncItemId].slice(-500)
        : state.processedActionIds;

      return {
        ...state,
        cases: nextCases,
        consults: nextConsults,
        alerts: nextAlerts,
        syncedCases: online ? nextCases : state.syncedCases,
        syncedConsults: online ? nextConsults : state.syncedConsults,
        syncedAlerts: online ? nextAlerts : state.syncedAlerts,
        syncQueue: nextSyncQueue,
        processedActionIds: nextProcessedActionIds,
      };
    }

    case 'MARK_ALERT_READ': {
      const { payload } = action;
      const nowISO = payload.nowISO || new Date().toISOString();
      const nextAlerts = state.alerts.map((a) =>
        a.id === payload.alertId ? { ...a, readAt: a.readAt || nowISO } : a
      );
      return {
        ...state,
        alerts: nextAlerts,
        syncedAlerts: nextAlerts,
      };
    }

    case 'CREATE_REFERRAL': {
      const { payload, online } = action;
      if (payload.syncItemId && state.processedActionIds.includes(payload.syncItemId)) {
        return state;
      }
      const nowISO = payload.nowISO || new Date().toISOString();
      const targetCaseId = payload.caseId;
      const targetCase = state.cases.find((c) => c.id === targetCaseId);
      if (!targetCase) {
        return state;
      }
      const targetPatientId = payload.patientId || targetCase.patientId;

      const patient = state.patients.find((p) => p.id === targetPatientId) || dataService.getPatient(targetPatientId);
      const patientNameEn = patient?.name?.en || 'Patient';
      const patientNameHi = patient?.name?.hi || 'मरीज़';

      const nextCases = state.cases.map((c) =>
        c.id === targetCaseId
          ? {
              ...c,
              state: 'REFERRAL_CREATED' as CaseState,
              dueAt: payload.dueAt || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
              updatedAt: nowISO,
            }
          : c
      );

      const existingRefIdx = state.referrals.findIndex(
        (r) => r.caseId === targetCaseId
      );

      const updatedRef: ReferralRecord =
        existingRefIdx >= 0
          ? {
              ...state.referrals[existingRefIdx],
              stage: 1,
              status: 'in_progress',
              dueAt: payload.dueAt || new Date(Date.now() + (payload.dueHours || 24) * 3600 * 1000).toISOString(),
            }
          : {
              id: payload.referralId || `r-${targetCaseId}`,
              patientId: targetPatientId,
              caseId: targetCaseId,
              facility: payload.facility || { en: 'District hospital', hi: 'ज़िला अस्पताल' },
              owner: { en: 'Sunita', hi: 'सुनीता' },
              status: 'in_progress',
              stage: 1,
              dueHours: payload.dueHours || 24,
              dueAt: payload.dueAt || new Date(Date.now() + (payload.dueHours || 24) * 3600 * 1000).toISOString(),
              createdAt: nowISO,
            };

      const nextReferrals =
        existingRefIdx >= 0
          ? state.referrals.map((r, i) => (i === existingRefIdx ? updatedRef : r))
          : [updatedRef, ...state.referrals];

      const syncItem: SyncItem | null = !online
        ? {
            id: payload.syncItemId || `sync-referral-${targetCaseId}`,
            actionType: 'CREATE_REFERRAL',
            payload,
            status: 'waiting_to_send',
            createdAt: nowISO,
            description: {
              en: `Referral created for ${patientNameEn}`,
              hi: `${patientNameHi} के लिए रेफ़रल बनाया गया`,
            },
          }
        : null;

      const nextSyncQueue = syncItem ? [syncItem, ...state.syncQueue] : state.syncQueue;
      const nextProcessedActionIds = payload.syncItemId
        ? [...state.processedActionIds, payload.syncItemId].slice(-500)
        : state.processedActionIds;

      return {
        ...state,
        cases: nextCases,
        referrals: nextReferrals,
        syncedCases: online ? nextCases : state.syncedCases,
        syncedReferrals: online ? nextReferrals : state.syncedReferrals,
        syncQueue: nextSyncQueue,
        processedActionIds: nextProcessedActionIds,
      };
    }

    case 'RECORD_OUTCOME': {
      const { payload } = action;
      const nowISO = payload.nowISO || new Date().toISOString();
      const targetCase = state.cases.find((c) => c.id === payload.caseId);
      if (!targetCase) {
        return state;
      }
      const nextCases = state.cases.map((c) =>
        c.id === payload.caseId
          ? {
              ...c,
              state: 'OUTCOME_RECORDED' as CaseState,
              outcome: payload.outcome || 'completed',
              updatedAt: nowISO,
            }
          : c
      );

      return {
        ...state,
        cases: nextCases,
        syncedCases: nextCases,
      };
    }

    case 'REFERRAL_ACTION': {
      const { payload, online } = action;
      if (payload.syncItemId && state.processedActionIds.includes(payload.syncItemId)) {
        return state;
      }
      const nowISO = payload.nowISO || new Date().toISOString();
      const refIdx = state.referrals.findIndex((r) => r.id === payload.referralId);
      if (refIdx < 0) return state;

      const ref = state.referrals[refIdx];
      let newStage = ref.stage;
      let newRefStatus = ref.status;
      let newCaseState: CaseState = 'REFERRAL_CREATED';

      if (payload.action === 'reminder') {
        newStage = Math.max(ref.stage, 2);
        newCaseState = 'REMINDER_SENT';
      } else if (payload.action === 'reached_facility') {
        newStage = Math.max(ref.stage, 3);
        newRefStatus = 'reached';
        newCaseState = 'REACHED_FACILITY';
      } else if (payload.action === 'outcome') {
        newStage = 4;
        newRefStatus = 'completed';
        newCaseState = 'OUTCOME_RECORDED';
      }

      const updatedRef: ReferralRecord = {
        ...ref,
        stage: newStage,
        status: newRefStatus,
        outcome: payload.outcome ?? ref.outcome,
        notes: payload.notes ?? ref.notes,
      };

      const nextReferrals = state.referrals.map((r, i) => (i === refIdx ? updatedRef : r));

      const nextCases = state.cases.map((c) =>
        c.id === ref.caseId
          ? {
              ...c,
              state: newCaseState,
              outcome: payload.outcome ?? c.outcome,
              updatedAt: nowISO,
            }
          : c
      );

      const patient = state.patients.find((p) => p.id === ref.patientId) || dataService.getPatient(ref.patientId);
      const patientNameEn = patient?.name?.en || 'Patient';
      const patientNameHi = patient?.name?.hi || 'मरीज़';

      const syncItem: SyncItem | null = !online
        ? {
            id: payload.syncItemId || `sync-ref-action-${ref.id}-${payload.action}`,
            actionType: 'REFERRAL_ACTION',
            payload,
            status: 'waiting_to_send',
            createdAt: nowISO,
            description: {
              en: `Referral action (${payload.action}) for ${patientNameEn}`,
              hi: `${patientNameHi} के लिए रेफ़रल कार्रवाई (${payload.action})`,
            },
          }
        : null;

      const nextSyncQueue = syncItem ? [syncItem, ...state.syncQueue] : state.syncQueue;
      const nextProcessedActionIds = payload.syncItemId
        ? [...state.processedActionIds, payload.syncItemId].slice(-500)
        : state.processedActionIds;

      return {
        ...state,
        cases: nextCases,
        referrals: nextReferrals,
        syncedCases: online ? nextCases : state.syncedCases,
        syncedReferrals: online ? nextReferrals : state.syncedReferrals,
        syncQueue: nextSyncQueue,
        processedActionIds: nextProcessedActionIds,
      };
    }

    case 'SYNC_NOW': {
      const nowISO = action.nowISO || new Date().toISOString();
      const newProcessedIds = state.syncQueue
        .filter((item) => item.status === 'waiting_to_send')
        .map((item) => item.id);

      const updatedQueue = state.syncQueue.map((item) =>
        item.status === 'waiting_to_send'
          ? { ...item, status: 'sent' as const, sentAt: nowISO }
          : item
      );

      const nextProcessedActionIds = [
        ...state.processedActionIds,
        ...newProcessedIds,
      ].slice(-500);

      return {
        ...state,
        syncQueue: updatedQueue,
        processedActionIds: nextProcessedActionIds,
        syncedCases: state.cases,
        syncedReferrals: state.referrals,
        syncedConsults: state.consults,
        syncedAlerts: state.alerts,
      };
    }

    case 'SET_CLOCK_OFFSET': {
      return {
        ...state,
        demoClockOffsetMinutes: action.payload.offsetMinutes,
      };
    }

    default:
      return state;
  }
}

export interface CaseStoreContextValue {
  state: CaseStoreState;
  patients: PatientRecord[];
  currentScreening: { patientId: string; caseId: string };
  currentCaseId?: string;
  syncedCases: CaseRecord[];
  syncedReferrals: ReferralRecord[];
  syncedConsults: ConsultRecord[];
  syncedAlerts: AlertRecord[];
  unreadAlertsCount: number;
  waitingSyncCount: number;
  demoDataResetNotice?: boolean;
  demoClockOffsetMinutes: number;
  readingAgreement: { agreed: number; total: number; rate: number };
  dismissResetNotice: () => void;
  setCurrentCaseId: (caseId: string) => void;
  isOverdue: (dueAt?: string | null) => boolean;
  getCase: (id: string) => CaseRecord | undefined;
  getCaseByPatientId: (patientId: string) => CaseRecord | undefined;
  getReferralByPatientId: (patientId: string) => ReferralRecord | undefined;
  getConsultByCaseId: (caseId: string) => ConsultRecord | undefined;
  getPatient: (id: string) => PatientRecord | undefined;
  getPatientSummary: (id: string, lang: 'en' | 'hi') => string;
  selectScreeningPatient: (patientId: string, caseId?: string) => void;
  addPatient: (data: {
    name: { en: string; hi: string } | string;
    age: number;
    village: { en: string; hi: string } | string;
    sex?: 'female' | 'male' | 'other';
    pregnant?: boolean;
    yearOfBirth?: number | null;
    household?: string;
    consent?: boolean;
  }) => PatientRecord;
  resetDemoData: () => void;
  syncNow: () => void;
  updateScreening: (
    payload: {
      patientId: string;
      caseId?: string;
      symptoms?: { en: string; hi: string };
      symptomFlags?: string[];
      hasDangerSigns?: boolean;
      photo?: boolean | string;
      photoData?: string;
      photoIsDemo?: boolean;
      testResult?: 'positive' | 'negative' | 'invalid';
      state?: CaseState;
    },
    online: boolean
  ) => void;
  requestConsult: (caseId: string, patientId: string, online: boolean) => void;
  markConsultReceived: (caseId: string) => void;
  markAlertRead: (alertId: string) => void;
  recordOutcome: (caseId: string, outcome?: 'completed' | 'rescheduled' | 'refused') => void;
  doctorReply: (
    caseId: string,
    advice: string,
    decision: 'treat_locally' | 'send_to_hospital' | string,
    read: string | undefined,
    online: boolean
  ) => { ok: boolean; error?: string };
  createReferral: (
    caseId: string,
    patientId: string,
    facility: { en: string; hi: string } | undefined,
    dueHours: number | undefined,
    online: boolean
  ) => void;
  referralAction: (
    referralId: string,
    action: 'reminder' | 'reached_facility' | 'outcome',
    outcome: ('completed' | 'rescheduled' | 'refused') | undefined,
    notes: string | undefined,
    online: boolean
  ) => void;
  getPriorityStats: () => {
    overdueReferralsCount: number;
    followupsDueCount: number;
    awaitingDoctorCount: number;
  };
  getLoopClosureRate: (windowHours?: number) => number | null;
}

const CaseStoreContext = createContext<CaseStoreContextValue | null>(null);

export function loadPersistedState(): CaseStoreState {
  if (typeof window === 'undefined') {
    return getInitialSeedState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialSeedState();

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Corrupt JSON: reset to seed and notify (Item 3 & 29)
      const seed = getInitialSeedState();
      seed.demoDataResetNotice = true;
      return seed;
    }

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.cases) || !Array.isArray(parsed.referrals)) {
      const seed = getInitialSeedState();
      seed.demoDataResetNotice = true;
      return seed;
    }

    const seed = getInitialSeedState();

    // Migrate cases & referrals: remove old Ramesh seed records
    const cases: CaseRecord[] = (parsed.cases || []).filter((c: any) => c.id !== LEGACY_RAMESH_CASE_ID);
    const referrals: ReferralRecord[] = (parsed.referrals || []).filter((r: any) => r.id !== 'r1');

    // Migrate consults: remove old Ramesh consult (con-c1)
    const consults: ConsultRecord[] = (parsed.consults || [])
      .filter((c: any) => c.id !== 'con-c1' && c.caseId !== LEGACY_RAMESH_CASE_ID)
      .map((c: any) => ({
      id: c.id || `con-${c.caseId}`,
      caseId: c.caseId,
      patientId: c.patientId,
      requestedAt: c.requestedAt || new Date().toISOString(),
      receivedAt: c.receivedAt,
      repliedAt: c.repliedAt,
      advice: typeof c.advice === 'string' ? c.advice : '',
      decision:
        c.decision === 'send_to_hospital' || c.decision === 'refer'
          ? ('send_to_hospital' as const)
          : ('treat_locally' as const),
      doctorName: c.doctorName || 'Dr. Rao',
      status: c.status === 'replied' ? ('replied' as const) : ('waiting' as const),
      testRead: c.testRead,
    }));

    // Item 7 & 21: De-duplicate existing alerts by id and by (type, caseId, consultId), drop old Ramesh overdue alert
    const seenIds = new Set<string>();
    const seenTypeCaseConsult = new Set<string>();
    const dedupedAlerts: AlertRecord[] = [];

    const rawAlertsList = Array.isArray(parsed.alerts) ? parsed.alerts : seed.alerts;
    for (const a of rawAlertsList) {
      if (!a || !a.id) continue;
      // Item 21: Remove seeded 'Referral overdue: Ramesh' alert
      if (a.id === 'alt-1' || (a.patientId === LEGACY_RAMESH_PATIENT_ID && a.kind === 'overdue')) continue;

      if (seenIds.has(a.id)) continue;

      const alertType: 'doctor_replied' | 'overdue' | 'followup' =
        a.type || (a.kind === 'replied' ? 'doctor_replied' : a.kind) || 'doctor_replied';
      const key = `${alertType}:${a.caseId || ''}:${a.consultId || ''}`;
      if (alertType === 'doctor_replied' && a.consultId && seenTypeCaseConsult.has(key)) {
        continue;
      }

      seenIds.add(a.id);
      if (a.consultId) seenTypeCaseConsult.add(key);

      dedupedAlerts.push({
        id: a.id,
        type: alertType,
        caseId: a.caseId,
        consultId: a.consultId,
        referralId: a.referralId,
        createdAt: a.createdAt || a.timestamp || new Date().toISOString(),
        readAt: a.readAt,
        title: a.title || a.text || { en: 'Alert', hi: 'सूचना' },
        advice: a.advice,
        decision: a.decision,
        doctorName: a.doctorName,
        repliedAt: a.repliedAt,
        kind: a.kind || (alertType === 'doctor_replied' ? 'replied' : alertType),
        group: a.group || 'today',
        text: a.text || a.title || { en: 'Alert', hi: 'सूचना' },
        time: a.time || { en: 'Recently', hi: 'हाल ही में' },
        patientId: a.patientId,
        timestamp: a.timestamp || a.createdAt || new Date().toISOString(),
      });
    }

    // Migrate patients: fill missing patient codes in a stable order and ensure no consent claimed
    const rawLoadedPatients: any[] =
      Array.isArray(parsed.patients) && parsed.patients.length > 0
        ? parsed.patients
        : seed.patients;

    let maxPatientCodeNum = 0;
    for (const sp of seed.patients) {
      if (sp && typeof sp.patientCode === 'string') {
        const match = sp.patientCode.match(/^MS-P-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxPatientCodeNum) {
            maxPatientCodeNum = num;
          }
        }
      }
    }
    for (const p of rawLoadedPatients) {
      if (p && typeof p.patientCode === 'string') {
        const match = p.patientCode.match(/^MS-P-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxPatientCodeNum) {
            maxPatientCodeNum = num;
          }
        }
      }
    }

    const seedMap = new Map(seed.patients.map((sp) => [sp.id, sp.patientCode]));

    const migratedPatients: PatientRecord[] = rawLoadedPatients.map((p: any) => {
      let code = p.patientCode;
      if (!code && seedMap.has(p.id)) {
        code = seedMap.get(p.id)!;
        const match = code.match(/^MS-P-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxPatientCodeNum) {
            maxPatientCodeNum = num;
          }
        }
      }
      return {
        ...p,
        patientCode: code,
      };
    });

    for (const p of migratedPatients) {
      if (!p.patientCode) {
        maxPatientCodeNum++;
        p.patientCode = formatPatientCode(maxPatientCodeNum);
      }
      if (p.consent !== true) {
        p.consent = undefined;
      }
    }

    return {
      schemaVersion: SCHEMA_VERSION,
      patients: migratedPatients,
      currentScreening: parsed.currentScreening?.patientId
        ? {
            patientId: parsed.currentScreening.patientId,
            caseId: typeof parsed.currentScreening.caseId === 'string' ? parsed.currentScreening.caseId : '',
          }
        : seed.currentScreening,
      currentCaseId: parsed.currentCaseId === LEGACY_RAMESH_CASE_ID ? undefined : parsed.currentCaseId,
      cases,
      referrals,
      consults,
      alerts: dedupedAlerts,
      syncQueue: Array.isArray(parsed.syncQueue) ? parsed.syncQueue : [],
      processedActionIds: Array.isArray(parsed.processedActionIds) ? parsed.processedActionIds.slice(-500) : [],
      demoClockOffsetMinutes: parsed.demoClockOffsetMinutes ?? 0,
      syncedCases: (parsed.syncedCases || cases).filter((c: any) => c.id !== LEGACY_RAMESH_CASE_ID),
      syncedReferrals: (parsed.syncedReferrals || referrals).filter((r: any) => r.id !== 'r1'),
      syncedConsults: (parsed.syncedConsults || consults).filter((c: any) => c.id !== 'con-c1' && c.caseId !== LEGACY_RAMESH_CASE_ID),
      syncedAlerts: (parsed.syncedAlerts || dedupedAlerts).filter((a: any) => a.id !== 'alt-1' && a.id !== 'a1'),
      demoDataResetNotice: false,
    };
  } catch (err) {
    console.warn('Failed to parse localStorage state:', err);
    const seed = getInitialSeedState();
    seed.demoDataResetNotice = true;
    return seed;
  }
}

export function CaseProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(caseReducer, undefined, loadPersistedState);

  // Persist to localStorage on state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const toSave = {
        schemaVersion: state.schemaVersion,
        patients: state.patients,
        currentScreening: state.currentScreening,
        currentCaseId: state.currentCaseId,
        cases: state.cases,
        referrals: state.referrals,
        consults: state.consults,
        alerts: state.alerts,
        syncQueue: state.syncQueue,
        processedActionIds: state.processedActionIds,
        demoClockOffsetMinutes: state.demoClockOffsetMinutes,
        syncedCases: state.syncedCases,
        syncedReferrals: state.syncedReferrals,
        syncedConsults: state.syncedConsults,
        syncedAlerts: state.syncedAlerts,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (err) {
      console.warn('Failed to persist CaseStore state', err);
    }
  }, [state]);

  const isOverdue = useCallback(
    (dueAt?: string | null) => computeIsOverdue(dueAt, state.demoClockOffsetMinutes),
    [state.demoClockOffsetMinutes]
  );

  const getPatient = useCallback(
    (id: string) => state.patients.find((p) => p.id === id) || (dataService.getPatient(id) as PatientRecord | undefined),
    [state.patients]
  );

  const getPatientSummary = useCallback(
    (id: string, lang: 'en' | 'hi') => {
      const patient = state.patients.find((item) => item.id === id) || dataService.getPatient(id);
      if (!patient) return '';
      const age = patient.age == null ? '' : `, ${patient.age}`;
      const village = typeof patient.village === 'string' ? patient.village : patient.village?.[lang] || '';
      return `${patient.name[lang]}${age}${village ? `, ${village}` : ''}`;
    },
    [state.patients]
  );

  const getCase = useCallback((id: string) => state.cases.find((c) => c.id === id), [state.cases]);

  const getCaseByPatientId = useCallback(
    (patientId: string) => state.cases.find((c) => c.patientId === patientId),
    [state.cases]
  );

  const getReferralByPatientId = useCallback(
    (patientId: string) => state.referrals.find((r) => r.patientId === patientId),
    [state.referrals]
  );

  const getConsultByCaseId = useCallback(
    (caseId: string) => state.consults.find((con) => con.caseId === caseId),
    [state.consults]
  );

  const selectScreeningPatient = useCallback((patientId: string, caseId?: string) => {
    const effectiveCaseId = caseId || generateCaseId();
    dispatch({ type: 'SELECT_SCREENING_PATIENT', payload: { patientId, caseId: effectiveCaseId } });
  }, []);

  const setCurrentCaseId = useCallback((caseId: string) => {
    dispatch({ type: 'SET_CURRENT_CASE_ID', payload: { caseId } });
  }, []);

  const dismissResetNotice = useCallback(() => {
    dispatch({ type: 'DISMISS_RESET_NOTICE' });
  }, []);

  const addPatient = useCallback(
    (data: {
      name: { en: string; hi: string } | string;
      age: number;
      village: { en: string; hi: string } | string;
      sex?: 'female' | 'male' | 'other';
      pregnant?: boolean;
      yearOfBirth?: number | null;
      household?: string;
      consent?: boolean;
    }): PatientRecord => {
      let maxPatientCodeNum = 0;
      for (const p of state.patients) {
        if (p && typeof p.patientCode === 'string') {
          const match = p.patientCode.match(/^MS-P-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxPatientCodeNum) {
              maxPatientCodeNum = num;
            }
          }
        }
      }
      const patientCode = formatPatientCode(maxPatientCodeNum + 1);

      const id = `p-${getDemoDate(state.demoClockOffsetMinutes).getTime()}-${Math.random().toString(36).slice(2, 6)}`;
      const nameObj =
        typeof data.name === 'string'
          ? { en: data.name, hi: data.name }
          : data.name;

      const villageObj =
        typeof data.village === 'string'
          ? { en: data.village, hi: data.village }
          : data.village;

      const record: PatientRecord = {
        id,
        patientCode,
        name: nameObj,
        age: data.age,
        village: villageObj,
        sex: data.sex,
        pregnant: data.pregnant,
        yearOfBirth: data.yearOfBirth,
        household: data.household,
        consent: data.consent,
      };

      dispatch({ type: 'ADD_PATIENT', payload: record });
      return record;
    },
    [state.patients, state.demoClockOffsetMinutes]
  );

  const resetDemoData = useCallback(() => {
    dispatch({ type: 'RESET_DEMO_DATA' });
  }, []);

  const syncNow = useCallback(() => {
    dispatch({ type: 'SYNC_NOW', nowISO: new Date().toISOString() });
  }, []);

  const updateScreening = useCallback(
    (
      payload: {
        patientId: string;
        caseId?: string;
        symptoms?: { en: string; hi: string };
        symptomFlags?: string[];
        hasDangerSigns?: boolean;
        photo?: boolean | string;
        photoData?: string;
        photoIsDemo?: boolean;
        testResult?: 'positive' | 'negative' | 'invalid';
        state?: CaseState;
      },
      online: boolean
    ) => {
      const nowISO = new Date().toISOString();
      const targetCaseId = payload.caseId || (state.currentScreening?.patientId === payload.patientId ? state.currentScreening.caseId : undefined);
      const syncItemId = `sync-screening-${targetCaseId || payload.patientId}-${Date.now()}`;
      dispatch({
        type: 'UPDATE_SCREENING',
        payload: { ...payload, caseId: targetCaseId, nowISO, syncItemId },
        online,
      });
    },
    [state.currentScreening]
  );

  const requestConsult = useCallback(
    (caseId: string, patientId: string, online: boolean) => {
      const nowISO = new Date().toISOString();
      const consultId = `con-${caseId}`;
      const syncItemId = `sync-consult-${caseId}`;
      dispatch({
        type: 'REQUEST_CONSULT',
        payload: { caseId, patientId, nowISO, consultId, syncItemId },
        online,
      });
    },
    []
  );

  const markConsultReceived = useCallback(
    (caseId: string) => {
      const consult = state.consults.find((c) => c.caseId === caseId);
      if (consult && !consult.receivedAt) {
        dispatch({
          type: 'MARK_CONSULT_RECEIVED',
          payload: { caseId, nowISO: new Date().toISOString() },
        });
      }
    },
    [state.consults]
  );

  const markAlertRead = useCallback((alertId: string) => {
    dispatch({
      type: 'MARK_ALERT_READ',
      payload: { alertId, nowISO: new Date().toISOString() },
    });
  }, []);

  const recordOutcome = useCallback(
    (caseId: string, outcome: 'completed' | 'rescheduled' | 'refused' = 'completed') => {
      dispatch({
        type: 'RECORD_OUTCOME',
        payload: { caseId, outcome, nowISO: new Date().toISOString() },
      });
    },
    []
  );

  const doctorReply = useCallback(
    (
      caseId: string,
      advice: string,
      decision: 'treat_locally' | 'send_to_hospital' | string,
      read: string | undefined,
      online: boolean
    ): { ok: boolean; error?: string } => {
      const existingConsult = state.consults.find((con) => con.caseId === caseId);
      if (existingConsult && existingConsult.status === 'replied') {
        return { ok: false, error: 'Reply already sent' };
      }

      const trimmedAdvice = advice.trim();
      const normalizedDecision: 'treat_locally' | 'send_to_hospital' =
        decision === 'send_to_hospital' ||
        decision.toLowerCase().includes('refer') ||
        decision.includes('रेफ़र') ||
        decision.includes('अस्पताल')
          ? 'send_to_hospital'
          : 'treat_locally';

      const nowISO = new Date().toISOString();
      const consultId = existingConsult?.id || `con-${caseId}`;
      const targetCase = state.cases.find((c) => c.id === caseId);
      const patientId = targetCase?.patientId || existingConsult?.patientId;
      const patient = patientId ? state.patients.find((p) => p.id === patientId) : undefined;
      const patientNameEn = patient?.name?.en || targetCase?.name?.en || 'Patient';
      const patientNameHi = patient?.name?.hi || targetCase?.name?.hi || 'मरीज़';
      const doctorName = 'Dr. Rao';

      const alertId = `doctor_replied:${caseId}:${consultId}:1`;
      const alert: AlertRecord = {
        id: alertId,
        type: 'doctor_replied',
        caseId,
        consultId,
        createdAt: nowISO,
        title: {
          en: `Doctor replied: ${patientNameEn}`,
          hi: `डॉक्टर का जवाब आया: ${patientNameHi}`,
        },
        advice: trimmedAdvice,
        decision: normalizedDecision,
        doctorName,
        repliedAt: nowISO,
        kind: 'replied',
        group: 'today',
        text: {
          en: `Doctor replied: ${patientNameEn}`,
          hi: `डॉक्टर का जवाब आया: ${patientNameHi}`,
        },
        time: {
          en: 'Just now',
          hi: 'अभी-अभी',
        },
        patientId,
        timestamp: nowISO,
      };

      const syncItemId = `sync-reply-${caseId}-${consultId}`;

      dispatch({
        type: 'DOCTOR_REPLY',
        payload: {
          caseId,
          consultId,
          advice: trimmedAdvice,
          decision: normalizedDecision,
          read,
          doctorName,
          nowISO,
          alert,
          syncItemId,
        },
        online,
      });

      return { ok: true };
    },
    [state.consults, state.cases, state.patients]
  );

  const createReferral = useCallback(
    (
      caseId: string,
      patientId: string,
      facility: { en: string; hi: string } | undefined,
      dueHours: number | undefined,
      online: boolean
    ) => {
      const nowISO = new Date().toISOString();
      const referralId = `r-${patientId}`;
      const dueAt = new Date(Date.now() + (dueHours || 24) * 3600 * 1000).toISOString();
      const syncItemId = `sync-referral-${patientId}`;
      dispatch({
        type: 'CREATE_REFERRAL',
        payload: { caseId, patientId, facility, dueHours, nowISO, referralId, dueAt, syncItemId },
        online,
      });
    },
    []
  );

  const referralAction = useCallback(
    (
      referralId: string,
      action: 'reminder' | 'reached_facility' | 'outcome',
      outcome: ('completed' | 'rescheduled' | 'refused') | undefined,
      notes: string | undefined,
      online: boolean
    ) => {
      const nowISO = new Date().toISOString();
      const syncItemId = `sync-ref-${referralId}-${action}`;
      dispatch({
        type: 'REFERRAL_ACTION',
        payload: { referralId, action, outcome, notes, nowISO, syncItemId },
        online,
      });
    },
    []
  );

  const getPriorityStats = useCallback(() => {
    let overdueReferralsCount = 0;
    let followupsDueCount = 0;
    let awaitingDoctorCount = 0;

    for (const c of state.cases) {
      if (c.state === 'OUTCOME_RECORDED' || c.state === 'REACHED_FACILITY') {
        continue;
      }
      if (c.state === 'CONSULT_REQUESTED') {
        awaitingDoctorCount++;
      }
      const p = priority(c);
      if (p.rank === 2) {
        overdueReferralsCount++;
      } else if (p.rank === 3 || c.type === 'followup') {
        followupsDueCount++;
      }
    }

    return {
      overdueReferralsCount: Math.max(overdueReferralsCount, 0),
      followupsDueCount: Math.max(followupsDueCount, 0),
      awaitingDoctorCount,
    };
  }, [state.cases]);

  const getLoopClosureRate = useCallback(
    (windowHours?: number) => {
      return loopClosureRate(state.cases, windowHours);
    },
    [state.cases]
  );

  const unreadAlertsCount = state.alerts.filter((a) => !a.readAt).length;
  const waitingSyncCount = state.syncQueue.filter((s) => s.status === 'waiting_to_send').length;

  const readingAgreement = React.useMemo(() => {
    const reviewed = state.consults.filter((con) => con.agreed !== undefined || con.doctorRead !== undefined);
    const agreed = reviewed.filter((con) => con.agreed === true || con.doctorRead === 'agree').length;
    const total = reviewed.length;
    const rate = total > 0 ? Math.round((agreed / total) * 100) : 100;
    return { agreed, total, rate };
  }, [state.consults]);

  const value: CaseStoreContextValue = {
    state,
    patients: state.patients,
    currentScreening: state.currentScreening,
    currentCaseId: state.currentCaseId,
    syncedCases: state.syncedCases,
    syncedReferrals: state.syncedReferrals,
    syncedConsults: state.syncedConsults,
    syncedAlerts: state.syncedAlerts,
    unreadAlertsCount,
    waitingSyncCount,
    demoDataResetNotice: state.demoDataResetNotice,
    demoClockOffsetMinutes: state.demoClockOffsetMinutes,
    readingAgreement,
    dismissResetNotice,
    setCurrentCaseId,
    isOverdue,
    getCase,
    getCaseByPatientId,
    getReferralByPatientId,
    getConsultByCaseId,
    getPatient,
    getPatientSummary,
    selectScreeningPatient,
    addPatient,
    resetDemoData,
    syncNow,
    updateScreening,
    requestConsult,
    markConsultReceived,
    markAlertRead,
    recordOutcome,
    doctorReply,
    createReferral,
    referralAction,
    getPriorityStats,
    getLoopClosureRate,
  };

  return <CaseStoreContext.Provider value={value}>{children}</CaseStoreContext.Provider>;
}

export function useCaseStore(): CaseStoreContextValue {
  const ctx = useContext(CaseStoreContext);
  if (!ctx) {
    throw new Error('useCaseStore must be used within a CaseProvider');
  }
  return ctx;
}
