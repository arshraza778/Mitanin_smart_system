
import type { CSSProperties } from 'react';
import type { ScreenProps } from '../App';

const COLORS = {
  page: '#EAF4EC',
  card: '#FFFFFF',
  green: '#286749',
  greenDark: '#204F39',
  greenLight: '#E5F1E8',
  orange: '#E97848',
  text: '#263238',
  muted: '#68766E',
  border: '#DCE8DE',
  success: '#238052',
  successBg: '#E5F5EA',
};

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100%',
    boxSizing: 'border-box',
    background: COLORS.page,
    color: COLORS.text,
    padding: '28px 20px 32px',
    fontFamily: 'inherit',
  },
  container: {
    width: '100%',
    maxWidth: 520,
    margin: '0 auto',
  },
  heading: {
    fontSize: 'clamp(28px, 5vw, 36px)',
    lineHeight: 1.2,
    fontWeight: 800,
    letterSpacing: '-0.8px',
    margin: '0 0 22px',
    color: COLORS.text,
  },
  card: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 24,
    padding: 'clamp(22px, 5vw, 32px)',
    boxShadow: '0 8px 28px rgba(38, 74, 48, 0.07)',
  },
  identity: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 26,
  },
  avatar: {
    width: 62,
    height: 62,
    flexShrink: 0,
    borderRadius: 20,
    background: COLORS.greenLight,
    color: COLORS.green,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 27,
    fontWeight: 800,
  },
  name: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    lineHeight: 1.3,
    color: COLORS.text,
  },
  role: {
    margin: '5px 0 0',
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: 600,
  },
  divider: {
    height: 1,
    background: '#E8EEE9',
    border: 0,
    margin: '22px 0',
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: 16,
    fontWeight: 800,
    color: COLORS.text,
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    padding: '7px 12px',
    background: COLORS.successBg,
    color: COLORS.success,
    fontSize: 13,
    fontWeight: 800,
  },
  languageGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  },
  languageButton: {
    minHeight: 46,
    padding: '11px 18px',
    borderRadius: 13,
    border: `1px solid ${COLORS.border}`,
    background: '#FFFFFF',
    color: COLORS.greenDark,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 150ms ease, border-color 150ms ease',
  },
  primaryButton: {
    width: '100%',
    minHeight: 50,
    marginTop: 24,
    padding: '13px 18px',
    border: 'none',
    borderRadius: 14,
    background: COLORS.green,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(40, 103, 73, 0.15)',
  },
  footer: {
    margin: '18px 0 0',
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 1.6,
  },
};

export default function Profile({
  lang,
  online,
  onNavigate,
  onSetLang,
}: ScreenProps) {
  const isHindi = lang === 'hi';

  const copy = isHindi
    ? {
        title: 'प्रोफ़ाइल',
        name: 'सुनीता',
        role: 'मितानिन',
        connection: 'कनेक्शन स्थिति',
        online: 'ऑनलाइन',
        offline: 'ऑफ़लाइन',
        language: 'भाषा चुनें',
        english: 'English',
        hindi: 'हिन्दी',
        changeRole: 'भूमिका बदलें',
        footer: 'आपकी स्वास्थ्य सेवा, आपकी भाषा में।',
      }
    : {
        title: 'Profile',
        name: 'Sunita',
        role: 'Mitanin',
        connection: 'Connection status',
        online: 'Online',
        offline: 'Offline',
        language: 'Language preference',
        english: 'English',
        hindi: 'हिन्दी',
        changeRole: 'Change role',
        footer: 'Community healthcare, closer to you.',
      };

  const selectedLanguageStyle: CSSProperties = {
    ...styles.languageButton,
    background: COLORS.green,
    borderColor: COLORS.green,
    color: '#FFFFFF',
  };

  return (
    <div style={styles.page}>
      <main style={styles.container}>
        <h1 style={styles.heading}>{copy.title}</h1>

        <section style={styles.card} aria-label={copy.title}>
          <div style={styles.identity}>
            <div style={styles.avatar} aria-hidden="true">
              {isHindi ? 'सु' : 'S'}
            </div>

            <div style={{ minWidth: 0 }}>
              <h2 style={styles.name}>{copy.name}</h2>
              <p style={styles.role}>{copy.role}</p>
            </div>
          </div>

          <hr style={styles.divider} />

          <div style={styles.statusRow}>
            <div>
              <h3 style={styles.sectionTitle}>{copy.connection}</h3>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: COLORS.muted,
                  fontSize: 14,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: online ? COLORS.success : '#89938D',
                  }}
                />
                {online ? copy.online : copy.offline}
              </span>
            </div>

            <span style={styles.statusBadge}>
              {online ? '●' : '○'} {online ? copy.online : copy.offline}
            </span>
          </div>

          <hr style={styles.divider} />

          <section aria-labelledby="profile-language-heading">
            <h3 id="profile-language-heading" style={styles.sectionTitle}>
              {copy.language}
            </h3>

            <div style={styles.languageGroup}>
              <button
                type="button"
                lang="en"
                aria-pressed={lang === 'en'}
                onClick={() => onSetLang('en')}
                style={lang === 'en' ? selectedLanguageStyle : styles.languageButton}
              >
                {copy.english}
                {lang === 'en' ? ' ✓' : ''}
              </button>

              <button
                type="button"
                lang="hi"
                aria-pressed={lang === 'hi'}
                onClick={() => onSetLang('hi')}
                style={lang === 'hi' ? selectedLanguageStyle : styles.languageButton}
              >
                {copy.hindi}
                {lang === 'hi' ? ' ✓' : ''}
              </button>
            </div>
          </section>

          <button
            type="button"
            onClick={() => onNavigate('/role')}
            style={styles.primaryButton}
          >
            {copy.changeRole} →
          </button>
        </section>

        <p style={styles.footer}>{copy.footer}</p>
      </main>
    </div>
  );
}
