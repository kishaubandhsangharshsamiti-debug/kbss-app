import React, { useState, useEffect } from 'react';
import {
  MemberService,
  SettingsService,
  CounterService,
  AFFECTED_VILLAGES,
  ALL_DESIGNATIONS,
  DESIGNATION_OPTIONS,
  EDUCATION_OPTIONS,
  formatDesignationDisplay,
  formatCardCode,
  getRoleForDesignation
} from '../../services/db';
import { MemberRecord, CommitteeSettings, UserRole } from '../../types';
import { IdCardView } from '../../components/IdCardView';
import { compressImage } from '../../utils/imageCompressor';
import {
  Users,
  Search,
  Eye,
  Edit2,
  Trash2,
  ShieldCheck,
  Slash,
  CheckCircle2,
  CreditCard,
  Camera,
  X,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ManageMembers: React.FC = () => {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [settings, setSettings] = useState<CommitteeSettings>({
    committeeName: 'Kishau Bandh Sangharsh Samiti',
    logoUrl: '',
    presidentName: '',
    presidentSignatureUrl: '',
    adminName: '',
    adminSignatureUrl: '',
    updatedAt: ''
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [designationFilter, setDesignationFilter] = useState<string>('');

  // Modals
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const [modalMode, setModalMode] = useState<'CARD' | 'EDIT' | 'DELETE' | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editFatherName, setEditFatherName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editVillage, setEditVillage] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editEducation, setEditEducation] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('MEMBER');
  const [editCode, setEditCode] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubMem = MemberService.subscribe((list) => {
      setMembers(list);
      setLoading(false);
      // Keep selectedMember up to date if modal is open
      setSelectedMember((prev) => {
        if (!prev) return null;
        return list.find((m) => m.id === prev.id) || prev;
      });
    });
    const unsubSet = SettingsService.subscribe((s) => setSettings(s));

    return () => {
      unsubMem();
      unsubSet();
    };
  }, []);

  const filteredMembers = members.filter((m) => {
    if (villageFilter && m.village !== villageFilter) return false;
    if (roleFilter && m.role !== roleFilter) return false;
    if (designationFilter) {
      const matchDesig = (m.designation || '').toLowerCase();
      const targetDesig = designationFilter.toLowerCase();
      if (!matchDesig.includes(targetDesig) && !targetDesig.includes(matchDesig)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = m.name?.toLowerCase().includes(q);
      const matchCode = m.code?.toLowerCase().includes(q);
      const matchMobile = m.mobile?.includes(q);
      const matchEmail = m.email?.toLowerCase().includes(q);
      const matchVillage = m.village?.toLowerCase().includes(q);
      const matchDesig = m.designation?.toLowerCase().includes(q);
      return matchName || matchCode || matchMobile || matchEmail || matchVillage || matchDesig;
    }
    return true;
  });

  const openEditModal = (m: MemberRecord) => {
    setSelectedMember(m);
    setEditName(m.name || '');
    setEditFatherName(m.fatherName || '');
    setEditDesignation(m.designation || '');
    setEditVillage(m.village || '');
    setEditMobile(m.mobile || '');
    setEditEducation(m.education || '');
    setEditAddress(m.address || '');
    setEditRole(m.role || 'MEMBER');
    setEditCode(m.code || '');
    setEditPhotoUrl(m.photoUrl || '');
    setModalMode('EDIT');
  };

  const handleDesignationSelect = (newDesig: string) => {
    setEditDesignation(newDesig);
    const autoRole = getRoleForDesignation(newDesig);
    setEditRole(autoRole);
    if (selectedMember) {
      const formatted = formatCardCode(selectedMember.code, newDesig, autoRole);
      setEditCode(formatted);
    }
  };

  const handleRegenerateCode = async () => {
    try {
      const next = await CounterService.getNextCode(editRole, editDesignation);
      setEditCode(next);
      toast.success(`Generated Standard Code: ${next}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate code');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    const toastId = toast.loading('Optimizing member photo...');
    try {
      const compressed = await compressImage(file, {
        maxWidth: 350,
        maxHeight: 400,
        quality: 0.82,
        preserveTransparency: false
      });
      setEditPhotoUrl(compressed);
      toast.dismiss(toastId);
      toast.success('Photo updated & optimized for ID card');
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Failed to process photo');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setSaving(true);
    try {
      const finalDesignation = editDesignation.trim() || 'General Member / सामान्य सदस्य';
      const autoRole = editRole || getRoleForDesignation(finalDesignation);
      const formattedCode = formatCardCode(editCode.trim() || selectedMember.code, finalDesignation, autoRole);

      await MemberService.update(selectedMember.id, {
        name: editName.trim(),
        fatherName: editFatherName.trim(),
        designation: finalDesignation,
        village: editVillage.trim(),
        mobile: editMobile.trim(),
        education: editEducation.trim(),
        address: editAddress.trim(),
        role: autoRole,
        code: formattedCode,
        photoUrl: editPhotoUrl
      });
      toast.success('Member record and designation updated successfully');
      setModalMode(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update member');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (m: MemberRecord) => {
    const isCurrentlyActive = m.status === 'APPROVED' || m.status === 'ACTIVE';
    const newStatus = isCurrentlyActive ? 'DISABLED' : 'APPROVED';
    try {
      await MemberService.setStatus(m.id, newStatus);
      toast.success(`Member status set to ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;
    setSaving(true);
    try {
      await MemberService.delete(selectedMember.id);
      toast.success(`Member record removed from central ledger`);
      setModalMode(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Accredited Member Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            View, search, edit, inspect dynamic ID cards, or disable member records.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, member code (e.g. 1 or 0.001), village, mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700"
          />
        </div>

        <div className="w-full sm:w-44">
          <select
            value={villageFilter}
            onChange={(e) => setVillageFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700"
          >
            <option value="">All Villages</option>
            {AFFECTED_VILLAGES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-44">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700"
          >
            <option value="">All Roles (सभी पद प्रकार)</option>
            <option value="MEMBER">General Member</option>
            <option value="OFFICE_BEARER">Office Bearer</option>
            <option value="PRESIDENT">President</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </div>

        <div className="w-full sm:w-56">
          <select
            value={designationFilter}
            onChange={(e) => setDesignationFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 font-medium"
          >
            <option value="">All Designations (सभी पद)</option>
            {ALL_DESIGNATIONS.map((d) => (
              <option key={d.id} value={d.english}>
                {d.id}. {d.english} — {d.hindi}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No member records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Member Details</th>
                  <th className="p-3.5">Contact & Village</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5">
                      <span className="font-mono font-black text-sm bg-emerald-50 text-emerald-950 px-2 py-1 rounded border border-emerald-200">
                        {m.code}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          {m.photoUrl ? (
                            <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <Users className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block text-sm">{m.name}</span>
                          <span className="text-slate-500 text-[11px]">S/o {m.fatherName}</span>
                          <div className="mt-0.5">
                            <span className="text-emerald-950 bg-emerald-100/90 border border-emerald-300 font-bold px-1.5 py-0.5 rounded text-[10.5px] inline-block leading-tight shadow-2xs">
                              {formatDesignationDisplay(m.designation)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 text-slate-700">
                      <div className="space-y-0.5">
                        <div className="font-mono font-medium">{m.mobile}</div>
                        <div className="text-[11px] text-slate-500">Village {m.village}</div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                          m.role === 'PRESIDENT'
                            ? 'bg-amber-100 text-amber-900 border-amber-200'
                            : m.role === 'OFFICE_BEARER'
                            ? 'bg-blue-100 text-blue-900 border-blue-200'
                            : m.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-900 border-purple-200'
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        {m.role}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleStatus(m)}
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                          m.status === 'APPROVED' || m.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-rose-100 hover:text-rose-800'
                            : 'bg-rose-100 text-rose-800 hover:bg-emerald-100 hover:text-emerald-800'
                        }`}
                        title="Click to toggle active/disabled status"
                      >
                        {m.status === 'APPROVED' || m.status === 'ACTIVE' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <Slash className="w-3 h-3" />
                            Disabled
                          </>
                        )}
                      </button>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedMember(m);
                            setModalMode('CARD');
                          }}
                          className="p-1.5 text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                          title="View Dynamic ID Card"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => openEditModal(m)}
                          className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Member Information"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setSelectedMember(m);
                            setModalMode('DELETE');
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Member Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ID CARD MODAL */}
      {selectedMember && modalMode === 'CARD' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-50 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-300 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Dynamic Member ID Card: {selectedMember.name} ({selectedMember.code})
                </h3>
                <p className="text-xs text-slate-500">
                  Rendered live from central committee settings and verified database credentials.
                </p>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <IdCardView member={selectedMember} settings={settings} onClose={() => setModalMode(null)} />
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {selectedMember && modalMode === 'EDIT' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Edit Member Record ({selectedMember.code})
              </h3>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Father's Name</label>
                  <input
                    type="text"
                    required
                    value={editFatherName}
                    onChange={(e) => setEditFatherName(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Designation (पद चयन)
                  </label>
                  <select
                    value={
                      ALL_DESIGNATIONS.some(
                        (d) =>
                          d.title === editDesignation ||
                          d.english.toLowerCase() === editDesignation.toLowerCase() ||
                          d.hindi === editDesignation
                      )
                        ? (ALL_DESIGNATIONS.find(
                            (d) =>
                              d.title === editDesignation ||
                              d.english.toLowerCase() === editDesignation.toLowerCase() ||
                              d.hindi === editDesignation
                          )?.title || editDesignation)
                        : 'CUSTOM'
                    }
                    onChange={(e) => {
                      if (e.target.value !== 'CUSTOM') {
                        handleDesignationSelect(e.target.value);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs mb-1.5"
                  >
                    {ALL_DESIGNATIONS.map((d) => (
                      <option key={d.id} value={d.title}>
                        {d.id}. {d.english} — {d.hindi}
                      </option>
                    ))}
                    <option value="CUSTOM">Custom / Other Designation (अन्य पद)</option>
                  </select>
                  <input
                    type="text"
                    value={editDesignation}
                    onChange={(e) => handleDesignationSelect(e.target.value)}
                    placeholder="Or type custom designation..."
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Role Type (भूमिका)</label>
                  <select
                    value={editRole}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setEditRole(newRole);
                      if (selectedMember) {
                        setEditCode(formatCardCode(selectedMember.code, editDesignation, newRole));
                      }
                    }}
                    className="w-full px-3 py-1.5 border rounded-lg bg-white"
                  >
                    <option value="MEMBER">General Member (सामान्य सदस्य)</option>
                    <option value="OFFICE_BEARER">Office Bearer (पदाधिकारी)</option>
                    <option value="PRESIDENT">President (अध्यक्ष)</option>
                    <option value="ADMIN">Administrator (व्यवस्थापक)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Membership Code (KBSS-पद-क्रमांक)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    placeholder="e.g. KBSS-ADM-001, KBSS-PRES-001..."
                    className="flex-1 px-3 py-1.5 border rounded-lg font-mono font-bold text-emerald-950 bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    className="px-3 py-1.5 text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg border border-emerald-300 transition shrink-0 cursor-pointer"
                    title="Generate standard code for this designation"
                  >
                    Auto-Format Code
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Village</label>
                  <input
                    type="text"
                    required
                    list="admin-village-suggestions"
                    value={editVillage}
                    onChange={(e) => setEditVillage(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg"
                    placeholder="Enter village name"
                  />
                  <datalist id="admin-village-suggestions">
                    {AFFECTED_VILLAGES.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mobile</label>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Residential Address</label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Education Qualification</label>
                <select
                  value={editEducation}
                  onChange={(e) => setEditEducation(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg"
                >
                  {EDUCATION_OPTIONS.map((ed) => (
                    <option key={ed} value={ed}>
                      {ed}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Update Photo</label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-14 rounded border bg-slate-50 overflow-hidden shrink-0">
                    {editPhotoUrl && <img src={editPhotoUrl} alt="Photo" className="w-full h-full object-cover" />}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="text-xs file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-100"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition shadow disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {selectedMember && modalMode === 'DELETE' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900">
              Confirm Delete Member Record
            </h3>
            <p className="text-slate-600">
              Are you sure you want to permanently delete member <strong>{selectedMember.name}</strong> ({selectedMember.code})?
              This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleDeleteMember}
                className="px-4 py-2 font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition shadow disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
