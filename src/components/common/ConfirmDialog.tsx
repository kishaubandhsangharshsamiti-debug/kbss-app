import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  needsInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  needsInput = false,
  inputLabel = 'Reason',
  inputPlaceholder = 'Enter reason...',
  onConfirm,
  onCancel,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (needsInput && !inputValue.trim()) {
      setInputError('Please provide a reason');
      return;
    }
    onConfirm(needsInput ? inputValue.trim() : undefined);
    setInputValue('');
    setInputError('');
  };

  const handleClose = () => {
    setInputValue('');
    setInputError('');
    onCancel();
  };

  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    primary: 'bg-blue-700 hover:bg-blue-800 text-white',
  };

  return (
    <div
      id="confirm-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div
        id="confirm-modal-box"
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-lg">
            <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-red-600' : 'text-amber-600'}`} />
            <span>{title}</span>
          </div>
          <button
            id="confirm-modal-close-btn"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          <p className="text-slate-600 text-sm leading-relaxed">{message}</p>

          {needsInput && (
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {inputLabel}
              </label>
              <textarea
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (inputError) setInputError('');
                }}
                rows={3}
                placeholder={inputPlaceholder}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900"
              />
              {inputError && <p className="text-xs text-red-600 mt-1">{inputError}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-3.5 bg-slate-50 border-t border-slate-100">
          <button
            id="confirm-modal-cancel-btn"
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            id="confirm-modal-action-btn"
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-xs ${variantStyles[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
