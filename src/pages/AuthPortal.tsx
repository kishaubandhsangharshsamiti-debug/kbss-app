import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  SettingsService,
  AFFECTED_VILLAGES,
  DESIGNATION_OPTIONS,
  EDUCATION_OPTIONS
} from '../services/db';
import { CommitteeSettings } from '../types';
import { compressImage } from '../utils/imageCompressor';
import {
  LogIn,
  UserPlus,
  Shield,
  KeyRound,
  Mail,
  Phone,
  Lock,
  User,
  MapPin,
  GraduationCap,
  Briefcase,
  Camera,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

type ActiveTab = 'login' | 'register' | 'admin';

interface AuthPortalProps {
  initialTab?: ActiveTab;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({ initialTab }) => {
  const navigate = useNavigate();
  const { loginWithEmailOrMobile, registerUser, resetPassword, currentUser, userAccount, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab || 'login');
  const [settings, setSettings] = useState<CommitteeSettings>({
    committeeName: 'Kishau Bandh Sangharsh Samiti',
    logoUrl: '',
    presidentName: '',
    presidentSignatureUrl: '',
    adminName: '',
    adminSignatureUrl: '',
    updatedAt: ''
  });

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Admin login form state
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regFatherName, setRegFatherName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regVillage, setRegVillage] = useState(AFFECTED_VILLAGES[0] || 'Meloth');
  const [regDesignation, setRegDesignation] = useState(DESIGNATION_OPTIONS[0] || 'Member');
  const [regEducation, setRegEducation] = useState(EDUCATION_OPTIONS[3] || 'Bachelor Degree / Graduate');
  const [regPhotoUrl, setRegPhotoUrl] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  // Status Modals & Dialogs
  const [statusMessage, setStatusMessage] = useState<{
    type: 'PENDING' | 'REJECTED' | 'CORRECTION_REQUIRED' | 'SUCCESS';
    title: string;
    description: string;
    rejectionReason?: string;
    correctionMessage?: string;
  } | null>(null);

  // Forgot password modal
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Support direct URL access to tabs (?tab=register or #register, ?tab=admin or #admin, etc.)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab')?.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    if (tabParam === 'register' || hash === '#register' || window.location.pathname === '/register') {
      setActiveTab('register');
    } else if (tabParam === 'admin' || hash === '#admin') {
      setActiveTab('admin');
    } else if (tabParam === 'login' || hash === '#login') {
      setActiveTab('login');
    }
  }, [initialTab]);

  // Load committee settings dynamically from Firestore
  useEffect(() => {
    const unsub = SettingsService.subscribe((s) => {
      setSettings(s);
    });
    return () => unsub();
  }, []);

  // Redirect if already authenticated and approved
  useEffect(() => {
    if (currentUser) {
      if (isAdmin) {
        navigate('/admin/dashboard');
      } else if (userAccount?.status === 'APPROVED') {
        navigate('/dashboard');
      }
    }
  }, [currentUser, isAdmin, userAccount, navigate]);

  // Handle Photo Upload (Convert to lightweight compressed Data URL for instant real-time synchronization)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, JPEG)');
      return;
    }

    const toastId = toast.loading('Optimizing photo for ID card...');
    try {
      const compressed = await compressImage(file, {
        maxWidth: 350,
        maxHeight: 400,
        quality: 0.82,
        preserveTransparency: false
      });
      setRegPhotoUrl(compressed);
      toast.dismiss(toastId);
      toast.success('Applicant photo selected & optimized');
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Failed to process photo. Please try another image.');
    }
  };

  // User Login Handler
  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword) {
      toast.error('Please enter your email or mobile number and password.');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await loginWithEmailOrMobile(loginIdentifier, loginPassword, false);

      if (res.status === 'ADMIN') {
        toast.success('Administrator authenticated');
        navigate('/admin/dashboard');
        return;
      }

      if (res.status === 'PENDING') {
        setStatusMessage({
          type: 'PENDING',
          title: 'Registration Pending Admin Approval',
          description: 'Your registration request has been submitted and is waiting for Admin approval. Once approved, your official Member Code and ID Card will be issued.'
        });
        return;
      }

      if (res.status === 'CORRECTION_REQUIRED') {
        setStatusMessage({
          type: 'CORRECTION_REQUIRED',
          title: 'Correction Requested by Admin',
          description: 'The administrator has requested updates to your registration application before final approval.',
          correctionMessage: res.correctionMessage
        });
        return;
      }

      if (res.status === 'REJECTED') {
        setStatusMessage({
          type: 'REJECTED',
          title: 'Registration Rejected',
          description: 'Your registration request has been reviewed and rejected by the administrator.',
          rejectionReason: res.rejectionReason
        });
        return;
      }

      if (res.status === 'APPROVED') {
        toast.success('Welcome back! Login successful.');
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid login credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Admin Login Handler
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminIdentifier.trim() || !adminPassword) {
      toast.error('Please enter administrator email or mobile and password.');
      return;
    }

    setAdminLoading(true);
    try {
      await loginWithEmailOrMobile(adminIdentifier, adminPassword, true);
      toast.success('Admin login successful.');
      navigate('/admin/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Unauthorized: Admin credentials required.');
    } finally {
      setAdminLoading(false);
    }
  };

  // User Registration Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!regName.trim()) return toast.error('Full Name is required.');
    if (!regFatherName.trim()) return toast.error("Father's/Husband's Name is required.");

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail.trim())) {
      return toast.error('Invalid email address format. Example: member@example.com');
    }

    // Indian mobile number validation (10 digits starting with 6, 7, 8, 9)
    const cleanMobile = regMobile.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return toast.error('Invalid Indian mobile number. Please enter a valid 10-digit number.');
    }

    if (!regAddress.trim()) return toast.error('Address is required.');
    if (!regVillage.trim()) return toast.error('Village selection is required.');
    if (!regEducation.trim()) return toast.error('Education qualification is required.');

    if (!regPhotoUrl) {
      return toast.error('Please upload an applicant photo for official ID card accreditation.');
    }

    if (regPassword.length < 6) {
      return toast.error('Password must be at least 6 characters in length.');
    }

    if (regPassword !== regConfirmPassword) {
      return toast.error('Passwords do not match. Please re-enter.');
    }

    setRegLoading(true);
    try {
      await registerUser({
        name: regName,
        fatherName: regFatherName,
        email: regEmail,
        mobile: cleanMobile,
        address: regAddress,
        village: regVillage,
        designation: regDesignation,
        education: regEducation,
        photoUrl: regPhotoUrl,
        password: regPassword
      });

      setStatusMessage({
        type: 'PENDING',
        title: 'Registration Submitted Successfully',
        description: 'Your registration request has been submitted and is waiting for Admin approval. The administrator will verify your credentials and assign your unique ID code.'
      });

      // Reset form
      setRegName('');
      setRegFatherName('');
      setRegEmail('');
      setRegMobile('');
      setRegAddress('');
      setRegPhotoUrl('');
      setRegPassword('');
      setRegConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Please check your information.');
    } finally {
      setRegLoading(false);
    }
  };

  // Forgot Password Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Please enter your registered email address or mobile number.');
      return;
    }

    setForgotLoading(true);
    try {
      const emailSentTo = await resetPassword(forgotEmail);
      toast.success(`Password reset link dispatched to ${emailSentTo}`);
      setForgotPasswordOpen(false);
      setForgotEmail('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send password reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        {/* Committee Branding Header */}
        <div className="text-center mb-6">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="mx-auto h-20 w-20 rounded-2xl object-cover shadow-lg border-2 border-emerald-700 bg-white"
            />
          ) : (
            <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-800 flex items-center justify-center shadow-lg border-2 border-emerald-600 text-white">
              <Shield className="w-9 h-9 text-amber-400" />
            </div>
          )}
          <h1 className="mt-3 text-2xl font-black text-slate-900 tracking-tight uppercase">
            {settings.committeeName || 'Kishau Bandh Sangharsh Samiti'}
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Gram Meloth Shambhar Kwanou • Central Administration & Member Portal
          </p>
        </div>

        {/* 3 Primary Options Bar */}
        <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 grid grid-cols-3 gap-1 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition ${
              activeTab === 'login'
                ? 'bg-emerald-800 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Login</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition ${
              activeTab === 'register'
                ? 'bg-emerald-800 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Registration</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition ${
              activeTab === 'admin'
                ? 'bg-slate-900 text-amber-400 shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin Login</span>
          </button>
        </div>

        {/* Main Card Container */}
        <div className="bg-white py-8 px-6 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-200">
          {/* TAB 1: USER LOGIN */}
          {activeTab === 'login' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Member Login</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Access your approved membership record, ID Card, meetings, and updates.
                </p>
              </div>

              <form onSubmit={handleUserLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Registered Email, Mobile Number or Member Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. member@gmail.com, 9876543210, or KBSS-MEM-00001"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-slate-50 focus:bg-white transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    You can log in using your registered email, 10-digit mobile number, or Member Code.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotPasswordOpen(true)}
                      className="text-xs font-semibold text-emerald-800 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-slate-50 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow text-sm font-bold text-white bg-emerald-800 hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-700 transition disabled:opacity-50"
                  >
                    {loginLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Verifying Credentials...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        Sign In to Member Portal
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-xs text-slate-600 hover:text-emerald-800"
                  >
                    Not registered yet? <strong className="underline text-emerald-800">Submit Membership Application</strong>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: USER REGISTRATION */}
          {activeTab === 'register' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Membership Registration</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Fill in all required details. Applications are reviewed and accredited by the Central Committee.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4 text-left">
                {/* Full Name & Father's Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Singh Tomar"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Father's / Husband's Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Late Shri Dayal Singh"
                      value={regFatherName}
                      onChange={(e) => setRegFatherName(e.target.value)}
                      className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Email & Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="member@example.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Mobile Number (10 Digits) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        value={regMobile}
                        onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ''))}
                        className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-slate-50 focus:bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Village & Designation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Village *
                    </label>
                    <select
                      value={regVillage}
                      onChange={(e) => setRegVillage(e.target.value)}
                      className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-slate-50 focus:bg-white"
                    >
                      {AFFECTED_VILLAGES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Designation Type *
                    </label>
                    <select
                      value={regDesignation}
                      onChange={(e) => setRegDesignation(e.target.value)}
                      className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-slate-50 focus:bg-white"
                    >
                      {DESIGNATION_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Education & Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Education Qualification *
                    </label>
                    <select
                      value={regEducation}
                      onChange={(e) => setRegEducation(e.target.value)}
                      className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-slate-50 focus:bg-white"
                    >
                      {EDUCATION_OPTIONS.map((ed) => (
                        <option key={ed} value={ed}>
                          {ed}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Residential Address *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="House No., Ward, Mohalla"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Applicant Photo Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Applicant Photo (For ID Card) *
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-20 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                      {regPhotoUrl ? (
                        <img src={regPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Clear passport-style photo. Formats: PNG, JPG (Max 2MB).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Create Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        placeholder="At least 6 characters"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="showPass"
                    checked={showRegPassword}
                    onChange={(e) => setShowRegPassword(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  <label htmlFor="showPass" className="text-xs text-slate-600">
                    Show Passwords
                  </label>
                </div>

                {/* Submit button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow text-sm font-bold text-white bg-emerald-800 hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-700 transition disabled:opacity-50"
                  >
                    {regLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Submitting Application...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Submit Registration Application
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-center text-slate-500">
                  By submitting, you certify that you are an affected resident/stakeholder of Kishau Dam Project area.
                </p>
              </form>
            </div>
          )}

          {/* TAB 3: ADMIN LOGIN */}
          {activeTab === 'admin' && (
            <div>
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 text-xs font-bold mb-2">
                  <Shield className="w-3.5 h-3.5 text-amber-700" />
                  Executive Admin Console
                </div>
                <h2 className="text-xl font-bold text-slate-900">Administrator Login</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enter administrator credentials to manage member approvals, designations, meetings, ID cards, and system settings.
                </p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Admin User ID (Email or Mobile)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Enter Admin Email or Mobile"
                      value={adminIdentifier}
                      onChange={(e) => setAdminIdentifier(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(adminIdentifier || 'kishaubandhsangharshsamiti@gmail.com');
                        setForgotPasswordOpen(true);
                      }}
                      className="text-xs font-semibold text-amber-800 hover:underline"
                    >
                      Forgot / Reset Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-slate-50 focus:bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={adminLoading}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow text-sm font-bold text-amber-400 bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition disabled:opacity-50"
                  >
                    {adminLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Authenticating Admin...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Access Executive Console
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-center text-slate-500 pt-1">
                  Access is restricted to authorized administrators of Kishau Bandh Sangharsh Samiti.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* STATUS NOTIFICATION MODAL */}
      {statusMessage && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center">
              {statusMessage.type === 'PENDING' && (
                <div className="bg-amber-100 text-amber-700 w-14 h-14 rounded-full flex items-center justify-center">
                  <Clock className="w-8 h-8" />
                </div>
              )}
              {statusMessage.type === 'CORRECTION_REQUIRED' && (
                <div className="bg-blue-100 text-blue-700 w-14 h-14 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8" />
                </div>
              )}
              {statusMessage.type === 'REJECTED' && (
                <div className="bg-rose-100 text-rose-700 w-14 h-14 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8" />
                </div>
              )}
              {statusMessage.type === 'SUCCESS' && (
                <div className="bg-emerald-100 text-emerald-700 w-14 h-14 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-900">{statusMessage.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{statusMessage.description}</p>

            {statusMessage.rejectionReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-left text-xs text-rose-900">
                <span className="font-bold block mb-0.5">Reason provided by Administrator:</span>
                {statusMessage.rejectionReason}
              </div>
            )}

            {statusMessage.correctionMessage && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-left text-xs text-blue-900">
                <span className="font-bold block mb-0.5">Administrator Note:</span>
                {statusMessage.correctionMessage}
              </div>
            )}

            <div className="pt-2">
              {statusMessage.type === 'CORRECTION_REQUIRED' ? (
                <button
                  type="button"
                  onClick={() => {
                    setStatusMessage(null);
                    navigate('/correction');
                  }}
                  className="w-full py-2.5 px-4 bg-blue-700 text-white rounded-lg font-bold text-sm hover:bg-blue-800 transition"
                >
                  Proceed to Correction Form
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStatusMessage(null)}
                  className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition"
                >
                  Understood
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD MODAL */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <KeyRound className="w-5 h-5 text-emerald-800" />
                <h3 className="text-base font-bold">Reset Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Enter your registered email address or mobile number. We will send a secure password reset link to your email.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Registered Email or Mobile
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. member@gmail.com or 9876543210"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="block w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition disabled:opacity-50"
                >
                  {forgotLoading ? 'Sending Link...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
