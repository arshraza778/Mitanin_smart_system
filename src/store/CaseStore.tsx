import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react';
import { priority, loopClosureRate, type CaseState } from '../domain';
import { dataService } from '../services';

export type { CaseState };

export const STORAGE_KEY = 'ms-state-v1';

export interface PatientRecord {
  id: string; // e.g. "p1"
  name: { en: string; hi: string };
  age: number | null;
  village: { en: string; hi: string } | string;
  caseId?: string;
  sex?: 'female' | 'male' | 'other';
  pregnant?: boolean;
}

export interface CaseRecord {
  id: string; // e.g. "c1"
  patientId: string; // e.g. "p1"
  name: { en: string; hi: string };
  village: { en: string; hi: string } | string;
  symptoms: { en: string; hi: string };
  symptomFlags?: string[];
  waitingMin: number;
  photo: boolean | string;
  photoData?: string;
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
  status: 'waiting' | 'replied';
  requestedAt: string;
  repliedAt?: string;
  doctorName?: string;
  advice?: string;
  decision?: string;
  testRead?: string;
}

export interface AlertRecord {
  id: string;
  kind: 'overdue' | 'replied' | 'followup';
  group: 'today' | 'earlier';
  text: { en: string; hi: string };
  time: { en: string; hi: string };
  patientId?: string;
  caseId?: string;
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
  patients: PatientRecord[];
  currentScreening: { patientId: string };
  cases: CaseRecord[];
  referrals: ReferralRecord[];
  consults: ConsultRecord[];
  alerts: AlertRecord[];
  syncQueue: SyncItem[];
  demoClockOffsetMinutes: number;
  syncedCases: CaseRecord[];
  syncedReferrals: ReferralRecord[];
  syncedConsults: ConsultRecord[];
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

export function getInitialSeedState(): CaseStoreState {
  const rawPatients = dataService.getPatients() as PatientRecord[];
  const rawCases = dataService.getCases();
  const rawReferrals = dataService.getReferrals();
  const rawAlerts = dataService.getAlerts();
  const rawSupervisor = dataService.getSupervisorRows();
  const now = Date.now();

  // Ramesh c1 / p1 initial state
  const initialCases: CaseRecord[] = rawCases.map((rc: any) => {
    const isRamesh = rc.patientId === 'p1' || rc.id === 'c1';
    const isPooja = rc.patientId === 'p6' || rc.id === 'c4';
    const isAnita = rc.patientId === 'p4' || rc.id === 'c2';

    // Due times for demo (e.g. Ramesh referral 2h ago, Pooja 1d ago)
    const dueTime = isRamesh
      ? new Date(now - 2 * 3600 * 1000).toISOString()
      : isPooja
      ? new Date(now - 24 * 3600 * 1000).toISOString()
      : undefined;

    const caseState: CaseState = isRamesh
      ? 'SCREENED'
      : isAnita
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
      symptomFlags: isRamesh ? ['fever'] : isAnita ? ['sleepy', 'drink'] : [],
      waitingMin: rc.waitingMin ?? 0,
      photo: rc.photo ?? false,
      testResult: isRamesh ? 'positive' : undefined,
      state: caseState,
      dueAt: dueTime,
      createdAt: new Date(now - (rc.waitingMin ?? 60) * 60 * 1000).toISOString(),
      updatedAt: new Date(now - (rc.waitingMin ?? 60) * 60 * 1000).toISOString(),
      type: isRamesh || isPooja ? 'referral' : 'consult',
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

  // Initial referrals
  const initialReferrals: ReferralRecord[] = rawReferrals.map((rf: any) => ({
    id: rf.id,
    patientId: rf.patientId,
    caseId: 'c1',
    facility: rf.facility,
    owner: rf.owner,
    status: 'in_progress', // Never store overdue
    stage: 1,
    dueHours: rf.dueHours ?? 24,
    dueAt: new Date(now - 2 * 3600 * 1000).toISOString(), // 2h ago
    createdAt: new Date(now - 26 * 3600 * 1000).toISOString(),
  }));

  // Initial consults
  const initialConsults: ConsultRecord[] = [
    {
      id: 'con-c2',
      caseId: 'c2',
      patientId: 'p4',
      status: 'waiting',
      requestedAt: new Date(now - 140 * 60 * 1000).toISOString(),
    },
    {
      id: 'con-c3',
      caseId: 'c3',
      patientId: 'p5',
      status: 'waiting',
      requestedAt: new Date(now - 75 * 60 * 1000).toISOString(),
    },
  ];

  // Initial alerts
  const initialAlerts: AlertRecord[] = rawAlerts.map((al: any) => ({
    id: al.id,
    kind: al.kind,
    group: al.group,
    text: al.text,
    time: al.time,
    timestamp: new Date().toISOString(),
  }));

  return {
    patients: rawPatients,
    currentScreening: { patientId: 'p1' },
    cases: allCases,
    referrals: initialReferrals,
    consults: initialConsults,
    alerts: initialAlerts,
    syncQueue: [],
    demoClockOffsetMinutes: 0,
    syncedCases: allCases,
    syncedReferrals: initialReferrals,
    syncedConsults: initialConsults,
  };
}

export type CaseAction =
  | { type: 'RESET_DEMO_DATA' }
  | { type: 'SELECT_SCREENING_PATIENT'; payload: { patientId: string } }
  | { type: 'ADD_PATIENT'; payload: PatientRecord }
  | {
      type: 'UPDATE_SCREENING';
      payload: {
        patientId: string;
        symptoms?: { en: string; hi: string };
        symptomFlags?: string[];
        hasDangerSigns?: boolean;
        photo?: boolean | string;
        photoData?: string;
        testResult?: 'positive' | 'negative' | 'invalid';
        state?: CaseState;
      };
      online: boolean;
    }
  | {
      type: 'REQUEST_CONSULT';
      payload: {
        caseId: string;
        patientId: string;
      };
      online: boolean;
    }
  | {
      type: 'DOCTOR_REPLY';
      payload: {
        caseId: string;
        advice: string;
        decision: string;
        read?: string;
      };
      online: boolean;
    }
  | {
      type: 'CREATE_REFERRAL';
      payload: {
        caseId: string;
        patientId: string;
        facility?: { en: string; hi: string };
        dueHours?: number;
      };
      online: boolean;
    }
  | {
      type: 'REFERRAL_ACTION';
      payload: {
        referralId: string;
        action: 'reminder' | 'reached_facility' | 'outcome';
        outcome?: 'completed' | 'rescheduled' | 'refused';
        notes?: string;
      };
      online: boolean;
    }
  | { type: 'SYNC_NOW' }
  | { type: 'SET_CLOCK_OFFSET'; payload: { offsetMinutes: number } };

export function caseReducer(state: CaseStoreState, action: CaseAction): CaseStoreState {
  const now = Date.now();

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

    case 'SELECT_SCREENING_PATIENT': {
      return {
        ...state,
        currentScreening: { patientId: action.payload.patientId },
      };
    }

    case 'ADD_PATIENT': {
      const newPatient = action.payload;
      const nextPatients = [newPatient, ...state.patients];
      return {
        ...state,
        patients: nextPatients,
        currentScreening: { patientId: newPatient.id },
      };
    }

    case 'UPDATE_SCREENING': {
      const { payload, online } = action;
      const existingIdx = state.cases.findIndex(
        (c) => c.patientId === payload.patientId || (payload.patientId === 'p1' && c.id === 'c1')
      );

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
          : payload.patientId === 'p1'
          ? 'c1'
          : `c-${payload.patientId}`;

      const targetCase: CaseRecord =
        existingIdx >= 0
          ? {
              ...state.cases[existingIdx],
              ...(payload.symptoms ? { symptoms: payload.symptoms } : {}),
              ...(payload.symptomFlags ? { symptomFlags: payload.symptomFlags } : {}),
              ...(payload.hasDangerSigns !== undefined ? { hasDangerSigns: payload.hasDangerSigns } : {}),
              ...(payload.photo !== undefined ? { photo: payload.photo } : {}),
              ...(payload.photoData !== undefined ? { photoData: payload.photoData } : {}),
              ...(payload.testResult !== undefined ? { testResult: payload.testResult } : {}),
              state: payload.state || state.cases[existingIdx].state,
              updatedAt: new Date(now).toISOString(),
            }
          : {
              id: caseId,
              patientId: payload.patientId,
              name: patientName,
              village: patientVillage,
              symptoms: payload.symptoms || { en: 'Fever over 2 days, test positive', hi: '2 दिन से ज़्यादा बुखार, जाँच पॉज़िटिव' },
              symptomFlags: payload.symptomFlags || ['fever'],
              waitingMin: 0,
              photo: payload.photo ?? true,
              photoData: payload.photoData,
              testResult: payload.testResult ?? 'positive',
              state: payload.state || 'SCREENED',
              createdAt: new Date(now).toISOString(),
              updatedAt: new Date(now).toISOString(),
              type: 'referral',
              mitanin: 'Sunita',
            };

      const nextCases =
        existingIdx >= 0
          ? state.cases.map((c, i) => (i === existingIdx ? targetCase : c))
          : [targetCase, ...state.cases];

      const syncItem: SyncItem | null = !online
        ? {
            id: `sync-${now}-${Math.random().toString(36).slice(2, 6)}`,
            actionType: 'UPDATE_SCREENING',
            payload,
            status: 'waiting_to_send',
            createdAt: new Date(now).toISOString(),
            description: {
              en: `Screening updated for ${patientName.en} (${payload.state || 'SCREENED'})`,
              hi: `${patientName.hi} की जाँच अद्यतित (${payload.state || 'जाँच पूर्ण'})`,
            },
          }
        : null;

      const nextSyncQueue = syncItem ? [syncItem, ...state.syncQueue] : state.syncQueue;

      return {
        ...state,
        cases: nextCases,
        syncedCases: online ? nextCases : state.syncedCases,
        syncQueue: nextSyncQueue,
      };
    }

    case 'REQUEST_CONSULT': {
      const { payload, online } = action;
      const targetCaseId = payload.caseId || (payload.patientId === 'p1' ? 'c1' : `c-${payload.patientId}`);
      const patient = state.patients.find((p) => p.id === payload.patientId) || dataService.getPatient(payload.patientId);
      const patientNameEn = patient?.name?.en || 'Patient';
      const patientNameHi = patient?.name?.hi || 'मरीज़';

      const nextCases = state.cases.map((c) =>
        c.id === targetCaseId || c.patientId === payload.patientId
          ? { ...c, state: 'CONSULT_REQUESTED' as CaseState, updatedAt: new Date(now).toISOString() }
          : c
      );

      const newConsult: ConsultRecord = {
        id: `con-${targetCaseId}-${now}`,
        caseId: targetCaseId,
        patientId: payload.patientId,
        status: 'waiting',
        requestedAt: new Date(now).toISOString(),
      };

      const nextConsults = [
        newConsult,
        ...state.consults.filter((con) => con.caseId !== targetCaseId),
      ];

      const syncItem: SyncItem | null = !online
        ? {
            id: `sync-${now}-${Math.random().toString(36).slice(2, 6)}`,
            actionType: 'REQUEST_CONSULT',
            payload,
            status: 'waiting_to_send',
            createdAt: new Date(now).toISOString(),
            description: {
              en: `Doctor consult requested for ${patientNameEn}`,
              hi: `${patientNameHi} के लिए डॉक्टर परामर्श का अनुरोध`,
            },
          }
        : null;

      const nextSyncQueue = syncItem ? [syncItem, ...state.syncQueue] : state.syncQueue;

      return {
        ...state,
        cases: nextCases,
        consults: nextConsults,
        syncedCases: online ? nextCases : state.syncedCases,
        syncedConsults: online ? nextConsults : state.syncedConsults,
        syncQueue: nextSyncQueue,
      };
    }

    case 'DOCTOR_REPLY': {
      const { payload, online } = action;
      const targetCaseId = payload.caseId || 'c1';

      const targetCase = state.cases.find((c) => c.id === targetCaseId);
      const patient = state.patients.find((p) => p.id === targetCase?.patientId) || (targetCase?.patientId ? dataService.getPatient(targetCase.patientId) : undefined);
      const patientNameEn = patient?.name?.en || targetCase?.name?.en || 'Patient';
      const patientNameHi = patient?.name?.hi || targetCase?.name?.hi || 'मरीज़';

      const nextCases = state.cases.map((c) =>
        c.id === targetCaseId
          ? {
              ...c,
              state: 'CONSULT_REPLIED' as CaseState,
              doctorAdvice: payload.advice,
              doctorDecision: payload.decision,
              doctorRead: payload.read,
              updatedAt: new Date(now).toISOString(),
            }
          : c
      );

      const nextConsults = state.consults.map((con) =>
        con.caseId === targetCaseId
          ? {
              ...con,
              status: 'replied' as const,
              repliedAt: new Date(now).toISOString(),
              doctorName: 'Dr. Rao',
              advice: payload.advice,
              decision: payload.decision,
              testRead: payload.read,
            }
          : con
      );

      const newAlert: AlertRecord = {
        id: `alt-rep-${now}`,
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
        caseId: targetCaseId,
        patientId: targetCase?.patientId,
        timestamp: new Date(now).toISOString(),
      };

      const nextAlerts = [newAlert, ...state.alerts];

      const syncItem: SyncItem | null = !online
        ? {
            id: `sync-${now}-${Math.random().toString(36).slice(2, 6)}`,
            actionType: 'DOCTOR_REPLY',
            payload,
            status: 'waiting_to_send',
            createdAt: new Date(now).toISOString(),
            description: {
              en: `Doctor reply sent for ${patientNameEn}`,
              hi: `${patientNameHi} के लिए डॉक्टर का जवाब भेजा गया`,
            },
          }
        : null;

      const nextSyncQueue = syncItem ? [syncItem, ...state.syncQueue] : state.syncQueue;

      return {
        ...state,
        cases: nextCases,
        consults: nextConsults,
        alerts: nextAlerts,
        syncedCases: online ? nextCases : state.syncedCases,
        syncedConsults: online ? nextConsults : state.syncedConsults,
        syncQueue: nextSyncQueue,
      };
    }

    case 'CREATE_REFERRAL': {
      const { payload, online } = action;
      const targetCaseId = payload.caseId || 'c1';
      const targetPatientId = payload.patientId || 'p1';

      const patient = state.patients.find((p) => p.id === targetPatientId) || dataService.getPatient(targetPatientId);
      const patientNameEn = patient?.name?.en || 'Patient';
      const patientNameHi = patient?.name?.hi || 'मरीज़';

      const nextCases = state.cases.map((c) =>
        c.id === targetCaseId || c.patientId === targetPatientId
          ? {
              ...c,
              state: 'REFERRAL_CREATED' as CaseState,
              dueAt: new Date(now + 24 * 3600 * 1000).toISOString(),
              updatedAt: new Date(now).toISOString(),
            }
          : c
      );

      const existingRefIdx = state.referrals.findIndex(
        (r) => r.patientId === targetPatientId || r.caseId === targetCaseId
      );

      const updatedRef: ReferralRecord =
        existingRefIdx >= 0
          ? {
              ...state.referrals[existingRefIdx],
              stage: 1,
              status: 'in_progress',
              dueAt: new Date(now + (payload.dueHours || 24) * 3600 * 1000).toISOString(),
            }
          : {
              id: `r-${targetPatientId}`,
              patientId: targetPatientId,
              caseId: targetCaseId,
              facility: payload.facility || { en: 'District hospital', hi: 'ज़िला अस्पताल' },
              owner: { en: 'Sunita', hi: 'सुनीता' },
              status: 'in_progress',
              stage: 1,
              dueHours: payload.dueHours || 24,
              dueAt: new Date(now + (payload.dueHours || 24) * 3600 * 1000).toISOString(),
              createdAt: new Date(now).toISOString(),
            };

      const nextReferrals =
        existingRefIdx >= 0
          ? state.referrals.map((r, i) => (i === existingRefIdx ? updatedRef : r))
          : [updatedRef, ...state.referrals];

      const syncItem: SyncItem | null = !online
        ? {
            id: `sync-${now}-${Math.random().toString(36).slice(2, 6)}`,
            actionType: 'CREATE_REFERRAL',
            payload,
            status: 'waiting_to_send',
            createdAt: new Date(now).toISOString(),
            description: {
              en: `Referral created for ${patientNameEn}`,
              hi: `${patientNameHi} के लिए रेफ़रल बनाया गया`,
            },
          }
        : null;

      const nextSyncQueue = syncItem ? [syncItem, ...state.syncQueue] : state.syncQueue;

      return {
        ...state,
        cases: nextCases,
        referrals: nextReferrals,
        syncedCases: online ? nextCases : state.syncedCases,
        syncedReferrals: online ? nextReferrals : state.syncedReferrals,
        syncQueue: nextSyncQueue,
      };
    }

    case 'REFERRAL_ACTION': {
      const { payload, online } = action;
      const refIdx = state.referrals.findIndex((r) => r.id === payload.referralId || r.id === 'r1');
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
        c.patientId === ref.patientId || c.id === ref.caseId || (ref.patientId === 'p1' && c.id === 'c1')
          ? {
              ...c,
              state: newCaseState,
              outcome: payload.outcome ?? c.outcome,
              updatedAt: new Date(now).toISOString(),
            }
          : c
      );

      const patient = state.patients.find((p) => p.id === ref.patientId) || dataService.getPatient(ref.patientId);
      const patientNameEn = patient?.name?.en || 'Patient';
      const patientNameHi = patient?.name?.hi || 'मरीज़';

      const syncItem: SyncItem | null = !online
        ? {
            id: `sync-${now}-${Math.random().toString(36).slice(2, 6)}`,
            actionType: 'REFERRAL_ACTION',
            payload,
            status: 'waiting_to_send',
            createdAt: new Date(now).toISOString(),
            description: {
              en: `Referral action (${payload.action}) for ${patientNameEn}`,
              hi: `${patientNameHi} के लिए रेफ़रल कार्रवाई (${payload.action})`,
            },
          }
        : null;

      const nextSyncQueue = syncItem ? [syncItem, ...state.syncQueue] : state.syncQueue;

      return {
        ...state,
        cases: nextCases,
        referrals: nextReferrals,
        syncedCases: online ? nextCases : state.syncedCases,
        syncedReferrals: online ? nextReferrals : state.syncedReferrals,
        syncQueue: nextSyncQueue,
      };
    }

    case 'SYNC_NOW': {
      const updatedQueue = state.syncQueue.map((item) =>
        item.status === 'waiting_to_send'
          ? { ...item, status: 'sent' as const, sentAt: new Date(now).toISOString() }
          : item
      );

      return {
        ...state,
        syncQueue: updatedQueue,
        syncedCases: state.cases,
        syncedReferrals: state.referrals,
        syncedConsults: state.consults,
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
  currentScreening: { patientId: string };
  syncedCases: CaseRecord[];
  syncedReferrals: ReferralRecord[];
  syncedConsults: ConsultRecord[];
  waitingSyncCount: number;
  isOverdue: (dueAt?: string | null) => boolean;
  getCase: (id: string) => CaseRecord | undefined;
  getCaseByPatientId: (patientId: string) => CaseRecord | undefined;
  getReferralByPatientId: (patientId: string) => ReferralRecord | undefined;
  getConsultByCaseId: (caseId: string) => ConsultRecord | undefined;
  getPatient: (id: string) => PatientRecord | undefined;
  getPatientSummary: (id: string, lang: 'en' | 'hi') => string;
  selectScreeningPatient: (patientId: string) => void;
  addPatient: (data: {
    name: { en: string; hi: string } | string;
    age: number;
    village: { en: string; hi: string } | string;
    sex?: 'female' | 'male' | 'other';
    pregnant?: boolean;
  }) => PatientRecord;
  resetDemoData: () => void;
  syncNow: () => void;
  updateScreening: (
    payload: {
      patientId: string;
      symptoms?: { en: string; hi: string };
      symptomFlags?: string[];
      hasDangerSigns?: boolean;
      photo?: boolean | string;
      photoData?: string;
      testResult?: 'positive' | 'negative' | 'invalid';
      state?: CaseState;
    },
    online: boolean
  ) => void;
  requestConsult: (caseId: string, patientId: string, online: boolean) => void;
  doctorReply: (
    caseId: string,
    advice: string,
    decision: string,
    read: string | undefined,
    online: boolean
  ) => void;
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
  getLoopClosureRate: (windowHours?: number) => number;
}

const CaseStoreContext = createContext<CaseStoreContextValue | null>(null);

function loadPersistedState(): CaseStoreState {
  if (typeof window === 'undefined') {
    return getInitialSeedState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialSeedState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.cases) || !Array.isArray(parsed.referrals)) {
      return getInitialSeedState();
    }
    const seed = getInitialSeedState();
    return {
      patients: Array.isArray(parsed.patients) && parsed.patients.length > 0 ? parsed.patients : seed.patients,
      currentScreening: parsed.currentScreening?.patientId ? parsed.currentScreening : seed.currentScreening,
      cases: parsed.cases,
      referrals: parsed.referrals,
      consults: parsed.consults || [],
      alerts: parsed.alerts || [],
      syncQueue: parsed.syncQueue || [],
      demoClockOffsetMinutes: parsed.demoClockOffsetMinutes ?? 0,
      syncedCases: parsed.syncedCases || parsed.cases,
      syncedReferrals: parsed.syncedReferrals || parsed.referrals,
      syncedConsults: parsed.syncedConsults || parsed.consults || [],
    };
  } catch (err) {
    console.warn('Failed to parse localStorage state:', err);
    return getInitialSeedState();
  }
}

export function CaseProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(caseReducer, undefined, loadPersistedState);

  // Persist to localStorage on state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const toSave = {
        patients: state.patients,
        currentScreening: state.currentScreening,
        cases: state.cases,
        referrals: state.referrals,
        consults: state.consults,
        alerts: state.alerts,
        syncQueue: state.syncQueue,
        demoClockOffsetMinutes: state.demoClockOffsetMinutes,
        syncedCases: state.syncedCases,
        syncedReferrals: state.syncedReferrals,
        syncedConsults: state.syncedConsults,
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

  const selectScreeningPatient = useCallback((patientId: string) => {
    dispatch({ type: 'SELECT_SCREENING_PATIENT', payload: { patientId } });
  }, []);

  const addPatient = useCallback(
    (data: {
      name: { en: string; hi: string } | string;
      age: number;
      village: { en: string; hi: string } | string;
      sex?: 'female' | 'male' | 'other';
      pregnant?: boolean;
    }): PatientRecord => {
      const id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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
        name: nameObj,
        age: data.age,
        village: villageObj,
        sex: data.sex,
        pregnant: data.pregnant,
      };

      dispatch({ type: 'ADD_PATIENT', payload: record });
      return record;
    },
    []
  );

