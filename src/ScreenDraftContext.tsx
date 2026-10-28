import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Role } from './BottomNav';

export interface NewPatientDraft {
  name: string;
  age: string;
  sex: 'female' | 'male' | 'other' | '';
  village: string;
  customVillage: string;
  pregnant: boolean;
}

export interface AdviceDraft {
  advice: string;
  decision?: 'local' | 'refer' | null;
  read?: 'agree' | 'disagree' | null;
}

export interface ScreenDraftContextValue {
  selectedVisitId: string | null;
  setSelectedVisitId: (id: string | null) => void;
  selectedAlertId: string | null;
  setSelectedAlertId: (id: string | null) => void;
  newPatientDraft: NewPatientDraft;
  setNewPatientDraft: React.Dispatch<React.SetStateAction<NewPatientDraft>>;
  getSymptomTicks: (patientId: string) => boolean[] | null;
  setSymptomTicks: (patientId: string, ticks: boolean[]) => void;
  getTestResult: (patientId: string) => ('positive' | 'negative' | 'invalid') | null;
  setTestResult: (patientId: string, res: 'positive' | 'negative' | 'invalid') => void;
  getTestPhoto: (patientId: string) => string | null;
  setTestPhoto: (patientId: string, photo: string | null) => void;
  getAdviceDraft: (caseId: string) => AdviceDraft | null;
  setAdviceDraft: (caseId: string, draft: AdviceDraft) => void;
  selectedDoctorCaseId: string | null;
  setSelectedDoctorCaseId: (id: string | null) => void;
  selectedSupervisorCaseId: string | null;
  setSelectedSupervisorCaseId: (id: string | null) => void;
  noPhotoReplyingCases: Record<string, boolean>;
  setNoPhotoReplying: (caseId: string, replying: boolean) => void;
  photoRequestedCases: Record<string, boolean>;
  setPhotoRequested: (caseId: string, requested: boolean) => void;
  currentRole: Role | null;
  setCurrentRole: (role: Role | null) => void;
}

const defaultPatientDraft: NewPatientDraft = {
  name: '',
  age: '',
  sex: '',
  village: 'Kotra',
  customVillage: '',
  pregnant: false,
};

const ScreenDraftContext = createContext<ScreenDraftContextValue | undefined>(undefined);

export function ScreenDraftProvider({ children }: { children: ReactNode }) {
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [newPatientDraft, setNewPatientDraft] = useState<NewPatientDraft>(defaultPatientDraft);
  const [symptomTicksMap, setSymptomTicksMap] = useState<Record<string, boolean[]>>({});
  const [testResultMap, setTestResultMap] = useState<Record<string, 'positive' | 'negative' | 'invalid'>>({});
  const [testPhotoMap, setTestPhotoMap] = useState<Record<string, string | null>>({});
  const [adviceDraftMap, setAdviceDraftMap] = useState<Record<string, AdviceDraft>>({});
  
  const [selectedDoctorCaseId, setSelectedDoctorCaseIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ms_selected_doctor_case') || null;
    }
    return null;
  });

  const [selectedSupervisorCaseId, setSelectedSupervisorCaseIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ms_selected_supervisor_case') || null;
    }
    return null;
  });

  const [currentRole, setCurrentRoleState] = useState<Role | null>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('ms_current_role') as Role | null) || null;
    }
    return null;
  });

  const [noPhotoReplyingCases, setNoPhotoReplyingCases] = useState<Record<string, boolean>>({});
  const [photoRequestedCases, setPhotoRequestedCases] = useState<Record<string, boolean>>({});

  const setSelectedDoctorCaseId = useCallback((id: string | null) => {
    setSelectedDoctorCaseIdState(id);
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('ms_selected_doctor_case', id);
      } else {
        localStorage.removeItem('ms_selected_doctor_case');
      }
    }
  }, []);

  const setSelectedSupervisorCaseId = useCallback((id: string | null) => {
    setSelectedSupervisorCaseIdState(id);
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('ms_selected_supervisor_case', id);
      } else {
        localStorage.removeItem('ms_selected_supervisor_case');
      }
    }
  }, []);

  const setCurrentRole = useCallback((role: Role | null) => {
    setCurrentRoleState(role);
    if (typeof window !== 'undefined') {
      if (role) {
        localStorage.setItem('ms_current_role', role);
      } else {
        localStorage.removeItem('ms_current_role');
      }
    }
  }, []);

  const setNoPhotoReplying = useCallback((caseId: string, replying: boolean) => {
    setNoPhotoReplyingCases((prev) => ({ ...prev, [caseId]: replying }));
  }, []);

  const setPhotoRequested = useCallback((caseId: string, requested: boolean) => {
    setPhotoRequestedCases((prev) => ({ ...prev, [caseId]: requested }));
  }, []);

  const getSymptomTicks = useCallback((patientId: string) => {
    return symptomTicksMap[patientId] ?? null;
  }, [symptomTicksMap]);

  const setSymptomTicks = useCallback((patientId: string, ticks: boolean[]) => {
    setSymptomTicksMap((prev) => ({ ...prev, [patientId]: ticks }));
  }, []);

  const getTestResult = useCallback((patientId: string) => {
    return testResultMap[patientId] ?? null;
  }, [testResultMap]);

  const setTestResult = useCallback((patientId: string, res: 'positive' | 'negative' | 'invalid') => {
    setTestResultMap((prev) => ({ ...prev, [patientId]: res }));
  }, []);

  const getTestPhoto = useCallback((patientId: string) => {
    return testPhotoMap[patientId] ?? null;
  }, [testPhotoMap]);

  const setTestPhoto = useCallback((patientId: string, photo: string | null) => {
    setTestPhotoMap((prev) => ({ ...prev, [patientId]: photo }));
  }, []);

  const getAdviceDraft = useCallback((caseId: string) => {
    return adviceDraftMap[caseId] ?? null;
  }, [adviceDraftMap]);

  const setAdviceDraft = useCallback((caseId: string, draft: AdviceDraft) => {
    setAdviceDraftMap((prev) => ({ ...prev, [caseId]: draft }));
  }, []);

  return (
    <ScreenDraftContext.Provider
      value={{
        selectedVisitId,
        setSelectedVisitId,
        selectedAlertId,
        setSelectedAlertId,
        newPatientDraft,
        setNewPatientDraft,
        getSymptomTicks,
        setSymptomTicks,
        getTestResult,
        setTestResult,
        getTestPhoto,
        setTestPhoto,
        getAdviceDraft,
        setAdviceDraft,
        selectedDoctorCaseId,
        setSelectedDoctorCaseId,
        selectedSupervisorCaseId,
        setSelectedSupervisorCaseId,
        noPhotoReplyingCases,
        setNoPhotoReplying,
        photoRequestedCases,
        setPhotoRequested,
        currentRole,
        setCurrentRole,
      }}
    >
      {children}
    </ScreenDraftContext.Provider>
  );
}

export function useScreenDraft(): ScreenDraftContextValue {
  const ctx = useContext(ScreenDraftContext);
  if (!ctx) {
    throw new Error('useScreenDraft must be used within a ScreenDraftProvider');
  }
  return ctx;
}
