import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import {
  UserAccount,
  RegistrationRequest,
  MemberRecord,
  CommitteeSettings,
  MeetingItem,
  UpdateItem,
  UserRole,
  AccountStatus
} from '../types';

// Default Committee Settings
export const DEFAULT_COMMITTEE_SETTINGS: CommitteeSettings = {
  committeeName: 'Kishau Bandh Sangharsh Samiti',
  logoUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&q=80&w=300',
  presidentName: 'Shri Surat Singh Tomar',
  presidentSignatureUrl: '',
  adminName: 'Executive Committee Administrator',
  adminSignatureUrl: '',
  updatedAt: new Date().toISOString()
};

// Common villages in the region
export const AFFECTED_VILLAGES = [
  'Meloth',
  'Shambhar',
  'Kwanou',
  'Tiuni',
  'Morar',
  'Banswada',
  'Mohar',
  'Hartal',
  'Koti',
  'Senj',
  'Chaurani',
  'Atal',
  'Mundhol',
  'Dharagad'
];

export const DESIGNATION_OPTIONS = [
  'Member',
  'President',
  'Vice President',
  'General Secretary',
  'Organizing Secretary',
  'Treasurer',
  'Media Coordinator',
  'Village Representative',
  'Youth Wing Representative',
  'Women Forum Representative',
  'Advisory Member'
];

export const OFFICE_BEARER_DESIGNATIONS = [
  'President',
  'Vice President',
  'General Secretary',
  'Organizing Secretary',
  'Treasurer',
  'Media Coordinator',
  'Village Representative',
  'Youth Wing Representative',
  'Women Forum Representative',
  'Advisory Member'
];

export const EDUCATION_OPTIONS = [
  'Primary / Middle',
  '10th Secondary',
  '12th Senior Secondary',
  'Bachelor Degree / Graduate',
  'Master Degree / Post Graduate',
  'Diploma / ITI Technical',
  'Professional Degree',
  'Traditional / Agrarian Leader'
];

// Short code mapping based on designation and role
export function getDesignationShortCode(designation?: string, role?: UserRole): string {
  const d = (designation || '').toLowerCase().trim();
  const r = (role || '').toUpperCase();

  if (r === 'ADMIN' || d.includes('admin') || d.includes('व्यवस्थापक')) return 'ADM';
  if (d.includes('vice president') || d.includes('उपाध्यक्ष') || d.includes('upadhyaksh')) return 'VP';
  if (r === 'PRESIDENT' || d.includes('president') || d.includes('अध्यक्ष') || d.includes('adhyaksh')) return 'PRES';
  if (d.includes('general secretary') || d.includes('महासचिव') || d.includes('mahasachiv')) return 'SEC';
  if (d.includes('organizing secretary') || d.includes('संगठन सचिव')) return 'ORG';
  if (d.includes('joint secretary') || d.includes('सह-सचिव') || d.includes('sahsachiv')) return 'JSEC';
  if (d.includes('secretary') || d.includes('सचिव') || d.includes('sachiv')) return 'SEC';
  if (d.includes('treasurer') || d.includes('कोषाध्यक्ष') || d.includes('koshadhyaksh') || d.includes('cashier')) return 'TR';
  if (d.includes('media') || d.includes('spokesperson') || d.includes('प्रवक्ता') || d.includes('मीडिया')) return 'MED';
  if (d.includes('advisor') || d.includes('सलाहकार') || d.includes('advisory')) return 'ADV';
  if (d.includes('patron') || d.includes('संरक्षक')) return 'PAT';
  if (d.includes('village representative') || d.includes('ग्राम प्रतिनिधि')) return 'REP';
  if (d.includes('youth') || d.includes('युवा')) return 'YTH';
  if (d.includes('women') || d.includes('महिला')) return 'WMN';
  if (r === 'OFFICE_BEARER' || d.includes('office bearer') || d.includes('कार्यकारिणी') || d.includes('पदाधिकारी')) return 'OFF';

  return 'MEM';
}

// Helpers to format code with KBSS- prefix and designation-short code
export function formatCustomCode(designation: string | undefined, role: UserRole | undefined, num: number): string {
  const short = getDesignationShortCode(designation, role);
  if (short === 'MEM') {
    return `KBSS-${short}-${String(num).padStart(5, '0')}`;
  }
  return `KBSS-${short}-${String(num).padStart(3, '0')}`;
}

export function formatMemberCode(num: number, designation?: string): string {
  return formatCustomCode(designation || 'Member', 'MEMBER', num);
}

