import { useState } from 'react';
import { Mail, Check, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { updateEmail } from '../services/authService';
import { useAuth } from '../context/AuthContext';

/**
 * EmailPreferenceForm — lets the user update their notification email.
 */
export default function EmailPreferenceForm() {
  const { user, refreshUser } = useAuth();
  const [email, setEmail]     = useState(user?.email || '');
  const [saved, setSaved]     = useState(false);

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: (newEmail) => updateEmail({ email: newEmail }),
    onSuccess: async () => {
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    reset();
    setSaved(false);
    mutate(email);
  };

  const isDirty = email !== user?.email;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notification email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            className="input pl-9"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setSaved(false); }}
            placeholder="you@example.com"
            required
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Price-drop alerts will be sent to this address.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600">
          {error.response?.data?.message || 'Failed to update email.'}
        </p>
      )}

      <button
        type="submit"
        disabled={!isDirty || isPending}
        className="btn-primary"
      >
        {isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
        ) : saved ? (
          <><Check className="w-4 h-4 text-green-300" /> Saved!</>
        ) : (
          'Update email'
        )}
      </button>
    </form>
  );
}
