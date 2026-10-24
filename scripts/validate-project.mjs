import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const src = path.join(root, 'src');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const en = readJson('src/i18n/en.json');
const hi = readJson('src/i18n/hi.json');
const keys = (v) => Array.isArray(v) ? v.map(keys) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, keys(x)])) : typeof v;
assert.deepEqual(keys(en), keys(hi), 'English/Hindi locale keys and structures must match');
function strings(v, prefix = '') { return Object.entries(v).flatMap(([k, x]) => x && typeof x === 'object' ? strings(x, `${prefix}${k}.`) : [[`${prefix}${k}`, x]]); }
for (const [key, value] of strings(hi)) assert(typeof value === 'string' ? value.trim().length > 0 : true, `Empty Hindi translation: ${key}`);

const allowedRoutes = ['/role','/mitanin/home','/mitanin/visits','/mitanin/screening/patient','/mitanin/screening/symptoms','/mitanin/screening/test','/mitanin/screening/result','/mitanin/consult','/mitanin/referral','/doctor/inbox','/doctor/review','/supervisor/overview','/case','/alerts','/profile'];
const routes = readJson('src/routes.json');
assert.deepEqual(routes.map((r) => r.route).sort(), [...allowedRoutes].sort(), 'routes.json must match the exact allowed route list');
assert.equal(routes.length, 15, 'Expected 15 application routes; States.tsx is reusable and not a route');
const app = fs.readFileSync(path.join(src, 'App.tsx'), 'utf8');
for (const route of allowedRoutes) assert(app.includes(`'${route}'`), `App route missing: ${route}`);
const screenDir = path.join(src, 'screens');
const screenFiles = fs.readdirSync(screenDir).filter((f) => f.endsWith('.tsx'));
assert.equal(screenFiles.length, 16, 'Expected 15 routed screens plus reusable States.tsx');
for (const file of screenFiles) {
  const code = fs.readFileSync(path.join(screenDir, file), 'utf8');
  assert(!code.includes('BottomNav'), `${file} must not render its own bottom navigation`);
  if (file !== 'States.tsx') {
    assert(code.includes("from '../i18n/en.json'") && code.includes("from '../i18n/hi.json'"), `${file} must read both locale JSON files`);
    assert(code.includes('ScreenProps'), `${file} must use the shared ScreenProps contract`);
    assert(!/const COPY\s*=\s*\{\s*en:\s*\{/.test(code), `${file} still contains inline bilingual copy`);
  }
}
const dataFiles = ['patients','visits','cases','alerts','referrals','dashboard','directory','timeline'];
for (const file of dataFiles) readJson(`src/data/${file}.json`);
const patientIds = new Set(readJson('src/data/patients.json').map((p) => p.id));
const caseData = readJson('src/data/cases.json');
for (const item of [...caseData.doctorInbox, ...caseData.supervisorRows]) assert(patientIds.has(item.patientId), `Unknown patient ID in case data: ${item.patientId}`);
for (const days of Object.values(readJson('src/data/visits.json'))) for (const item of days) assert(patientIds.has(item.patientId), `Unknown patient ID in visit data: ${item.patientId}`);
const css = fs.readFileSync(path.join(src, 'styles.css'), 'utf8');
const requiredTokens = {'--ms-forest':'#2B6B52','--ms-green':'#6BAF7D','--ms-mint':'#EAF4EC','--ms-orange':'#EE7B4D','--ms-blue':'#7B8CF5','--ms-ink':'#1F2933','--ms-muted':'#6B7785','--ms-card':'#FFFFFF','--ms-danger':'#D64545','--ms-warn':'#E8A33D','--ms-ok':'#2E9E5B'};
for (const [token, value] of Object.entries(requiredTokens)) assert(css.includes(`${token}: ${value}`), `Missing/wrong design token ${token}`);
assert(css.includes('@media (max-width: 360px)') && css.includes('@media (max-width: 390px)'), 'Missing 360px/390px responsive rules');
console.log('PASS: locale parity, exact route inventory, shared screen props, centralized bottom navigation, JSON data integrity, exact design-token values, and responsive breakpoint rules.');
console.log('NOTE: This is structural validation, not a substitute for browser screenshots at 360px/390px or a successful production build.');
