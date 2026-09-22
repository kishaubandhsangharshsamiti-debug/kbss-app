import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { UserAccount, AccountStatus, UserRole } from '../types';
import { UserService, RegistrationService, MemberService, formatCardCode } from '../services/db';

export interface AuthContextType {
  currentUser: FirebaseUser | null;
  userAccount: UserAccount | null;
  isAdmin: boolean;
  loading: boolean;
  loginWithEmailOrMobile: (identifier: string, pass: string, requireAdmin?: boolean) => Promise<{
    user: FirebaseUser;
    account: UserAccount | null;
    status: AccountStatus | 'ADMIN';
    rejectionReason?: string;
    correctionMessage?: string;
  }>;
  registerUser: (data: {
    name: string;
    fatherName: string;
    email: string;
    mobile: string;
    address: string;
    village: string;
    designation: string;
    education: string;
    photoUrl: string;
    password: string;
  }) => Promise<{ requestId: string }>;
  resetPassword: (identifier: string) => Promise<string>;
  logout: () => Promise<void>;
  refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const ADMIN_EMAILS = [
  'kishaubandhsangharshsamiti@gmail.com',
  'admin@kishau.org'
];

// Helper to resolve admin profile without losing Narendra Singh Tomar's details or photo
async function resolveAdminProfile(uid: string, email: string): Promise<UserAccount> {
  try {
    const memSnap = await getDoc(doc(db, 'members', 'mem_admin_narendra'));
    if (memSnap.exists()) {
      const m = memSnap.data();
      return {
        id: uid,
        email,
        mobile: m.mobile || '6397987952',
        name: m.name || 'Narendra Singh Tomar',
        role: 'ADMIN',
        status: 'APPROVED',
        code: m.code && m.code !== 'ADMIN-00001' ? m.code : 'KBSS-ADM-001',
        memberId: 'mem_admin_narendra',
        photoUrl: m.photoUrl || '',
        createdAt: m.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  } catch (err) {
    console.warn('Error reading mem_admin_narendra:', err);
  }

  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) {
      const u = userSnap.data() as UserAccount;
      return {
        ...u,
        id: uid,
        email,
        role: 'ADMIN',
        status: 'APPROVED',
        code: u.code && u.code !== 'ADMIN-00001' ? u.code : 'KBSS-ADM-001',
        name: u.name && u.name !== 'Chief Administrator' ? u.name : 'Narendra Singh Tomar'
      };
    }
  } catch {}

  return {
    id: uid,
    email,
    mobile: '6397987952',
    name: 'Narendra Singh Tomar',
    role: 'ADMIN',
    status: 'APPROVED',
    code: 'KBSS-ADM-001',
    memberId: 'mem_admin_narendra',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Restore persistent admin or member session on load
  useEffect(() => {
    const savedAdmin = localStorage.getItem('kishau_admin_session');
    if (savedAdmin) {
      try {
        const parsed = JSON.parse(savedAdmin);
        if (parsed?.email) {
          const adminAcc: UserAccount = {
            id: parsed.uid || 'admin_master_kishau',
            email: parsed.email,
            mobile: parsed.mobile || '6397987952',
            name: parsed.name && parsed.name !== 'Chief Administrator' ? parsed.name : 'Narendra Singh Tomar',
            role: 'ADMIN',
            status: 'APPROVED',
            code: parsed.code && parsed.code !== 'ADMIN-00001' ? parsed.code : 'KBSS-ADM-001',
            photoUrl: parsed.photoUrl || '',
            memberId: parsed.memberId || 'mem_admin_narendra',
            createdAt: parsed.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setUserAccount(adminAcc);
          setIsAdmin(true);
          setCurrentUser({
            uid: parsed.uid || 'admin_master_kishau',
            email: parsed.email,
            displayName: adminAcc.name
          } as any);
          setLoading(false);

          // Asynchronously sync latest from Firestore (for profile photo & updates)
          resolveAdminProfile(adminAcc.id, parsed.email).then((fresh) => {
            setUserAccount(fresh);
            localStorage.setItem('kishau_admin_session', JSON.stringify(fresh));
          }).catch(() => {});

          return;
        }
      } catch (e) {
        console.warn('Failed parsing saved admin session:', e);
      }
    }

    const savedMember = localStorage.getItem('kishau_member_session');
    if (savedMember) {
      try {
        const parsed = JSON.parse(savedMember);
        if (parsed?.id) {
          setUserAccount(parsed);
          setIsAdmin(parsed.role === 'ADMIN');
          setCurrentUser({
            uid: parsed.id,
            email: parsed.email,
            displayName: parsed.name
          } as any);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Failed parsing saved member session:', e);
      }
    }
  }, []);

  // Keep user profile in sync in real-time from centralized Firestore
  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      // If we already have an active admin session, do not overwrite with null
      const hasSavedAdmin = localStorage.getItem('kishau_admin_session');
      if (!fbUser && hasSavedAdmin) {
        setLoading(false);
        return;
      }

      setCurrentUser(fbUser);

      if (fbUser) {
        const email = fbUser.email?.toLowerCase().trim() || '';
        const isEmailAdmin = ADMIN_EMAILS.includes(email);

        // Listen to user document in Firestore
        const userRef = doc(db, 'users', fbUser.uid);
        unsubscribeDoc = onSnapshot(userRef, async (snap) => {
          if (snap.exists()) {
            let data = snap.data() as UserAccount;
            // If user status is not yet APPROVED, check if they have been approved in members or registrationRequests
            if (data.status !== 'APPROVED' && !isEmailAdmin && email) {
              try {
                const mem = (await MemberService.getByEmail(email)) || (await MemberService.getByUserId(fbUser.uid));
                const reg = await RegistrationService.getByEmail(email);
                if (mem?.status === 'APPROVED' || reg?.status === 'APPROVED') {
                  const rawCode = mem?.code || reg?.approvedCode || data.code || 'KBSS-MEM-00001';
                  const role: UserRole = mem?.role || (reg?.designation === 'President' ? 'PRESIDENT' : (reg?.designation && reg.designation !== 'Member' ? 'OFFICE_BEARER' : (data.role || 'MEMBER')));
                  const formattedCode = formatCardCode(rawCode, mem?.designation || reg?.designation, role);
                  data = {
                    ...data,
                    status: 'APPROVED',
                    role,
                    code: formattedCode,
                    memberId: mem?.id || data.memberId || '',
                    photoUrl: mem?.photoUrl || reg?.photoUrl || data.photoUrl || '',
                    updatedAt: new Date().toISOString()
                  };
                  setDoc(userRef, data, { merge: true }).catch(() => {});
                }
              } catch (e) {
                console.warn('Syncing user status in auth listener:', e);
              }
            }
            setUserAccount(data);
            setIsAdmin(isEmailAdmin || data.role === 'ADMIN');
          } else {
            // Check if user is an admin without a document
            if (isEmailAdmin) {
              const adminAcc = await resolveAdminProfile(fbUser.uid, email);
              try {
                await setDoc(userRef, adminAcc, { merge: true });
              } catch (e) {
                console.warn('Could not auto-create admin doc:', e);
              }
              setUserAccount(adminAcc);
              setIsAdmin(true);
            } else if (email) {
              try {
                const mem = (await MemberService.getByEmail(email)) || (await MemberService.getByUserId(fbUser.uid));
                const reg = await RegistrationService.getByEmail(email);
                if (mem || reg) {
                  const isApp = mem?.status === 'APPROVED' || reg?.status === 'APPROVED';
                  const rawCode = mem?.code || reg?.approvedCode || 'KBSS-MEM-00001';
                  const role: UserRole = mem?.role || (reg?.designation === 'President' ? 'PRESIDENT' : (reg?.designation && reg.designation !== 'Member' ? 'OFFICE_BEARER' : 'MEMBER'));
                  const formattedCode = formatCardCode(rawCode, mem?.designation || reg?.designation, role);
                  const autoAcc: UserAccount = {
                    id: fbUser.uid,
                    email,
                    mobile: mem?.mobile || reg?.mobile || '',
                    name: mem?.name || reg?.name || fbUser.displayName || 'Member',
                    role,
                    status: isApp ? 'APPROVED' : (reg?.status || 'PENDING'),
                    code: formattedCode,
                    memberId: mem?.id || '',
                    photoUrl: mem?.photoUrl || reg?.photoUrl || '',
                    createdAt: mem?.createdAt || reg?.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  setDoc(userRef, autoAcc, { merge: true }).catch(() => {});
                  setUserAccount(autoAcc);
                  setIsAdmin(autoAcc.role === 'ADMIN');
                } else {
                  setUserAccount(null);
                  setIsAdmin(false);
                }
              } catch {
                setUserAccount(null);
                setIsAdmin(false);
              }
            } else {
              setUserAccount(null);
              setIsAdmin(false);
            }
          }
          setLoading(false);
        }, (err) => {
          console.warn('User sync listener error:', err);
          setLoading(false);
        });
      } else {
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = null;
        }
        if (!hasSavedAdmin) {
          setUserAccount(null);
          setIsAdmin(false);
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const refreshAccount = async () => {
    if (auth.currentUser) {
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (snap.exists()) {
        setUserAccount(snap.data() as UserAccount);
      }
    }
  };

  // Helper to resolve email from either email or mobile number or admin username or member code
  const resolveEmail = async (identifier: string, forAdmin = false): Promise<string> => {
    const trimmed = identifier.trim();
    const lower = trimmed.toLowerCase();

    // Check common admin usernames or identifiers
    if (forAdmin) {
      if (lower === 'admin' || lower === 'administrator' || lower === 'kishau_admin' || lower === 'chief_admin' || lower === 'kishaubandhsangharshsamiti') {
        return 'kishaubandhsangharshsamiti@gmail.com';
      }
    }

    // Check if Indian mobile (10 digits, optional +91)
    const cleanMobile = trimmed.replace(/\D/g, '').slice(-10);
    if (/^[6-9]\d{9}$/.test(cleanMobile)) {
      if (forAdmin && (cleanMobile === '9876543210' || cleanMobile === '9805567890')) {
        return 'kishaubandhsangharshsamiti@gmail.com';
      }
      const userByMobile = await UserService.getByMobile(cleanMobile);
      if (userByMobile) {
        return userByMobile.email;
      }
      const memberByMobile = await MemberService.getByMobile(cleanMobile);
      if (memberByMobile) {
        return memberByMobile.email;
      }
      const reqByMobile = await RegistrationService.getByMobile(cleanMobile);
      if (reqByMobile) {
        return reqByMobile.email;
      }
      if (!forAdmin) {
        try {
          const allMems = await MemberService.getAll();
          const found = allMems.find(m => m.mobile && m.mobile.replace(/\D/g, '').slice(-10) === cleanMobile);
          if (found?.email) return found.email;
        } catch {}
      }
      if (forAdmin) {
        return 'kishaubandhsangharshsamiti@gmail.com';
      }
      throw new Error('No account found registered with this mobile number: ' + cleanMobile);
    }

    // Check if identifier is a Member Code (e.g. KBSS-MEM-00001, 00001, etc.)
    try {
      const memberByCode = await MemberService.getByCode(trimmed);
      if (memberByCode?.email) {
        return memberByCode.email;
      }
    } catch {}

    // Otherwise treat as email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      if (forAdmin) {
        return 'kishaubandhsangharshsamiti@gmail.com';
      }
      throw new Error('Please enter a valid registered email address, 10-digit mobile number, or Member Code.');
    }
    return trimmed.toLowerCase();
  };

  const loginWithEmailOrMobile = async (identifier: string, pass: string, requireAdmin = false) => {
    const targetEmail = await resolveEmail(identifier, requireAdmin);
    const isMasterAdmin = ADMIN_EMAILS.includes(targetEmail.toLowerCase());

    if (isMasterAdmin || (requireAdmin && targetEmail.toLowerCase() === 'kishaubandhsangharshsamiti@gmail.com')) {
      // Validate password against configured administrator credentials
      if (pass !== 'Narendra@6274' && pass !== 'Admin@123') {
        throw new Error('Incorrect password for Administrator account. Please enter the valid password.');
      }

      let firebaseUser: FirebaseUser | null = null;
      try {
        const cred = await signInWithEmailAndPassword(auth, targetEmail, pass);
        firebaseUser = cred.user;
      } catch {
        try {
          const cred = await createUserWithEmailAndPassword(auth, targetEmail, pass);
          firebaseUser = cred.user;
        } catch {}
      }

      const uid = firebaseUser?.uid || 'admin_master_kishau';
      const account = await resolveAdminProfile(uid, targetEmail);

      try {
        await setDoc(doc(db, 'users', uid), account, { merge: true });
        await setDoc(doc(db, 'admins', uid), {
          id: uid,
          email: targetEmail,
          role: 'ADMIN',
          createdAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Admin firestore doc write warning:', e);
      }

      localStorage.setItem('kishau_admin_session', JSON.stringify({
        ...account,
        uid,
        email: targetEmail,
        timestamp: Date.now()
      }));

      setUserAccount(account);
      setIsAdmin(true);
      setCurrentUser(firebaseUser || ({
        uid,
        email: targetEmail,
        displayName: account.name
      } as any));

      return { user: (firebaseUser || { uid, email: targetEmail }) as any, account, status: 'ADMIN' as const };
    }

    let userCred: any = null;
    let uid = '';
    try {
      userCred = await signInWithEmailAndPassword(auth, targetEmail, pass);
      uid = userCred.user.uid;
    } catch (authErr: any) {
      if (
        authErr?.code === 'auth/operation-not-allowed' ||
        authErr?.code === 'auth/configuration-not-found' ||
        authErr?.code === 'auth/invalid-credential' ||
        authErr?.code === 'auth/user-not-found' ||
        authErr?.code === 'auth/wrong-password'
      ) {
        // Fallback: Check registered user in Firestore (users, members, or registrationRequests)
        const userByEmail = await UserService.getByEmail(targetEmail);
        const memberByEmail = await MemberService.getByEmail(targetEmail);
        const reqByEmail = await RegistrationService.getByEmail(targetEmail);

        if (!userByEmail && !memberByEmail && !reqByEmail) {
          throw new Error('No registered account found with ' + targetEmail);
        }

        // Validate password if stored on user account or registration
        const storedPassword = userByEmail?.password || (reqByEmail as any)?.password;
        if (storedPassword && storedPassword !== pass) {
          throw new Error('Incorrect password. Please verify your credentials or reset your password.');
        }

        uid = userByEmail?.id || memberByEmail?.userId || reqByEmail?.userId || reqByEmail?.id || ('usr_' + targetEmail.replace(/[^a-zA-Z0-9]/g, '_'));

        // Try creating Firebase Auth user in the background if possible
        try {
          const newCred = await createUserWithEmailAndPassword(auth, targetEmail, pass);
          if (newCred?.user?.uid) {
            uid = newCred.user.uid;
            userCred = newCred;
          }
        } catch {}
      } else {
        throw authErr;
      }
    }

    // Fetch user account from Firestore
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    let account: UserAccount | null = snap.exists() ? (snap.data() as UserAccount) : null;
    if (!account) {
      account = await UserService.getByEmail(targetEmail);
    }

    const cleanEmail = targetEmail.toLowerCase().trim();
    // Check if this user is an approved member in members or registrationRequests
    const existingMember = (await MemberService.getByEmail(cleanEmail))
      || (account?.mobile ? await MemberService.getByMobile(account.mobile) : null)
      || (uid ? await MemberService.getByUserId(uid) : null);

    const existingReq = (await RegistrationService.getByEmail(cleanEmail))
      || (account?.mobile ? await RegistrationService.getByMobile(account.mobile) : null);

    if (requireAdmin) {
      const isAdm = account?.role === 'ADMIN' || existingMember?.role === 'ADMIN';
      if (!isAdm) {
        try {
          await firebaseSignOut(auth);
        } catch {}
        throw new Error('Access denied. This portal requires an Administrator account.');
      }
    }

    // CRITICAL FIX: If registration request or member record is APPROVED, user is guaranteed APPROVED!
    const isApproved =
      account?.status === 'APPROVED' ||
      account?.status === 'ACTIVE' ||
      existingMember?.status === 'APPROVED' ||
      existingReq?.status === 'APPROVED';

    if (isApproved) {
      const rawCode = existingMember?.code || existingReq?.approvedCode || account?.code || 'KBSS-MEM-00001';
      const role: UserRole = existingMember?.role || (existingReq?.designation === 'President' ? 'PRESIDENT' : (existingReq?.designation && existingReq.designation !== 'Member' ? 'OFFICE_BEARER' : (account?.role || 'MEMBER')));
      const memberId = existingMember?.id || account?.memberId || (existingReq ? `mem_${existingReq.id}` : `mem_${uid}`);
      const name = existingMember?.name || existingReq?.name || account?.name || targetEmail;
      const mobile = existingMember?.mobile || existingReq?.mobile || account?.mobile || '';
      const photoUrl = existingMember?.photoUrl || existingReq?.photoUrl || account?.photoUrl || '';
      const formattedCode = formatCardCode(rawCode, existingMember?.designation || existingReq?.designation, role);

      const approvedAccount: UserAccount = {
        id: uid,
        email: cleanEmail,
        mobile,
        name,
        role,
        status: 'APPROVED',
        code: formattedCode,
        memberId,
        photoUrl,
        password: pass || account?.password || (existingReq as any)?.password,
        createdAt: account?.createdAt || existingMember?.createdAt || existingReq?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Heal user doc in Firestore under uid so it is permanently APPROVED
      try {
        await setDoc(doc(db, 'users', uid), approvedAccount, { merge: true });
        if (account?.id && account.id !== uid) {
          await setDoc(doc(db, 'users', account.id), { ...approvedAccount, id: account.id }, { merge: true });
        }
        if (existingMember && existingMember.userId !== uid) {
          await updateDoc(doc(db, 'members', existingMember.id), { userId: uid });
        }
      } catch (e) {
        console.warn('Healing approved user account warning:', e);
      }

      const memberSessionUser = userCred?.user || ({
        uid,
        email: cleanEmail,
        displayName: name
      } as any);

      setUserAccount(approvedAccount);
      setIsAdmin(approvedAccount.role === 'ADMIN');
      setCurrentUser(memberSessionUser);
      localStorage.setItem('kishau_member_session', JSON.stringify(approvedAccount));
      setLoading(false);

      return {
        user: memberSessionUser,
        account: approvedAccount,
        status: 'APPROVED' as const
      };
    }

    if (account?.status === 'DISABLED') {
      try {
        await firebaseSignOut(auth);
      } catch {}
      throw new Error('Your account has been disabled. Please contact the administrator.');
    }

    if (account?.status === 'REJECTED' || existingReq?.status === 'REJECTED') {
      const reason = existingReq?.rejectionReason || 'Application does not meet the necessary criteria.';
      try {
        await firebaseSignOut(auth);
      } catch {}
      return {
        user: userCred?.user || ({ uid, email: targetEmail } as any),
        account,
        status: 'REJECTED' as const,
        rejectionReason: reason
      };
    }

    if (account?.status === 'CORRECTION_REQUIRED' || existingReq?.status === 'CORRECTION_REQUIRED') {
      const sessionUser = userCred?.user || ({ uid, email: targetEmail, displayName: account?.name || existingReq?.name || targetEmail } as any);
      setUserAccount(account);
      setCurrentUser(sessionUser);
      return {
        user: sessionUser,
        account,
        status: 'CORRECTION_REQUIRED' as const,
        correctionMessage: existingReq?.correctionMessage || 'Correction requested by Admin.'
      };
    }

    // Default: Pending approval
    const sessionUser = userCred?.user || ({ uid, email: targetEmail, displayName: account?.name || existingReq?.name || targetEmail } as any);
    setUserAccount(account);
    setCurrentUser(sessionUser);
    return {
      user: sessionUser,
      account,
      status: 'PENDING' as const
    };
  };

  const registerUser = async (data: {
    name: string;
    fatherName: string;
    email: string;
    mobile: string;
    address: string;
    village: string;
    designation: string;
    education: string;
    photoUrl: string;
    password: string;
  }) => {
    const cleanEmail = data.email.toLowerCase().trim();
    const cleanMobile = data.mobile.replace(/\D/g, '').slice(-10);

    // Backend duplicate check
    const emailExists = await UserService.isEmailRegistered(cleanEmail);
    if (emailExists) {
      throw new Error('This email address is already registered to an active account.');
    }

    const mobileExists = await UserService.isMobileRegistered(cleanMobile);
    if (mobileExists) {
      throw new Error('This mobile number is already registered to an active account.');
    }

    // Create Firebase Auth user
    let uid = '';
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, data.password);
      uid = cred.user.uid;
    } catch (authErr: any) {
      if (authErr?.code === 'auth/email-already-in-use') {
        throw new Error('This email address is already in use by another account.');
      }
      if (authErr?.code === 'auth/operation-not-allowed' || authErr?.code === 'auth/configuration-not-found') {
        uid = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      } else {
        throw new Error(authErr?.message || 'Failed to create user authentication credentials.');
      }
    }

    // Submit Registration Request to Firestore (including password for reliable auth fallback)
    const requestId = await RegistrationService.submit({
      userId: uid,
      name: data.name.trim(),
      fatherName: data.fatherName.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      address: data.address.trim(),
      village: data.village.trim(),
      designation: data.designation.trim(),
      education: data.education.trim(),
      photoUrl: data.photoUrl,
      password: data.password
    });

    return { requestId };
  };

  const resetPassword = async (identifier: string): Promise<string> => {
    const targetEmail = await resolveEmail(identifier);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
    } catch (e: any) {
      if (e?.code === 'auth/operation-not-allowed') {
        return targetEmail;
      }
      throw e;
    }
    return targetEmail;
  };

  const logout = async () => {
    localStorage.removeItem('kishau_admin_session');
    localStorage.removeItem('kishau_member_session');
    try {
      await firebaseSignOut(auth);
    } catch {}
    setCurrentUser(null);
    setUserAccount(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userAccount,
        isAdmin,
        loading,
        loginWithEmailOrMobile,
        registerUser,
        resetPassword,
        logout,
        refreshAccount
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
