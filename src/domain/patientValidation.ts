import { getDemoDate } from './dateUtils';

export interface PatientFormValues {
  name: string;
  age: string | number | null | undefined;
  yearOfBirth?: string | number | null | undefined;
  household?: string;
  consentGiven?: boolean;
  requireConsent?: boolean;
  sex?: 'female' | 'male' | 'other' | '';
  village?: string;
  customVillage?: string;
  pregnant?: boolean;
}

export interface PatientFormErrors {
  name?: string;
  age?: string;
  yearOfBirth?: string;
  consent?: string;
  village?: string;
}

export interface ExistingPatientRecord {
  id: string;
  name: { en: string; hi: string };
  age: number | null;
  village: { en: string; hi: string } | string;
  patientCode?: string;
  [key: string]: any;
}

export function validatePatient(
  values: PatientFormValues,
  lang: 'en' | 'hi' = 'en',
  currentYear?: number
): { isValid: boolean; valid: boolean; errors: PatientFormErrors } {
  const errors: PatientFormErrors = {};
  const isHi = lang === 'hi';

  const trimmedName = typeof values.name === 'string' ? values.name.trim() : '';
  if (!trimmedName) {
    errors.name = isHi ? 'कृपया मरीज़ का नाम दर्ज करें' : 'Patient name is required';
  }

  const rawAge = values.age;
  const ageStr = String(rawAge ?? '').trim();
  const ageNum = Number(ageStr);

  if (
    ageStr === '' ||
    rawAge == null ||
    Number.isNaN(ageNum) ||
    !Number.isInteger(ageNum) ||
    ageNum < 0 ||
    ageNum > 120
  ) {
    errors.age = isHi
      ? 'उम्र 0 से 120 के बीच होनी चाहिए'
      : 'Age must be a number between 0 and 120';
  }

  // Year of birth validation (optional field, but if entered must be plausible)
  const rawYob = values.yearOfBirth;
  const yobStr = String(rawYob ?? '').trim();
  if (yobStr !== '') {
    const yobNum = Number(yobStr);
    const maxYear = currentYear ?? getDemoDate().getFullYear();
    if (
      Number.isNaN(yobNum) ||
      !Number.isInteger(yobNum) ||
      yobNum < 1900 ||
      yobNum > maxYear
    ) {
      errors.yearOfBirth = isHi
        ? 'जन्म का वर्ष 1900 से वर्तमान वर्ष के बीच होना चाहिए'
        : 'Year of birth must be between 1900 and current year';
    }
  }

  // Consent validation (required checkbox for new screenings)
  if (values.requireConsent && !values.consentGiven) {
    errors.consent = isHi
      ? 'मरीज़ या परिवार की सहमति आवश्यक है'
      : 'Consent is required before saving a new patient';
  }

  const isValid = Object.keys(errors).length === 0;
  return {
    isValid,
    valid: isValid,
    errors,
  };
}

/**
 * Pure duplicate detection rule:
 * Same name (case-insensitive, trimmed) AND same village AND age difference of 1 year or less.
 */
export function findDuplicatePatients(
  candidate: {
    name: string;
    age: number | string | null | undefined;
    village: string | { en: string; hi: string };
  },
  existingPatients: ExistingPatientRecord[]
): ExistingPatientRecord[] {
  const cName = (typeof candidate.name === 'string' ? candidate.name : '').trim().toLowerCase();
  if (!cName) return [];

  const cAge = candidate.age != null && candidate.age !== '' ? Number(candidate.age) : null;
  if (cAge == null || Number.isNaN(cAge)) return [];

  const getVillageStrings = (v: string | { en: string; hi: string } | undefined): string[] => {
    if (!v) return [];
    if (typeof v === 'string') return [v.trim().toLowerCase()];
    return [v.en?.trim().toLowerCase(), v.hi?.trim().toLowerCase()].filter(Boolean) as string[];
  };

  const cVillages = getVillageStrings(candidate.village);

  return existingPatients.filter((p) => {
    // 1. Same name (case-insensitive, trimmed)
    const pNameEn = (p.name?.en || '').trim().toLowerCase();
    const pNameHi = (p.name?.hi || '').trim().toLowerCase();
    const nameMatches = cName === pNameEn || cName === pNameHi;
    if (!nameMatches) return false;

    // 2. Same village
    const pVillages = getVillageStrings(p.village);
    const villageMatches = cVillages.some((cv) => pVillages.includes(cv));
    if (!villageMatches) return false;

    // 3. Age difference of 1 year or less
    if (p.age == null || Number.isNaN(Number(p.age))) return false;
    const diff = Math.abs(cAge - Number(p.age));
    return diff <= 1;
  });
}
