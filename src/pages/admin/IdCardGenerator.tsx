import React, { useState, useEffect } from 'react';
import { MemberService, SettingsService } from '../../services/db';
import { MemberRecord, CommitteeSettings } from '../../types';
import { IdCardView } from '../../components/IdCardView';
import {
  CreditCard,
  Search,
  ShieldCheck,
  CheckCircle2,
  Users,
  Info
} from 'lucide-react';

export const IdCardGenerator: React.FC = () => {
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
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);

  useEffect(() => {
    const unsubMem = MemberService.subscribe((list) => {
      setMembers(list);
      if (list.length > 0) {
        setSelectedMemberId((current) => {
          if (current && list.some((m) => m.id === current)) return current;
          // Prioritize Admin (Narendra Singh Tomar)
          const adminMem = list.find((m) => m.role === 'ADMIN' || m.code === 'ADM-001' || m.name.includes('Narendra'));
          const selected = adminMem || list[0];
          setSelectedMember(selected);
          return selected.id;
        });
      }
    });
    const unsubSet = SettingsService.subscribe((s) => setSettings(s));

    return () => {
      unsubMem();
      unsubSet();
    };
  }, []);

  const handleSelect = (id: string) => {
    setSelectedMemberId(id);
    const m = members.find((item) => item.id === id) || null;
    setSelectedMember(m);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Dynamic ID Card Engine & Authorization
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Real-time inspection of member, office bearer, president, and administrator ID credentials.
          </p>
        </div>
      </div>

      {/* Signature Rules Info Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md space-y-3">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Strict Council Signature Rules Verification</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <strong className="text-amber-300 block mb-1">Admin ID Card:</strong>
            Displays President's signature ONLY. Does not self-sign.
          </div>
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <strong className="text-amber-300 block mb-1">President ID Card:</strong>
            Displays Admin authorized signature ONLY.
          </div>
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <strong className="text-emerald-400 block mb-1">All Member & Officer Cards:</strong>
            Displays BOTH President & Admin signatures.
          </div>
        </div>
      </div>

      {/* Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-4">
        <div className="w-full sm:w-80">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
            Select Member Record to Preview
          </label>
          <select
            value={selectedMemberId}
            onChange={(e) => handleSelect(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
          >
            {members.length === 0 && <option value="">No approved members</option>}
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                [{m.code}] {m.name} - {m.designation} ({m.role})
              </option>
            ))}
          </select>
        </div>

        {/* Quick select pills */}
        <div className="flex flex-wrap items-center gap-2">
          {members.some((m) => m.role === 'ADMIN' || m.code === 'ADM-001') && (
            <button
              onClick={() => {
                const adminMem = members.find((m) => m.role === 'ADMIN' || m.code === 'ADM-001');
                if (adminMem) handleSelect(adminMem.id);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-300 transition"
            >
              ★ Admin Card (Narendra Singh Tomar)
            </button>
          )}
          {members.some((m) => m.role === 'PRESIDENT' || m.code === '0.001') && (
            <button
              onClick={() => {
                const presMem = members.find((m) => m.role === 'PRESIDENT' || m.code === '0.001');
                if (presMem) handleSelect(presMem.id);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 transition"
            >
              ★ President Card (Shyam Singh Tomar)
            </button>
          )}
        </div>

        {selectedMember && (
          <div className="flex flex-wrap items-center gap-3 text-xs pt-3 sm:pt-4 ml-auto">
            <span className="font-bold text-slate-900">Active Record:</span>
            <span className="font-mono bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-black">
              {selectedMember.code}
            </span>
            <span className="text-slate-600 font-semibold">{selectedMember.designation}</span>
            <span className="text-slate-500 font-medium">Village: {selectedMember.village}</span>
          </div>
        )}
      </div>

      {/* Live Preview Card */}
      {selectedMember ? (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <IdCardView member={selectedMember} settings={settings} />
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          No member selected or no approved members in the database.
        </div>
      )}
    </div>
  );
};
