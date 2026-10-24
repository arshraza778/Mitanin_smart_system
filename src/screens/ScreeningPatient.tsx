import { useMemo, useState } from 'react';
import type { ScreenProps } from '../App';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import { dataService } from '../services';
import { useCaseStore } from '../store/CaseStore';
import { validatePatient } from '../domain';

const STEP = 1;

const COPY = {
  en: enLocale.screens.ScreeningPatient,
  hi: hiLocale.screens.ScreeningPatient,
} as const;

const DIRECTORY = dataService.getDirectory();

export default function ScreeningPatient({ lang, onNavigate }: ScreenProps) {
  const t = COPY[lang];
  const { patients, currentScreening, selectScreeningPatient, addPatient } = useCaseStore();

  const [query, setQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    () => currentScreening?.patientId || patients[0]?.id || ''
  );
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formAge, setFormAge] = useState('');
  const [formSex, setFormSex] = useState<'female' | 'male' | 'other' | ''>('');
  const [formVillage, setFormVillage] = useState(DIRECTORY.villages[0]?.en || 'Kotra');
  const [formCustomVillage, setFormCustomVillage] = useState('');
  const [formPregnant, setFormPregnant] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; age?: string }>({});

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

  const handleSaveNewPatient = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validatePatient(
      {
        name: formName,
        age: formAge,
        sex: formSex,
        village: formVillage,
        customVillage: formCustomVillage,
        pregnant: isFemaleAge12Plus ? formPregnant : false,
      },
      lang
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

    const newRecord = addPatient({
      name: { en: formName.trim(), hi: formName.trim() },
      age: Number(formAge),
      village: chosenVillage,
      sex: formSex || undefined,
      pregnant: isFemaleAge12Plus ? formPregnant : undefined,
    });

    setSelectedPatientId(newRecord.id);
    selectScreeningPatient(newRecord.id);
    setShowAddForm(false);
    setFormName('');
    setFormAge('');
    setFormSex('');
    setFormCustomVillage('');
    setFormPregnant(false);
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
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {t.steps.map((_, i) => (
          <span
            key={i}
            style={{
              height: 8,
              borderRadius: 4,
              background: i < STEP ? 'var(--ms-orange)' : 'var(--ms-green-100)',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
        {t.steps.map((label, i) => (
          <span
            key={label}
            style={{
              fontSize: 12.5,
              fontWeight: i === STEP - 1 ? 800 : 600,
              color: i === STEP - 1 ? 'var(--ms-ink)' : 'var(--ms-muted)',
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );

  const renderBanner = () => (
    <div
      role="note"
      style={{
        marginTop: 14,
        padding: '12px 16px',
        borderRadius: 16,
        background: 'var(--ms-green-100)',
        color: 'var(--ms-green-900)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 13,
        fontWeight: 700,
        border: '1px solid #c2e2ca',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 16 }}>ℹ</span>
      <span>{t.banner}</span>
    </div>
  );

  const renderPatientListAndForm = () => (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Search Input (56px high) */}
      <div style={{ position: 'relative' }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
          style={{
            width: '100%',
            height: 56,
            minHeight: 56,
            padding: '0 16px 0 44px',
            borderRadius: 16,
            border: '2px solid var(--ms-border)',
            background: 'var(--ms-surface)',
            color: 'var(--ms-ink)',
            fontSize: 15,
            fontWeight: 600,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ms-muted)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ position: 'absolute', left: 16, top: 19 }}
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>

      {/* Add New Patient Toggle Button (56px high) */}
      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          style={{
            width: '100%',
            height: 56,
            minHeight: 56,
            padding: '0 20px',
            borderRadius: 18,
            border: '2px dashed var(--ms-green-500)',
            background: 'var(--ms-mint)',
            color: 'var(--ms-forest)',
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'background 0.15s ease',
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
          <span>{t.addNewPatient}</span>
        </button>
      ) : (
        /* Add Patient Form */
        <form
          onSubmit={handleSaveNewPatient}
          style={{
            padding: 20,
            borderRadius: 22,
            background: 'var(--ms-surface)',
            border: '2px solid var(--ms-border)',
            display: 'grid',
            gap: 16,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ms-ink)' }}>
              {t.addNewPatient}
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setFormErrors({});
              }}
              style={{
                border: 0,
                background: 'none',
                color: 'var(--ms-muted)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              {t.cancel}
            </button>
          </div>

          {/* Name Field (56px high) */}
          <div>
            <label
              htmlFor="ms-patient-name"
              style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ms-ink)', marginBottom: 6 }}
            >
              {t.nameLabel}
            </label>
            <input
              id="ms-patient-name"
              type="text"
              value={formName}
              onChange={(e) => {
                setFormName(e.target.value);
                if (formErrors.name) setFormErrors((errs) => ({ ...errs, name: undefined }));
              }}
              placeholder={t.namePlaceholder}
              style={{
                width: '100%',
                height: 56,
                minHeight: 56,
                padding: '0 16px',
                borderRadius: 16,
                border: `2px solid ${formErrors.name ? 'var(--ms-danger)' : 'var(--ms-border)'}`,
                background: 'var(--ms-bg)',
                fontSize: 15,
                fontWeight: 600,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            {formErrors.name && (
              <span role="alert" style={{ display: 'block', marginTop: 4, fontSize: 12, fontWeight: 700, color: 'var(--ms-danger)' }}>
                {formErrors.name}
              </span>
            )}
          </div>

          {/* Age Field (56px high) */}
          <div>
            <label
              htmlFor="ms-patient-age"
              style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ms-ink)', marginBottom: 6 }}
            >
              {t.ageLabel}
            </label>
            <input
              id="ms-patient-age"
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
                height: 56,
                minHeight: 56,
                padding: '0 16px',
                borderRadius: 16,
                border: `2px solid ${formErrors.age ? 'var(--ms-danger)' : 'var(--ms-border)'}`,
                background: 'var(--ms-bg)',
                fontSize: 15,
                fontWeight: 600,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            {formErrors.age && (
              <span role="alert" style={{ display: 'block', marginTop: 4, fontSize: 12, fontWeight: 700, color: 'var(--ms-danger)' }}>
                {formErrors.age}
              </span>
            )}
          </div>

          {/* Sex Field */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ms-ink)', marginBottom: 6 }}>
              {t.sexLabel}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {(['female', 'male', 'other'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormSex(formSex === s ? '' : s)}
                  style={{
                    height: 48,
                    borderRadius: 14,
                    border: `2px solid ${formSex === s ? 'var(--ms-forest)' : 'var(--ms-border)'}`,
                    background: formSex === s ? 'var(--ms-mint)' : 'var(--ms-bg)',
                    color: formSex === s ? 'var(--ms-forest)' : 'var(--ms-ink)',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Village Field (56px high) */}
          <div>
            <label
              htmlFor="ms-patient-village"
              style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ms-ink)', marginBottom: 6 }}
            >
              {t.villageLabel}
            </label>
            <select
              id="ms-patient-village"
              value={formVillage}
              onChange={(e) => setFormVillage(e.target.value)}
              style={{
                width: '100%',
                height: 56,
                minHeight: 56,
                padding: '0 16px',
                borderRadius: 16,
                border: '2px solid var(--ms-border)',
                background: 'var(--ms-bg)',
                fontSize: 15,
                fontWeight: 600,
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
                  height: 56,
                  minHeight: 56,
                  marginTop: 8,
                  padding: '0 16px',
                  borderRadius: 16,
                  border: '2px solid var(--ms-border)',
                  background: 'var(--ms-bg)',
                  fontSize: 15,
                  fontWeight: 600,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            )}
          </div>

          {/* Pregnant switch - shown ONLY when Sex is Female and Age is 12 or more */}
          {isFemaleAge12Plus && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 16,
                background: 'var(--ms-bg)',
                border: '1px solid var(--ms-border)',
              }}
            >
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ms-ink)' }}>{t.pregnantLabel}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setFormPregnant(false)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 10,
                    border: 0,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                    background: !formPregnant ? 'var(--ms-forest)' : '#e2e8e5',
                    color: !formPregnant ? '#fff' : 'var(--ms-muted)',
                  }}
                >
                  {t.no}
                </button>
                <button
                  type="button"
                  onClick={() => setFormPregnant(true)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 10,
                    border: 0,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                    background: formPregnant ? 'var(--ms-orange)' : '#e2e8e5',
                    color: formPregnant ? '#fff' : 'var(--ms-muted)',
                  }}
                >
                  {t.yes}
                </button>
              </div>
            </div>
          )}

          {/* Submit form button (56px high) */}
          <button
            type="submit"
            style={{
              width: '100%',
              height: 56,
              minHeight: 56,
              borderRadius: 18,
              border: 0,
              background: 'var(--ms-forest)',
              color: '#fff',
              fontSize: 16,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {t.savePatient}
          </button>
        </form>
      )}

      {/* Patient List Heading */}
      <h3 style={{ margin: '8px 0 0', fontSize: 16, fontWeight: 800, color: 'var(--ms-ink)' }}>
        {t.existingPatients} ({filteredPatients.length})
      </h3>

      {/* List of Patients with large tap targets (>= 56px high) */}
      {filteredPatients.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--ms-muted)', fontSize: 14, fontWeight: 600 }}>
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
                  style={{
                    width: '100%',
                    minHeight: 64,
                    padding: '14px 18px',
                    borderRadius: 20,
                    border: `2px solid ${isSelected ? 'var(--ms-orange)' : 'transparent'}`,
                    background: isSelected ? '#FFF3EC' : 'var(--ms-surface)',
                    boxShadow: '0 4px 14px rgba(31, 77, 56, 0.06)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--ms-ink)', lineHeight: 1.25 }}>
                        {p.name[lang]}
                      </span>
                      {ageText && (
                        <span
                          style={{
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: 'var(--ms-muted)',
                            background: 'var(--ms-bg)',
                            padding: '2px 8px',
                            borderRadius: 8,
                          }}
                        >
                          {ageText}
                        </span>
                      )}
                    </div>
                    {villageName && (
                      <span style={{ display: 'block', marginTop: 4, fontSize: 13, color: 'var(--ms-muted)', fontWeight: 600 }}>
                        {villageName}
                      </span>
                    )}
                  </div>

                  <span
                    aria-hidden="true"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? 'var(--ms-orange)' : 'var(--ms-border)'}`,
                      background: isSelected ? 'var(--ms-orange)' : 'transparent',
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <div>
      {/* ===================== NARROW PHONE LAYOUT (@md and below) ===================== */}
      <div className="block @2xl:hidden">
        <header
          style={{
            background: 'var(--ms-surface)',
            borderRadius: '0 0 32px 32px',
            padding: 'calc(20px + env(safe-area-inset-top, 0px)) 20px 20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          }}
        >
          {renderStepper()}
          <h1 style={{ margin: '16px 0 2px', fontSize: 24, fontWeight: 800, color: 'var(--ms-ink)' }}>
            {t.title}
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ms-muted)', fontWeight: 600 }}>
            {t.subtitle}
          </p>
          {renderBanner()}
        </header>

        <section style={{ padding: '20px 20px 100px' }}>
          {renderPatientListAndForm()}
        </section>

        {/* Sticky Bottom Actions */}
        <div
          style={{
            position: 'sticky',
            bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            marginTop: -80,
            padding: '14px 20px 8px',
            display: 'flex',
            gap: 12,
            background: 'linear-gradient(to top, var(--ms-bg) 70%, rgba(246,248,245,0))',
          }}
        >
          <button
            type="button"
            onClick={() => onNavigate('/mitanin/home')}
            style={{
              flex: '0 0 auto',
              padding: '16px 14px',
              border: 0,
              background: 'none',
              cursor: 'pointer',
              fontSize: 17,
              fontWeight: 800,
              color: 'var(--ms-green-700)',
            }}
          >
            {t.back}
          </button>
          <button
            type="button"
            disabled={!selectedPatientId}
            onClick={handleNext}
            style={{
              flex: 1,
              height: 62,
              border: 0,
              borderRadius: 22,
              cursor: selectedPatientId ? 'pointer' : 'default',
              fontSize: 18.5,
              fontWeight: 800,
              background: selectedPatientId ? 'var(--ms-orange)' : '#d5ddd8',
              color: selectedPatientId ? '#fff' : '#8a9690',
              boxShadow: selectedPatientId ? '0 10px 22px rgba(240, 121, 75, 0.35)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {t.next}
          </button>
        </div>
      </div>

      {/* ===================== WIDE CONTAINER LAYOUT (@2xl and above) ===================== */}
      <div className="hidden @2xl:block" style={{ padding: '32px 24px 48px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <header
            style={{
              background: 'var(--ms-surface)',
              borderRadius: 28,
              border: '1px solid var(--ms-border)',
              padding: '24px 32px',
              boxShadow: 'var(--ms-shadow-card)',
              marginBottom: 24,
            }}
          >
            {renderStepper()}
            <div style={{ marginTop: 18 }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--ms-ink)' }}>
                {t.title}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ms-muted)', fontWeight: 600 }}>
                {t.subtitle}
              </p>
            </div>
            {renderBanner()}
          </header>

          <main
            style={{
              background: 'var(--ms-surface)',
              borderRadius: 28,
              border: '1px solid var(--ms-border)',
              padding: '32px',
              boxShadow: 'var(--ms-shadow-card)',
            }}
          >
            {renderPatientListAndForm()}

            <div
              style={{
                marginTop: 28,
                paddingTop: 20,
                borderTop: '1px solid var(--ms-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => onNavigate('/mitanin/home')}
                style={{
                  padding: '14px 24px',
                  border: 0,
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 800,
                  color: 'var(--ms-green-700)',
                }}
              >
                {t.back}
              </button>
              <button
                type="button"
                disabled={!selectedPatientId}
                onClick={handleNext}
                style={{
                  padding: '16px 36px',
                  height: 56,
                  border: 0,
                  borderRadius: 18,
                  cursor: selectedPatientId ? 'pointer' : 'default',
                  fontSize: 17,
                  fontWeight: 800,
                  background: selectedPatientId ? 'var(--ms-orange)' : '#d5ddd8',
                  color: selectedPatientId ? '#fff' : '#8a9690',
                  boxShadow: selectedPatientId ? '0 8px 20px rgba(240, 121, 75, 0.35)' : 'none',
                }}
              >
                {t.next} →
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
