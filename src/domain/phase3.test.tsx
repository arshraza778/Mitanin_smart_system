import { describe, expect, it } from 'vitest';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import App from '../App';
import RoleSelect from '../screens/RoleSelect';
import Profile from '../screens/Profile';
import MitaninHome from '../screens/MitaninHome';
import SupervisorDashboard from '../screens/SupervisorDashboard';
import enLocale from '../i18n/en.json';
import hiLocale from '../i18n/hi.json';
import routesList from '../routes.json';
import { CaseProvider } from '../store/CaseStore';
import { ViewModeProvider } from '../ViewModeContext';
import { ScreenDraftProvider } from '../ScreenDraftContext';

declare const require: any;
declare const process: any;
const fs = require('node:fs');
const path = require('node:path');

// Wrapper helper
function renderWithProviders(ui: React.ReactElement) {
  return renderToString(
    <CaseProvider>
      <ViewModeProvider>
        <ScreenDraftProvider>{ui}</ScreenDraftProvider>
      </ViewModeProvider>
    </CaseProvider>
  );
}

describe('Phase 3 vitest tests: Honest demo, role and profile', () => {
  // (a) RoleSelect: Continue button is disabled until a role is chosen; choosing a role enables it
  it('(a) RoleSelect: Continue button is disabled until a role is chosen', () => {
    // When selectedRole is null (default initial state)
    const htmlUnselected = renderWithProviders(
      <RoleSelect
        lang="en"
        online={true}
        onNavigate={() => {}}
        onSetLang={() => {}}
        onToggleOnline={() => {}}
      />
    );
    // Continue button must have disabled attribute / aria-disabled="true"
    expect(htmlUnselected).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?Continue/);
  });

  // (b) "Demo data" tag shows on EVERY route (all 15 routes in routes.json)
  it('(b) "Demo data" tag shows on EVERY route (all 15 routes in routes.json)', () => {
    expect(routesList.length).toBe(15);

    for (const routeObj of routesList) {
      const route = (routeObj as any).route;
      const htmlEn = renderWithProviders(
        <App initialPath={route} initialLang="en" initialMode="phone" />
      );
      expect(
        htmlEn.includes('ms-demo-tag'),
        `Route ${route} in English phone mode must render .ms-demo-tag`
      ).toBe(true);
      expect(
        htmlEn.includes('Demo data'),
        `Route ${route} in English phone mode must render 'Demo data'`
      ).toBe(true);

      const htmlWeb = renderWithProviders(
        <App initialPath={route} initialLang="en" initialMode="web" />
      );
      expect(
        htmlWeb.includes('ms-demo-tag'),
        `Route ${route} in English web mode must render .ms-demo-tag`
      ).toBe(true);
      expect(
        htmlWeb.includes('Demo data'),
        `Route ${route} in English web mode must render 'Demo data'`
      ).toBe(true);

      const htmlHi = renderWithProviders(
        <App initialPath={route} initialLang="hi" initialMode="phone" />
      );
      expect(
        htmlHi.includes('ms-demo-tag'),
        `Route ${route} in Hindi phone mode must render .ms-demo-tag`
      ).toBe(true);
      expect(
        htmlHi.includes('डेमो डेटा'),
        `Route ${route} in Hindi phone mode must render 'डेमो डेटा'`
      ).toBe(true);
    }
  });

  // (c) Two role disclaimer lines exist in en.json and hi.json and appear on RoleSelect
  it('(c) Two role disclaimer lines exist in en.json and hi.json and appear on RoleSelect', () => {
    expect(enLocale.screens.RoleSelect.disclaimerLine1).toBe(
      'Demo only. Choosing a role is not a sign-in.'
    );
    expect(enLocale.screens.RoleSelect.disclaimerLine2).toBe(
      'Fictional data. No real patient information.'
    );
    expect(hiLocale.screens.RoleSelect.disclaimerLine1).toBeTruthy();
    expect(hiLocale.screens.RoleSelect.disclaimerLine2).toBeTruthy();

    const htmlEn = renderWithProviders(
      <RoleSelect
        lang="en"
        online={true}
        onNavigate={() => {}}
        onSetLang={() => {}}
        onToggleOnline={() => {}}
      />
    );
    expect(htmlEn).toContain('Demo only. Choosing a role is not a sign-in.');
    expect(htmlEn).toContain('Fictional data. No real patient information.');

    const htmlHi = renderWithProviders(
      <RoleSelect
        lang="hi"
        online={true}
        onNavigate={() => {}}
        onSetLang={() => {}}
        onToggleOnline={() => {}}
      />
    );
    expect(htmlHi).toContain(hiLocale.screens.RoleSelect.disclaimerLine1);
    expect(htmlHi).toContain(hiLocale.screens.RoleSelect.disclaimerLine2);
  });

  // (d) Profile.tsx has no hardcoded person names, shows "Assigned area (demo)", "Last sent to server" showing "Never", "Simulated" label, and "Change role" button
  it('(d) Profile.tsx has no hardcoded person names, shows required labels and Change role button', () => {
    const profileFileContent = fs.readFileSync(
      path.join(process.cwd(), 'src/screens/Profile.tsx'),
      'utf-8'
    );
    // Must NOT have hardcoded Dr. Rao or Mr. Verma in Profile.tsx
    expect(profileFileContent.includes('Dr. Rao')).toBe(false);
    expect(profileFileContent.includes('Mr. Verma')).toBe(false);
    // Must NOT contain Log out or logout
    expect(/log\s*out/i.test(profileFileContent)).toBe(false);

    const htmlEn = renderWithProviders(
      <Profile
        lang="en"
        online={true}
        onNavigate={() => {}}
        onSetLang={() => {}}
        onToggleOnline={() => {}}
      />
    );
    expect(htmlEn).toContain('Assigned area (demo)');
    expect(htmlEn).toContain('Last sent to server');
    expect(htmlEn).toContain('Never');
    expect(htmlEn).toContain('Simulated');
    expect(htmlEn).toContain('Change role');

    const htmlHi = renderWithProviders(
      <Profile
        lang="hi"
        online={true}
        onNavigate={() => {}}
        onSetLang={() => {}}
        onToggleOnline={() => {}}
      />
    );
    expect(htmlHi).toContain(hiLocale.screens.Profile.assignedArea);
    expect(htmlHi).toContain(hiLocale.screens.Profile.lastSent);
    expect(htmlHi).toContain(hiLocale.screens.Profile.never);
    expect(htmlHi).toContain('सिम्युलेटेड');
    expect(htmlHi).toContain('भूमिका बदलें');
  });

  // (e) Caption "Demo data, as of <time>" appears on Home and Supervisor counts with demo clock time, not Date.now()
  it('(e) Caption "Demo data, as of <time>" appears on Home and Supervisor counts', () => {
    const homeContent = fs.readFileSync(
      path.join(process.cwd(), 'src/screens/MitaninHome.tsx'),
      'utf-8'
    );
    const supervisorContent = fs.readFileSync(
      path.join(process.cwd(), 'src/screens/SupervisorDashboard.tsx'),
      'utf-8'
    );

    // Must NOT use Date.now() in screen files
    expect(homeContent.includes('Date.now()')).toBe(false);
    expect(supervisorContent.includes('Date.now()')).toBe(false);

    // Mitanin Home renders demoDataAsOf
    const homeHtml = renderWithProviders(
      <MitaninHome
        lang="en"
        online={true}
        onNavigate={() => {}}
        onSetLang={() => {}}
        onToggleOnline={() => {}}
      />
    );
    expect(homeHtml).toMatch(/Demo data, as of \d{1,2}:\d{2}\s*(?:AM|PM)?/i);

    // Supervisor Dashboard renders demoDataAsOf
    const superHtml = renderWithProviders(
      <SupervisorDashboard
        lang="en"
        online={true}
        onNavigate={() => {}}
        onSetLang={() => {}}
        onToggleOnline={() => {}}
      />
    );
    expect(superHtml).toMatch(/Demo data, as of \d{1,2}:\d{2}\s*(?:AM|PM)?/i);
  });
});
