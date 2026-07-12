import { X, AlertCircle } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size] || 'max-w-lg';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal w-full ${sizeClass}`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function ErrorCallout({ message }) {
  if (!message) return null;
  return (
    <div className="error-callout">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal max-w-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-slate-400 text-sm mb-6">{message}</p>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button
              className={danger ? 'btn-danger' : 'btn-primary'}
              onClick={() => { onConfirm(); onClose(); }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
