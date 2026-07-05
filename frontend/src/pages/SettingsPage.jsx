import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Bell, LogOut, Check, Loader2, Eye, EyeOff } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import EmailPreferenceForm from '../components/EmailPreferenceForm';
import { changePassword } from '../services/authService';
import { useAuth } from '../context/AuthContext';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
        <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-brand-600" />
        </div>
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ChangePasswordForm() {
  const [form, setForm]     = useState({ currentPassword: '', newPassword: '' });
  const [show, setShow]     = useState({ current: false, new: false });
  const [saved, setSaved]   = useState(false);

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setSaved(true);
      setForm({ currentPassword: '', newPassword: '' });
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    reset();
    setSaved(false);
    mutate(form);
  };

  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
        <div className="relative">
          <input
            type={show.current ? 'text' : 'password'}
            className="input pr-10"
            value={form.currentPassword}
            onChange={set('currentPassword')}
            required
          />
          <button type="button" className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
            onClick={() => setShow(s => ({ ...s, current: !s.current }))}>
            {show.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
        <div className="relative">
          <input
            type={show.new ? 'text' : 'password'}
            className="input pr-10"
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            value={form.newPassword}
            onChange={set('newPassword')}
            required
          />
          <button type="button" className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
            onClick={() => setShow(s => ({ ...s, new: !s.new }))}>
            {show.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error.response?.data?.message || 'Failed to change password.'}</p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
        ) : saved ? (
          <><Check className="w-4 h-4" /> Changed!</>
        ) : 'Change password'}
      </button>
    </form>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Profile info (read-only) */}
      <Section title="Account" icon={User}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            {user?.phone && <p className="text-sm text-gray-500">{user.phone}</p>}
          </div>
        </div>
      </Section>

      {/* Notification email */}
      <Section title="Notifications" icon={Bell}>
        <p className="text-sm text-gray-500">
          We send price-drop alerts to your email. Update it here if you want alerts at a different address.
        </p>
        <EmailPreferenceForm />
      </Section>

      {/* Change password */}
      <Section title="Security" icon={Lock}>
        <ChangePasswordForm />
      </Section>

      {/* Danger zone */}
      <div className="card p-6">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700"
        >
          <LogOut className="w-4 h-4" />
          Sign out of all devices
        </button>
      </div>
    </div>
  );
}
