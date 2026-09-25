import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RegistrationService, AFFECTED_VILLAGES, ALL_DESIGNATIONS, DESIGNATION_OPTIONS, EDUCATION_OPTIONS } from '../services/db';
import { RegistrationRequest } from '../types';
import { compressImage } from '../utils/imageCompressor';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Camera,
  User,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';

export const CorrectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userAccount, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<RegistrationRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form editable state
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [village, setVillage] = useState('');
  const [designation, setDesignation] = useState('');
  const [education, setEducation] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => {
    async function loadRequest() {
      if (!currentUser?.email) {
        setLoading(false);
        return;
      }
      try {
        const req = await RegistrationService.getByEmail(currentUser.email);
        if (req) {
          setRequest(req);
          setName(req.name || '');
          setFatherName(req.fatherName || '');
          setEmail(req.email || '');
          setMobile(req.mobile || '');
          setAddress(req.address || '');
          setVillage(req.village || AFFECTED_VILLAGES[0]);
          setDesignation(req.designation || DESIGNATION_OPTIONS[0]);
          setEducation(req.education || EDUCATION_OPTIONS[0]);
          setPhotoUrl(req.photoUrl || '');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadRequest();
  }, [currentUser]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      if (e.target) e.target.value = '';
      return;
    }
    // Max 500 KB
    if (file.size > 500 * 1024) {
      toast.error('फ़ोटो का आकार अधिकतम 500KB होना चाहिए (Photo must not exceed 500KB)');
      if (e.target) e.target.value = '';
      return;
    }
    const toastId = toast.loading('Optimizing photo...');
    try {
      const compressed = await compressImage(file, {
        maxWidth: 350,
        maxHeight: 400,
        quality: 0.82,
        preserveTransparency: false
      });
      setPhotoUrl(compressed);
      toast.dismiss(toastId);
      toast.success('Updated applicant photo uploaded & optimized');
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Failed to process photo');
      if (e.target) e.target.value = '';
    }
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    if (!name.trim()) return toast.error('Full Name is required');
    if (!fatherName.trim()) return toast.error("Father's Name is required");
    if (!email.trim()) return toast.error('Email is required');
    if (!mobile.trim() || mobile.length !== 10) return toast.error('Valid 10-digit mobile number is required');
    if (!address.trim()) return toast.error('Address is required');
    if (!photoUrl) return toast.error('Applicant photo is required');

    setSubmitting(true);
    try {
      await RegistrationService.resubmit(request.id, {
        name: name.trim(),
        fatherName: fatherName.trim(),
        email: email.toLowerCase().trim(),
        mobile: mobile.trim(),
        address: address.trim(),
        village,
        designation,
        education,
        photoUrl
      });

      toast.success('Registration resubmitted for Admin approval');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resubmit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-700 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600">Loading your registration record...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">No Pending Correction Found</h3>
          <p className="text-xs text-slate-600">
            No registration requiring correction was identified for your current session.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 bg-emerald-800 text-white rounded-lg font-bold text-xs hover:bg-emerald-900"
          >
            Back to Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Sign Out & Return to Home
          </button>
          <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            Status: Correction Required
          </span>
        </div>

        {/* Administrator Notice Card */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-blue-900 font-bold">
            <AlertCircle className="w-5 h-5 text-blue-700" />
            <h3>Correction Requested by Administrator</h3>
          </div>
          <p className="text-xs text-blue-800">
            Please update the required fields as noted by the administrative reviewer, then click{' '}
            <strong>Resubmit for Approval</strong> below.
          </p>
          {request.correctionMessage && (
            <div className="p-3.5 bg-white border border-blue-200 rounded-xl text-xs text-slate-800 font-medium">
              <strong className="text-blue-950 block mb-1">Reviewer Instructions:</strong>
              "{request.correctionMessage}"
            </div>
          )}
          {request.correctionFields && request.correctionFields.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-blue-900">Fields to verify:</span>
              {request.correctionFields.map((f: string) => (
                <span key={f} className="text-[10px] font-bold uppercase bg-blue-200/70 text-blue-900 px-2 py-0.5 rounded">
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Correction Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
          <form onSubmit={handleResubmit} className="space-y-5">
            <h4 className="text-base font-bold text-slate-900 border-b pb-2">
              Update Registration Information
            </h4>

            {/* Photo update */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Applicant Photo *
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-24 rounded-lg border-2 border-slate-300 bg-slate-50 overflow-hidden shrink-0 shadow-sm">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Applicant" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handlePhotoUpload}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-800 hover:file:bg-blue-200 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Upload a clear photo if requested by the admin (अधिकतम साइज़: 500KB / Max 500KB).
                  </p>
                </div>
              </div>
            </div>

            {/* Full Name & Father Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Father's / Husband's Name *
                </label>
                <input
                  type="text"
                  required
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            {/* Email & Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number (10 Digits) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 font-mono"
                />
              </div>
            </div>

            {/* Village & Designation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Village *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    list="correction-village-suggestions"
                    placeholder="e.g. Mailoth / Shambhar / Kwanu"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                  />
                  <datalist id="correction-village-suggestions">
                    {AFFECTED_VILLAGES.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Designation (पद) *
                </label>
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 font-medium"
                >
                  {ALL_DESIGNATIONS.map((d) => (
                    <option key={d.id} value={d.title}>
                      {d.id}. {d.english} — {d.hindi}
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
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
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
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-4 border-t">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 transition disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Resubmitting to Admin...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Resubmit for Approval
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
