import { useState } from 'react';
import type { TextBox } from '../text-boxes/types';

type FeedbackType = 'bug' | 'suggestion' | 'code-share' | 'other';

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug report' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'code-share', label: 'Interesting code I built' },
  { value: 'other', label: 'Other' },
];

interface FeedbackModalProps {
  userCode: string;
  textBoxes: TextBox[];
  onClose: () => void;
}

export function FeedbackModal({ userCode, textBoxes, onClose }: FeedbackModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<FeedbackType>('suggestion');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus('submitting');
    try {
      const json = JSON.stringify({ userCode, textBoxes }, null, 2);
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, type, message, json }),
      });
      if (!res.ok) throw new Error('Server error');
      setStatus('success');
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const inputClass =
    'w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Send Feedback</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 2l12 12M14 2L2 14" />
            </svg>
          </button>
        </div>

        {status === 'success' ? (
          <div className="px-5 py-8 text-center">
            <p className="text-emerald-600 dark:text-emerald-400 font-medium text-sm mb-1">Thank you!</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Your feedback was submitted.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs text-gray-500 dark:text-gray-400">Name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Anonymous"
                  className={inputClass}
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs text-gray-500 dark:text-gray-400">Email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">Type</label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="feedback-type"
                      value={value}
                      checked={type === value}
                      onChange={() => setType(value)}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                placeholder="Describe the bug, suggestion, or what you built…"
                className={`${inputClass} resize-none`}
              />
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1">
              Your current code will be attached automatically.
            </p>

            {status === 'error' && (
              <p className="text-xs text-red-500">{errorMsg}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === 'submitting' || !message.trim()}
                className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {status === 'submitting' ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
