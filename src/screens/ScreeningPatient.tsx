import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Info, Search, UserPlus, X } from 'lucide-react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';
import { useCaseStore } from '../store/CaseStore';
import { useScreenDraft } from '../ScreenDraftContext';
import { validatePatient, findDuplicatePatients, getDemoDate, type ExistingPatientRecord } from '../domain';

const STEP = 1;

const COPY = {
  en: enLocale.screens.ScreeningPatient,
  hi: hiLocale.screens.ScreeningPatient,
} as const;

const DIRECTORY = dataService.getDirectory();

export default function ScreeningPatient({ lang, onNavigate }: ScreenProps) {
  const t = COPY[lang];
  const { patients, currentScreening, selectScreeningPatient, addPatient, demoClockOffsetMinutes } = useCaseStore();
  const { newPatientDraft, setNewPatientDraft } = useScreenDraft();

  const [query, setQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    () => currentScreening?.patientId || patients[0]?.id || ''
  );
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state bound to context draft
  const formName = newPatientDraft.name;
  const formAge = newPatientDraft.age;
  const formSex = newPatientDraft.sex;
  const formVillage = newPatientDraft.village || DIRECTORY.villages[0]?.en || 'Kotra';
  const formCustomVillage = newPatientDraft.customVillage;
  const formPregnant = newPatientDraft.pregnant;

  const setFormName = (name: string) => setNewPatientDraft((p) => ({ ...p, name }));
  const setFormAge = (age: string) => setNewPatientDraft((p) => ({ ...p, age }));
  const setFormSex = (sex: 'female' | 'male' | 'other' | '') => setNewPatientDraft((p) => ({ ...p, sex }));
  const setFormVillage = (village: string) => setNewPatientDraft((p) => ({ ...p, village }));
  const setFormCustomVillage = (customVillage: string) => setNewPatientDraft((p) => ({ ...p, customVillage }));
  const setFormPregnant = (pregnant: boolean) => setNewPatientDraft((p) => ({ ...p, pregnant }));

  const [formYearOfBirth, setFormYearOfBirth] = useState('');
  const [formHousehold, setFormHousehold] = useState('');
  const [formConsent, setFormConsent] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<ExistingPatientRecord[]>([]);

  const [formErrors, setFormErrors] = useState<{
    name?: string;
    age?: string;
    yearOfBirth?: string;
    consent?: string;
  }>({});

  const isFemaleAge12Plus = formSex === 'female' && Number(formAge) >= 12;

  const filteredPatients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const nameEn = (p.name?.en || '').toLowerCase();
      const nameHi = p.name?.hi || '';
      const villageEn = (typeof p.village === 'string' ? p.village : p.village?.en || '').toLowerCase();
      const villageHi = typeof p.village === 'string' ? p.village : p.village?.hi || '';
      return (
        nameEn.includes(q) ||
        nameHi.includes(q) ||
        villageEn.includes(q) ||
        villageHi.includes(q)
      );
    });
  }, [patients, query]);

  const handleSelect = (id: string) => {
    setSelectedPatientId(id);
    selectScreeningPatient(id);
  };

  const resetForm = () => {
    setFormName('');
    setFormAge('');
    setFormYearOfBirth('');
    setFormHousehold('');
    setFormConsent(false);
    setFormSex('');
    setFormCustomVillage('');
    setFormPregnant(false);
    setFormErrors({});
    setDuplicateMatches([]);
  };

  const commitAddPatient = (chosenVillage: { en: string; hi: string }) => {
    const yobNum = formYearOfBirth.trim() ? Number(formYearOfBirth) : null;
    const newRecord = addPatient({
      name: { en: formName.trim(), hi: formName.trim() },
      age: Number(formAge),
      village: chosenVillage,
      sex: formSex || undefined,
      pregnant: isFemaleAge12Plus ? formPregnant : undefined,
      yearOfBirth: yobNum,
      household: formHousehold.trim() || undefined,
      consent: true,
    });

    setSelectedPatientId(newRecord.id);
    selectScreeningPatient(newRecord.id);
    setShowAddForm(false);
    resetForm();
  };

  const handleSaveNewPatient = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const currentDemoYear = getDemoDate(demoClockOffsetMinutes || 0).getFullYear();
    const validation = validatePatient(
      {
        name: formName,
        age: formAge,
        yearOfBirth: formYearOfBirth,
        household: formHousehold,
        consentGiven: formConsent,
        requireConsent: true,
        sex: formSex,
        village: formVillage,
        customVillage: formCustomVillage,
        pregnant: isFemaleAge12Plus ? formPregnant : false,
      },
      lang,
      currentDemoYear
    );

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});

    const chosenVillage =
      formVillage === 'other'
        ? { en: formCustomVillage.trim() || 'Other', hi: formCustomVillage.trim() || 'अन्य' }
        : {
            en: formVillage,
            hi: DIRECTORY.villages.find((v) => v.en === formVillage)?.hi || formVillage,
          };

    const candidate = {
      name: formName,
      age: formAge,
      village: chosenVillage,
    };

    const matches = findDuplicatePatients(candidate, patients);
    if (matches.length > 0) {
      setDuplicateMatches(matches);
      return;
    }

    commitAddPatient(chosenVillage);
  };

  const handleUseExistingPatient = (existingId: string) => {
    setSelectedPatientId(existingId);
    selectScreeningPatient(existingId);
    setShowAddForm(false);
    resetForm();
  };

  const handleAddAsNewAnyway = () => {
    if (!formConsent) {
      setFormErrors((errs) => ({
        ...errs,
        consent: t.errors.consentRequired,
      }));
      return;
    }

    const chosenVillage =
      formVillage === 'other'
        ? { en: formCustomVillage.trim() || 'Other', hi: formCustomVillage.trim() || 'अन्य' }
        : {
            en: formVillage,
            hi: DIRECTORY.villages.find((v) => v.en === formVillage)?.hi || formVillage,
          };

    commitAddPatient(chosenVillage);
  };

  const handleNext = () => {
    if (!selectedPatientId) return;
    selectScreeningPatient(selectedPatientId);
    onNavigate('/mitanin/screening/symptoms');
  };

  const renderStepper = () => (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={4}
      aria-valuenow={STEP}
      aria-valuetext={`${t.stepOf}: ${t.steps[STEP - 1]}`}
      style={{
        background: '#FFFFFF',
        borderRadius: 14,
        padding: '12px 14px',
        border: '1px solid #E3ECE7',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {t.steps.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === STEP;
          const isDone = stepNum < STEP;

          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 48 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    background: isActive ? '#053C31' : isDone ? '#2E7D4F' : '#E3ECE7',
                    color: isActive || isDone ? '#FFFFFF' : '#404945',
                    boxShadow: isActive ? '0 0 0 4px rgba(142, 182, 155, 0.4)' : 'none',
                  }}
                >
                  {isDone ? <Check size={14} strokeWidth={3} /> : stepNum}
                </div>
                <span
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#053C31' : isDone ? '#2E7D4F' : '#404945',
                    textAlign: 'center',
                  }}
                >
                  {label}
                </span>
              </div>
              {i < 3 && (
                <div
                  style={{
                    height: 2,
                    flex: 1,
                    margin: '0 4px',
                    marginBottom: 16,
                    background: isDone ? '#2E7D4F' : '#E3ECE7',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderBanner = () => (
    <div
      role="note"
      style={{
        marginTop: 12,
        padding: '10px 14px',
        borderRadius: 12,
        background: '#E7F0EA',
        color: '#404945',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 12.5,
        fontWeight: 600,
        border: '1px solid #CCD9D2',
      }}
    >
      <Info size={16} color="#235347" style={{ flexShrink: 0 }} />
      <span>{t.banner}</span>
    </div>
  );

  const renderSearchInput = () => (
    <div style={{ position: 'relative' }}>
      <Search
        size={18}
        color="#707975"
        style={{ position: 'absolute', left: 16, top: 18, pointerEvents: 'none' }}
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.searchPlaceholder}
        aria-label={t.searchPlaceholder}
        style={{
          width: '100%',
          height: 52,
          minHeight: 52,
          padding: '0 40px 0 46px',
          borderRadius: 14,
          border: '1px solid #E3ECE7',
          background: '#FFFFFF',
          color: '#00201C',
          fontSize: 14,
          fontWeight: 500,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          aria-label="Clear search"
          className="ms-btn ms-btn--ghost ms-btn--sm"
          style={{
            position: 'absolute',
            right: 12,
            top: 14,
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );

  const renderAddPatientForm = (isAlwaysOpen: boolean = false) => (
    <form
      onSubmit={handleSaveNewPatient}
      style={{
        padding: isAlwaysOpen ? 0 : 18,
        borderRadius: isAlwaysOpen ? 0 : 16,
        background: isAlwaysOpen ? 'transparent' : '#FFFFFF',
        border: isAlwaysOpen ? 'none' : '1px solid #E3ECE7',
        display: 'grid',
        gap: 14,
        boxShadow: isAlwaysOpen ? 'none' : '0 4px 16px rgba(0,0,0,0.06)',
      }}
    >
      {!isAlwaysOpen && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#00201C' }}>
            {t.addNewPatient}
          </h3>
          <button
            type="button"
            onClick={() => {
              setShowAddForm(false);
              setFormErrors({});
            }}
            className="ms-btn ms-btn--ghost ms-btn--sm"
            style={{
              padding: '4px 8px',
            }}
          >
            {t.cancel}
          </button>
        </div>
      )}

      {/* Name Field */}
      <div>
        <label
          htmlFor={isAlwaysOpen ? 'ms-patient-name-wide' : 'ms-patient-name'}
          style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#00201C', marginBottom: 6 }}
        >
          {t.nameLabel}
        </label>
        <input
          id={isAlwaysOpen ? 'ms-patient-name-wide' : 'ms-patient-name'}
          type="text"
          value={formName}
          onChange={(e) => {
            setFormName(e.target.value);
            if (formErrors.name) setFormErrors((errs) => ({ ...errs, name: undefined }));
          }}
          placeholder={t.namePlaceholder}
          style={{
            width: '100%',
            height: 48,
            padding: '0 14px',
            borderRadius: 12,
            border: `1px solid ${formErrors.name ? '#BA1A1A' : '#E3ECE7'}`,
            background: '#F8FAF9',
            color: '#00201C',
            fontSize: 14,
            fontWeight: 500,
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        {formErrors.name && (
          <span role="alert" style={{ display: 'block', marginTop: 4, fontSize: 12, fontWeight: 600, color: '#BA1A1A' }}>
            {formErrors.name}
          </span>
        )}
      </div>

      {/* Age Field */}
      <div>
        <label
          htmlFor={isAlwaysOpen ? 'ms-patient-age-wide' : 'ms-patient-age'}
          style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#00201C', marginBottom: 6 }}
        >
          {t.ageLabel}
        </label>
        <input
          id={isAlwaysOpen ? 'ms-patient-age-wide' : 'ms-patient-age'}
          type="number"
          min="0"
          max="120"
          value={formAge}
          onChange={(e) => {
            setFormAge(e.target.value);
            if (formErrors.age) setFormErrors((errs) => ({ ...errs, age: undefined }));
          }}
          placeholder={t.agePlaceholder}
          style={{
            width: '100%',
            height: 48,
            padding: '0 14px',
            borderRadius: 12,
            border: `1px solid ${formErrors.age ? '#BA1A1A' : '#E3ECE7'}`,
            background: '#F8FAF9',
            color: '#00201C',
            fontSize: 14,
            fontWeight: 500,
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        {formErrors.age && (
          <span role="alert" style={{ display: 'block', marginTop: 4, fontSize: 12, fontWeight: 600, color: '#BA1A1A' }}>
            {formErrors.age}
          </span>
        )}
      </div>

      {/* Year of Birth Field */}
      <div>
        <label
          htmlFor={isAlwaysOpen ? 'ms-patient-yob-wide' : 'ms-patient-yob'}
          style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ms-text)', marginBottom: 6 }}
        >
          {t.yearOfBirthLabel}
        </label>
        <input
          id={isAlwaysOpen ? 'ms-patient-yob-wide' : 'ms-patient-yob'}
          type="number"
          min="1900"
          value={formYearOfBirth}
          onChange={(e) => {
            setFormYearOfBirth(e.target.value);
            if (formErrors.yearOfBirth) setFormErrors((errs) => ({ ...errs, yearOfBirth: undefined }));
          }}
          placeholder={t.yearOfBirthPlaceholder}
          style={{
            width: '100%',
            height: 48,
            padding: '0 14px',
            borderRadius: 'var(--ms-radius-md)',
            border: `1px solid ${formErrors.yearOfBirth ? 'var(--ms-danger)' : 'var(--ms-border)'}`,
            background: 'var(--ms-page)',
            color: 'var(--ms-text)',
            fontSize: 14,
            fontWeight: 500,
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        {formErrors.yearOfBirth && (
          <span role="alert" style={{ display: 'block', marginTop: 4, fontSize: 12, fontWeight: 600, color: 'var(--ms-danger)' }}>
            {formErrors.yearOfBirth}
          </span>
        )}
      </div>

      {/* Household Field */}
      <div>
        <label
          htmlFor={isAlwaysOpen ? 'ms-patient-household-wide' : 'ms-patient-household'}
          style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ms-text)', marginBottom: 6 }}
        >
          {t.householdLabel}
        </label>
        <input
          id={isAlwaysOpen ? 'ms-patient-household-wide' : 'ms-patient-household'}
          type="text"
          value={formHousehold}
          onChange={(e) => setFormHousehold(e.target.value)}
          placeholder={t.householdPlaceholder}
          style={{
            width: '100%',
            height: 48,
            padding: '0 14px',
            borderRadius: 'var(--ms-radius-md)',
            border: '1px solid var(--ms-border)',
            background: 'var(--ms-page)',
            color: 'var(--ms-text)',
            fontSize: 14,
            fontWeight: 500,
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
      </div>

      {/* Sex Field */}
      <div>
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#00201C', marginBottom: 6 }}>
          {t.sexLabel}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {(['female', 'male', 'other'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFormSex(formSex === s ? '' : s)}
              className={`ms-btn ${formSex === s ? 'ms-btn--primary' : 'ms-btn--secondary'} ms-btn--md`}
            >
              {t[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Village Field */}
      <div>
        <label
          htmlFor={isAlwaysOpen ? 'ms-patient-village-wide' : 'ms-patient-village'}
          style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#00201C', marginBottom: 6 }}
        >
          {t.villageLabel}
        </label>
        <select
          id={isAlwaysOpen ? 'ms-patient-village-wide' : 'ms-patient-village'}
          value={formVillage}
          onChange={(e) => setFormVillage(e.target.value)}
          style={{
            width: '100%',
            height: 48,
            padding: '0 14px',
            borderRadius: 12,
            border: '1px solid #E3ECE7',
            background: '#F8FAF9',
            color: '#00201C',
            fontSize: 14,
            fontWeight: 500,
            boxSizing: 'border-box',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {DIRECTORY.villages.map((v) => (
            <option key={v.en} value={v.en}>
              {v[lang]}
            </option>
          ))}
          <option value="other">{lang === 'hi' ? 'अन्य गाँव' : 'Other village'}</option>
        </select>
        {formVillage === 'other' && (
          <input
            type="text"
            value={formCustomVillage}
            onChange={(e) => setFormCustomVillage(e.target.value)}
            placeholder={t.customVillagePlaceholder}
            style={{
              width: '100%',
              height: 48,
              marginTop: 8,
              padding: '0 14px',
              borderRadius: 12,
              border: '1px solid #E3ECE7',
              background: '#F8FAF9',
              color: '#00201C',
              fontSize: 14,
              fontWeight: 500,
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        )}
      </div>

      {/* Pregnant switch */}
      {isFemaleAge12Plus && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: 12,
            background: '#F8FAF9',
            border: '1px solid #E3ECE7',
          }}
        >
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#00201C' }}>{t.pregnantLabel}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setFormPregnant(false)}
              className={`ms-btn ${!formPregnant ? 'ms-btn--primary' : 'ms-btn--secondary'} ms-btn--sm`}
            >
              {t.no}
            </button>
            <button
              type="button"
              onClick={() => setFormPregnant(true)}
              className={`ms-btn ${formPregnant ? 'ms-btn--primary' : 'ms-btn--secondary'} ms-btn--sm`}
            >
              {t.yes}
            </button>
          </div>
        </div>
      )}

      {/* Consent Checkbox */}
      <div>
        <label
          htmlFor={isAlwaysOpen ? 'ms-patient-consent-wide' : 'ms-patient-consent'}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ms-text)',
            minHeight: 48,
            padding: '4px 0',
            userSelect: 'none',
          }}
        >
          <input
            id={isAlwaysOpen ? 'ms-patient-consent-wide' : 'ms-patient-consent'}
            type="checkbox"
            checked={formConsent}
            onChange={(e) => {
              setFormConsent(e.target.checked);
              if (formErrors.consent) setFormErrors((errs) => ({ ...errs, consent: undefined }));
            }}
            style={{
              width: 20,
              height: 20,
              marginTop: 2,
              accentColor: 'var(--ms-primary)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          />
          <span>{t.consentLabel}</span>
        </label>
        {formErrors.consent && (
          <span role="alert" style={{ display: 'block', marginTop: 4, fontSize: 12, fontWeight: 600, color: 'var(--ms-danger)' }}>
            {formErrors.consent}
          </span>
        )}
      </div>

      {/* Possible Duplicate Panel or Submit Button */}
      {duplicateMatches.length > 0 ? (
        <div
          role="alert"
          style={{
            padding: 16,
            borderRadius: 'var(--ms-radius-md)',
            background: 'var(--ms-warn-bg)',
            border: '1px solid var(--ms-warn)',
            display: 'grid',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ms-warn)' }}>
              {t.possibleDuplicate}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ms-text)', fontWeight: 500 }}>
            {t.duplicateFoundText}
          </p>

          <div style={{ display: 'grid', gap: 10 }}>
            {duplicateMatches.map((match) => {
              const villageText = typeof match.village === 'string' ? match.village : match.village[lang];
              return (
                <div
                  key={match.id}
                  style={{
                    padding: 12,
                    borderRadius: 'var(--ms-radius-sm)',
                    background: 'var(--ms-card)',
                    border: '1px solid var(--ms-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ms-text)' }}>
                      {match.name[lang]}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--ms-muted)' }}>
                      {match.age} {t.years} • {villageText}
                    </span>
                    {match.patientCode && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--ms-primary)',
                          background: 'var(--ms-mint)',
                          padding: '2px 6px',
                          borderRadius: 'var(--ms-radius-sm)',
                        }}
                      >
                        {match.patientCode}
                      </span>
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleUseExistingPatient(match.id)}
                      className="ms-btn ms-btn--primary ms-btn--md"
                    >
                      <span>{t.useThisPatient}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleAddAsNewAnyway}
              className="ms-btn ms-btn--secondary ms-btn--md"
            >
              <span>{t.addAsNewAnyway}</span>
            </button>
            <button
              type="button"
              onClick={() => setDuplicateMatches([])}
              className="ms-btn ms-btn--ghost ms-btn--sm"
            >
              <span>{t.cancel}</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="submit"
          className="ms-btn ms-btn--primary ms-btn--lg ms-btn--block"
        >
          {t.savePatient}
        </button>
      )}
    </form>
  );

  const renderPatientList = () => (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#163832', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {t.existingPatients}
        </span>
        <span style={{ fontSize: 12, color: '#707975', fontWeight: 500 }}>
          {filteredPatients.length}
        </span>
      </div>

      {filteredPatients.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#707975', fontSize: 14, fontWeight: 500 }}>
          {t.noPatientsFound}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {filteredPatients.map((p) => {
            const isSelected = p.id === selectedPatientId;
            const villageName = typeof p.village === 'string' ? p.village : p.village?.[lang] || '';
            const ageText = p.age != null ? `${p.age} ${t.years}` : '';

            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  aria-pressed={isSelected}
                  className={`ms-btn ms-btn--card ${isSelected ? 'ms-btn--card-primary' : ''}`}
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                    {/* Radio visual */}
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: `2px solid ${isSelected ? '#235347' : '#707975'}`,
                        background: isSelected ? '#235347' : '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFFFFF' }} />
                      )}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15.5, fontWeight: 700, color: '#00201C', lineHeight: 1.25 }}>
                          {p.name[lang]}
                        </span>
                        {ageText && (
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: '#404945',
                              background: '#E7F0EA',
                              padding: '2px 8px',
                              borderRadius: 6,
                            }}
                          >
                            {ageText}
                          </span>
                        )}
                        {p.patientCode && (
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: 'var(--ms-primary)',
                              background: 'var(--ms-mint)',
                              padding: '2px 8px',
                              borderRadius: 'var(--ms-radius-sm)',
                              letterSpacing: '0.02em',
                            }}
                          >
                            {p.patientCode}
                          </span>
                        )}
                      </div>
                      {villageName && (
                        <span style={{ display: 'block', marginTop: 3, fontSize: 12.5, color: '#707975', fontWeight: 500 }}>
                          {villageName}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  const renderSearchAndList = () => (
    <div style={{ display: 'grid', gap: 14 }}>
      {renderSearchInput()}
      {renderPatientList()}
    </div>
  );

  const renderPatientListAndForm = () => (
    <div style={{ display: 'grid', gap: 14 }}>
      {renderSearchInput()}

      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="ms-btn ms-btn--secondary ms-btn--lg ms-btn--block"
        >
          <UserPlus size={18} color="#235347" />
          <span>{t.addNewPatient}</span>
        </button>
      ) : (
        renderAddPatientForm(false)
      )}

      {renderPatientList()}
    </div>
  );

  return (
    <div>
      {/* ===================== NARROW PHONE LAYOUT (@md and below) ===================== */}
      <div className="block @2xl:hidden">
        {/* Header bar */}
        <header
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #E3ECE7',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            padding: 'calc(12px + env(safe-area-inset-top, 0px)) 16px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => onNavigate('/mitanin/home')}
              aria-label={t.back}
              className="ms-btn ms-btn--ghost ms-btn--icon"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#051F20', lineHeight: 1.2 }}>
                {t.title}
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707975', fontWeight: 500 }}>
                {t.subtitle}
              </p>
            </div>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#235347',
              background: '#DAF1DE',
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid rgba(142, 182, 155, 0.4)',
            }}
          >
            {filteredPatients.length} {t.patientCount}
          </span>
        </header>

        <section style={{ padding: '16px 16px 100px' }}>
          {renderStepper()}
          {renderBanner()}
          <div style={{ marginTop: 16 }}>
            {renderPatientListAndForm()}
          </div>
        </section>

        {/* Sticky Bottom Actions */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            padding: '12px 16px calc(14px + max(env(safe-area-inset-bottom, 0px), 16px))',
            display: 'flex',
            gap: 12,
            background: '#FFFFFF',
            borderTop: '1px solid #E3ECE7',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
            zIndex: 25,
          }}
        >
          <button
            type="button"
            onClick={() => onNavigate('/mitanin/home')}
            className="ms-btn ms-btn--secondary ms-btn--lg"
          >
            <ArrowLeft size={18} />
            <span>{t.back}</span>
          </button>
          <button
            type="button"
            disabled={!selectedPatientId}
            aria-disabled={!selectedPatientId}
            onClick={handleNext}
            className="ms-btn ms-btn--primary ms-btn--lg ms-btn--block"
            style={{ flex: 1 }}
          >
            <span>{t.next}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* ===================== WIDE CONTAINER LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ padding: '24px 16px 48px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <header
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #E3ECE7',
              padding: '24px 28px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              marginBottom: 20,
            }}
          >
            {renderStepper()}
            <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#00201C' }}>
                  {t.title}
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#707975', fontWeight: 500 }}>
                  {t.subtitle}
                </p>
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#235347',
                  background: '#DAF1DE',
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: '1px solid rgba(142, 182, 155, 0.4)',
                }}
              >
                {filteredPatients.length} {t.registeredCount}
              </span>
            </div>
            {renderBanner()}
          </header>

          <main
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
              gap: 24,
              alignItems: 'start',
            }}
          >
            {/* Left Column: Search & Patient List */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                border: '1px solid #E3ECE7',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              {renderSearchAndList()}
            </div>

            {/* Right Column: Add New Patient Panel (not a modal) */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                border: '1px solid #E3ECE7',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                position: 'sticky',
                top: 88,
              }}
            >
              <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: '#00201C' }}>
                {t.addNewPatient}
              </h2>
              {renderAddPatientForm(true)}
            </div>
          </main>

          <div
            style={{
              marginTop: 24,
              padding: '16px 24px',
              borderRadius: 16,
              background: '#FFFFFF',
              border: '1px solid #E3ECE7',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => onNavigate('/mitanin/home')}
              className="ms-btn ms-btn--secondary ms-btn--md"
            >
              <ArrowLeft size={18} />
              <span>{t.back}</span>
            </button>
            <button
              type="button"
              disabled={!selectedPatientId}
              aria-disabled={!selectedPatientId}
              onClick={handleNext}
              className="ms-btn ms-btn--primary ms-btn--md"
            >
              <span>{t.next}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

