"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  User, Mail, Phone, MapPin, Shield, Lock,
  CheckCircle, AlertCircle, Loader2, Edit3, Save, X,
  Heart, Clock, Users,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface ProfileData {
  displayName:   string;
  email:         string;
  phone:         string;
  dateOfBirth:   string;
  country:       string;
  city:          string;
  goals:         string[];
  preferredTime: string;
  emergencyContact: {
    name:  string;
    phone: string;
  };
}

const GOALS = [
  "Manage stress & anxiety",
  "Improve relationships",
  "Work through grief or loss",
  "Build self-confidence",
  "Navigate life transitions",
  "Improve work-life balance",
  "Process trauma",
  "General mental wellness",
];

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({
  title, icon: Icon, children, accent = "#0D3B44",
}: {
  title: string; icon: React.ElementType;
  children: React.ReactNode; accent?: string;
}) {
  return (
    <div className="rounded-2xl p-6"
      style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
      <div className="flex items-center gap-2 mb-5 pb-4 border-b"
        style={{ borderColor: "rgba(13,59,68,0.07)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: accent + "12" }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: "#0D3B44" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Field ──────────────────────────────────────────────────────────────────
function Field({
  label, value, editing, children,
}: {
  label: string; value: string; editing: boolean; children?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
        style={{ color: "#8A9BA8" }}>
        {label}
      </label>
      {editing ? children : (
        <p className="text-sm py-2.5 px-0" style={{ color: value ? "#22272B" : "#C4C4C4" }}>
          {value || "Not set"}
        </p>
      )}
    </div>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────
function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none transition-colors"
      style={{ borderColor: "rgba(13,59,68,0.15)", background: "#FAFAFA" }} />
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ type, msg }: { type: "success"|"error"; msg: string }) {
  return (
    <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-medium animate-fade-in"
      style={{ background: type === "success" ? "#0D3B44" : "#E8604C", color: "white" }}>
      {type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ClientProfilePage() {
  const { user } = useAuth();

  const [profile, setProfile]       = useState<ProfileData>({
    displayName: "", email: "", phone: "", dateOfBirth: "",
    country: "", city: "", goals: [], preferredTime: "",
    emergencyContact: { name: "", phone: "" },
  });
  const [draft, setDraft]           = useState<ProfileData>(profile);
  const [loading, setLoading]       = useState(true);
  const [editSection, setEditSection] = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState<{ type: "success"|"error"; msg: string } | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving]               = useState(false);
  const [pwError, setPwError]                 = useState<string | null>(null);

  function showToast(type: "success"|"error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  // Load profile from Firestore
  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        const loaded: ProfileData = {
          displayName:   d.displayName   ?? user.displayName ?? "",
          email:         d.email         ?? user.email ?? "",
          phone:         d.phone         ?? "",
          dateOfBirth:   d.dateOfBirth   ?? "",
          country:       d.country       ?? "",
          city:          d.city          ?? "",
          goals:         d.goals         ?? [],
          preferredTime: d.preferredTime ?? "",
          emergencyContact: {
            name:  d.emergencyContact?.name  ?? "",
            phone: d.emergencyContact?.phone ?? "",
          },
        };
        setProfile(loaded);
        setDraft(loaded);
      }
      setLoading(false);
    })();
  }, [user]);

  function startEdit(section: string) {
    setDraft({ ...profile });
    setEditSection(section);
  }

  function cancelEdit() {
    setDraft({ ...profile });
    setEditSection(null);
  }

  async function saveSection() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName:      draft.displayName,
        phone:            draft.phone,
        dateOfBirth:      draft.dateOfBirth,
        country:          draft.country,
        city:             draft.city,
        goals:            draft.goals,
        preferredTime:    draft.preferredTime,
        emergencyContact: draft.emergencyContact,
        updatedAt:        serverTimestamp(),
      });

      // Update Firebase Auth display name if changed
      if (draft.displayName !== profile.displayName) {
        await updateProfile(user, { displayName: draft.displayName });
      }

      setProfile({ ...draft });
      setEditSection(null);
      showToast("success", "Profile updated successfully.");
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange() {
    if (!user || !user.email) return;
    setPwError(null);

    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters."); return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match."); return;
    }

    setPwSaving(true);
    try {
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setEditSection(null);
      showToast("success", "Password changed successfully.");
    } catch (err: any) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setPwError("Current password is incorrect.");
      } else {
        setPwError("Failed to change password. Please try again.");
      }
    } finally {
      setPwSaving(false);
    }
  }

  function toggleGoal(goal: string) {
    setDraft(d => ({
      ...d,
      goals: d.goals.includes(goal)
        ? d.goals.filter(g => g !== goal)
        : [...d.goals, goal],
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 size={28} className="animate-spin" style={{ color: "#4ECDC4" }} />
      </div>
    );
  }

  const isEditing = (s: string) => editSection === s;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {toast && <Toast type={toast.type} msg={toast.msg} />}

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)", color: "white" }}>
          {profile.displayName?.[0]?.toUpperCase() ?? "U"}
        </div>
        <div>
          <h2 className="text-2xl" style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}>
            {profile.displayName || "Your Profile"}
          </h2>
          <p className="text-sm" style={{ color: "#8A9BA8" }}>{profile.email}</p>
        </div>
      </div>

      {/* ── Personal Information ── */}
      <Section title="Personal Information" icon={User}>
        <div className="flex items-center justify-between mb-4">
          <span />
          {!isEditing("personal") ? (
            <button onClick={() => startEdit("personal")}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{ color: "#0D3B44", background: "rgba(13,59,68,0.06)" }}>
              <Edit3 size={12} /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={cancelEdit}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ color: "#8A9BA8", background: "rgba(13,59,68,0.04)" }}>
                <X size={12} /> Cancel
              </button>
              <button onClick={saveSection} disabled={saving}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" value={profile.displayName} editing={isEditing("personal")}>
            <Input value={draft.displayName} onChange={v => setDraft(d => ({ ...d, displayName: v }))} placeholder="Your full name" />
          </Field>
          <Field label="Email Address" value={profile.email} editing={false}>
            <Input value={draft.email} onChange={() => {}} placeholder="" />
          </Field>
          <Field label="Phone Number" value={profile.phone} editing={isEditing("personal")}>
            <Input value={draft.phone} onChange={v => setDraft(d => ({ ...d, phone: v }))} placeholder="+1 (868) 000-0000" />
          </Field>
          <Field label="Date of Birth" value={profile.dateOfBirth} editing={isEditing("personal")}>
            <Input value={draft.dateOfBirth} onChange={v => setDraft(d => ({ ...d, dateOfBirth: v }))} type="date" />
          </Field>
          <Field label="City" value={profile.city} editing={isEditing("personal")}>
            <Input value={draft.city} onChange={v => setDraft(d => ({ ...d, city: v }))} placeholder="Kingstown" />
          </Field>
          <Field label="Country" value={profile.country} editing={isEditing("personal")}>
            <Input value={draft.country} onChange={v => setDraft(d => ({ ...d, country: v }))} placeholder="St. Vincent & the Grenadines" />
          </Field>
        </div>
      </Section>

      {/* ── Wellness Goals ── */}
      <Section title="Wellness Goals" icon={Heart} accent="#4ECDC4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs" style={{ color: "#8A9BA8" }}>
            {profile.goals.length > 0
              ? `${profile.goals.length} goal${profile.goals.length > 1 ? "s" : ""} selected`
              : "No goals set yet"}
          </p>
          {!isEditing("goals") ? (
            <button onClick={() => startEdit("goals")}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ color: "#0D3B44", background: "rgba(13,59,68,0.06)" }}>
              <Edit3 size={12} /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={cancelEdit}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ color: "#8A9BA8", background: "rgba(13,59,68,0.04)" }}>
                <X size={12} /> Cancel
              </button>
              <button onClick={saveSection} disabled={saving}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save
              </button>
            </div>
          )}
        </div>

        {isEditing("goals") ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map(goal => {
                const selected = draft.goals.includes(goal);
                return (
                  <button key={goal} onClick={() => toggleGoal(goal)}
                    className="text-left p-3 rounded-xl border-2 text-xs font-medium transition-all"
                    style={{
                      borderColor: selected ? "#0D3B44" : "rgba(13,59,68,0.1)",
                      background:  selected ? "rgba(13,59,68,0.05)" : "white",
                      color:       selected ? "#0D3B44" : "#4A5568",
                    }}>
                    {selected && <CheckCircle size={11} className="inline mr-1" style={{ color: "#4ECDC4" }} />}
                    {goal}
                  </button>
                );
              })}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "#8A9BA8" }}>Preferred Session Time</label>
              <select value={draft.preferredTime}
                onChange={e => setDraft(d => ({ ...d, preferredTime: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
                style={{ borderColor: "rgba(13,59,68,0.15)", background: "#FAFAFA" }}>
                <option value="">No preference</option>
                <option value="morning">Morning (9am – 12pm)</option>
                <option value="afternoon">Afternoon (12pm – 4pm)</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {profile.goals.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.goals.map(goal => (
                  <span key={goal} className="px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ background: "rgba(78,205,196,0.1)", color: "#2BA8A0" }}>
                    {goal}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "#C4C4C4" }}>No goals selected</p>
            )}
            {profile.preferredTime && (
              <div className="flex items-center gap-2 mt-2">
                <Clock size={13} style={{ color: "#8A9BA8" }} />
                <span className="text-xs" style={{ color: "#8A9BA8" }}>
                  Preferred: {profile.preferredTime === "morning" ? "Morning (9am – 12pm)" : "Afternoon (12pm – 4pm)"}
                </span>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── Emergency Contact ── */}
      <Section title="Emergency Contact" icon={Users} accent="#E8604C">
        <div className="flex items-center justify-between mb-4">
          <span />
          {!isEditing("emergency") ? (
            <button onClick={() => startEdit("emergency")}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ color: "#0D3B44", background: "rgba(13,59,68,0.06)" }}>
              <Edit3 size={12} /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={cancelEdit}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ color: "#8A9BA8", background: "rgba(13,59,68,0.04)" }}>
                <X size={12} /> Cancel
              </button>
              <button onClick={saveSection} disabled={saving}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save
              </button>
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Contact Name" value={profile.emergencyContact.name} editing={isEditing("emergency")}>
            <Input value={draft.emergencyContact.name}
              onChange={v => setDraft(d => ({ ...d, emergencyContact: { ...d.emergencyContact, name: v } }))}
              placeholder="Full name" />
          </Field>
          <Field label="Phone Number" value={profile.emergencyContact.phone} editing={isEditing("emergency")}>
            <Input value={draft.emergencyContact.phone}
              onChange={v => setDraft(d => ({ ...d, emergencyContact: { ...d.emergencyContact, phone: v } }))}
              placeholder="+1 (868) 000-0000" />
          </Field>
        </div>
      </Section>

      {/* ── Security ── */}
      <Section title="Security" icon={Shield} accent="#D4A853">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs" style={{ color: "#8A9BA8" }}>Change your account password</p>
          {!isEditing("password") ? (
            <button onClick={() => { setEditSection("password"); setPwError(null); }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ color: "#0D3B44", background: "rgba(13,59,68,0.06)" }}>
              <Lock size={12} /> Change Password
            </button>
          ) : (
            <button onClick={() => { setEditSection(null); setPwError(null); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ color: "#8A9BA8", background: "rgba(13,59,68,0.04)" }}>
              <X size={12} /> Cancel
            </button>
          )}
        </div>

        {isEditing("password") && (
          <div className="space-y-4">
            {pwError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: "rgba(232,96,76,0.08)", color: "#E8604C" }}>
                <AlertCircle size={14} />{pwError}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "#8A9BA8" }}>Current Password</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Your current password"
                className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
                style={{ borderColor: "rgba(13,59,68,0.15)", background: "#FAFAFA" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "#8A9BA8" }}>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
                style={{ borderColor: "rgba(13,59,68,0.15)", background: "#FAFAFA" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "#8A9BA8" }}>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
                style={{ borderColor: confirmPassword && confirmPassword !== newPassword ? "#E8604C" : "rgba(13,59,68,0.15)", background: "#FAFAFA" }} />
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-xs mt-1" style={{ color: "#E8604C" }}>Passwords do not match</p>
              )}
            </div>
            <button onClick={handlePasswordChange} disabled={pwSaving || !currentPassword || !newPassword || !confirmPassword}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}>
              {pwSaving ? <><Loader2 size={14} className="animate-spin" /> Updating...</> : "Update Password"}
            </button>
          </div>
        )}

        {!isEditing("password") && (
          <div className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "rgba(13,59,68,0.03)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(78,205,196,0.1)" }}>
              <Lock size={14} style={{ color: "#4ECDC4" }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "#0D3B44" }}>Password</p>
              <p className="text-xs" style={{ color: "#8A9BA8" }}>Last changed: unknown</p>
            </div>
            <div className="ml-auto">
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: "rgba(78,205,196,0.1)", color: "#2BA8A0" }}>
                Protected
              </span>
            </div>
          </div>
        )}
      </Section>

      {/* ── Contact preferences ── */}
      <div className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background: "rgba(13,59,68,0.03)", border: "1px solid rgba(13,59,68,0.07)" }}>
        <Mail size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#8A9BA8" }} />
        <p className="text-xs" style={{ color: "#8A9BA8" }}>
          To change your email address please contact{" "}
          <a href="mailto:support@valeoexperience.com"
            className="underline font-medium" style={{ color: "#0D3B44" }}>
            support@valeoexperience.com
          </a>
        </p>
      </div>

    </div>
  );
}
