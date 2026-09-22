import React, { useState, useEffect } from 'react';
import {
  MemberService,
  SettingsService,
  CounterService,
  OFFICE_BEARER_DESIGNATIONS
} from '../../services/db';
import { MemberRecord, CommitteeSettings, UserRole } from '../../types';
import { IdCardView } from '../../components/IdCardView';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  Award,
  Plus,
  Search,
  CreditCard,
  UserCheck,
  Shield,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ManageOfficeBearers: React.FC = () => {
  const [allMembers, setAllMembers] = useState<MemberRecord[]>([]);
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

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Promote existing member modal
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [selectedMemberToPromote, setSelectedMemberToPromote] = useState<string>('');
  const [promoteDesignation, setPromoteDesignation] = useState(OFFICE_BEARER_DESIGNATIONS[0] || 'Vice President');
  const [promoteLoading, setPromoteLoading] = useState(false);

  // View ID Card modal
  const [cardMember, setCardMember] = useState<MemberRecord | null>(null);

  // Demote confirmation modal
  const [demotingOfficer, setDemotingOfficer] = useState<MemberRecord | null>(null);
  const [demoting, setDemoting] = useState(false);

  useEffect(() => {
    const unsubMem = MemberService.subscribe((list) => {
      setAllMembers(list);
      setLoading(false);
    });
    const unsubSet = SettingsService.subscribe((s) => setSettings(s));

    return () => {
      unsubMem();
      unsubSet();
    };
  }, []);

  const officeBearers = allMembers.filter(
    (m) =>
      m.role === 'OFFICE_BEARER' ||
      m.role === 'PRESIDENT' ||
      m.code.startsWith('0.') ||
      (m.code.length === 3 && /^\d{3}$/.test(m.code))
  );

  const generalMembers = allMembers.filter(
    (m) =>
      m.role === 'MEMBER' &&
      !m.code.includes('PRES') &&
      !m.code.includes('ADM') &&
      !m.code.includes('VP') &&
      !m.code.startsWith('0.')
  );

  const filteredOfficers = officeBearers.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.code?.toLowerCase().includes(q) ||
      m.designation?.toLowerCase().includes(q) ||
      m.village?.toLowerCase().includes(q)
    );
  });

  const handlePromoteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberToPromote) {
      toast.error('Please select a member to promote');
      return;
    }

    setPromoteLoading(true);
    try {
      // Generate sequential designation-specific code: e.g. KBSS-PRES-001, KBSS-VP-001
      const isPresident = promoteDesignation.toLowerCase().includes('president') && !promoteDesignation.toLowerCase().includes('vice');
      const role: UserRole = isPresident ? 'PRESIDENT' : 'OFFICE_BEARER';
      const nextCode = await CounterService.getNextCode(role, promoteDesignation);

      await MemberService.update(selectedMemberToPromote, {
        code: nextCode,
        role,
        designation: promoteDesignation
      });

      toast.success(`Member designated as ${promoteDesignation}! Assigned Code: ${nextCode}`);
      setPromoteModalOpen(false);
      setSelectedMemberToPromote('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to designate office bearer');
    } finally {
      setPromoteLoading(false);
    }
  };

  const handleConfirmDemote = async () => {
    if (!demotingOfficer) return;
    setDemoting(true);
    try {
      await MemberService.update(demotingOfficer.id, {
        role: 'MEMBER',
        designation: 'Member'
      });
      toast.success(`${demotingOfficer.name} reverted to general member.`);
      setDemotingOfficer(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to revert member');
    } finally {
      setDemoting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Executive Office Bearers Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Manage committee leadership, executive designations, and special series codes (`001`, `002`...).
          </p>
        </div>

        <button
          onClick={() => setPromoteModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Designate Office Bearer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search office bearers by name, code, designation, village..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Office Bearers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredOfficers.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
            <Award className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            No office bearers designated yet. You can promote approved members using the button above.
          </div>
        ) : (
          filteredOfficers.map((officer) => (
            <div
              key={officer.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400 shadow-sm p-5 flex flex-col justify-between transition space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-14 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  {officer.photoUrl ? (
                    <img src={officer.photoUrl} alt={officer.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <UserCheck className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {officer.code}
                    </span>
                    {officer.role === 'PRESIDENT' && (
                      <span className="text-[10px] font-extrabold bg-amber-500 text-slate-950 px-2 py-0.2 rounded">
                        President
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 truncate mt-1">{officer.name}</h3>
                  <p className="text-xs font-semibold text-amber-800 truncate">{officer.designation}</p>
                  <p className="text-[11px] text-slate-500 truncate">Village: {officer.village}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setCardMember(officer)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-amber-800"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  View ID Card
                </button>

                <button
                  onClick={() => setDemotingOfficer(officer)}
                  className="text-[11px] font-semibold text-slate-400 hover:text-rose-600"
                >
                  Revert to Member
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PROMOTE MODAL */}
      {promoteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Designate Office Bearer</h3>
              <button onClick={() => setPromoteModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePromoteMember} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                  Select Accredited Member *
                </label>
                <select
                  required
                  value={selectedMemberToPromote}
                  onChange={(e) => setSelectedMemberToPromote(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  <option value="">-- Choose Member --</option>
                  {generalMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.code}) - Village {m.village}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                  Executive Designation *
                </label>
                <select
                  required
                  value={promoteDesignation}
                  onChange={(e) => setPromoteDesignation(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  {OFFICE_BEARER_DESIGNATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                <span className="font-bold block mb-0.5">Automated Code Assignment:</span>
                This member will automatically receive the next sequential Leadership Code (e.g. 001, 002)
                and will be issued an updated executive ID Card.
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setPromoteModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={promoteLoading}
                  className="px-4 py-2 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow disabled:opacity-50"
                >
                  {promoteLoading ? 'Designating...' : 'Confirm Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ID CARD MODAL */}
      {cardMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-50 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-300 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Executive ID Card: {cardMember.name} ({cardMember.code})
              </h3>
              <button onClick={() => setCardMember(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <IdCardView member={cardMember} settings={settings} onClose={() => setCardMember(null)} />
          </div>
        </div>
      )}

      {/* CONFIRM REVERT MODAL */}
      <ConfirmDialog
        isOpen={!!demotingOfficer}
        title="Revert Office Bearer"
        message={`Are you sure you want to revert "${demotingOfficer?.name}" from ${demotingOfficer?.designation} back to General Member status?`}
        confirmText={demoting ? 'Reverting...' : 'Revert to Member'}
        cancelText="Cancel"
        variant="warning"
        onConfirm={handleConfirmDemote}
        onCancel={() => setDemotingOfficer(null)}
      />
    </div>
  );
};
