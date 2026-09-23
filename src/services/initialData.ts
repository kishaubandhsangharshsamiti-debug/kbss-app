import { Designation, EducationOption, AgendaItem, Meeting, AboutContent, ContactInfo, CommitteeSettings } from '../types';

export const DEFAULT_DESIGNATIONS: Designation[] = [
  { id: 'des_1', name: 'President', status: true, sortOrder: 1 },
  { id: 'des_2', name: 'Vice President', status: true, sortOrder: 2 },
  { id: 'des_3', name: 'General Secretary', status: true, sortOrder: 3 },
  { id: 'des_4', name: 'Secretary', status: true, sortOrder: 4 },
  { id: 'des_5', name: 'Treasurer', status: true, sortOrder: 5 },
  { id: 'des_6', name: 'Executive Member', status: true, sortOrder: 6 },
  { id: 'des_7', name: 'Member', status: true, sortOrder: 7 },
  { id: 'des_8', name: 'Volunteer', status: true, sortOrder: 8 },
];

export const DEFAULT_EDUCATION_OPTIONS: EducationOption[] = [
  { id: 'edu_1', name: 'High School', status: true, sortOrder: 1 },
  { id: 'edu_2', name: 'Intermediate', status: true, sortOrder: 2 },
  { id: 'edu_3', name: 'ITI', status: true, sortOrder: 3 },
  { id: 'edu_4', name: 'Diploma', status: true, sortOrder: 4 },
  { id: 'edu_5', name: 'Graduation', status: true, sortOrder: 5 },
  { id: 'edu_6', name: 'Post Graduation', status: true, sortOrder: 6 },
  { id: 'edu_7', name: 'Other', status: true, sortOrder: 7 },
];

export const DEFAULT_AGENDA_ITEMS: AgendaItem[] = [
  {
    id: 'agenda_1',
    title: 'Demand reconsideration of the Kishau Dam project',
    description: 'Demand a comprehensive socio-ecological review and reconsideration of the Kishau Multipurpose Dam project impacting our ancestral villages and river ecosystems.',
    sortOrder: 1,
    published: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'agenda_2',
    title: 'Protection of interests of local people',
    description: 'Safeguard the land rights, livelihoods, culture, and residential security of all families living in the submergence and catchment influence zone.',
    sortOrder: 2,
    published: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'agenda_3',
    title: 'Giving due importance to Gram Sabha vote',
    description: 'Ensure that the constitutional authority and democratic decisions of the Gram Sabha are honored before any administrative or construction steps are initiated.',
    sortOrder: 3,
    published: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'agenda_4',
    title: 'Presenting problems of affected area before authorities',
    description: 'Systematically represent ground realities, displacement risks, and community grievances before state, central, and judicial authorities.',
    sortOrder: 4,
    published: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'agenda_5',
    title: 'Raising environment-related issues',
    description: 'Highlight environmental degradation, seismic risks, geological vulnerabilities, and forest ecosystem destruction associated with the large reservoir.',
    sortOrder: 5,
    published: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'agenda_6',
    title: 'Peaceful and democratic expression through the committee',
    description: 'Conduct all collective community actions, representations, and dialogues through constitutional, peaceful, and non-violent democratic means.',
    sortOrder: 6,
    published: true,
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_ABOUT: AboutContent = {
  content: `Kishau Bandh Sangharsh Samiti – Gram Mailoth Shambhar Kwanu is a dedicated grassroots people's collective formed to represent the residents, farmers, and traditional landholders directly affected by the proposed Kishau Dam project on the Tons River.\n\nOur collective represents the united voice of the affected village communities of Mailoth, Shambhar, Kwanu, and adjacent settlements. We believe that development must never come at the catastrophic expense of rural heritage, ecological equilibrium, and the forced displacement of our ancestral communities.`,
  objectives: [
    'Unite all affected families under an organized and transparent democratic committee.',
    'Formally convey the unanimous resolutions passed by the Gram Sabha to government bodies.',
    'Prevent forced relocation and irreversible ecological destruction of the Tons river valley.',
    'Provide identity recognition and verification for all authorized committee members and volunteers.',
    'Advocate for sustainable, people-centric alternatives that do not cause massive submergence.'
  ],
  highlightTagline: "We don't want displacement. We want reconsideration of the Kishau Dam.",
};

export const DEFAULT_CONTACT: ContactInfo = {
  mobile: '+91 98765 43210',
  email: 'contact@kishaubandhsangharshsamiti.org',
  whatsapp: '+91 98765 43210',
  address: 'Gram Mailoth Shambhar Kwanu, Post Kwanu, Tehsil Chakrata / Tiuni, Dehradun District, Uttarakhand - 248197',
};

export const DEFAULT_SETTINGS: CommitteeSettings = {
  committeeName: 'Kishau Bandh Sangharsh Samiti',
  tagline: "We don't want displacement. We want reconsideration of the Kishau Dam.",
  logoUrl: '',
  signatureUrl: '',
};

export const DEFAULT_MEETINGS: Meeting[] = [
  {
    id: 'meet_1',
    title: 'Gram Sabha Special Meeting on Displacement Survey',
    date: '2026-10-15',
    time: '11:00 AM',
    location: 'Community Panchayat Bhavan, Gram Meloth',
    description: 'Joint discussion on recent notices issued regarding submergence boundaries and review of Gram Sabha unanimous resolution against displacement.',
    agenda: '1. Assessment of survey markers. 2. Gram Sabha collective resolution. 3. Legal representation committee formation.',
    pdfUrl: '',
    published: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'meet_2',
    title: 'Delegation Review with District Magistrate and Authorities',
    date: '2026-11-02',
    time: '02:30 PM',
    location: 'Kwanou Central Ground',
    description: 'Reporting outcomes of the committee delegation meeting with district authorities regarding compensation myths and ecological hazards.',
    agenda: '1. Report of delegation visit. 2. Distribution of Member ID cards. 3. Next phase of peaceful public awareness.',
    pdfUrl: '',
    published: true,
    createdAt: new Date().toISOString(),
  },
];
