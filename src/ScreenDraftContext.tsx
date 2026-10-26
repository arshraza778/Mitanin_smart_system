import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface NewPatientDraft {
  name: string;
  age: string;
  sex: 'female' | 'male' | 'other' | '';
  village: string;
  customVillage: string;
  pregnant: boolean;
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
  getAdviceDraft: (caseId: string) => { advice: string; decision?: string } | null;
  setAdviceDraft: (caseId: string, draft: { advice: string; decision?: string }) => void;
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
  const [adviceDraftMap, setAdviceDraftMap] = useState<Record<string, { advice: string; decision?: string }>>({});

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

  const setAdviceDraft = useCallback((caseId: string, draft: { advice: string; decision?: string }) => {
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
