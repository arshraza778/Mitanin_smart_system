export interface PatientFormValues {
  name: string;
  age: string | number | null | undefined;
  sex?: 'female' | 'male' | 'other' | '';
  village?: string;
  customVillage?: string;
  pregnant?: boolean;
}

export interface PatientFormErrors {
  name?: string;
  age?: string;
  village?: string;
}

export function validatePatient(
  values: PatientFormValues,
  lang: 'en' | 'hi' = 'en'
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

  const isValid = Object.keys(errors).length === 0;
  return {
    isValid,
    valid: isValid,
    errors,
  };
}
