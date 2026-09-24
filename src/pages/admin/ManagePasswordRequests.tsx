import React, { useState, useEffect } from 'react';
import { PasswordResetService } from '../../services/db';
import { PasswordResetRequest } from '../../types';
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  User,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  ShieldCheck,
  Check,
  X,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ManagePasswordRequests: React.FC = () => {
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedReq, setSelectedReq] = useState<PasswordResetRequest | null>(null);
  const [modalMode, setModalMode] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const unsub = PasswordResetService.subscribe((list) => {
      setRequests(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredRequests = requests.filter((r) => {
    if (activeTab !== 'ALL' && r.status !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.name?.toLowerCase().includes(q);
      const matchEmail = r.email?.toLowerCase().includes(q);
      const matchMobile = r.mobile?.includes(q);
      const matchCode = r.memberCode?.toLowerCase().includes(q);
      const matchVillage = r.village?.toLowerCase().includes(q);
      return matchName || matchEmail || matchMobile || matchCode || matchVillage;
    }
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  const handleApprove = async () => {
    if (!selectedReq) return;
    setActionLoading(true);
    try {
      await PasswordResetService.approve(selectedReq.id, 'Narendra Singh Tomar (Admin)');
      toast.success(
        `पासवर्ड रीसेट अनुरोध स्वीकृत! ${selectedReq.name} अब अपने नए पासवर्ड से लॉगिन कर सकेंगे।`
      );
      setModalMode(null);
      setSelectedReq(null);
    } catch (err: any) {
      toast.error(err.message || 'स्वीकृति में समस्या आई');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReq) return;
    setActionLoading(true);
    try {
      await PasswordResetService.reject(
        selectedReq.id,
        rejectReason.trim() || 'व्यवस्थापक द्वारा अनुरोध अस्वीकार किया गया',
        'Narendra Singh Tomar (Admin)'
      );
      toast.success('अनुरोध अस्वीकार कर दिया गया');
      setModalMode(null);
      setSelectedReq(null);
      setRejectReason('');
    } catch (err: any) {
      toast.error(err.message || 'अस्वीकार करने में समस्या आई');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="w-7 h-7 text-emerald-800" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Password Reset Requests
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            पासवर्ड रीसेट अनुरोधों की समीक्षा व अनुमोदन (Approval)। स्वीकृति के बाद सदस्य नए पासवर्ड से लॉगिन कर सकेंगे।
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">कुल अनुरोध</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{requests.length}</p>
          </div>
          <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
            <KeyRound className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">लंबित (Pending)</p>
            <p className="text-2xl font-black text-amber-950 mt-1">{pendingCount}</p>
          </div>
          <div className="p-3 bg-amber-100 rounded-xl text-amber-800">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">स्वीकृत (Approved)</p>
            <p className="text-2xl font-black text-emerald-950 mt-1">{approvedCount}</p>
          </div>
          <div className="p-3 bg-emerald-100 rounded-xl text-emerald-800">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">अस्वीकृत (Rejected)</p>
            <p className="text-2xl font-black text-rose-950 mt-1">{rejectedCount}</p>
          </div>
          <div className="p-3 bg-rose-100 rounded-xl text-rose-800">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            सभी ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'PENDING'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            लंबित ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            स्वीकृत ({approvedCount})
          </button>
          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'REJECTED'
                ? 'bg-rose-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            अस्वीकृत ({rejectedCount})
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="नाम, कोड, ईमेल, मोबाइल या ग्राम द्वारा खोजें..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 bg-slate-50 focus:bg-white"
          />
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-7 h-7 text-emerald-800 animate-spin mx-auto mb-2" />
            <p className="text-xs">अनुरोध लोड किए जा रहे हैं...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <KeyRound className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">कोई पासवर्ड रीसेट अनुरोध नहीं मिला</p>
            <p className="text-xs text-slate-500 mt-1">
              वर्तमान फ़िल्टर या खोज के अनुसार कोई रिकॉर्ड उपलब्ध नहीं है।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">सदस्य (Member)</th>
                  <th className="py-3 px-4">संपर्क (Contact)</th>
                  <th className="py-3 px-4">ग्राम (Village)</th>
                  <th className="py-3 px-4">दिनांक (Date)</th>
                  <th className="py-3 px-4">स्थिति (Status)</th>
                  <th className="py-3 px-4 text-right">कार्यवाही (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                          <User className="w-4 h-4 text-emerald-800" />
                          <span>{req.name}</span>
                        </div>
                        {req.memberCode && (
                          <span className="font-mono text-[10px] font-black bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                            {req.memberCode}
                          </span>
                        )}
                        {req.note && (
                          <p className="text-[11px] text-slate-500 mt-1 italic">
                            "{req.note}"
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 space-y-0.5 text-slate-600">
                      {req.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{req.email}</span>
                        </div>
                      )}
                      {req.mobile && (
                        <div className="flex items-center gap-1 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{req.mobile}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold">{req.village || 'N/A'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString('hi-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      }) : 'N/A'}
                    </td>

                    <td className="py-3 px-4">
                      {req.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-700" />
                          लंबित (Pending)
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          स्वीकृत (Approved)
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                          <XCircle className="w-3 h-3 text-rose-700" />
                          अस्वीकृत (Rejected)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setModalMode('APPROVE');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>स्वीकृत करें (Approve)</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setModalMode('REJECT');
                              setRejectReason('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs transition border border-rose-300"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>अस्वीकार</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          {req.status === 'APPROVED'
                            ? `स्वीकृत द्वारा: ${req.approvedBy || 'Admin'}`
                            : `कारण: ${req.rejectionReason || 'N/A'}`}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* APPROVAL CONFIRMATION MODAL */}
      {modalMode === 'APPROVE' && selectedReq && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-emerald-800">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="text-base font-bold text-slate-900">
                  पासवर्ड रीसेट स्वीकृति (Approve Request)
                </h3>
              </div>
              <button
                onClick={() => {
                  setModalMode(null);
                  setSelectedReq(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <p className="font-bold text-slate-900 text-sm">{selectedReq.name}</p>
              {selectedReq.memberCode && (
                <p className="text-emerald-900 font-bold font-mono">
                  सदस्य कोड: {selectedReq.memberCode}
                </p>
              )}
              <p className="text-slate-600">ईमेल: {selectedReq.email}</p>
              <p className="text-slate-600">मोबाइल: {selectedReq.mobile}</p>
              {selectedReq.village && <p className="text-slate-600">ग्राम: {selectedReq.village}</p>}
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
              <p className="font-bold">✓ इस कार्यवाही से क्या होगा:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-emerald-900">
                <li>सदस्य का नया पासवर्ड सक्रिय (Activate) हो जाएगा।</li>
                <li>सदस्य तुरंत अपने नए पासवर्ड से पोर्टल पर लॉगिन कर सकेंगे।</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalMode(null);
                  setSelectedReq(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleApprove}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>स्वीकृत हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>स्वीकृत करें (Approve Now)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {modalMode === 'REJECT' && selectedReq && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-rose-800">
                <XCircle className="w-6 h-6" />
                <h3 className="text-base font-bold text-slate-900">
                  अनुरोध अस्वीकार करें (Reject Request)
                </h3>
              </div>
              <button
                onClick={() => {
                  setModalMode(null);
                  setSelectedReq(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-slate-900">{selectedReq.name}</p>
              <p className="text-slate-600">{selectedReq.email} • {selectedReq.mobile}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                अस्वीकृति का कारण (Reason for Rejection)
              </label>
              <textarea
                rows={3}
                placeholder="उदा. जानकारी सत्यापित नहीं हो पाई अथवा विवरण मेल नहीं खा रहा है..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalMode(null);
                  setSelectedReq(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                रद्द करें
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleReject}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg transition disabled:opacity-50"
              >
                {actionLoading ? 'अस्वीकार हो रहा है...' : 'अस्वीकार करें'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
