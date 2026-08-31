'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Key, Smartphone, Globe, AlertTriangle, Eye, EyeOff, Trash2, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const DEVICES = [
  { id: '1', name: 'Chrome on Windows 11', location: 'Boston, MA', lastActive: 'Active now', current: true, icon: '💻' },
  { id: '2', name: 'EduBoard Android App', location: 'Boston, MA', lastActive: '2 hours ago', current: false, icon: '📱' },
  { id: '3', name: 'Firefox on macOS', location: 'New York, NY', lastActive: '3 days ago', current: false, icon: '🖥️' },
];

export default function SecurityPage() {
  const router = useRouter();
  const { updateUserPassword } = useAuth();
  const [twoFA, setTwoFA] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [showPass, setShowPass] = useState({ curr: false, new: false, confirm: false });
  const [password, setPassword] = useState({ curr: '', new: '', confirm: '' });
  const [passMsg, setPassMsg] = useState('');
  const [updating, setUpdating] = useState(false);
  const [devices, setDevices] = useState(DEVICES);

  const changePassword = async () => {
    if (password.new.length < 6) { setPassMsg('New password must be at least 6 characters'); return; }
    if (password.new !== password.confirm) { setPassMsg('Passwords do not match'); return; }
    try {
      setUpdating(true);
      await updateUserPassword(password.new);
      setPassMsg('✅ Password changed successfully in Firebase Auth!');
      setPassword({ curr: '', new: '', confirm: '' });
    } catch (err: any) {
      setPassMsg(err?.message || 'Password update failed. Re-authentication may be required.');
    } finally {
      setUpdating(false);
      setTimeout(() => setPassMsg(''), 4000);
    }
  };

  const revokeDevice = (id: string) => setDevices(d => d.filter(x => x.id !== id));

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange} className={`w-12 h-6 rounded-full transition-all relative ${value ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--bg-tertiary)] border border-[var(--border-primary)]'}`}>
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="px-6 py-4 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)]"><ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" /></button>
        <div><h1 className="font-bold text-[var(--text-primary)]">Security Settings</h1><p className="text-xs text-[var(--text-tertiary)]">Manage account security</p></div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Security score */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)] mb-1">Security Score</p>
              <p className="text-3xl font-bold text-[var(--text-primary)]">{twoFA && biometric ? 100 : twoFA ? 80 : 60}<span className="text-lg font-normal text-[var(--text-tertiary)]">/100</span></p>
            </div>
            <Shield className={`w-12 h-12 ${twoFA && biometric ? 'text-green-400' : twoFA ? 'text-yellow-400' : 'text-red-400'}`} />
          </div>
          {(!twoFA || !biometric) && (
            <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Enable 2FA and Biometric to reach 100%</p>
          )}
        </div>

        {/* Authentication */}
        <section className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] space-y-4">
          <h3 className="font-semibold text-[var(--text-primary)]">Authentication</h3>
          {[
            { icon: Shield, label: 'Two-Factor Authentication', desc: 'Require OTP on every login', value: twoFA, onChange: () => setTwoFA(v => !v) },
            { icon: Smartphone, label: 'Biometric Login', desc: 'Use fingerprint or Face ID', value: biometric, onChange: () => setBiometric(v => !v) },
            { icon: Globe, label: 'New Login Alerts', desc: 'Get email alerts for new device logins', value: loginAlerts, onChange: () => setLoginAlerts(v => !v) },
          ].map(({ icon: Icon, label, desc, value, onChange }) => (
            <div key={label} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[var(--color-primary-500)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{desc}</p>
                </div>
              </div>
              <Toggle value={value} onChange={onChange} />
            </div>
          ))}
        </section>

        {/* Change password */}
        <section className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2"><Key className="w-4 h-4 text-[var(--color-primary-500)]" /> Change Password</h3>
          <div className="space-y-3">
            {([['curr', 'Current Password'], ['new', 'New Password'], ['confirm', 'Confirm New Password']] as const).map(([key, label]) => (
              <div key={key} className="relative">
                <input
                  type={showPass[key] ? 'text' : 'password'}
                  value={password[key]}
                  onChange={e => setPassword(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={label}
                  className="w-full px-4 py-2.5 pr-12 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary-500)]" />
                <button onClick={() => setShowPass(s => ({ ...s, [key]: !s[key] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
                  {showPass[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            ))}
            {passMsg && <p className={`text-sm ${passMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{passMsg}</p>}
            <button onClick={changePassword}
              className="w-full py-2.5 rounded-xl text-white font-semibold text-sm" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              Update Password
            </button>
          </div>
        </section>

        {/* Devices */}
        <section className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Active Devices</h3>
          <div className="space-y-3">
            {devices.map(d => (
              <div key={d.id} className={`flex items-center justify-between p-3 rounded-xl ${d.current ? 'bg-green-500/5 border border-green-500/20' : 'bg-[var(--bg-tertiary)]'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{d.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{d.name}</p>
                      {d.current && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">This device</span>}
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)]">{d.location} · {d.lastActive}</p>
                  </div>
                </div>
                {!d.current && (
                  <button onClick={() => revokeDevice(d.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-400 transition-colors" title="Revoke access">
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Danger zone */}
        <section className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20">
          <h3 className="font-semibold text-red-400 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Danger Zone</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Delete Account</p>
              <p className="text-xs text-[var(--text-tertiary)]">Permanently delete your account and all data</p>
            </div>
            <button className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
