"use client";

import { useState, useEffect } from "react";
import {
  collection, query, where, getDocs, addDoc,
  updateDoc, doc, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  ClipboardList, CheckCircle, Clock, AlertCircle,
  ChevronRight, X, Loader2, Send, Lock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
type QuestionType = "text" | "textarea" | "scale" | "multiChoice" | "yesNo";

interface Question {
  id:       string;
  type:     QuestionType;
  label:    string;
  required: boolean;
  options?: string[];   // for multiChoice
  min?:     number;     // for scale
  max?:     number;
}

interface AssessmentTemplate {
  id:          string;
  title:       string;
  description: string;
  questions:   Question[];
  createdBy:   string;
}

interface AssignedAssessment {
  id:           string;
  templateId:   string;
  templateTitle: string;
  clientId:     string;
  doctorId:     string;
  status:       "pending" | "completed";
  responses:    Record<string, string | number>;
  assignedAt:   any;
  completedAt:  any;
  dueDate?:     string;
}

// ── Scale input ────────────────────────────────────────────────────────────
function ScaleInput({ question, value, onChange }: {
  question: Question; value: number | ""; onChange: (v: number) => void;
}) {
  const min = question.min ?? 1;
  const max = question.max ?? 10;
  const steps = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map(n => (
          <button key={n} onClick={() => onChange(n)}
            className="w-9 h-9 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: value === n ? "#0D3B44" : "rgba(13,59,68,0.06)",
              color:      value === n ? "white"   : "#4A5568",
            }}>
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: "#8A9BA8" }}>Not at all</span>
        <span className="text-xs" style={{ color: "#8A9BA8" }}>Extremely</span>
      </div>
    </div>
  );
}

