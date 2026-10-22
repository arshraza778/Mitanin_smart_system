import patients from './data/patients.json';
import visitsByDay from './data/visits.json';
import caseData from './data/cases.json';
import alerts from './data/alerts.json';
import referrals from './data/referrals.json';
import directory from './data/directory.json';
import dashboard from './data/dashboard.json';
import timeline from './data/timeline.json';

/**
 * Single data-access boundary for the prototype. All screen-facing mock-data
 * reads go through this module so a future API adapter has one integration point.
 * The current adapter is intentionally synchronous because it reads bundled JSON.
 */
export const dataService = {
  getPatients: () => patients,
  getPatient: (id: string) => patients.find((patient) => patient.id === id),
  getPatientSummary: (id: string, lang: 'en' | 'hi') => {
    const patient = patients.find((item) => item.id === id);
    if (!patient) return '';
    const age = patient.age == null ? '' : `, ${patient.age}`;
    const village = patient.village[lang];
    return `${patient.name[lang]}${age}${village ? `, ${village}` : ''}`;
  },
  getVisitsByDay: () => Object.fromEntries(Object.entries(visitsByDay).map(([day, items]) => [day, items.map((visit) => {
    const patient = patients.find((item) => item.id === visit.patientId);
    return patient ? { ...visit, name: patient.name, village: patient.village } : visit;
  })])),
  getVisits: (day?: number) => {
    const byDay = Object.fromEntries(Object.entries(visitsByDay).map(([key, items]) => [key, items.map((visit) => {
      const patient = patients.find((item) => item.id === visit.patientId);
      return patient ? { ...visit, name: patient.name, village: patient.village } : visit;
    })]));
    return day == null ? Object.values(byDay).flat() : (byDay[String(day)] ?? []);
  },
  getCases: () => caseData.doctorInbox.map((record) => {
    const patient = patients.find((item) => item.id === record.patientId);
    return patient ? { ...record, name: { en: `${patient.name.en}${patient.age == null ? '' : `, ${patient.age}`}`, hi: `${patient.name.hi}${patient.age == null ? '' : `, ${patient.age}`}` }, village: patient.village } : record;
  }),
  getSupervisorRows: () => caseData.supervisorRows.map((record) => {
    const patient = patients.find((item) => item.id === record.patientId);
    return patient ? { ...record, name: { en: `${patient.name.en}${patient.age == null ? '' : `, ${patient.age}`}`, hi: `${patient.name.hi}${patient.age == null ? '' : `, ${patient.age}`}` }, village: patient.village.en } : record;
  }),
  getReferrals: () => referrals,
  getAlerts: () => alerts,
  getDirectory: () => directory,
  getDashboardData: () => dashboard,
  getTimeline: () => timeline,
};
