import React, { useState, useEffect } from 'react';
import { MeetingService } from '../../services/db';
import { MeetingItem } from '../../types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ManageMeetings: React.FC = () => {
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingItem | null>(null);

  // Delete State
  const [deletingMeeting, setDeletingMeeting] = useState<MeetingItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = MeetingService.subscribe((list) => {
      setMeetings(list);
      setLoading(false);
    }, false); // Load all meetings (published + unpublished) for admin
    return () => unsub();
  }, []);

  const openCreateModal = () => {
    setEditingMeeting(null);
    setTitle('');
    setDate('');
    setTime('');
    setLocation('Village Meloth Panchayat Bhavan');
    setDescription('');
    setPublished(true);
    setModalOpen(true);
  };

  const openEditModal = (m: MeetingItem) => {
    setEditingMeeting(m);
    setTitle(m.title);
    setDate(m.date);
    setTime(m.time);
    setLocation(m.location);
    setDescription(m.description);
    setPublished(m.published ?? (m.status === 'PUBLISHED'));
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date.trim()) {
      toast.error('Meeting title and date are required');
      return;
    }

    setSaving(true);
    try {
      if (editingMeeting) {
        await MeetingService.update(editingMeeting.id, {
          title: title.trim(),
          date: date.trim(),
          time: time.trim(),
          location: location.trim(),
          description: description.trim(),
          status: published ? 'PUBLISHED' : 'DRAFT',
          published
        });
        toast.success('Meeting updated');
      } else {
        await MeetingService.create({
          title: title.trim(),
          date: date.trim(),
          time: time.trim(),
          location: location.trim(),
          description: description.trim(),
          status: published ? 'PUBLISHED' : 'DRAFT',
          published
        });
        toast.success('Meeting scheduled and published');
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save meeting');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (m: MeetingItem) => {
    try {
      await MeetingService.update(m.id, { published: !m.published });
      toast.success(m.published ? 'Meeting unpublished' : 'Meeting published');
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingMeeting) return;
    setDeleting(true);
    try {
      await MeetingService.delete(deletingMeeting.id);
      toast.success('Meeting notice deleted successfully');
      setDeletingMeeting(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete meeting');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Assembly & Meeting Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Create, publish, and notify members about council assemblies and village meetings.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Assembly</span>
        </button>
      </div>

      {/* Meetings List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {meetings.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No assemblies scheduled yet. Click "Schedule New Assembly" to create one.
          </div>
        ) : (
          meetings.map((m) => (
            <div
              key={m.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm space-y-3 transition flex flex-col justify-between ${
                m.published ? 'border-slate-200 hover:border-emerald-500' : 'border-slate-200 opacity-75 bg-slate-50/50'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2 border-b pb-2">
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{m.title}</h3>
                  <button
                    onClick={() => handleTogglePublish(m)}
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      m.published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {m.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {m.published ? 'Published' : 'Draft'}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-semibold text-emerald-900">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    {m.date} • {m.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {m.location}
                  </span>
                </div>

                <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                  {m.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEditModal(m)}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                  title="Edit Meeting"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingMeeting(m)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Delete Meeting"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingMeeting ? 'Edit Assembly Notice' : 'Schedule New Committee Assembly'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Meeting Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Village Delegation Meeting on RFCTLARR 2013 Compensation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 11:00 AM"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assembly Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gram Meloth Panchayat Bhavan"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Agenda Points & Details</label>
                <textarea
                  rows={4}
                  placeholder="Points of discussion, affected villages invited, delegation representation..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pub"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-800"
                />
                <label htmlFor="pub" className="font-bold text-slate-700">
                  Publish immediately for logged-in members to view
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition shadow disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDialog
        isOpen={!!deletingMeeting}
        title="Delete Assembly Notice"
        message={`Are you sure you want to permanently delete the meeting notice "${deletingMeeting?.title}"?`}
        confirmText={deleting ? 'Deleting...' : 'Delete Meeting'}
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingMeeting(null)}
      />
    </div>
  );
};
