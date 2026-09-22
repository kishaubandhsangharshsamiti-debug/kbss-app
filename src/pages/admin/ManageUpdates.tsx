import React, { useState, useEffect } from 'react';
import { UpdateService } from '../../services/db';
import { UpdateItem } from '../../types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  Image,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  RefreshCw,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ManageUpdates: React.FC = () => {
  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<UpdateItem | null>(null);

  // Delete Confirmation State
  const [deletingUpdate, setDeletingUpdate] = useState<UpdateItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('Circular');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = UpdateService.subscribe((list) => {
      setUpdates(list);
      setLoading(false);
    }, false);
    return () => unsub();
  }, []);

  const openCreateModal = () => {
    setEditingUpdate(null);
    setTitle('');
    setDate(new Date().toISOString().slice(0, 10));
    setCategory('Official Circular');
    setDescription('');
    setImageUrl('');
    setPublished(true);
    setModalOpen(true);
  };

  const openEditModal = (u: UpdateItem) => {
    setEditingUpdate(u);
    setTitle(u.title);
    setDate(u.date);
    setCategory(u.category || 'Official Circular');
    setDescription(u.description);
    setImageUrl(u.imageUrl || '');
    setPublished(u.published ?? (u.status === 'PUBLISHED'));
    setModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Update title is required');
      return;
    }

    setSaving(true);
    try {
      if (editingUpdate) {
        await UpdateService.update(editingUpdate.id, {
          title: title.trim(),
          date,
          category,
          description: description.trim(),
          imageUrl,
          status: published ? 'PUBLISHED' : 'DRAFT',
          published
        });
        toast.success('Update circular revised');
      } else {
        await UpdateService.create({
          title: title.trim(),
          date,
          category,
          description: description.trim(),
          imageUrl,
          status: published ? 'PUBLISHED' : 'DRAFT',
          published
        });
        toast.success('New circular published to member dashboard');
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save update');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (u: UpdateItem) => {
    try {
      await UpdateService.update(u.id, { published: !u.published });
      toast.success(u.published ? 'Circular unpublished' : 'Circular published');
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUpdate) return;
    setDeleting(true);
    try {
      await UpdateService.delete(deletingUpdate.id);
      toast.success('Official circular deleted successfully');
      setDeletingUpdate(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete circular');
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
            Circulars & Official Updates
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Publish official announcements, legal memorandums, and council notices.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Post New Circular</span>
        </button>
      </div>

      {/* Updates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {updates.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No updates posted yet. Click "Post New Circular" to publish one.
          </div>
        ) : (
          updates.map((u) => (
            <div
              key={u.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm space-y-3 transition flex flex-col justify-between ${
                u.published ? 'border-slate-200 hover:border-emerald-500' : 'border-slate-200 opacity-75 bg-slate-50/50'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2 border-b pb-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {u.category || 'Circular'}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug mt-1">{u.title}</h3>
                  </div>
                  <button
                    onClick={() => handleTogglePublish(u)}
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      u.published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {u.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {u.published ? 'Published' : 'Draft'}
                  </button>
                </div>

                <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(u.date).toLocaleDateString()}
                </div>

                <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                  {u.description}
                </p>

                {u.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 max-h-48">
                    <img src={u.imageUrl} alt={u.title} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEditModal(u)}
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                  title="Edit Update"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingUpdate(u)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Delete Update"
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
                {editingUpdate ? 'Edit Circular Notice' : 'Post New Official Circular'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Circular Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Legal Advisory regarding Land Acquisition Compensation Notices"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Description & Content</label>
                <textarea
                  rows={4}
                  placeholder="Detailed text of circular, instructions for residents..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Circular Image / Attachment (Optional)</label>
                <div className="flex items-center gap-3">
                  {imageUrl && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border">
                      <img src={imageUrl} alt="Attached" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pubUpd"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-800"
                />
                <label htmlFor="pubUpd" className="font-bold text-slate-700">
                  Publish immediately to member dashboards
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
                  {saving ? 'Publishing...' : 'Save & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDialog
        isOpen={!!deletingUpdate}
        title="Delete Official Circular"
        message={`Are you sure you want to permanently delete "${deletingUpdate?.title}"? This circular will be removed from all member dashboards.`}
        confirmText={deleting ? 'Deleting...' : 'Delete Circular'}
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingUpdate(null)}
      />
    </div>
  );
};
