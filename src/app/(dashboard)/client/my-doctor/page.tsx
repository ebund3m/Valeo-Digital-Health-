// src/app/(dashboard)/client/my-doctor/page.tsx
"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import type { DoctorProfile } from "@/lib/matching";
import {
  Star, Globe, Clock, Users, CheckCircle, AlertCircle,
  MessageCircle, Calendar, RefreshCw, Loader2, ChevronRight,
  Heart, Award, BookOpen,
} from "lucide-react";

interface Assignment {
  clientId:        string;
  doctorId:        string;
  doctorName:      string;
  matchPercent:    number;
  assignedAt:      any;
  assignedBy:      string;
  status:          "active" | "inactive";
  switchRequested: boolean;
  switchReason?:   string;
  switchRequestedAt?: any;
}

export default function MyDoctorPage() {
  const { user }    = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [doctor,     setDoctor]     = useState<DoctorProfile | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [showSwitch, setShowSwitch] = useState(false);
  const [reason,     setReason]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const assignSnap = await getDoc(doc(db, "assignments", user.uid));
      if (!assignSnap.exists()) { setLoading(false); return; }
      const assign = assignSnap.data() as Assignment;
      setAssignment(assign);

      const doctorSnap = await getDoc(doc(db, "users", assign.doctorId));
      if (doctorSnap.exists()) setDoctor({ uid: doctorSnap.id, ...doctorSnap.data() } as DoctorProfile);
      setLoading(false);
    })();
  }, [user]);

  async function handleSwitchRequest() {
    if (!user || !reason.trim()) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, "assignments", user.uid), {
        switchRequested:    true,
        switchReason:       reason.trim(),
        switchRequestedAt:  serverTimestamp(),
      });
      setAssignment(a => a ? { ...a, switchRequested: true, switchReason: reason.trim() } : a);
      setSubmitted(true);
      setShowSwitch(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={28} className="animate-spin" style={{ color: "#4ECDC4" }} />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl" style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}>
          My Therapist
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "#8A9BA8" }}>
          Your assigned therapist and session information
        </p>
      </div>

      {/* No assignment yet */}
      {!assignment && (
        <div className="rounded-2xl p-10 text-center"
          style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "rgba(78,205,196,0.08)" }}>
            <Users size={24} style={{ color: "#4ECDC4" }} />
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: "#0D3B44" }}>No therapist assigned yet</p>
          <p className="text-xs mb-4" style={{ color: "#8A9BA8" }}>
            Complete your intake questionnaire to get matched with the right therapist.
          </p>
          <a href="/onboarding/intake"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}>
            Complete Intake <ChevronRight size={14} />
          </a>
        </div>
      )}

      {/* Doctor card */}
      {doctor && assignment && (
        <>
          {/* Switch request submitted banner */}
          {(assignment.switchRequested || submitted) && (
            <div className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: "rgba(212,168,83,0.08)", border: "1px solid rgba(212,168,83,0.2)" }}>
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#D4A853" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "#B8860B" }}>
                  Switch request submitted
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#8A9BA8" }}>
                  Our team will review your request and get back to you within 24 hours.
                </p>
              </div>
            </div>
          )}

          {/* Main doctor card */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>

            {/* Ocean header */}
            <div className="p-6 pb-16 relative"
              style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                    style={{ color: "rgba(78,205,196,0.8)" }}>Your Therapist</p>
                  <h3 className="text-2xl text-white"
                    style={{ fontFamily: "var(--font-dm-serif)" }}>
                    {doctor.title} {doctor.displayName}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: "rgba(78,205,196,0.15)" }}>
                  <Heart size={12} style={{ color: "#4ECDC4" }} />
                  <span className="text-xs font-semibold" style={{ color: "#4ECDC4" }}>
                    {assignment.matchPercent}% match
                  </span>
                </div>
              </div>
            </div>

            {/* Avatar overlapping */}
            <div className="px-6 relative" style={{ marginTop: "-40px" }}>
              {doctor.photoURL ? (
                <img src={doctor.photoURL} alt={doctor.displayName}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md" />
              ) : (
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold border-4 border-white shadow-md"
                  style={{ background: "rgba(78,205,196,0.15)", color: "#0D3B44" }}>
                  {doctor.displayName[0]}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 pt-4">
              {/* Bio */}
              <p className="text-sm leading-relaxed mb-5" style={{ color: "#4A5568" }}>
                {doctor.bio}
              </p>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: "Experience",   value: `${doctor.yearsExperience} years`,          Icon: Award       },
                  { label: "Languages",    value: doctor.languages.join(", "),                 Icon: Globe       },
                  { label: "Availability", value: `${doctor.maxClients - doctor.currentClients} spots open`, Icon: Users },
                  { label: "Sessions",     value: doctor.sessionTypes[0],                      Icon: Clock       },
                ].map(({ label, value, Icon }) => (
                  <div key={label} className="rounded-xl p-3 flex items-center gap-3"
                    style={{ background: "rgba(13,59,68,0.03)" }}>
                    <Icon size={14} style={{ color: "#4ECDC4" }} />
                    <div>
                      <p className="text-xs" style={{ color: "#8A9BA8" }}>{label}</p>
                      <p className="text-sm font-semibold" style={{ color: "#0D3B44" }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Specializations */}
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8A9BA8" }}>
                  Specializations
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {doctor.specializations.map(s => (
                    <span key={s} className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: "rgba(78,205,196,0.08)", color: "#0D3B44",
                        border: "1px solid rgba(78,205,196,0.2)" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Approaches */}
              {doctor.approaches?.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8A9BA8" }}>
                    Therapeutic Approaches
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {doctor.approaches.map(a => (
                      <span key={a} className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: "rgba(13,59,68,0.05)", color: "#4A5568" }}>
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2 border-t" style={{ borderColor: "rgba(13,59,68,0.06)" }}>
                <a href="/client/messages"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}>
                  <MessageCircle size={15} /> Message
                </a>
                <a href="/client/appointments"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(78,205,196,0.1)", color: "#2BA8A0" }}>
                  <Calendar size={15} /> Book Session
                </a>
              </div>
            </div>
          </div>

          {/* Request switch card */}
          {!assignment.switchRequested && !submitted && (
            <div className="rounded-2xl p-5"
              style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
              {!showSwitch ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#0D3B44" }}>
                      Not the right fit?
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#8A9BA8" }}>
                      You can request a different therapist at any time.
                    </p>
                  </div>
                  <button onClick={() => setShowSwitch(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border"
                    style={{ borderColor: "rgba(13,59,68,0.15)", color: "#0D3B44" }}>
                    <RefreshCw size={14} /> Request Switch
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "#0D3B44" }}>
                    Request a different therapist
                  </p>
                  <p className="text-xs mb-3" style={{ color: "#8A9BA8" }}>
                    Please share a bit about why you'd like to switch. This helps us find a better match.
                  </p>
                  <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                    placeholder="e.g. I feel I need someone who specialises more in anxiety..."
                    className="w-full px-4 py-3 rounded-xl text-sm border focus:outline-none resize-none mb-3"
                    style={{ borderColor: "rgba(13,59,68,0.15)", background: "#FAFAFA", color: "#22272B" }} />
                  <div className="flex gap-2">
                    <button onClick={() => setShowSwitch(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
                      style={{ borderColor: "rgba(13,59,68,0.12)", color: "#8A9BA8" }}>
                      Cancel
                    </button>
                    <button onClick={handleSwitchRequest} disabled={!reason.trim() || submitting}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}>
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle size={14} /> Submit Request</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