export function formatOfficerCode(num: number, designation?: string): string {
  return formatCustomCode(designation || 'Office Bearer', 'OFFICE_BEARER', num);
}

export function formatAdminCode(num: number): string {
  return formatCustomCode('Administrator', 'ADMIN', num);
}

// Guarantees all codes start with KBSS- (e.g. KBSS-ADM-001, KBSS-PRES-001, KBSS-MEM-00001)
export function formatCardCode(rawCode?: string, designation?: string, role?: UserRole): string {
  if (!rawCode) {
    const short = getDesignationShortCode(designation, role);
    return short === 'MEM' ? 'KBSS-MEM-00001' : `KBSS-${short}-001`;
  }
  const clean = String(rawCode).trim();
  
  // If already properly prefixed with KBSS-
  if (clean.startsWith('KBSS-')) {
    return clean;
  }
  
  // If starts with ADMIN- or ADM-
  if (clean.startsWith('ADMIN-')) {
    const numPart = clean.replace(/^ADMIN-/, '');
    return `KBSS-ADM-${numPart.padStart(3, '0')}`;
  }
  if (clean.startsWith('ADM-')) {
    const numPart = clean.replace(/^ADM-/, '');
    return `KBSS-ADM-${numPart.padStart(3, '0')}`;
  }
  if (clean.startsWith('PRES-')) {
    const numPart = clean.replace(/^PRES-/, '');
    return `KBSS-PRES-${numPart.padStart(3, '0')}`;
  }
  if (clean.startsWith('VP-')) {
    const numPart = clean.replace(/^VP-/, '');
    return `KBSS-VP-${numPart.padStart(3, '0')}`;
  }
  if (clean.startsWith('SEC-')) {
    const numPart = clean.replace(/^SEC-/, '');
    return `KBSS-SEC-${numPart.padStart(3, '0')}`;
  }
  if (clean.startsWith('0.')) {
    const num = clean.replace(/^0\./, '');
    const short = getDesignationShortCode(designation, role);
    return `KBSS-${short === 'MEM' ? 'OFF' : short}-${num.padStart(3, '0')}`;
  }
  
  // If purely digits e.g. "00001" or "001"
  if (/^\d+$/.test(clean)) {
    const short = getDesignationShortCode(designation, role);
    if (clean.length <= 3) {
      return `KBSS-${short === 'MEM' ? 'OFF' : short}-${clean.padStart(3, '0')}`;
    }
    return `KBSS-MEM-${clean.padStart(5, '0')}`;
  }

  // Any other prefix
  return `KBSS-${clean}`;
}

// ---------------------------------------------------------------------------
// 1. SETTINGS SERVICE
// ---------------------------------------------------------------------------
export const SettingsService = {
  async getSettings(): Promise<CommitteeSettings> {
    const path = 'settings/committee';
    try {
      const docRef = doc(db, 'settings', 'committee');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as CommitteeSettings;
      }
      // Initialize if not exists
      await setDoc(docRef, DEFAULT_COMMITTEE_SETTINGS);
      return DEFAULT_COMMITTEE_SETTINGS;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return DEFAULT_COMMITTEE_SETTINGS;
    }
  },

  subscribe(callback: (settings: CommitteeSettings) => void): Unsubscribe {
    const docRef = doc(db, 'settings', 'committee');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data() as CommitteeSettings);
      } else {
        callback(DEFAULT_COMMITTEE_SETTINGS);
      }
    }, (err) => {
      console.warn('Settings subscription error:', err);
    });
  },

  async updateSettings(settings: Partial<CommitteeSettings>): Promise<void> {
    const path = 'settings/committee';
    try {
      const docRef = doc(db, 'settings', 'committee');
      const current = await this.getSettings();
      const updated: CommitteeSettings = {
        ...current,
        ...settings,
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, updated, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  },

  async update(settings: Partial<CommitteeSettings>): Promise<void> {
    return this.updateSettings(settings);
  }
};

// ---------------------------------------------------------------------------
// 2. CODE COUNTER SERVICE (Generates 00001, 0.001, ADMIN-00001)
// ---------------------------------------------------------------------------
export const CounterService = {
  async getCurrentMemberCounter(): Promise<number> {
    try {
      const snap = await getDoc(doc(db, 'counters', 'codes'));
      return snap.exists() ? (snap.data().nextMemberNum || 1) : 1;
    } catch {
      return 1;
    }
  },

  async getCurrentOfficerCounter(): Promise<number> {
    try {
      const snap = await getDoc(doc(db, 'counters', 'codes'));
      return snap.exists() ? (snap.data().nextOfficerNum || 1) : 1;
    } catch {
      return 1;
    }
  },

  async getNextOfficerCode(designation?: string): Promise<string> {
    return this.getNextCode('OFFICE_BEARER', designation);
  },

  async getNextCode(role: UserRole, designation?: string): Promise<string> {
    const counterDocRef = doc(db, 'counters', 'codes');
    const short = getDesignationShortCode(designation, role);
    const counterKey = `count_${short}`;

    try {
      return await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(counterDocRef);
        let currentNum = 1;

        if (snap.exists()) {
          const data = snap.data();
          if (data[counterKey] !== undefined) {
            currentNum = data[counterKey];
          } else if (short === 'MEM' && data.nextMemberNum !== undefined) {
            currentNum = data.nextMemberNum;
          } else if (short === 'ADM' && data.nextAdminNum !== undefined) {
            currentNum = data.nextAdminNum;
          } else if (short === 'PRES' && data.nextPresidentNum !== undefined) {
            currentNum = data.nextPresidentNum;
          } else if (data.nextOfficerNum !== undefined) {
            currentNum = data.nextOfficerNum;
          }
        }

        const assignedCode = formatCustomCode(designation, role, currentNum);
        
        transaction.set(counterDocRef, {
          [counterKey]: currentNum + 1,
          ...(short === 'MEM' ? { nextMemberNum: currentNum + 1 } : {}),
          ...(short === 'ADM' ? { nextAdminNum: currentNum + 1 } : {}),
          ...(short === 'PRES' ? { nextPresidentNum: currentNum + 1 } : {})
        }, { merge: true });

        return assignedCode;
      });
    } catch (e) {
      console.error('Counter transaction error, using fallback:', e);
      const fallbackNum = short === 'MEM' ? (Math.floor(Date.now() % 90000) + 1) : (Math.floor(Date.now() % 900) + 1);
      return formatCustomCode(designation, role, fallbackNum);
    }
  }
};

