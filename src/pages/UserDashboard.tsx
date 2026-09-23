import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  MemberService,
  SettingsService,
  MeetingService,
  UpdateService,
  RegistrationService,
  formatCardCode,
  formatDesignationDisplay
} from '../services/db';
import {
  MemberRecord,
  CommitteeSettings,
  MeetingItem,
  UpdateItem,
  RegistrationRequest,
  UserRole
} from '../types';
import { IdCardView } from '../components/IdCardView';
import {
  User,
  CreditCard,
  Calendar,
  Bell,
  CheckCircle2,
  LogOut,
  Shield,
  Clock,
  MapPin,
  Phone,
  Mail,
  GraduationCap,
  Briefcase,
  Download,
  AlertCircle,
  FileText,
  Camera,
  Loader2,
  Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import { compressImage } from '../utils/imageCompressor';

type UserTab = 'profile' | 'idcard' | 'meetings' | 'updates' | 'status';

export const UserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userAccount, logout, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<UserTab>('profile');
  const [member, setMember] = useState<MemberRecord | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<CommitteeSettings>({
    committeeName: 'Kishau Bandh Sangharsh Samiti',
    logoUrl: '',
    presidentName: '',
    presidentSignatureUrl: '',
    adminName: '',
    adminSignatureUrl: '',
    updatedAt: ''
  });
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(true);

  // If not authenticated after auth loading finishes, redirect to login
  useEffect(() => {
    if (!authLoading && !currentUser && !userAccount) {
      const savedMember = localStorage.getItem('kishau_member_session');
      if (!savedMember) {
        navigate('/login', { replace: true });
      }
    }
  }, [authLoading, currentUser, userAccount, navigate]);

  // Sync Member Data and Committee Settings
  useEffect(() => {
    // If neither currentUser nor userAccount is available yet, wait for auth
    if (!currentUser && !userAccount) {
      if (!authLoading) {
        setLoading(false);
      }
      return;
    }

    let unsubMember: (() => void) | null = null;
    let unsubSettings: (() => void) | null = null;
    let unsubMeetings: (() => void) | null = null;
    let unsubUpdates: (() => void) | null = null;

    async function loadData() {
      try {
        const userId = currentUser?.uid || userAccount?.id;
        const userEmail = currentUser?.email || userAccount?.email;
        const userMobile = userAccount?.mobile;

        let mem: MemberRecord | null = null;

        // 1. Try by memberId if available on account
        if (userAccount?.memberId) {
          mem = await MemberService.getById(userAccount.memberId);
        }

        // 2. Try by userId
        if (!mem && userId) {
          mem = await MemberService.getByUserId(userId);
        }

        // 3. Try by email
        if (!mem && userEmail) {
          mem = await MemberService.getByEmail(userEmail);
        }

        // 4. Try by mobile
        if (!mem && userMobile) {
          mem = await MemberService.getByMobile(userMobile);
        }

        // 5. Fallback scan if needed
        if (!mem && (userEmail || userMobile)) {
          const allMembers = await MemberService.getAll();
          const targetEmail = userEmail?.toLowerCase();
          mem = allMembers.find(m => 
            (targetEmail && m.email.toLowerCase() === targetEmail) ||
            (userMobile && m.mobile === userMobile)
          ) || null;
        }

        // 6. Check registration request or member doc approval
        if (!mem) {
          let regReq: RegistrationRequest | null = null;
          if (userEmail) {
            regReq = await RegistrationService.getByEmail(userEmail);
          }
          if (!regReq && userMobile) {
            regReq = await RegistrationService.getByMobile(userMobile);
          }

          if (regReq && (regReq.status === 'APPROVED' || userAccount?.status === 'APPROVED')) {
            const role: UserRole = (userAccount?.role as any) || (regReq.designation === 'President' ? 'PRESIDENT' : (regReq.designation !== 'Member' ? 'OFFICE_BEARER' : 'MEMBER'));
            const assignedCode = regReq.approvedCode || userAccount?.code || 'KBSS-MEM-00001';
            mem = {
              id: regReq.id,
              userId: userId || regReq.userId || '',
              code: formatCardCode(assignedCode, regReq.designation, role),
              role,
              name: regReq.name,
              fatherName: regReq.fatherName,
              email: regReq.email,
              mobile: regReq.mobile,
              address: regReq.address,
              village: regReq.village,
              designation: regReq.designation,
              education: regReq.education,
              photoUrl: regReq.photoUrl,
              status: 'APPROVED',
              createdAt: regReq.createdAt,
              updatedAt: regReq.updatedAt
            };
          }
        }

        // Auto-heal user doc if member is approved but user account status is not yet APPROVED
        if (mem && userAccount && userAccount.status !== 'APPROVED') {
          try {
            await setDoc(doc(db, 'users', userAccount.id), {
              status: 'APPROVED',
              code: mem.code,
              memberId: mem.id,
              role: mem.role,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (e) {
            console.warn('Auto healing user account in UserDashboard:', e);
          }
        }

        setMember(mem);

        // Real-time member updates listener (instantly reflects designation or code changes made by admin)
        unsubMember = MemberService.subscribe((allList) => {
          const targetUserId = currentUser?.uid || userAccount?.id;
          const targetEmail = (currentUser?.email || userAccount?.email || '').toLowerCase();
          const targetMobile = userAccount?.mobile;
          const targetMemberId = userAccount?.memberId;

          const updated = allList.find((m) =>
            (targetMemberId && m.id === targetMemberId) ||
            (targetUserId && m.userId === targetUserId) ||
            (targetEmail && m.email?.toLowerCase() === targetEmail) ||
            (targetMobile && m.mobile === targetMobile)
          );

          if (updated) {
            setMember(updated);
          }
        });

        // Central committee settings listener
        unsubSettings = SettingsService.subscribe((s) => {
          setSettings(s);
        });

        // Published meetings listener
        unsubMeetings = MeetingService.subscribe((list) => {
          setMeetings(list);
        }, true);

        // Published updates listener
        unsubUpdates = UpdateService.subscribe((list) => {
          setUpdates(list);
        }, true);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Safety timeout: max 3 seconds loading state
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      clearTimeout(safetyTimer);
      if (unsubMember) unsubMember();
      if (unsubSettings) unsubSettings();
      if (unsubMeetings) unsubMeetings();
      if (unsubUpdates) unsubUpdates();
    };
  }, [currentUser, userAccount, authLoading]);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out safely');
    navigate('/');
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-800 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-semibold text-slate-700">Loading Member Dashboard...</p>
        </div>
      </div>
    );
  }

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !member) return;

    if (!file.type.startsWith('image/')) {
      toast.error('कृपया केवल इमेज (JPG/PNG) फ़ाइल चुनें');
      return;
    }

    setUploadingPhoto(true);
    const toastId = toast.loading('फ़ोटो सुरक्षित की जा रही है... (Saving photo...)');

    try {
      const compressed = await compressImage(file, {
        maxWidth: 350,
        maxHeight: 420,
        quality: 0.85,
        preserveTransparency: false
      });

      // Update both member document and synced user document
      await MemberService.updatePhoto(member.id, compressed);

      setMember((prev) => (prev ? { ...prev, photoUrl: compressed } : null));

      // Update local storage session
      const savedSession = localStorage.getItem('kishau_member_session');
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          localStorage.setItem('kishau_member_session', JSON.stringify({
            ...parsed,
            photoUrl: compressed
          }));
        } catch {}
      }

      toast.success('फ़ोटो सफलतापूर्वक अपडेट और सुरक्षित हो गई! (Photo updated successfully!)', { id: toastId });
    } catch (err: any) {
      console.error('Photo upload error:', err);
      toast.error(err.message || 'फ़ोटो सेव करने में समस्या आई', { id: toastId });
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  // If member record not yet approved or not found
  if (!member && userAccount?.status !== 'APPROVED') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4 border border-slate-200">
          <Clock className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">Application Pending Approval</h3>
          <p className="text-xs text-slate-600">
            Your registration request is currently being reviewed by the administrative council.
            Please check back shortly or contact the committee secretary.
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-slate-800 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-emerald-900 text-white shadow-md border-b-2 border-amber-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-cover border-2 border-amber-300 bg-white"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-800 border-2 border-amber-300 flex items-center justify-center">
                <Shield className="w-6 h-6 text-amber-300" />
              </div>
            )}
            <div>
              <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-amber-300 truncate max-w-xs sm:max-w-md">
                {settings.committeeName || 'Kishau Bandh Sangharsh Samiti'}
              </h1>
              <p className="text-[11px] text-emerald-100">
                Official Member Dashboard • {member?.village || 'Affected Area'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <span className="text-xs font-bold block">{member?.name || userAccount?.name}</span>
              <span className="text-[10px] font-mono text-emerald-200">
                Code: {member?.code || userAccount?.code ? formatCardCode(member?.code || userAccount?.code, member?.designation, member?.role || userAccount?.role) : 'N/A'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-xs font-semibold text-white border border-emerald-700 transition"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col md:flex-row gap-6 w-full">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeTab === 'profile'
                  ? 'bg-emerald-800 text-white shadow'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <User className="w-4 h-4" />
              My Profile
            </button>

            <button
              onClick={() => setActiveTab('idcard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeTab === 'idcard'
                  ? 'bg-emerald-800 text-white shadow'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              My ID Card
            </button>

            <button
              onClick={() => setActiveTab('meetings')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeTab === 'meetings'
                  ? 'bg-emerald-800 text-white shadow'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4" />
                Meetings
              </div>
              {meetings.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 font-extrabold">
                  {meetings.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('updates')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeTab === 'updates'
                  ? 'bg-emerald-800 text-white shadow'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4" />
                Latest Updates
              </div>
              {updates.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-extrabold">
                  {updates.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('status')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeTab === 'status'
                  ? 'bg-emerald-800 text-white shadow'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Account Status
            </button>

            <div className="pt-2 border-t mt-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 transition text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          {/* TAB 1: MY PROFILE */}
          {activeTab === 'profile' && member && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 border-b pb-6">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-24 h-28 rounded-xl overflow-hidden border-2 border-emerald-700 bg-slate-100 relative shadow-md group">
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                    {uploadingPhoto && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center text-white">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  {/* Photo Change Action */}
                  <input
                    type="file"
                    ref={photoInputRef}
                    accept="image/*"
                    onChange={handleProfilePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => photoInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Change Profile Picture"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {uploadingPhoto ? 'सुरक्षित हो रहा है...' : 'फ़ोटो बदलें'}
                  </button>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{member.name}</h2>
                    <span className="font-mono text-xs font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-md border border-emerald-200">
                      {member.code}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {member.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Son/Daughter/Wife of: <strong className="text-slate-800">{member.fatherName}</strong>
                  </p>
                  <p className="text-xs text-emerald-800 font-semibold pt-1">
                    Designation (पद): <strong className="text-emerald-950 font-bold">{formatDesignationDisplay(member.designation)}</strong> • Village {member.village}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('idcard')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 shadow transition"
                >
                  <CreditCard className="w-4 h-4" />
                  View ID Card
                </button>
              </div>

              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">
                    Official Member Code
                  </span>
                  <span className="font-mono text-sm font-extrabold text-slate-900">{member.code}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">
                    Designation (पद)
                  </span>
                  <span className="font-bold text-sm text-slate-900">{formatDesignationDisplay(member.designation)}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">
                    Registered Village
                  </span>
                  <span className="font-semibold text-sm text-slate-900">{member.village}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">
                    Education Qualification
                  </span>
                  <span className="font-semibold text-sm text-slate-900">{member.education}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">
                    Registered Mobile Number
                  </span>
                  <span className="font-mono font-semibold text-sm text-slate-900">{member.mobile}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">
                    Email Address
                  </span>
                  <span className="font-semibold text-sm text-slate-900">{member.email}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1 sm:col-span-2">
                  <span className="text-slate-500 font-bold uppercase tracking-wider block text-[10px]">
                    Residential Address
                  </span>
                  <span className="font-medium text-sm text-slate-900">{member.address}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MY ID CARD */}
          {activeTab === 'idcard' && member && (
            <div className="space-y-4">
              <IdCardView member={member} settings={settings} />
            </div>
          )}

          {/* TAB 3: MEETINGS */}
          {activeTab === 'meetings' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Scheduled Committee Meetings</h2>
                <p className="text-xs text-slate-500">
                  Official community assembly notices, dates, and locations for project-affected residents.
                </p>
              </div>

              {meetings.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                  <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No scheduled meetings at this time</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Meeting circulars will be published here by the executive council.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {meetings.map((m) => (
                    <div
                      key={m.id}
                      className="p-5 rounded-xl border border-slate-200 hover:border-emerald-600 bg-slate-50/70 hover:bg-white transition space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                        <h3 className="text-base font-bold text-slate-900">{m.title}</h3>
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full w-fit">
                          <Calendar className="w-3.5 h-3.5" />
                          {m.date} • {m.time}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <MapPin className="w-4 h-4 text-emerald-700" />
                        Location: {m.location}
                      </div>

                      <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                        {m.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LATEST UPDATES */}
          {activeTab === 'updates' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Official Committee Updates</h2>
                <p className="text-xs text-slate-500">
                  Latest circulars, legal announcements, and campaign news published by the Samiti.
                </p>
              </div>

              {updates.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                  <Bell className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No updates published yet</p>
                  <p className="text-xs text-slate-500 mt-1">Official circulars will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {updates.map((u) => (
                    <div
                      key={u.id}
                      className="p-5 rounded-xl border border-slate-200 hover:border-emerald-600 bg-slate-50/70 hover:bg-white transition space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 border-b pb-2">
                        <h3 className="text-base font-bold text-slate-900">{u.title}</h3>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {new Date(u.date).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                        {u.description}
                      </p>

                      {u.imageUrl && (
                        <div className="rounded-lg overflow-hidden border border-slate-200 max-w-md">
                          <img src={u.imageUrl} alt={u.title} className="w-full h-auto object-cover" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ACCOUNT STATUS */}
          {activeTab === 'status' && member && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Membership Accreditation Status</h2>
                <p className="text-xs text-slate-500">
                  Real-time status verified against the central committee database.
                </p>
              </div>

              <div className="p-6 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-emerald-950">Accredited & Active Member</h3>
                    <p className="text-xs text-emerald-800">
                      Your membership record is certified and active on the central ledger.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-emerald-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-emerald-900 font-bold block text-[10px] uppercase">Member Code</span>
                    <span className="font-mono font-black text-sm text-emerald-950">{member.code}</span>
                  </div>
                  <div>
                    <span className="text-emerald-900 font-bold block text-[10px] uppercase">Accredited On</span>
                    <span className="font-medium text-slate-800">
                      {member.approvedAt ? new Date(member.approvedAt).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-900 font-bold block text-[10px] uppercase">Approved By</span>
                    <span className="font-medium text-slate-800 truncate block">
                      {member.approvedBy || 'Central Admin'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <strong className="text-slate-800 block">Digital Verification Guarantee:</strong>
                <p>
                  Your assigned Member Code ({member.code}) can be verified against the official Samiti ledger anytime.
                  If any details need revision, please request your village representative or secretary.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
