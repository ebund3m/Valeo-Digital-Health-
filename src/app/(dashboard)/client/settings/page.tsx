'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  User, Mail, Phone, Lock, Eye, EyeOff,
  Check, AlertCircle, Shield, Loader2,
  Bell, CheckCircle, AlertTriangle,
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════════
interface SettingsPageProps {
  role: 'admin' | 'doctor' | 'client';
  accent: string;
  accentLight: string;
}

interface NotifPrefs {
  emailAppointments: boolean;
  emailMessages:     boolean;
  emailAssessments:  boolean;
}

// FIX 1 + 7: Hex-alpha via string concat is invalid CSS cross-browser.
// This helper converts known brand hex colours to their rgba equivalents.
function hexToRgba(hex: string, alpha: number): string {
  const map: Record<string, string> = {
    '#E8604C': `rgba(232,96,76,${alpha})`,
    '#0D3B44': `rgba(13,59,68,${alpha})`,
    '#4ECDC4': `rgba(78,205,196,${alpha})`,
    '#D4A853': `rgba(212,168,83,${alpha})`,
    '#1A535C': `rgba(26,83,92,${alpha})`,
  };
  return map[hex] ?? `rgba(13,59,68,${alpha})`;
}

// S2: First + last initial
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

// ══════════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════════
export default function AccountSettingsPage({ role, accent, accentLight }: SettingsPageProps) {
  const { user } = useAuth();

  // ── Profile ───────────────────────────────────────────────────────────────
  const [displayName,     setDisplayName]     = useState('');
  const [phone,           setPhone]           = useState('');
  const [initName,        setInitName]        = useState('');
  const [initPhone,       setInitPhone]       = useState('');
  const [loadingProfile,  setLoadingProfile]  = useState(true);
  const [loadError,       setLoadError]       = useState<string | null>(null); // FIX 3

  // ── Password ──────────────────────────────────────────────────────────────
  const [pwCurrent,   setPwCurrent]   = useState('');
  const [pwNew,       setPwNew]       = useState('');
  const [pwConfirm,   setPwConfirm]   = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Notifications ─────────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState<NotifPrefs>({
    emailAppointments: true,
    emailMessages:     true,
    emailAssessments:  true,
  });
  const [notifsDirty, setNotifsDirty] = useState(false);

  // ── Status ────────────────────────────────────────────────────────────────
  const [profileStatus,  setProfileStatus]  = useState<'idle'|'saving'|'success'|'error'>('idle');
  const [passwordStatus, setPasswordStatus] = useState<'idle'|'saving'|'success'|'error'>('idle');
  const [notifStatus,    setNotifStatus]    = useState<'idle'|'saving'|'success'|'error'>('idle');
  const [profileError,   setProfileError]   = useState('');
  const [passwordError,  setPasswordError]  = useState('');

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // FIX 2 + 8: All timers tracked in refs so they can be cleared on unmount
  //            and so rapid calls don't stack.
  const toastTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passwordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      // FIX 8: Clear all timers on unmount to prevent setState on unmounted component
      [toastTimerRef, profileTimerRef, passwordTimerRef, notifTimerRef].forEach(ref => {
        if (ref.current) clearTimeout(ref.current);
      });
    };
  }, []);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }

  function scheduleReset(
    setter: (v: 'idle') => void,
    ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    delay = 3000,
  ) {
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(() => setter('idle'), delay);
  }

  // ══════════════════════════════════════════════════════════════
  //  Load profile from Firestore
  //  FIX 3: try/catch so Firestore errors show an error state
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data() ?? {};

        const name = user.displayName || data.displayName || '';
        const ph   = data.phone || '';

        setDisplayName(name);
        setPhone(ph);
        setInitName(name);
        setInitPhone(ph);

        // FIX 4: Use functional updater to avoid stale closure over `notifs`
        if (data.notifPrefs) {
          setNotifs(prev => ({ ...prev, ...data.notifPrefs }));
        }
      } catch (err) {
        console.error('[AccountSettings] load:', err);
        setLoadError('Could not load your settings. Please refresh the page.');
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, [user]);

  // FIX 5: Added `displayName` to deps to fix stale closure lint warning.
  //        Guard: only sync if Auth has a name but local state is still empty.
  useEffect(() => {
    if (user?.displayName && !displayName) {
      setDisplayName(user.displayName);
      setInitName(user.displayName);
    }
  }, [user?.displayName, displayName]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const profileDirty = displayName !== initName || phone !== initPhone;

  const strength = (() => {
    if (!pwNew) return 0;
    let s = 0;
    if (pwNew.length >= 8)           s++;
    if (pwNew.length >= 12)          s++;
    if (/[A-Z]/.test(pwNew))         s++;
    if (/[0-9]/.test(pwNew))         s++;
    if (/[^A-Za-z0-9]/.test(pwNew))  s++;
    return s;
  })();
  const strengthLabel = ['', 'Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColor = ['', '#E8604C', '#E8604C', '#D4A853', '#4ECDC4', '#0D3B44'];

  const roleLabel    = role === 'admin' ? 'Administrator' : role === 'doctor' ? 'Doctor' : 'Client';
  // FIX 1: Use hexToRgba() instead of roleBadgeCol + '15'
  const roleBadgeCol = role === 'admin' ? '#E8604C' : role === 'doctor' ? '#0D3B44' : '#4ECDC4';

  const lastLogin = user?.metadata?.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  // ══════════════════════════════════════════════════════════════
  //  SAVE PROFILE
  //  FIX 10: Consistently save with Dr. prefix for doctors
  // ══════════════════════════════════════════════════════════════
  async function handleSaveProfile() {
    if (!displayName.trim()) {
      setProfileError('Name cannot be empty.');
      return;
    }
    setProfileStatus('saving');
    setProfileError('');
    try {
      if (auth.currentUser) {
        // FIX 10: For doctors, ensure Dr. prefix is stored consistently
        const rawName   = displayName.trim().replace(/^Dr\.\s*/i, '');
        const nameToSave = role === 'doctor' ? `Dr. ${rawName}` : displayName.trim();

        await updateProfile(auth.currentUser, { displayName: nameToSave });
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          displayName: nameToSave,
          phone:       phone.trim(),
          updatedAt:   serverTimestamp(),
        });
        setDisplayName(nameToSave);
        setInitName(nameToSave);
        setInitPhone(phone.trim());
      }
      setProfileStatus('success');
      showToast('Profile updated successfully.');
      scheduleReset(setProfileStatus, profileTimerRef, 3000);
    } catch {
      setProfileError('Failed to update profile. Please try again.');
      setProfileStatus('error');
      scheduleReset(setProfileStatus, profileTimerRef, 4000);
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  CHANGE PASSWORD
  // ══════════════════════════════════════════════════════════════
  async function handleChangePassword() {
    setPasswordError('');
    if (!pwCurrent)          { setPasswordError('Please enter your current password.'); return; }
    if (pwNew.length < 8)    { setPasswordError('New password must be at least 8 characters.'); return; }
    if (pwNew !== pwConfirm) { setPasswordError('New passwords do not match.'); return; }
    if (pwNew === pwCurrent) { setPasswordError('New password must differ from your current one.'); return; }
    if (strength < 2)        { setPasswordError('Please choose a stronger password.'); return; }

    setPasswordStatus('saving');
    try {
      if (auth.currentUser?.email) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, pwCurrent);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, pwNew);
      }
      setPasswordStatus('success');
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
      showToast('Password changed successfully.');
      scheduleReset(setPasswordStatus, passwordTimerRef, 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setPasswordError('Current password is incorrect.');
      } else {
        setPasswordError('Failed to change password. Please try again.');
      }
      setPasswordStatus('error');
      scheduleReset(setPasswordStatus, passwordTimerRef, 4000);
    }
  }

  // ── Save notification prefs ───────────────────────────────────────────────
  async function handleSaveNotifs() {
    if (!user) return;
    setNotifStatus('saving');
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notifPrefs: notifs,
        updatedAt:  serverTimestamp(),
      });
      setNotifsDirty(false);
      setNotifStatus('success');
      showToast('Notification preferences saved.');
      scheduleReset(setNotifStatus, notifTimerRef, 3000);
    } catch {
      setNotifStatus('error');
      scheduleReset(setNotifStatus, notifTimerRef, 4000);
    }
  }

  function toggleNotif(key: keyof NotifPrefs) {
    setNotifs(p => ({ ...p, [key]: !p[key] }));
    setNotifsDirty(true);
  }

  // ── Display name shown in the avatar area ─────────────────────────────────
  // FIX 10: display preview matches what will actually be saved
  const displayedName = role === 'doctor' && displayName
    ? displayName.startsWith('Dr.') ? displayName : `Dr. ${displayName}`
    : displayName || 'Your Name';

  // ══════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-medium"
          style={{ background: toast.type === 'success' ? '#0D3B44' : '#E8604C', color: 'white' }}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-dm-serif)', fontSize: '28px', color: '#0D3B44', marginBottom: '6px' }}>
          Account Settings
        </h1>
        <p style={{ fontSize: '14px', color: '#8A9BA8' }}>
          Manage your profile, security, and notification preferences.
        </p>
      </div>

      {/* FIX 3: Load error banner */}
      {loadError && (
        <div
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(232,96,76,0.06)', border: '1px solid rgba(232,96,76,0.15)' }}
        >
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#E8604C' }} />
          <p className="text-sm" style={{ color: '#E8604C' }}>{loadError}</p>
        </div>
      )}

      {/* ── PROFILE CARD ───────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'white', boxShadow: '0 1px 4px rgba(13,59,68,0.07)' }}>
        <div style={{ height: '3px', background: `linear-gradient(90deg, ${accent}, ${accentLight})` }} />
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <User size={18} style={{ color: accent }} />
              <h2 className="text-base font-semibold" style={{ color: '#0D3B44' }}>Profile Information</h2>
            </div>
            {profileDirty && (
              <span
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(212,168,83,0.12)', color: '#B8860B' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                Unsaved changes
              </span>
            )}
          </div>

          {/* Avatar + role banner */}
          <div className="flex items-center gap-4 mb-6 pb-6"
            style={{ borderBottom: '1px solid rgba(13,59,68,0.06)' }}>
            {/* S2: First + last initials */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accentLight})`,
                fontFamily: 'var(--font-dm-serif)',
              }}
            >
              {getInitials(displayName || user?.email || '?')}
            </div>
            <div>
              {/* FIX 10: Preview matches what will be saved */}
              <p className="font-semibold text-sm" style={{ color: '#0D3B44' }}>
                {displayedName}
              </p>
              <p className="text-xs mb-2" style={{ color: '#8A9BA8' }}>{user?.email}</p>
              {/* FIX 1: hexToRgba() instead of roleBadgeCol + '15' */}
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: hexToRgba(roleBadgeCol, 0.12), color: roleBadgeCol }}
              >
                <Shield size={10} />
                {roleLabel}
              </span>
            </div>
          </div>

          {loadingProfile ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={22} className="animate-spin" style={{ color: accent }} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: '#8A9BA8' }}>Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: '#8A9BA8' }} />
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: '#F8F9FA', border: '1px solid rgba(13,59,68,0.1)', color: '#0D3B44' }}
                  />
                </div>
                {role === 'doctor' && (
                  <p className="text-xs mt-1" style={{ color: '#8A9BA8' }}>
                    Enter your name without "Dr." — it will be added automatically.
                  </p>
                )}
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: '#8A9BA8' }}>Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: '#8A9BA8' }} />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                    style={{
                      background: 'rgba(13,59,68,0.03)',
                      border: '1px solid rgba(13,59,68,0.06)',
                      color: '#8A9BA8',
                      cursor: 'not-allowed',
                    }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: '#8A9BA8' }}>
                  Email cannot be changed. Contact admin if needed.
                </p>
              </div>

              {/* Phone — FIX 9: generic format */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: '#8A9BA8' }}>
                  Phone Number <span style={{ color: '#C4C4C4' }}>(optional)</span>
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: '#8A9BA8' }} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (xxx) xxx-xxxx"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: '#F8F9FA', border: '1px solid rgba(13,59,68,0.1)', color: '#0D3B44' }}
                  />
                </div>
              </div>

              {profileError && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(232,96,76,0.08)', color: '#E8604C', border: '1px solid rgba(232,96,76,0.15)' }}
                >
                  <AlertCircle size={15} />{profileError}
                </div>
              )}

              <button
                onClick={handleSaveProfile}
                disabled={profileStatus === 'saving' || !profileDirty}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  // FIX 7: no hex-alpha in box-shadow — use rgba directly
                  background: profileStatus === 'success'
                    ? 'rgba(78,205,196,0.1)'
                    : `linear-gradient(135deg, ${accent}, ${accentLight})`,
                  color:     profileStatus === 'success' ? '#4ECDC4' : 'white',
                  boxShadow: profileStatus === 'success' ? 'none' : `0 4px 14px ${hexToRgba(accent, 0.3)}`,
                  cursor:    (profileStatus === 'saving' || !profileDirty) ? 'not-allowed' : 'pointer',
                }}
              >
                {profileStatus === 'saving'  ? <><Loader2 size={14} className="animate-spin" />Saving…</>
               : profileStatus === 'success' ? <><Check size={14} />Saved!</>
               : 'Save Profile'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── PASSWORD CARD ─────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'white', boxShadow: '0 1px 4px rgba(13,59,68,0.07)' }}>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #E8604C, #D4A853)' }} />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock size={18} style={{ color: '#E8604C' }} />
            <h2 className="text-base font-semibold" style={{ color: '#0D3B44' }}>Change Password</h2>
          </div>

          <div className="space-y-4">
            {/* Current */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#8A9BA8' }}>Current Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: '#8A9BA8' }} />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={pwCurrent}
                  onChange={e => setPwCurrent(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none"
                  style={{ background: '#F8F9FA', border: '1px solid rgba(13,59,68,0.1)', color: '#0D3B44' }}
                />
                <button type="button" onClick={() => setShowCurrent(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                  style={{ color: '#8A9BA8' }}>
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#8A9BA8' }}>New Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: '#8A9BA8' }} />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={pwNew}
                  onChange={e => setPwNew(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && pwConfirm && handleChangePassword()}
                  placeholder="Min. 8 characters"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none"
                  style={{ background: '#F8F9FA', border: '1px solid rgba(13,59,68,0.1)', color: '#0D3B44' }}
                />
                <button type="button" onClick={() => setShowNew(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                  style={{ color: '#8A9BA8' }}>
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {pwNew && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all"
                        style={{ background: i <= strength ? strengthColor[strength] : 'rgba(13,59,68,0.08)' }} />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strengthColor[strength] }}>
                    {strengthLabel[strength]}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#8A9BA8' }}>Confirm New Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: '#8A9BA8' }} />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={pwConfirm}
                  onChange={e => setPwConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none"
                  style={{
                    background: '#F8F9FA',
                    border: `1px solid ${pwConfirm && pwConfirm !== pwNew ? 'rgba(232,96,76,0.4)' : 'rgba(13,59,68,0.1)'}`,
                    color: '#0D3B44',
                  }}
                />
                <button type="button" onClick={() => setShowConfirm(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                  style={{ color: '#8A9BA8' }}>
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {pwConfirm && pwConfirm !== pwNew && (
                <p className="text-xs mt-1" style={{ color: '#E8604C' }}>Passwords do not match</p>
              )}
              {pwConfirm && pwConfirm === pwNew && pwNew && (
                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#4ECDC4' }}>
                  <Check size={11} /> Passwords match
                </p>
              )}
            </div>

            {passwordError && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(232,96,76,0.08)', color: '#E8604C', border: '1px solid rgba(232,96,76,0.15)' }}
              >
                <AlertCircle size={15} />{passwordError}
              </div>
            )}

            <button
              onClick={handleChangePassword}
              disabled={passwordStatus === 'saving'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
              style={{
                background: passwordStatus === 'success'
                  ? 'rgba(78,205,196,0.1)'
                  : 'linear-gradient(135deg, #E8604C, #C44D3A)',
                color:     passwordStatus === 'success' ? '#4ECDC4' : 'white',
                boxShadow: passwordStatus === 'success' ? 'none' : '0 4px 14px rgba(232,96,76,0.3)',
                cursor:    passwordStatus === 'saving' ? 'not-allowed' : 'pointer',
              }}
            >
              {passwordStatus === 'saving'  ? <><Loader2 size={14} className="animate-spin" />Updating…</>
             : passwordStatus === 'success' ? <><Check size={14} />Password Changed!</>
             : <><Lock size={14} />Change Password</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── NOTIFICATION PREFERENCES ───────────────────────────── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'white', boxShadow: '0 1px 4px rgba(13,59,68,0.07)' }}>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #4ECDC4, #0D3B44)' }} />
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Bell size={18} style={{ color: '#4ECDC4' }} />
              <h2 className="text-base font-semibold" style={{ color: '#0D3B44' }}>
                Notification Preferences
              </h2>
            </div>
            {notifsDirty && (
              <span className="text-xs font-medium" style={{ color: '#B8860B' }}>Unsaved</span>
            )}
          </div>

          <div className="space-y-4">
            {([
              { key: 'emailAppointments', label: 'Appointment updates',  sub: 'Confirmations, reminders, and cancellations' },
              { key: 'emailMessages',     label: 'New messages',         sub: 'When you receive a new chat message'         },
              { key: 'emailAssessments',  label: 'Assessment activity',  sub: 'When an assessment is assigned or completed'  },
            ] as { key: keyof NotifPrefs; label: string; sub: string }[]).map(({ key, label, sub }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#0D3B44' }}>{label}</p>
                  <p className="text-xs" style={{ color: '#8A9BA8' }}>{sub}</p>
                </div>
                <button
                  onClick={() => toggleNotif(key)}
                  className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all"
                  style={{ background: notifs[key] ? accent : 'rgba(13,59,68,0.12)' }}
                >
                  <span
                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
                    style={{ left: notifs[key] ? '24px' : '4px' }}
                  />
                </button>
              </div>
            ))}

            <button
              onClick={handleSaveNotifs}
              disabled={notifStatus === 'saving' || !notifsDirty}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: notifStatus === 'success'
                  ? 'rgba(78,205,196,0.1)'
                  : 'linear-gradient(135deg, #4ECDC4, #0D3B44)',
                color:  notifStatus === 'success' ? '#4ECDC4' : 'white',
                cursor: (notifStatus === 'saving' || !notifsDirty) ? 'not-allowed' : 'pointer',
              }}
            >
              {notifStatus === 'saving'  ? <><Loader2 size={14} className="animate-spin" />Saving…</>
             : notifStatus === 'success' ? <><Check size={14} />Saved!</>
             : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>

      {/* ── ACCOUNT INFO ───────────────────────────────────────── */}
      <div className="rounded-2xl p-5"
        style={{ background: 'rgba(13,59,68,0.03)', border: '1px solid rgba(13,59,68,0.06)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#8A9BA8' }}>
          Account Info
        </p>
        <div className="space-y-3">
          {[
            { label: 'Account ID',     value: user?.uid ? `${user.uid.slice(0, 16)}…` : '—', mono: true },
            { label: 'Role',           value: roleLabel, color: roleBadgeCol },
            {
              label: 'Email Verified',
              value: user?.emailVerified ? '✓ Verified' : '✗ Not verified',
              color: user?.emailVerified ? '#4ECDC4' : '#E8604C',
            },
            { label: 'Last Sign In',   value: lastLogin ?? '—' },
          ].map(({ label, value, color, mono }) => (
            <div key={label} className="flex items-center justify-between text-sm"
              style={{ borderBottom: '1px solid rgba(13,59,68,0.05)', paddingBottom: '10px' }}>
              <span style={{ color: '#4A5568' }}>{label}</span>
              <span
                className={mono ? 'font-mono text-xs' : 'font-medium text-xs'}
                style={{ color: color ?? '#8A9BA8' }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