// ── Assessment form modal ──────────────────────────────────────────────────
function AssessmentModal({ assessment, template, onSubmit, onClose }: {
  assessment: AssignedAssessment;
  template:   AssessmentTemplate;
  onSubmit:   (responses: Record<string, string | number>) => Promise<void>;
  onClose:    () => void;
}) {
  const [responses, setResponses] = useState<Record<string, string | number>>(assessment.responses ?? {});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setResponse(id: string, value: string | number) {
    setResponses(r => ({ ...r, [id]: value }));
  }

  async function handleSubmit() {
    // Validate required fields
    const missing = template.questions.filter(q => q.required && !responses[q.id] && responses[q.id] !== 0);
    if (missing.length > 0) {
      setError(`Please answer all required questions (${missing.length} remaining).`); return;
    }
    setSubmitting(true);
    try {
      await onSubmit(responses);
      onClose();
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const answered  = template.questions.filter(q => responses[q.id] !== undefined && responses[q.id] !== "").length;
  const total     = template.questions.length;
  const progress  = total > 0 ? (answered / total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-2xl rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
        style={{ background: "#FAF8F3" }}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold"
                style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}>
                {template.title}
              </h3>
              <p className="text-sm mt-1" style={{ color: "#8A9BA8" }}>
                {template.description}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5 flex-shrink-0">
              <X size={18} style={{ color: "#4A5568" }} />
            </button>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs" style={{ color: "#8A9BA8" }}>{answered} of {total} answered</span>
            <span className="text-xs font-semibold" style={{ color: "#0D3B44" }}>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(13,59,68,0.08)" }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, #0D3B44, #4ECDC4)" }} />
          </div>
        </div>

        {/* Questions */}
        <div className="overflow-y-auto flex-1 px-6 pb-4 space-y-6">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(232,96,76,0.08)", color: "#E8604C" }}>
              <AlertCircle size={14} />{error}
            </div>
          )}

          {template.questions.map((q, i) => (
            <div key={q.id} className="rounded-2xl p-5"
              style={{ background: "white", boxShadow: "0 1px 3px rgba(13,59,68,0.06)" }}>
              <p className="text-sm font-semibold mb-1" style={{ color: "#0D3B44" }}>
                <span style={{ color: "#8A9BA8" }}>{i + 1}. </span>{q.label}
                {q.required && <span style={{ color: "#E8604C" }}> *</span>}
              </p>

              {q.type === "text" && (
                <input type="text" value={(responses[q.id] as string) ?? ""}
                  onChange={e => setResponse(q.id, e.target.value)}
                  placeholder="Your answer..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none mt-2"
                  style={{ borderColor: "rgba(13,59,68,0.15)", background: "#FAFAFA" }} />
              )}

              {q.type === "textarea" && (
                <textarea value={(responses[q.id] as string) ?? ""}
                  onChange={e => setResponse(q.id, e.target.value)}
                  rows={3} placeholder="Your answer..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm border resize-none focus:outline-none mt-2"
                  style={{ borderColor: "rgba(13,59,68,0.15)", background: "#FAFAFA" }} />
              )}

              {q.type === "scale" && (
                <div className="mt-3">
                  <ScaleInput question={q} value={responses[q.id] as number ?? ""}
                    onChange={v => setResponse(q.id, v)} />
                </div>
              )}

              {q.type === "yesNo" && (
                <div className="flex gap-3 mt-3">
                  {["Yes", "No"].map(opt => (
                    <button key={opt} onClick={() => setResponse(q.id, opt)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all"
                      style={{
                        borderColor: responses[q.id] === opt ? "#0D3B44" : "rgba(13,59,68,0.12)",
                        background:  responses[q.id] === opt ? "rgba(13,59,68,0.06)" : "white",
                        color:       responses[q.id] === opt ? "#0D3B44" : "#8A9BA8",
                      }}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {q.type === "multiChoice" && q.options && (
                <div className="space-y-2 mt-3">
                  {q.options.map(opt => (
                    <button key={opt} onClick={() => setResponse(q.id, opt)}
                      className="w-full text-left px-4 py-2.5 rounded-xl text-sm border-2 transition-all"
                      style={{
                        borderColor: responses[q.id] === opt ? "#0D3B44" : "rgba(13,59,68,0.12)",
                        background:  responses[q.id] === opt ? "rgba(13,59,68,0.06)" : "white",
                        color:       responses[q.id] === opt ? "#0D3B44" : "#4A5568",
                      }}>
                      {responses[q.id] === opt && <CheckCircle size={12} className="inline mr-2" style={{ color: "#4ECDC4" }} />}
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex-shrink-0 flex gap-3"
          style={{ borderColor: "rgba(13,59,68,0.08)" }}>
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold border-2"
            style={{ borderColor: "rgba(13,59,68,0.15)", color: "#0D3B44" }}>
            Save & Continue Later
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}>
            {submitting ? <><Loader2 size={14} className="animate-spin" />Submitting...</> : <><Send size={14} />Submit</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assessment card ────────────────────────────────────────────────────────
function AssessmentCard({ assessment, onOpen }: {
  assessment: AssignedAssessment; onOpen: () => void;
}) {
  const done = assessment.status === "completed";

  return (
    <button onClick={!done ? onOpen : undefined}
      className={`w-full text-left rounded-2xl p-5 transition-all ${!done ? "hover:-translate-y-0.5 cursor-pointer" : "cursor-default"}`}
      style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: done ? "rgba(78,205,196,0.1)" : "rgba(212,168,83,0.1)" }}>
          {done
            ? <CheckCircle size={20} style={{ color: "#4ECDC4" }} />
            : <ClipboardList size={20} style={{ color: "#D4A853" }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: "#0D3B44" }}>
              {assessment.templateTitle}
            </p>
            {!done && <ChevronRight size={16} className="flex-shrink-0" style={{ color: "#C4C4C4" }} />}
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                background: done ? "rgba(78,205,196,0.1)" : "rgba(212,168,83,0.1)",
                color:      done ? "#2BA8A0"             : "#B8860B",
              }}>
              {done ? <><CheckCircle size={10} /> Completed</> : <><Clock size={10} /> Pending</>}
            </span>
            {assessment.dueDate && !done && (
              <span className="text-xs" style={{ color: "#8A9BA8" }}>
                Due {new Date(assessment.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
            {done && assessment.completedAt?.toDate && (
              <span className="text-xs" style={{ color: "#8A9BA8" }}>
                Completed {assessment.completedAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
          {!done && (
            <p className="text-xs mt-2" style={{ color: "#8A9BA8" }}>
              Assigned by Dr. Miller · Tap to begin
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ClientAssessmentsPage() {
  const { user } = useAuth();

  const [assessments, setAssessments] = useState<AssignedAssessment[]>([]);
  const [templates,   setTemplates]   = useState<Record<string, AssessmentTemplate>>({});
  const [loading,     setLoading]     = useState(true);
  const [active,      setActive]      = useState<AssignedAssessment | null>(null);
  const [toast,       setToast]       = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg }); setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Load assigned assessments for this client
      const snap = await getDocs(
        query(
          collection(db, "assessments"),
          where("clientId", "==", user.uid),
          orderBy("assignedAt", "desc")
        )
      );
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }) as AssignedAssessment);
      setAssessments(loaded);

      // Load all unique templates
      const templateIds = [...new Set(loaded.map(a => a.templateId))];
      if (templateIds.length > 0) {
        const tSnaps = await Promise.all(
          templateIds.map(id => getDocs(query(collection(db, "assessmentTemplates"), where("__name__", "==", id))))
        );
        const tMap: Record<string, AssessmentTemplate> = {};
        tSnaps.forEach(s => s.docs.forEach(d => { tMap[d.id] = { id: d.id, ...d.data() } as AssessmentTemplate; }));
        setTemplates(tMap);
      }

      setLoading(false);
    })();
  }, [user]);

  async function handleSubmit(responses: Record<string, string | number>) {
    if (!active || !user) return;
    await updateDoc(doc(db, "assessments", active.id), {
      responses,
      status:      "completed",
      completedAt: serverTimestamp(),
    });
    setAssessments(prev => prev.map(a =>
      a.id === active.id
        ? { ...a, responses, status: "completed", completedAt: { toDate: () => new Date() } }
        : a
    ));
    showToast("success", "Assessment submitted successfully.");
  }

  const pending   = assessments.filter(a => a.status === "pending");
  const completed = assessments.filter(a => a.status === "completed");

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-medium"
          style={{ background: toast.type === "success" ? "#0D3B44" : "#E8604C", color: "white" }}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl" style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}>
          Assessments
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "#8A9BA8" }}>
          Forms and questionnaires assigned by Dr. Miller
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",     value: assessments.length, accent: "#0D3B44" },
          { label: "Pending",   value: pending.length,     accent: "#D4A853" },
          { label: "Completed", value: completed.length,   accent: "#4ECDC4" },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-2xl p-4 text-center"
            style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
            <p className="text-3xl font-semibold"
              style={{ fontFamily: "var(--font-dm-serif)", color: accent }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: "#8A9BA8" }}>{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin" style={{ color: "#4ECDC4" }} />
        </div>
      ) : assessments.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "rgba(78,205,196,0.08)" }}>
            <ClipboardList size={24} style={{ color: "#4ECDC4" }} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: "#0D3B44" }}>No assessments yet</p>
          <p className="text-xs" style={{ color: "#8A9BA8" }}>
            Dr. Miller will assign assessments here when needed.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} style={{ color: "#D4A853" }} />
                <h3 className="text-sm font-semibold" style={{ color: "#0D3B44" }}>
                  Needs Attention ({pending.length})
                </h3>
              </div>
              <div className="space-y-3">
                {pending.map(a => (
                  <AssessmentCard key={a.id} assessment={a}
                    onOpen={() => setActive(a)} />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={14} style={{ color: "#4ECDC4" }} />
                <h3 className="text-sm font-semibold" style={{ color: "#0D3B44" }}>
                  Completed ({completed.length})
                </h3>
              </div>
              <div className="space-y-3">
                {completed.map(a => (
                  <AssessmentCard key={a.id} assessment={a} onOpen={() => {}} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Privacy note */}
      <div className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: "rgba(13,59,68,0.03)", border: "1px solid rgba(13,59,68,0.07)" }}>
        <Lock size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#8A9BA8" }} />
        <p className="text-xs" style={{ color: "#8A9BA8" }}>
          Your responses are confidential and only visible to Dr. Miller. They help personalise your care.
        </p>
      </div>

      {/* Modal */}
      {active && templates[active.templateId] && (
        <AssessmentModal
          assessment={active}
          template={templates[active.templateId]}
          onSubmit={handleSubmit}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}
