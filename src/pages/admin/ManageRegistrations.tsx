import React, { useState, useEffect } from 'react';
import {
  RegistrationService,
  AFFECTED_VILLAGES,
  formatDesignationDisplay,
  getRoleForDesignation
} from '../../services/db';
import {
  RegistrationRequest,
  RequestStatus,
  UserRole
} from '../../types';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Camera,
  Mail,
  Phone,
  MapPin,
  Clock,
  RefreshCw,
  Edit3,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ManageRegistrations: React.FC = () => {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeStatusTab, setActiveStatusTab] = useState<RequestStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [villageFilter, setVillageFilter] = useState('');

  // Modals state
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [modalMode, setModalMode] = useState<'VIEW' | 'APPROVE' | 'REJECT' | 'CORRECTION' | null>(null);

  // Action Form States
  const [approvalRole, setApprovalRole] = useState<UserRole>('MEMBER');
  const [approvalCustomCode, setApprovalCustomCode] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [correctionMsg, setCorrectionMsg] = useState('');
  const [selectedCorrectionFields, setSelectedCorrectionFields] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const unsub = RegistrationService.subscribe((list) => {
      setRequests(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const CORRECTION_FIELD_OPTIONS = [
    'Full Name',
    "Father's / Husband's Name",
    'Mobile Number',
    'Email Address',
    'Residential Address',
    'Village',
    'Designation',
    'Education Qualification',
    'Applicant Photo'
  ];

  const filteredRequests = requests.filter((r) => {
    if (activeStatusTab !== 'ALL' && r.status !== activeStatusTab) return false;
    if (villageFilter && r.village !== villageFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.name?.toLowerCase().includes(q);
      const matchEmail = r.email?.toLowerCase().includes(q);
      const matchMobile = r.mobile?.includes(q);
      const matchVillage = r.village?.toLowerCase().includes(q);
      const matchDesig = r.designation?.toLowerCase().includes(q);
      return matchName || matchEmail || matchMobile || matchVillage || matchDesig;
    }
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const correctionCount = requests.filter((r) => r.status === 'CORRECTION_REQUIRED').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  const openModal = (req: RegistrationRequest, mode: 'VIEW' | 'APPROVE' | 'REJECT' | 'CORRECTION') => {
    setSelectedRequest(req);
    setModalMode(mode);
    setApprovalRole(getRoleForDesignation(req.designation));
    setApprovalCustomCode('');
    setRejectReason('');
    setCorrectionMsg('');
    setSelectedCorrectionFields([]);
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setModalMode(null);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const approvedMember = await RegistrationService.approve(selectedRequest.id, {
        role: approvalRole,
        customCode: approvalCustomCode.trim() || undefined,
        adminName: 'Administrator'
      });
      const code = typeof approvedMember === 'object' && approvedMember ? approvedMember.code : String(approvedMember);
      toast.success(`Application approved! Code ${code} allocated.`);
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    setActionLoading(true);
    try {
      await RegistrationService.reject(selectedRequest.id, rejectReason.trim());
      toast.success('Application rejected.');
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendCorrection = async () => {
    if (!selectedRequest) return;
    if (!correctionMsg.trim()) {
      toast.error('Please enter instructions for the applicant.');
      return;
    }
    setActionLoading(true);
    try {
      await RegistrationService.requestCorrection(
        selectedRequest.id,
        selectedCorrectionFields,
        correctionMsg.trim()
      );
      toast.success('Correction request sent to applicant.');
      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send correction request');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleCorrectionField = (field: string) => {
    setSelectedCorrectionFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Registration Management Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Process, approve, reject, or request corrections for incoming membership requests.
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveStatusTab('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeStatusTab === 'ALL'
              ? 'bg-slate-900 text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>All Applications</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-black">
            {requests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveStatusTab('PENDING')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeStatusTab === 'PENDING'
              ? 'bg-amber-600 text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Pending Approvals</span>
          {pendingCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-black">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveStatusTab('CORRECTION_REQUIRED')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeStatusTab === 'CORRECTION_REQUIRED'
              ? 'bg-blue-600 text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Correction Required</span>
          {correctionCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-200 text-blue-950 font-black">
              {correctionCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveStatusTab('APPROVED')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeStatusTab === 'APPROVED'
              ? 'bg-emerald-700 text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Approved</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 font-black">
            {approvedCount}
          </span>
        </button>

        <button
          onClick={() => setActiveStatusTab('REJECTED')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeStatusTab === 'REJECTED'
              ? 'bg-rose-700 text-white shadow'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Rejected</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-950 font-black">
            {rejectedCount}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by applicant name, mobile, email, designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700"
          />
        </div>

        <div className="w-full sm:w-48">
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
      </div>

      {/* Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No registration records found matching the current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Applicant</th>
                  <th className="p-3.5">Contact Details</th>
                  <th className="p-3.5">Village & Designation</th>
                  <th className="p-3.5">Registered On</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          {req.photoUrl ? (
                            <img src={req.photoUrl} alt={req.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <Camera className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block text-sm">{req.name}</span>
                          <span className="text-slate-500 text-[11px]">S/o {req.fatherName}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 text-slate-700">
                      <div className="space-y-0.5">
                        <div className="font-mono text-slate-900 font-semibold">{req.mobile}</div>
                        <div className="text-[11px] text-slate-500">{req.email}</div>
                      </div>
                    </td>

                    <td className="p-3.5 text-slate-700">
                      <div className="font-bold text-slate-900">{req.village}</div>
                      <div className="text-[11px] font-semibold text-emerald-800">
                        {formatDesignationDisplay(req.designation)}
                      </div>
                    </td>

                    <td className="p-3.5 text-slate-500 text-[11px]">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-3.5">
                      {req.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                      {req.status === 'CORRECTION_REQUIRED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          <AlertCircle className="w-3 h-3" />
                          Correction Required
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Approved
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openModal(req, 'VIEW')}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          title="View Full Application"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {req.status !== 'APPROVED' && (
                          <button
                            onClick={() => openModal(req, 'APPROVE')}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs transition"
                          >
                            Approve
                          </button>
                        )}

                        {req.status !== 'APPROVED' && req.status !== 'REJECTED' && (
                          <button
                            onClick={() => openModal(req, 'CORRECTION')}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 transition"
                          >
                            Correct
                          </button>
                        )}

                        {req.status !== 'APPROVED' && req.status !== 'REJECTED' && (
                          <button
                            onClick={() => openModal(req, 'REJECT')}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 transition"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ACTION & VIEW MODAL */}
      {selectedRequest && modalMode && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {modalMode === 'VIEW' && 'Application Details'}
                {modalMode === 'APPROVE' && 'Approve Registration & Allocate Code'}
                {modalMode === 'REJECT' && 'Reject Registration'}
                {modalMode === 'CORRECTION' && 'Send for Applicant Correction'}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Applicant Summary Banner */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-12 h-14 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                {selectedRequest.photoUrl ? (
                  <img src={selectedRequest.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-slate-400 m-auto mt-4" />
                )}
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-900 text-sm block">{selectedRequest.name}</span>
                <span className="text-slate-600 block">S/o: {selectedRequest.fatherName}</span>
                <span className="text-slate-500 font-mono">{selectedRequest.mobile} • {selectedRequest.village}</span>
              </div>
            </div>

            {/* MODE: VIEW */}
            {modalMode === 'VIEW' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Designation</span>
                    <span className="font-semibold text-slate-800">{selectedRequest.designation}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Education</span>
                    <span className="font-semibold text-slate-800">{selectedRequest.education}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Email</span>
                  <span className="font-medium text-slate-800">{selectedRequest.email}</span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Residential Address</span>
                  <span className="font-medium text-slate-800">{selectedRequest.address}, Village {selectedRequest.village}</span>
                </div>

                {selectedRequest.rejectionReason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900">
                    <strong className="block mb-1">Rejection Reason:</strong>
                    {selectedRequest.rejectionReason}
                  </div>
                )}

                {selectedRequest.correctionMessage && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
                    <strong className="block mb-1">Correction Requested:</strong>
                    {selectedRequest.correctionMessage}
                  </div>
                )}
              </div>
            )}

            {/* MODE: APPROVE */}
            {modalMode === 'APPROVE' && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-600">
                  Approving this request will automatically increment the sequential counter, assign an official
                  identification code, create the accredited member record, and enable their login.
                </p>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Role Accreditation
                  </label>
                  <select
                    value={approvalRole}
                    onChange={(e) => setApprovalRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="MEMBER">General Member (Code: 00001, 00002...)</option>
                    <option value="OFFICE_BEARER">Office Bearer (Code: 001, 002...)</option>
                    <option value="PRESIDENT">President (Official Leadership Code)</option>
                    <option value="ADMIN">Administrator (Administrative Console Access)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Optional Manual Code Override (Leave empty for automatic sequential code)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 005 or 00042"
                    value={approvalCustomCode}
                    onChange={(e) => setApprovalCustomCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleApprove}
                    className="px-4 py-2 font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition shadow disabled:opacity-50"
                  >
                    {actionLoading ? 'Allocating Code...' : 'Approve & Issue ID'}
                  </button>
                </div>
              </div>
            )}

            {/* MODE: REJECT */}
            {modalMode === 'REJECT' && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-600">
                  Please specify the reason for rejecting this application. The applicant will see this message
                  when attempting to sign in.
                </p>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Rejection Reason *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Applicant does not reside within the notified Kishau Dam submergence or rehabilitation zone."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-600"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleReject}
                    className="px-4 py-2 font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition shadow disabled:opacity-50"
                  >
                    {actionLoading ? 'Rejecting...' : 'Reject Application'}
                  </button>
                </div>
              </div>
            )}

            {/* MODE: CORRECTION */}
            {modalMode === 'CORRECTION' && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-600">
                  Select which items require update and provide detailed instructions for the applicant:
                </p>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">
                    Check Fields Requiring Correction
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CORRECTION_FIELD_OPTIONS.map((f) => {
                      const checked = selectedCorrectionFields.includes(f);
                      return (
                        <button
                          type="button"
                          key={f}
                          onClick={() => toggleCorrectionField(f)}
                          className={`p-2 text-left rounded-lg border text-xs font-semibold flex items-center justify-between transition ${
                            checked
                              ? 'bg-blue-50 border-blue-500 text-blue-900'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                          }`}
                        >
                          <span>{f}</span>
                          {checked && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Reviewer Instruction Note *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. The photo provided is blurry. Please upload a clear, front-facing passport photograph."
                    value={correctionMsg}
                    onChange={(e) => setCorrectionMsg(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleSendCorrection}
                    className="px-4 py-2 font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition shadow disabled:opacity-50"
                  >
                    {actionLoading ? 'Sending...' : 'Request Correction'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
