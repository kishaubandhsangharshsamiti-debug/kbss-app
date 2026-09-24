import React, { useState, useEffect } from 'react';
import {
  SettingsService,
  CounterService
} from '../../services/db';
import { CommitteeSettings } from '../../types';
import { compressImage } from '../../utils/imageCompressor';
import {
  Settings,
  Save,
  Upload,
  Shield,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  Hash,
  Award,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<CommitteeSettings>({
    committeeName: 'Kishau Bandh Sangharsh Samiti',
    logoUrl: '',
    presidentName: 'Shyam Singh Tomar',
    presidentSignatureUrl: '',
    adminName: 'Narendra Singh Tomar',
    adminSignatureUrl: '',
    updatedAt: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Counter values for inspection
  const [memberCounterVal, setMemberCounterVal] = useState<number | null>(null);
  const [officerCounterVal, setOfficerCounterVal] = useState<number | null>(null);

  useEffect(() => {
    const unsub = SettingsService.subscribe((s) => {
      setSettings(s);
      setLoading(false);
    });

    async function loadCounters() {
      const [mCount, oCount] = await Promise.all([
        CounterService.getCurrentMemberCounter(),
        CounterService.getCurrentOfficerCounter()
      ]);
      setMemberCounterVal(mCount);
      setOfficerCounterVal(oCount);
    }
    loadCounters();

    return () => unsub();
  }, []);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoUrl' | 'presidentSignatureUrl' | 'adminSignatureUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isLogo = field === 'logoUrl';
    const toastId = toast.loading('Optimizing image for ID card...');

    try {
      const compressed = await compressImage(file, {
        maxWidth: isLogo ? 350 : 350,
        maxHeight: isLogo ? 350 : 140,
        quality: 0.85,
        preserveTransparency: true
      });

      setSettings((prev) => ({
        ...prev,
        [field]: compressed
      }));
      toast.dismiss(toastId);
      toast.success('Image optimized & uploaded. Click Save Changes to apply.');
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Failed to process image. Please try another file.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading('Saving committee settings...');
    try {
      // Ensure all images are compressed before saving to Firestore to strictly satisfy the 1MB document limit
      let finalLogo = settings.logoUrl;
      let finalPresSig = settings.presidentSignatureUrl;
      let finalAdminSig = settings.adminSignatureUrl;

      if (finalLogo && finalLogo.length > 50000) {
        finalLogo = await compressImage(finalLogo, { maxWidth: 350, maxHeight: 350, quality: 0.85, preserveTransparency: true });
      }
      if (finalPresSig && finalPresSig.length > 35000) {
        finalPresSig = await compressImage(finalPresSig, { maxWidth: 350, maxHeight: 140, quality: 0.85, preserveTransparency: true });
      }
      if (finalAdminSig && finalAdminSig.length > 35000) {
        finalAdminSig = await compressImage(finalAdminSig, { maxWidth: 350, maxHeight: 140, quality: 0.85, preserveTransparency: true });
      }

      await SettingsService.update({
        committeeName: settings.committeeName.trim(),
        logoUrl: finalLogo,
        presidentName: (settings.presidentName || '').trim(),
        presidentSignatureUrl: finalPresSig,
        adminName: (settings.adminName || '').trim(),
        adminSignatureUrl: finalAdminSig
      });

      setSettings(prev => ({
        ...prev,
        logoUrl: finalLogo,
        presidentSignatureUrl: finalPresSig,
        adminSignatureUrl: finalAdminSig
      }));

      toast.dismiss(toastId);
      toast.success('Central Committee settings & signatures saved successfully! All ID cards updated.');
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-800" />
        <p className="text-xs font-semibold">Loading committee settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Committee Configuration & Dynamic Signatures
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
          Changes made here instantly update the committee branding and authorized signatures across all dynamic ID cards.
        </p>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Committee Identity */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 border-b pb-3">
            <Shield className="w-5 h-5 text-emerald-800" />
            <h3 className="text-base font-bold text-slate-900">Committee Identity & Official Logo</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Official Committee Name *
              </label>
              <input
                type="text"
                required
                value={settings.committeeName}
                onChange={(e) => setSettings({ ...settings, committeeName: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-700"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Printed on ID card front ribbon, headers, and certificates.
              </p>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Official Committee Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl border-2 border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt="Logo"
                      referrerPolicy="no-referrer"
                      onError={() => {
                        setSettings((prev) => ({ ...prev, logoUrl: '' }));
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Shield className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs transition">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'logoUrl')}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1">PNG or JPG (Max 2MB)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: President Details & Signature */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 border-b pb-3">
            <Award className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">President Authorization & Signature</h3>
              <p className="text-xs text-slate-500">
                Stamps the left signature on General Member and Office Bearer cards, and the sole signature on Admin cards.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                President Full Name *
              </label>
              <input
                type="text"
                required
                value={settings.presidentName}
                onChange={(e) => setSettings({ ...settings, presidentName: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl font-semibold"
              />
            </div>

            {/* Signature upload */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                President Digital Signature
              </label>
              <div className="flex items-center gap-4">
                <div className="w-36 h-14 rounded-xl border border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 p-1">
                  {settings.presidentSignatureUrl ? (
                    <img
                      src={settings.presidentSignatureUrl}
                      alt="President Signature"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-slate-400 italic font-serif">
                      {settings.presidentName || 'No Signature'}
                    </span>
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-xs transition">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Signature
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'presidentSignatureUrl')}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1">Transparent PNG recommended</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Admin Signatory Details & Signature */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 border-b pb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Administrator / Authorized Signatory</h3>
              <p className="text-xs text-slate-500">
                Stamps the right signature on Member/Officer cards, and the sole signature on President cards.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Admin Signatory Name *
              </label>
              <input
                type="text"
                required
                value={settings.adminName}
                onChange={(e) => setSettings({ ...settings, adminName: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl font-semibold"
              />
            </div>

            {/* Admin signature upload */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Admin Digital Signature
              </label>
              <div className="flex items-center gap-4">
                <div className="w-36 h-14 rounded-xl border border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 p-1">
                  {settings.adminSignatureUrl ? (
                    <img
                      src={settings.adminSignatureUrl}
                      alt="Admin Signature"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-slate-400 italic font-serif">
                      {settings.adminName || 'No Signature'}
                    </span>
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs cursor-pointer shadow-xs transition">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Signature
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'adminSignatureUrl')}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1">Transparent PNG recommended</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Counter Sequence Inspection */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Hash className="w-5 h-5 text-slate-700" />
            <h3 className="text-base font-bold text-slate-900">Sequential Counter Integrity Status</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block">
                  General Member Counter
                </span>
                <span className="font-mono text-xl font-black text-slate-900">
                  Current: {memberCounterVal ?? 0}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">Next code: {(memberCounterVal ?? 0) + 1}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-700">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block">
                  Office Bearer Counter
                </span>
                <span className="font-mono text-xl font-black text-amber-900">
                  Current: {String(officerCounterVal ?? 0).padStart(3, '0')}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Next code: {String((officerCounterVal ?? 0) + 1).padStart(3, '0')}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-900">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Synchronizing Settings...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save & Synchronize All ID Cards
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
