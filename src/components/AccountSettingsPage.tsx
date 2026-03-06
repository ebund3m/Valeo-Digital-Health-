'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  User, Mail, Phone, Lock, Eye, EyeOff,
  Check, AlertCircle, Camera, Shield,
} from 'lucide-react';

interface SettingsPageProps {
  role: 'admin' | 'doctor' | 'client';
  accent: string;
  accentLight: string;
}

export default function AccountSettingsPage({ role, accent, accentLight }: SettingsPageProps) {
  const { user } = useAuth();

  // Profile state
  const [profile, setProfile] = useState({
    displayName: user?.displayName || '',
    phone: '',
  });

  // Password state
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // UI state
  const [profileStatus, setProfileStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const passwordStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8)  score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColor = ['', '#E8604C', '#E8604C', '#D4A853', '#4ECDC4', '#0D3B44'];
  const strength = passwordStrength(passwords.new);

  async function handleSaveProfile() {
    if (!profile.displayName.trim()) {
      setProfileError('Name cannot be empty.');
      return;
    }
    setProfileStatus('saving');
    setProfileError('');
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: profile.displayName });
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          displayName: profile.displayName,
          phone: profile.phone,
          updatedAt: new Date().toISOString(),
        });
      }
      setProfileStatus('success');
      setTimeout(() => setProfileStatus('idle'), 3000);
    } catch {
      setProfileError('Failed to update profile. Please try again.');
      setProfileStatus('error');
    }
  }

  async function handleChangePassword() {
    setPasswordError('');
    if (!passwords.current) { setPasswordError('Please enter your current password.'); return; }
    if (passwords.new.length < 8) { setPasswordError('New password must be at least 8 characters.'); return; }
    if (passwords.new !== passwords.confirm) { setPasswordError('New passwords do not match.'); return; }
    if (passwords.new === passwords.current) { setPasswordError('New password must be different from your current password.'); return; }

    setPasswordStatus('saving');
    try {
      if (auth.currentUser && auth.currentUser.email) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, passwords.current);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, passwords.new);
      }
      setPasswordStatus('success');
      setPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => setPasswordStatus('idle'), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setPasswordError('Current password is incorrect.');
      } else {
        setPasswordError('Failed to change password. Please try again.');
      }
      setPasswordStatus('error');
    }
  }

  const roleLabel = role === 'admin' ? 'Administrator' : role === 'doctor' ? 'Doctor' : 'Client';
  const roleBadgeColor = role === 'admin' ? '#E8604C' : role === 'doctor' ? '#0D3B44' : '#4ECDC4';

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: '28px', color: '#1A1A2E', marginBottom: '6px' }}>
          Account Settings
        </h1>
        <p style={{ fontSize: '14px', color: '#8A9BA8' }}>
          Manage your profile information and security settings.
        </p>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 1px 4px rgba(26,26,46,0.07)' }}>
        <div style={{ height: '3px', background: `linear-gradient(90deg, ${accent}, ${accentLight})` }} />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <User size={18} style={{ color: accent }} />
            <h2 className="text-base font-semibold" style={{ color: '#1A1A2E' }}>Profile Information</h2>
          </div>

          {/* Avatar + role */}
          <div className="flex items-center gap-4 mb-6 pb-6" style={{ borderBottom: '1px solid rgba(26,26,46,0.06)' }}>
            <div className="relative">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-semibold flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accentLight})`, fontFamily: 'var(--font-dm-serif)' }}>
                {profile.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: '#1A1A2E' }}>{profile.displayName || 'Your Name'}</p>
              <p className="text-xs mb-2" style={{ color: '#8A9BA8' }}>{user?.email}</p>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: roleBadgeColor + '15', color: roleBadgeColor }}>
                <Shield size={10} />
                {roleLabel}
              </span>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8A9BA8' }}>
                Full Name
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#8A9BA8' }} />
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: '#F8F9FA', border: '1px solid rgba(26,26,46,0.1)', color: '#1A1A2E' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8A9BA8' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#8A9BA8' }} />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(26,26,46,0.03)', border: '1px solid rgba(26,26,46,0.06)', color: '#8A9BA8', cursor: 'not-allowed' }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: '#8A9BA8' }}>Email cannot be changed. Contact admin if needed.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8A9BA8' }}>
                Phone Number (optional)
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#8A9BA8' }} />
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+1 (784) 000-0000"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: '#F8F9FA', border: '1px solid rgba(26,26,46,0.1)', color: '#1A1A2E' }}
                />
              </div>
            </div>

            {profileError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(232,96,76,0.08)', color: '#E8604C', border: '1px solid rgba(232,96,76,0.2)' }}>
                <AlertCircle size={15} />
                {profileError}
              </div>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={profileStatus === 'saving'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: profileStatus === 'success' ? 'rgba(78,205,196,0.1)' : `linear-gradient(135deg, ${accent}, ${accentLight})`,
                color: profileStatus === 'success' ? '#4ECDC4' : 'white',
                boxShadow: profileStatus === 'success' ? 'none' : `0 4px 14px ${accent}40`,
                cursor: profileStatus === 'saving' ? 'not-allowed' : 'pointer',
                opacity: profileStatus === 'saving' ? 0.7 : 1,
              }}>
              {profileStatus === 'success' ? (
                <><Check size={15} /> Saved!</>
              ) : profileStatus === 'saving' ? (
                'Saving…'
              ) : (
                'Save Profile'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Password Card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 1px 4px rgba(26,26,46,0.07)' }}>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #E8604C, #D4A853)' }} />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock size={18} style={{ color: '#E8604C' }} />
            <h2 className="text-base font-semibold" style={{ color: '#1A1A2E' }}>Change Password</h2>
          </div>

          <div className="space-y-4">
            {/* Current password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8A9BA8' }}>
                Current Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#8A9BA8' }} />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={passwords.current}
                  onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                  placeholder="Enter current password"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none"
                  style={{ background: '#F8F9FA', border: '1px solid rgba(26,26,46,0.1)', color: '#1A1A2E' }}
                />
                <button type="button" onClick={() => setShowCurrent(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#8A9BA8' }}>
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8A9BA8' }}>
                New Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#8A9BA8' }} />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={passwords.new}
                  onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))}
                  placeholder="Min. 8 characters"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none"
                  style={{ background: '#F8F9FA', border: '1px solid rgba(26,26,46,0.1)', color: '#1A1A2E' }}
                />
                <button type="button" onClick={() => setShowNew(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#8A9BA8' }}>
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Strength bar */}
              {passwords.new && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all"
                        style={{ background: i <= strength ? strengthColor[strength] : 'rgba(26,26,46,0.08)' }} />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strengthColor[strength] }}>
                    {strengthLabel[strength]}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8A9BA8' }}>
                Confirm New Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#8A9BA8' }} />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={passwords.confirm}
                  onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none"
                  style={{
                    background: '#F8F9FA',
                    border: `1px solid ${passwords.confirm && passwords.confirm !== passwords.new ? 'rgba(232,96,76,0.4)' : 'rgba(26,26,46,0.1)'}`,
                    color: '#1A1A2E'
                  }}
                />
                <button type="button" onClick={() => setShowConfirm(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#8A9BA8' }}>
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {passwords.confirm && passwords.confirm !== passwords.new && (
                <p className="text-xs mt-1" style={{ color: '#E8604C' }}>Passwords do not match</p>
              )}
              {passwords.confirm && passwords.confirm === passwords.new && passwords.new && (
                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#4ECDC4' }}>
                  <Check size={11} /> Passwords match
                </p>
              )}
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(232,96,76,0.08)', color: '#E8604C', border: '1px solid rgba(232,96,76,0.2)' }}>
                <AlertCircle size={15} />
                {passwordError}
              </div>
            )}

            <button
              onClick={handleChangePassword}
              disabled={passwordStatus === 'saving'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: passwordStatus === 'success' ? 'rgba(78,205,196,0.1)' : 'linear-gradient(135deg, #E8604C, #C44D3A)',
                color: passwordStatus === 'success' ? '#4ECDC4' : 'white',
                boxShadow: passwordStatus === 'success' ? 'none' : '0 4px 14px rgba(232,96,76,0.35)',
                cursor: passwordStatus === 'saving' ? 'not-allowed' : 'pointer',
                opacity: passwordStatus === 'saving' ? 0.7 : 1,
              }}>
              {passwordStatus === 'success' ? (
                <><Check size={15} /> Password Changed!</>
              ) : passwordStatus === 'saving' ? (
                'Updating…'
              ) : (
                <><Lock size={15} /> Change Password</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(26,26,46,0.03)', border: '1px solid rgba(26,26,46,0.06)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#8A9BA8' }}>Account Info</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span style={{ color: '#4A5568' }}>Account ID</span>
            <span className="font-mono text-xs" style={{ color: '#8A9BA8' }}>{user?.uid?.slice(0, 16)}…</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: '#4A5568' }}>Role</span>
            <span className="font-semibold capitalize" style={{ color: roleBadgeColor }}>{roleLabel}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: '#4A5568' }}>Email Verified</span>
            <span style={{ color: user?.emailVerified ? '#4ECDC4' : '#E8604C' }}>
              {user?.emailVerified ? '✓ Verified' : '✗ Not verified'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
