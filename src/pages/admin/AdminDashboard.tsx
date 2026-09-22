import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  Bell,
  Award,
  ArrowRight,
  Shield,
  CreditCard,
  UserCheck,
  AlertCircle,
  Plus,
  Sparkles
} from 'lucide-react';
import {
  RegistrationService,
  MemberService,
  MeetingService,
  UpdateService
} from '../../services/db';
import {
  RegistrationRequest,
  MemberRecord,
  MeetingItem,
  UpdateItem
} from '../../types';
import toast from 'react-hot-toast';

export const AdminDashboard: React.FC = () => {
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubReg = RegistrationService.subscribe((list) => setRegistrations(list));
    const unsubMem = MemberService.subscribe((list) => setMembers(list));
    const unsubMeet = MeetingService.subscribe((list) => setMeetings(list), false);
    const unsubUpd = UpdateService.subscribe((list) => setUpdates(list), false);

    setLoading(false);

    return () => {
      unsubReg();
      unsubMem();
      unsubMeet();
      unsubUpd();
    };
  }, []);

  const pendingRequests = registrations.filter((r) => r.status === 'PENDING');
  const correctionRequests = registrations.filter((r) => r.status === 'CORRECTION_REQUIRED');
  const officeBearers = members.filter((m) => m.role === 'OFFICE_BEARER' || m.role === 'PRESIDENT');

  const handleQuickApprove = async (req: RegistrationRequest) => {
    try {
      const approvedMember = await RegistrationService.approve(req.id, {
        role: 'MEMBER',
        adminName: 'Administrator'
      });
      const code = typeof approvedMember === 'object' && approvedMember ? approvedMember.code : String(approvedMember);
      toast.success(`Applicant ${req.name} approved! Assigned Code: ${code}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve application');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Administrative Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Real-time oversight of registrations, member accreditations, and community notices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/id-cards"
            title="Inspect, print, or download Administrator ID Card"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 border border-purple-300 text-purple-900 font-bold text-xs hover:bg-purple-100 transition shadow-xs"
          >
            <CreditCard className="w-3.5 h-3.5 text-purple-700" />
            <span>Admin ID Card</span>
          </Link>

          <Link
            to="/admin/registrations"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 shadow transition"
          >
            <UserCheck className="w-4 h-4" />
            <span>Review Applications ({pendingRequests.length})</span>
          </Link>

          <Link
            to="/admin/meetings"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-xs hover:bg-slate-50 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Post Meeting</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Accredited Members
            </span>
            <div className="text-3xl font-black text-slate-900 mt-1">{members.length}</div>
            <span className="text-[11px] text-emerald-700 font-semibold">Active credentials</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Office Bearers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Office Bearers
            </span>
            <div className="text-3xl font-black text-amber-700 mt-1">{officeBearers.length}</div>
            <span className="text-[11px] text-amber-700 font-semibold">Special codes (0.001+)</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pending Approvals
            </span>
            <div className="text-3xl font-black text-rose-700 mt-1">{pendingRequests.length}</div>
            <span className="text-[11px] text-rose-700 font-semibold">Awaiting review</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Assemblies & Updates */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Meetings / Circulars
            </span>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {meetings.length} / {updates.length}
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">Published notices</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Pending Applications Quick Review Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              Recent Pending Registrations ({pendingRequests.length})
            </h2>
          </div>
          <Link
            to="/admin/registrations"
            className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
          >
            <span>Full Registration Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            No pending registration requests waiting for review!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingRequests.slice(0, 5).map((req) => (
              <div
                key={req.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    {req.photoUrl ? (
                      <img src={req.photoUrl} alt={req.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Users className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{req.name}</h4>
                    <p className="text-xs text-slate-500">
                      S/o {req.fatherName} • Village {req.village} • Mobile:{' '}
                      <span className="font-mono font-medium text-slate-700">{req.mobile}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQuickApprove(req)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Issue Code</span>
                  </button>

                  <Link
                    to="/admin/registrations"
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
                  >
                    Review Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Access Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
            <CreditCard className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">ID Cards Preview</h3>
          <p className="text-xs text-slate-500">
            Inspect ID card templates, QR verification payloads, and signature authorization rules.
          </p>
          <Link
            to="/admin/idcards"
            className="inline-block pt-1 text-xs font-bold text-purple-700 hover:underline"
          >
            Launch ID Card Engine →
          </Link>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Office Bearers Console</h3>
          <p className="text-xs text-slate-500">
            Manage committee leadership and assign sequential leadership codes (`0.001`, `0.002`, etc.).
          </p>
          <Link
            to="/admin/office-bearers"
            className="inline-block pt-1 text-xs font-bold text-teal-700 hover:underline"
          >
            Manage Office Bearers →
          </Link>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Committee Settings</h3>
          <p className="text-xs text-slate-500">
            Update committee logo, President signature, and Admin authorized signature dynamically.
          </p>
          <Link
            to="/admin/settings"
            className="inline-block pt-1 text-xs font-bold text-amber-700 hover:underline"
          >
            Open Settings →
          </Link>
        </div>
      </div>
    </div>
  );
};