// ---------------------------------------------------------------------------
// 3. REGISTRATION REQUEST SERVICE
// ---------------------------------------------------------------------------
export const RegistrationService = {
  async submit(data: Omit<RegistrationRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'> & { password?: string }): Promise<string> {
    const path = 'registrationRequests';
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const request: RegistrationRequest = {
      ...data,
      id: requestId,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now
    };

    try {
      await setDoc(doc(db, 'registrationRequests', requestId), request);

      // Also create a linked user status record in users collection if userId provided
      if (data.userId) {
        const userDoc: UserAccount = {
          id: data.userId,
          email: data.email.toLowerCase().trim(),
          mobile: data.mobile.trim(),
          name: data.name.trim(),
          role: 'MEMBER',
          status: 'PENDING',
          password: data.password,
          createdAt: now,
          updatedAt: now
        };
        await setDoc(doc(db, 'users', data.userId), userDoc, { merge: true });
      }

      return requestId;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
      throw e;
    }
  },

  async getById(id: string): Promise<RegistrationRequest | null> {
    const path = `registrationRequests/${id}`;
    try {
      const snap = await getDoc(doc(db, 'registrationRequests', id));
      return snap.exists() ? (snap.data() as RegistrationRequest) : null;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return null;
    }
  },

  async getByEmail(email: string): Promise<RegistrationRequest | null> {
    const path = 'registrationRequests';
    try {
      const q = query(collection(db, 'registrationRequests'), where('email', '==', email.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as RegistrationRequest;
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return null;
    }
  },

  async getByMobile(mobile: string): Promise<RegistrationRequest | null> {
    const path = 'registrationRequests';
    try {
      const q = query(collection(db, 'registrationRequests'), where('mobile', '==', mobile.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as RegistrationRequest;
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return null;
    }
  },

  subscribeAll(callback: (requests: RegistrationRequest[]) => void): Unsubscribe {
    const q = query(collection(db, 'registrationRequests'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => d.data() as RegistrationRequest);
      callback(list);
    }, (err) => {
      console.warn('RegistrationRequests subscription error:', err);
    });
  },

  subscribe(callback: (requests: RegistrationRequest[]) => void): Unsubscribe {
    return this.subscribeAll(callback);
  },

  // Admin approves a request
  async approve(
    requestId: string,
    optionsOrAdminEmail?: string | { role?: UserRole; customCode?: string; adminName?: string }
  ): Promise<MemberRecord> {
    const req = await this.getById(requestId);
    if (!req) throw new Error('Registration request not found');

    let role: UserRole = req.designation === 'President'
      ? 'PRESIDENT'
      : (req.designation !== 'Member' ? 'OFFICE_BEARER' : 'MEMBER');
    let adminEmail = 'admin';
    let customCode: string | undefined;

    if (typeof optionsOrAdminEmail === 'string') {
      adminEmail = optionsOrAdminEmail;
    } else if (optionsOrAdminEmail) {
      if (optionsOrAdminEmail.role) role = optionsOrAdminEmail.role;
      if (optionsOrAdminEmail.adminName) adminEmail = optionsOrAdminEmail.adminName;
      if (optionsOrAdminEmail.customCode) customCode = optionsOrAdminEmail.customCode;
    }

    // Assign sequential unique code based on designation & role
    const assignedCode = customCode || (await CounterService.getNextCode(role, req.designation));
    const formattedCode = formatCardCode(assignedCode, req.designation, role);
    const now = new Date().toISOString();
    const memberId = `mem_${Date.now()}`;
    const cleanEmail = req.email.toLowerCase().trim();
    const cleanMobile = req.mobile.trim();

    // Look up any existing user account linked to this email or mobile
    let primaryUserId = req.userId;
    const matchingUserIds = new Set<string>();
    if (primaryUserId) matchingUserIds.add(primaryUserId);

    try {
      const existingByEmail = await UserService.getByEmail(cleanEmail);
      if (existingByEmail?.id) {
        matchingUserIds.add(existingByEmail.id);
        if (!primaryUserId) primaryUserId = existingByEmail.id;
      }
      const existingByMobile = await UserService.getByMobile(cleanMobile);
      if (existingByMobile?.id) {
        matchingUserIds.add(existingByMobile.id);
        if (!primaryUserId) primaryUserId = existingByMobile.id;
      }
    } catch (e) {
      console.warn('Checking existing users during approval:', e);
    }

    if (!primaryUserId) {
      primaryUserId = `user_${Date.now()}`;
      matchingUserIds.add(primaryUserId);
    }

    const member: MemberRecord = {
      id: memberId,
      userId: primaryUserId,
      code: formattedCode,
      role,
      name: req.name,
      fatherName: req.fatherName,
      email: cleanEmail,
      mobile: cleanMobile,
      address: req.address,
      village: req.village,
      designation: req.designation,
      education: req.education,
      photoUrl: req.photoUrl,
      status: 'APPROVED',
      createdAt: req.createdAt,
      updatedAt: now,
      approvedAt: now,
      approvedBy: adminEmail
    };

    // Save member record
    await setDoc(doc(db, 'members', memberId), member);

    // Update registration request
    await updateDoc(doc(db, 'registrationRequests', requestId), {
      status: 'APPROVED',
      approvedAt: now,
      approvedBy: adminEmail,
      approvedCode: formattedCode,
      userId: primaryUserId,
      updatedAt: now
    });

    // Update or create ALL linked user accounts to APPROVED status
    for (const uId of matchingUserIds) {
      await setDoc(doc(db, 'users', uId), {
        id: uId,
        email: cleanEmail,
        mobile: cleanMobile,
        name: req.name,
        role,
        status: 'APPROVED',
        code: formattedCode,
        photoUrl: req.photoUrl || '',
        memberId,
        updatedAt: now
      }, { merge: true });
    }

    return member;
  },

  // Admin rejects a request - Permanently purged from server so it does not show anywhere
  async reject(requestId: string, reason?: string, adminEmail?: string): Promise<void> {
    const req = await this.getById(requestId);
    
    // 1. Delete from registrationRequests
    await deleteDoc(doc(db, 'registrationRequests', requestId));

    // 2. Delete user account from users collection
    if (req?.userId) {
      try {
        await deleteDoc(doc(db, 'users', req.userId));
      } catch (err) {
        console.warn('Could not delete user account:', err);
      }
    }
  },

  // Admin sends request for correction
  async sendForCorrection(requestId: string, fields: string[], message: string): Promise<void> {
    const req = await this.getById(requestId);
    if (!req) throw new Error('Registration request not found');

    const now = new Date().toISOString();
    await updateDoc(doc(db, 'registrationRequests', requestId), {
      status: 'CORRECTION_REQUIRED',
      correctionFields: fields,
      correctionMessage: message,
      updatedAt: now
    });

    if (req.userId) {
      await updateDoc(doc(db, 'users', req.userId), {
        status: 'CORRECTION_REQUIRED',
        updatedAt: now
      });
    }
  },

  async requestCorrection(requestId: string, fields: string[], message: string): Promise<void> {
    return this.sendForCorrection(requestId, fields, message);
  },

  // User resubmits edited information
  async resubmit(requestId: string, updatedFields: Partial<RegistrationRequest>): Promise<void> {
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'registrationRequests', requestId), {
      ...updatedFields,
      status: 'PENDING',
      updatedAt: now
    });

    const req = await this.getById(requestId);
    if (req?.userId) {
      await updateDoc(doc(db, 'users', req.userId), {
        status: 'PENDING',
        name: updatedFields.name || req.name,
        email: updatedFields.email ? updatedFields.email.toLowerCase().trim() : req.email,
        mobile: updatedFields.mobile ? updatedFields.mobile.trim() : req.mobile,
        updatedAt: now
      });
    }
  }
};

// ---------------------------------------------------------------------------
// 4. MEMBERS SERVICE
// ---------------------------------------------------------------------------
export const MemberService = {
  subscribeAll(callback: (members: MemberRecord[]) => void): Unsubscribe {
    const q = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => {
        const data = d.data() as MemberRecord;
        return {
          ...data,
          code: formatCardCode(data.code, data.designation, data.role),
          status: (data.status === 'DISABLED' ? 'DISABLED' : 'APPROVED') as 'DISABLED' | 'APPROVED'
        };
      });
      callback(list);
    }, (err) => {
      console.warn('Members subscription error:', err);
    });
  },

  subscribe(callback: (members: MemberRecord[]) => void): Unsubscribe {
    return this.subscribeAll(callback);
  },

  async getAll(): Promise<MemberRecord[]> {
    const path = 'members';
    try {
      const q = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => {
        const data = d.data() as MemberRecord;
        return {
          ...data,
          code: formatCardCode(data.code, data.designation, data.role)
        };
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  },

  async getById(id: string): Promise<MemberRecord | null> {
    const path = `members/${id}`;
    try {
      const snap = await getDoc(doc(db, 'members', id));
      if (!snap.exists()) return null;
      const data = snap.data() as MemberRecord;
      return {
        ...data,
        code: formatCardCode(data.code, data.designation, data.role)
      };
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return null;
    }
  },

  async getByUserId(userId: string): Promise<MemberRecord | null> {
    const path = 'members';
    try {
      const q = query(collection(db, 'members'), where('userId', '==', userId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data() as MemberRecord;
        return {
          ...data,
          code: formatCardCode(data.code, data.designation, data.role)
        };
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return null;
    }
  },

  async getByCode(code: string): Promise<MemberRecord | null> {
    const path = 'members';
    const clean = code.trim();
    try {
      const all = await this.getAll();
      const match = all.find(m => m.code === clean || m.code === formatCardCode(clean) || clean.endsWith(m.code));
      if (match) return match;

      const q = query(collection(db, 'members'), where('code', '==', clean));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data() as MemberRecord;
        return {
          ...data,
          code: formatCardCode(data.code, data.designation, data.role)
        };
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return null;
    }
  },

  async getByEmail(email: string): Promise<MemberRecord | null> {
    const path = 'members';
    try {
      const cleanEmail = email.toLowerCase().trim();
      const q = query(collection(db, 'members'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data() as MemberRecord;
        return {
          ...data,
          code: formatCardCode(data.code, data.designation, data.role)
        };
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return null;
    }
  },

  async getByMobile(mobile: string): Promise<MemberRecord | null> {
    const path = 'members';
    try {
      const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
      const q = query(collection(db, 'members'), where('mobile', '==', cleanMobile));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as MemberRecord;
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return null;
    }
  },

  async update(id: string, updates: Partial<MemberRecord>): Promise<void> {
    const path = `members/${id}`;
    const now = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'members', id), {
        ...updates,
        updatedAt: now
      });

      // Sync user profile if name/email/mobile/code/photoUrl changed
      const member = await this.getById(id);
      if (member) {
        const userUpdates: any = {
          name: member.name,
          email: member.email,
          mobile: member.mobile,
          role: member.role,
          status: member.status,
          code: member.code,
          updatedAt: now
        };
        if (member.photoUrl) {
          userUpdates.photoUrl = member.photoUrl;
        }

        if (member.userId) {
          try {
            await setDoc(doc(db, 'users', member.userId), userUpdates, { merge: true });
          } catch (err) {
            console.warn('Could not sync user by userId:', err);
          }
        }

        // Also sync any other user document with matching email to prevent stale overwrites
        if (member.email) {
          try {
            const q = query(collection(db, 'users'), where('email', '==', member.email.toLowerCase().trim()));
            const snap = await getDocs(q);
            for (const d of snap.docs) {
              await setDoc(doc(db, 'users', d.id), userUpdates, { merge: true });
            }
          } catch (err) {
            console.warn('Could not sync user by email:', err);
          }
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
      throw e;
    }
  },

  async updatePhoto(id: string, photoUrl: string): Promise<void> {
    const path = `members/${id}`;
    const now = new Date().toISOString();
    try {
      await updateDoc(doc(db, 'members', id), {
        photoUrl,
        updatedAt: now
      });

      const member = await this.getById(id);
      if (member) {
        if (member.userId) {
          try {
            await setDoc(doc(db, 'users', member.userId), { photoUrl, updatedAt: now }, { merge: true });
          } catch (err) {
            console.warn('Could not sync user photo by userId:', err);
          }
        }
        if (member.email) {
          try {
            const q = query(collection(db, 'users'), where('email', '==', member.email.toLowerCase().trim()));
            const snap = await getDocs(q);
            for (const d of snap.docs) {
              await setDoc(doc(db, 'users', d.id), { photoUrl, updatedAt: now }, { merge: true });
            }
          } catch (err) {
            console.warn('Could not sync user photo by email:', err);
          }
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
      throw e;
    }
  },

  async setStatus(id: string, status: 'APPROVED' | 'DISABLED' | 'ACTIVE'): Promise<void> {
    const member = await this.getById(id);
    if (!member) return;
    const normalizedStatus = status === 'DISABLED' ? 'DISABLED' : 'APPROVED';
    await this.update(id, { status: normalizedStatus });
    if (member.userId) {
      await updateDoc(doc(db, 'users', member.userId), {
        status: normalizedStatus,
        updatedAt: new Date().toISOString()
      });
    }
  },

  async delete(id: string): Promise<void> {
    const path = `members/${id}`;
    const member = await this.getById(id);
    try {
      await deleteDoc(doc(db, 'members', id));
      if (member?.userId) {
        await deleteDoc(doc(db, 'users', member.userId));
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  },

  // Admin creates an office bearer directly
  async createOfficeBearer(data: Omit<MemberRecord, 'id' | 'code' | 'status' | 'createdAt' | 'updatedAt' | 'approvedAt'>, adminEmail: string): Promise<MemberRecord> {
    const role: UserRole = data.designation.toLowerCase().includes('president') && !data.designation.toLowerCase().includes('vice')
      ? 'PRESIDENT'
      : 'OFFICE_BEARER';
    const code = await CounterService.getNextCode(role, data.designation);
    const now = new Date().toISOString();
    const id = `mem_${Date.now()}`;

    const member: MemberRecord = {
      ...data,
      id,
      code,
      role,
      status: 'APPROVED',
      createdAt: now,
      updatedAt: now,
      approvedAt: now,
      approvedBy: adminEmail
    };

    await setDoc(doc(db, 'members', id), member);

    // Also register user record
    if (data.userId) {
      await setDoc(doc(db, 'users', data.userId), {
        id: data.userId,
        email: data.email.toLowerCase().trim(),
        mobile: data.mobile.trim(),
        name: data.name,
        role,
        status: 'APPROVED',
        code,
        photoUrl: data.photoUrl || '',
        memberId: id,
        createdAt: now,
        updatedAt: now
      }, { merge: true });
    }

    return member;
  }
};

// ---------------------------------------------------------------------------
// 5. USER ACCOUNTS SERVICE (Email or Mobile authentication lookup)
// ---------------------------------------------------------------------------
export const UserService = {
  async getByEmail(email: string): Promise<UserAccount | null> {
    const path = 'users';
    try {
      const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as UserAccount));
        const approved = list.find(u => u.status === 'APPROVED' || u.status === 'ACTIVE');
        return approved || list[0];
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return null;
    }
  },

  async getByMobile(mobile: string): Promise<UserAccount | null> {
    const path = 'users';
    try {
      const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
      const q = query(collection(db, 'users'), where('mobile', '==', cleanMobile));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as UserAccount));
        const approved = list.find(u => u.status === 'APPROVED' || u.status === 'ACTIVE');
        return approved || list[0];
      }
      // Also try raw mobile
      if (cleanMobile !== mobile.trim()) {
        const q2 = query(collection(db, 'users'), where('mobile', '==', mobile.trim()));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
          const list = snap2.docs.map(d => ({ ...d.data(), id: d.id } as UserAccount));
          const approved = list.find(u => u.status === 'APPROVED' || u.status === 'ACTIVE');
          return approved || list[0];
        }
      }
      return null;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return null;
    }
  },

  async getById(uid: string): Promise<UserAccount | null> {
    const path = `users/${uid}`;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? (snap.data() as UserAccount) : null;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
      return null;
    }
  },

  async isEmailRegistered(email: string): Promise<boolean> {
    const normalized = email.toLowerCase().trim();
    const user = await this.getByEmail(normalized);
    if (user && user.status !== 'REJECTED') return true;
    const req = await RegistrationService.getByEmail(normalized);
    return !!req && req.status !== 'REJECTED';
  },

  async isMobileRegistered(mobile: string): Promise<boolean> {
    const trimmed = mobile.trim();
    const user = await this.getByMobile(trimmed);
    if (user && user.status !== 'REJECTED') return true;
    const req = await RegistrationService.getByMobile(trimmed);
    return !!req && req.status !== 'REJECTED';
  }
};

// ---------------------------------------------------------------------------
// 6. MEETINGS SERVICE
// ---------------------------------------------------------------------------
export const MeetingService = {
  subscribe(callback: (meetings: MeetingItem[]) => void, publishedOnly = false): Unsubscribe {
    const q = query(collection(db, 'meetings'));

    return onSnapshot(q, (snap) => {
      let list = snap.docs.map(d => {
        const item = d.data() as MeetingItem;
        return {
          ...item,
          id: d.id,
          published: item.status === 'PUBLISHED' || item.published === true
        };
      });
      if (publishedOnly) {
        list = list.filter(m => m.status === 'PUBLISHED' || m.published === true);
      }
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      callback(list);
    }, (err) => {
      console.warn('Meetings subscription error:', err);
      callback([]);
    });
  },

  async create(data: Omit<MeetingItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<MeetingItem> {
    const id = `meet_${Date.now()}`;
    const now = new Date().toISOString();
    const isPub = data.published !== undefined ? data.published : (data.status === 'PUBLISHED');
    const status = isPub ? 'PUBLISHED' : 'DRAFT';
    const meeting: MeetingItem = {
      ...data,
      id,
      status,
      published: isPub,
      createdAt: now,
      updatedAt: now
    };
    await setDoc(doc(db, 'meetings', id), meeting);
    return meeting;
  },

  async update(id: string, updates: Partial<MeetingItem>): Promise<void> {
    const now = new Date().toISOString();
    const cleanUpdates = { ...updates };
    if (cleanUpdates.published !== undefined) {
      cleanUpdates.status = cleanUpdates.published ? 'PUBLISHED' : 'DRAFT';
    } else if (cleanUpdates.status !== undefined) {
      cleanUpdates.published = cleanUpdates.status === 'PUBLISHED';
    }
    await updateDoc(doc(db, 'meetings', id), {
      ...cleanUpdates,
      updatedAt: now
    });
  },

  async delete(id: string): Promise<void> {
    const path = `meetings/${id}`;
    try {
      await deleteDoc(doc(db, 'meetings', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
      throw e;
    }
  }
};

// ---------------------------------------------------------------------------
// 7. UPDATES SERVICE
// ---------------------------------------------------------------------------
export const UpdateService = {
  subscribe(callback: (updates: UpdateItem[]) => void, publishedOnly = false): Unsubscribe {
    const q = query(collection(db, 'updates'));

    return onSnapshot(q, (snap) => {
      let list = snap.docs.map(d => {
        const item = d.data() as UpdateItem;
        return {
          ...item,
          id: d.id,
          published: item.status === 'PUBLISHED' || item.published === true
        };
      });
      if (publishedOnly) {
        list = list.filter(u => u.status === 'PUBLISHED' || u.published === true);
      }
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      callback(list);
    }, (err) => {
      console.warn('Updates subscription error:', err);
      callback([]);
    });
  },

  async create(data: Omit<UpdateItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<UpdateItem> {
    const id = `upd_${Date.now()}`;
    const now = new Date().toISOString();
    const isPub = data.published !== undefined ? data.published : (data.status === 'PUBLISHED');
    const status = isPub ? 'PUBLISHED' : 'DRAFT';
    const item: UpdateItem = {
      ...data,
      id,
      status,
      published: isPub,
      createdAt: now,
      updatedAt: now
    };
    await setDoc(doc(db, 'updates', id), item);
    return item;
  },

  async update(id: string, updates: Partial<UpdateItem>): Promise<void> {
    const now = new Date().toISOString();
    const cleanUpdates = { ...updates };
    if (cleanUpdates.published !== undefined) {
      cleanUpdates.status = cleanUpdates.published ? 'PUBLISHED' : 'DRAFT';
    } else if (cleanUpdates.status !== undefined) {
      cleanUpdates.published = cleanUpdates.status === 'PUBLISHED';
    }
    await updateDoc(doc(db, 'updates', id), {
      ...cleanUpdates,
      updatedAt: now
    });
  },

  async delete(id: string): Promise<void> {
    const path = `updates/${id}`;
    try {
      await deleteDoc(doc(db, 'updates', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
      throw e;
    }
  }
};

// ---------------------------------------------------------------------------
// 8. SAMPLE / TEST DATA INITIALIZER
// ---------------------------------------------------------------------------
export async function seedDemoDataIfEmpty(): Promise<boolean> {
  try {
    const existingMembers = await MemberService.getAll();
    if (existingMembers.length > 0) {
      return false; // Already populated
    }

    const now = new Date().toISOString();

    // 1. Seed Committee Settings
    const defaultSettings: CommitteeSettings = {
      committeeName: 'Kishau Bandh Sangharsh Samiti',
      logoUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&q=80&w=300',
      presidentName: 'Shri Surat Singh Tomar',
      presidentSignatureUrl: '',
      adminName: 'Executive Committee Administrator',
      adminSignatureUrl: '',
      updatedAt: now
    };
    await setDoc(doc(db, 'settings', 'committee'), defaultSettings, { merge: true });

    // 2. Seed President Member Record
    const presId = 'mem_president_001';
    await setDoc(doc(db, 'members', presId), {
      id: presId,
      userId: 'user_pres_001',
      code: '0.001',
      role: 'PRESIDENT',
      name: 'Shri Surat Singh Tomar',
      fatherName: 'Late Shri Pratap Singh Tomar',
      email: 'surattomar@kishau.org',
      mobile: '9816012345',
      address: 'Village Meloth, Tehsil Tiuni, Dehradun',
      village: 'Meloth',
      designation: 'President',
      education: 'Master Degree / Post Graduate',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
      status: 'APPROVED',
      createdAt: now,
      updatedAt: now,
      approvedAt: now,
      approvedBy: 'Admin'
    });

    // 3. Seed Office Bearer
    const offId = 'mem_officer_002';
    await setDoc(doc(db, 'members', offId), {
      id: offId,
      userId: 'user_off_002',
      code: '0.002',
      role: 'OFFICE_BEARER',
      name: 'Shri Virender Chauhan',
      fatherName: 'Shri Mohan Lal Chauhan',
      email: 'virender.chauhan@kishau.org',
      mobile: '9418054321',
      address: 'Village Kwanou, Post Tiuni, Dehradun',
      village: 'Kwanou',
      designation: 'General Secretary',
      education: 'Bachelor Degree / Graduate',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300',
      status: 'APPROVED',
      createdAt: now,
      updatedAt: now,
      approvedAt: now,
      approvedBy: 'Admin'
    });

    // 4. Seed General Member
    const memId = 'mem_member_00001';
    await setDoc(doc(db, 'members', memId), {
      id: memId,
      userId: 'user_mem_00001',
      code: '00001',
      role: 'MEMBER',
      name: 'Shri Rakesh Rawat',
      fatherName: 'Shri Amar Singh Rawat',
      email: 'rakeshrawat@gmail.com',
      mobile: '9805567890',
      address: 'Village Tiuni, Block Tiuni, Dehradun',
      village: 'Tiuni',
      designation: 'Member',
      education: '12th Senior Secondary',
      photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=300',
      status: 'APPROVED',
      createdAt: now,
      updatedAt: now,
      approvedAt: now,
      approvedBy: 'Admin'
    });

    // 5. Seed Sample Meeting
    const meetId = 'meet_demo_01';
    await setDoc(doc(db, 'meetings', meetId), {
      id: meetId,
      title: 'Maha-Panchayat & Land Rights Executive Assembly',
      date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      time: '11:00 AM',
      location: 'Panchayat Bhavan, Village Meloth',
      description: 'Important assembly to discuss dam rehabilitation package, compensation rates, and state representations.',
      status: 'PUBLISHED',
      published: true,
      createdAt: now,
      updatedAt: now
    });

    // 7. Seed Sample Circular
    const updId = 'upd_demo_01';
    await setDoc(doc(db, 'updates', updId), {
      id: updId,
      title: 'Official Notification: Village Survey and Compensation Verification Schedule',
      date: new Date().toISOString().slice(0, 10),
      category: 'Official Circular',
      description: 'All affected village families are requested to keep their land registry documents and Kisan passbooks ready for committee review.',
      imageUrl: '',
      status: 'PUBLISHED',
      published: true,
      createdAt: now,
      updatedAt: now
    });

    return true;
  } catch (err) {
    console.error('Seed demo data error:', err);
    return false;
  }
}