  const resetDemoData = useCallback(() => {
    dispatch({ type: 'RESET_DEMO_DATA' });
  }, []);

  const syncNow = useCallback(() => {
    dispatch({ type: 'SYNC_NOW' });
  }, []);

  const updateScreening = useCallback(
    (
      payload: {
        patientId: string;
        symptoms?: { en: string; hi: string };
        symptomFlags?: string[];
        hasDangerSigns?: boolean;
        photo?: boolean | string;
        photoData?: string;
        testResult?: 'positive' | 'negative' | 'invalid';
        state?: CaseState;
      },
      online: boolean
    ) => {
      dispatch({ type: 'UPDATE_SCREENING', payload, online });
    },
    []
  );

  const requestConsult = useCallback(
    (caseId: string, patientId: string, online: boolean) => {
      dispatch({ type: 'REQUEST_CONSULT', payload: { caseId, patientId }, online });
    },
    []
  );

  const doctorReply = useCallback(
    (
      caseId: string,
      advice: string,
      decision: string,
      read: string | undefined,
      online: boolean
    ) => {
      dispatch({
        type: 'DOCTOR_REPLY',
        payload: { caseId, advice, decision, read },
        online,
      });
    },
    []
  );

  const createReferral = useCallback(
    (
      caseId: string,
      patientId: string,
      facility: { en: string; hi: string } | undefined,
      dueHours: number | undefined,
      online: boolean
    ) => {
      dispatch({
        type: 'CREATE_REFERRAL',
        payload: { caseId, patientId, facility, dueHours },
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
      dispatch({
        type: 'REFERRAL_ACTION',
        payload: { referralId, action, outcome, notes },
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
      overdueReferralsCount: Math.max(overdueReferralsCount, 1),
      followupsDueCount: Math.max(followupsDueCount, 2),
      awaitingDoctorCount,
    };
  }, [state.cases]);

  const getLoopClosureRate = useCallback(
    (windowHours?: number) => {
      return loopClosureRate(state.cases, windowHours);
    },
    [state.cases]
  );

  const waitingSyncCount = state.syncQueue.filter((s) => s.status === 'waiting_to_send').length;

  const value: CaseStoreContextValue = {
    state,
    patients: state.patients,
    currentScreening: state.currentScreening,
    syncedCases: state.syncedCases,
    syncedReferrals: state.syncedReferrals,
    syncedConsults: state.syncedConsults,
    waitingSyncCount,
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
