"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";
import {
  useClientAppointments,
  bookAppointment,
  type Appointment,
} from "@/hooks/useAppointments";
import {
  Calendar, Clock, Plus, X, CheckCircle,
  AlertCircle, XCircle, Loader2, ChevronLeft,
  ChevronRight, Video, CreditCard, Lock,
} from "lucide-react";
export const dynamic = "force-dynamic";

// ── Config ─────────────────────────────────────────────────────────────────
const DOCTOR_ID   = "REPLACE_WITH_DR_MILLER_UID";
const DOCTOR_NAME = "Dr. Jozelle Miller";

const SESSION_TYPES = [
  { id: "individual",   label: "Individual Therapy", duration: 60, price: 400, description: "One-on-one therapy session" },
  { id: "couples",      label: "Couples Therapy",    duration: 90, price: 600, description: "Therapy for couples" },
  { id: "coaching",     label: "Life Coaching",      duration: 60, price: 350, description: "Goal-focused coaching session" },
  { id: "workplace",    label: "Workplace Wellness",  duration: 60, price: 500, description: "Workplace mental health support" },
  { id: "consultation", label: "Free Consultation",  duration: 15, price: 0,   description: "Initial 15-minute consultation" },
];

const TIME_SLOTS = [
  "9:00 AM","9:30 AM","10:00 AM","10:30 AM",
  "11:00 AM","11:30 AM","2:00 PM","2:30 PM",
  "3:00 PM","3:30 PM","4:00 PM","4:30 PM",
];

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Appointment["status"] }) {
  const styles = {
    pending:   { bg: "rgba(212,168,83,0.12)",  color: "#B8860B", label: "Pending",   Icon: Clock },
    approved:  { bg: "rgba(78,205,196,0.12)",  color: "#2BA8A0", label: "Confirmed", Icon: CheckCircle },
    rejected:  { bg: "rgba(232,96,76,0.12)",   color: "#E8604C", label: "Rejected",  Icon: XCircle },
    completed: { bg: "rgba(13,59,68,0.1)",     color: "#0D3B44", label: "Completed", Icon: CheckCircle },
    cancelled: { bg: "rgba(138,155,168,0.12)", color: "#8A9BA8", label: "Cancelled", Icon: XCircle },
  };
  const { bg, color, label, Icon } = styles[status];
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: bg, color }}>
      <Icon size={11} />{label}
    </span>
  );
}

// ── Appointment card ───────────────────────────────────────────────────────
function AppointmentCard({ appt }: { appt: Appointment }) {
  return (
    <div className="rounded-2xl p-5 flex items-start gap-4"
      style={{ background: "white", boxShadow: "0 1px 3px rgba(13,59,68,0.06)" }}>
      <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
        style={{ background: "rgba(13,59,68,0.06)" }}>
        <span className="text-xs font-bold" style={{ color: "#0D3B44" }}>
          {new Date(appt.date + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
        </span>
        <span className="text-lg font-bold leading-none" style={{ color: "#0D3B44" }}>
          {new Date(appt.date + "T12:00:00").getDate()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-semibold text-sm" style={{ color: "#0D3B44" }}>{appt.type}</p>
          <StatusBadge status={appt.status} />
        </div>
        <p className="text-xs mb-2" style={{ color: "#8A9BA8" }}>{DOCTOR_NAME}</p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs" style={{ color: "#4A5568" }}>
            <Clock size={11} />{appt.time}
          </span>
          <span className="flex items-center gap-1 text-xs" style={{ color: "#4A5568" }}>
            <Video size={11} />{appt.duration} min
          </span>
        </div>
        {appt.notes && (
          <p className="text-xs mt-2 italic" style={{ color: "#8A9BA8" }}>{appt.notes}</p>
        )}
      </div>
    </div>
  );
}

// ── Mini calendar ──────────────────────────────────────────────────────────
function MiniCalendar({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const [viewDate, setViewDate] = useState(new Date());
  const today = new Date(); today.setHours(0,0,0,0);
  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const cells: (number | null)[] = [];
  for (let i = 0; i < new Date(year, month, 1).getDay(); i++) cells.push(null);
  for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) cells.push(d);

  return (
    <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 1px 3px rgba(13,59,68,0.06)" }}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1 rounded-lg hover:bg-black/5">
          <ChevronLeft size={16} style={{ color: "#4A5568" }} />
        </button>
        <span className="text-sm font-semibold" style={{ color: "#0D3B44" }}>
          {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1 rounded-lg hover:bg-black/5">
          <ChevronRight size={16} style={{ color: "#4A5568" }} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-center text-xs font-medium py-1" style={{ color: "#8A9BA8" }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const d = new Date(year, month, day);
          const disabled = d < today || d.getDay() === 0 || d.getDay() === 6;
          const isSelected = dateStr === selected;
          return (
            <button key={day} disabled={disabled} onClick={() => onSelect(dateStr)}
              className="aspect-square flex items-center justify-center text-xs rounded-lg transition-all"
              style={{
                background: isSelected ? "#0D3B44" : "transparent",
                color: isSelected ? "white" : disabled ? "#C4C4C4" : "#22272B",
                cursor: disabled ? "not-allowed" : "pointer",
                fontWeight: isSelected ? 600 : 400,
              }}>
              {day}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-center mt-3" style={{ color: "#8A9BA8" }}>Weekends unavailable</p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
function ClientAppointmentsPageInner() {
  const { user }                    = useAuth();
  const { appointments, loading }   = useClientAppointments();
  const searchParams                = useSearchParams();

  const [showBooking, setShowBooking]     = useState(false);
  const [step, setStep]                   = useState<1|2|3|4>(1);
  const [selectedType, setSelectedType]   = useState("");
  const [selectedDate, setSelectedDate]   = useState("");
  const [selectedTime, setSelectedTime]   = useState("");
  const [notes, setNotes]                 = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [redirecting, setRedirecting]     = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [toast, setToast]                 = useState<{ type: "success"|"error"; msg: string } | null>(null);

  const selectedTypeObj = SESSION_TYPES.find(t => t.id === selectedType);

  // Handle return from WiPay
  useEffect(() => {
    const success = searchParams.get("success");
    const err     = searchParams.get("error");
    const free    = searchParams.get("free");

    if (success) {
      setToast({ type: "success", msg: free ? "Free consultation booked! Dr. Miller will be in touch." : "Payment successful! Your session is confirmed." });
    } else if (err === "payment_failed") {
      setToast({ type: "error", msg: "Payment was not completed. Please try again." });
    } else if (err) {
      setToast({ type: "error", msg: "Something went wrong. Please try again." });
    }

    if (toast) setTimeout(() => setToast(null), 5000);
  }, [searchParams]);

  function resetBooking() {
    setStep(1); setSelectedType(""); setSelectedDate(""); setSelectedTime("");
    setNotes(""); setError(null); setRedirecting(false); setShowBooking(false);
  }

  async function handleSubmit() {
    if (!user || !selectedType || !selectedDate || !selectedTime) return;
    setSubmitting(true); setError(null);

    try {
      // 1. Create the appointment with status "pending"
      const appointmentId = await bookAppointment({
        clientId:    user.uid,
        clientName:  user.displayName ?? "Client",
        clientEmail: user.email ?? "",
        doctorId:    DOCTOR_ID,
        type:        selectedTypeObj?.label ?? selectedType,
        date:        selectedDate,
        time:        selectedTime,
        duration:    selectedTypeObj?.duration ?? 60,
        ...(notes ? { notes } : {}),
      });

      // Free consultation — no payment needed
      if (selectedTypeObj?.price === 0) {
        const res = await fetch("/api/payments/initiate", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            appointmentId,
            clientId:    user.uid,
            clientName:  user.displayName ?? "Client",
            clientEmail: user.email ?? "",
            sessionType: selectedTypeObj?.label,
          }),
        });
        const data = await res.json();
        if (data.redirect) { window.location.href = data.redirect; return; }
      }

      // Paid session — move to payment step
      setStep(4);
      setSubmitting(false);

      // Initiate payment
      setRedirecting(true);
      const res = await fetch("/api/payments/initiate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          appointmentId,
          clientId:    user.uid,
          clientName:  user.displayName ?? "Client",
          clientEmail: user.email ?? "",
          sessionType: selectedTypeObj?.label,
        }),
      });
      const data = await res.json();
      if (data.redirect) {
        window.location.href = data.redirect;
      } else {
        setError("Could not initiate payment. Please try again.");
        setRedirecting(false);
      }

    } catch (err) {
      console.error("Booking error:", err);
      setError("Failed to book appointment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const upcoming = appointments.filter(a => ["pending","approved"].includes(a.status));
  const past     = appointments.filter(a => ["completed","rejected","cancelled"].includes(a.status));

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-medium"
          style={{
            background: toast.type === "success" ? "#0D3B44" : "#E8604C",
            color: "white",
          }}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl" style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}>
            Appointments
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "#8A9BA8" }}>
            Manage your sessions with {DOCTOR_NAME}
          </p>
        </div>
        <button onClick={() => { setShowBooking(true); setStep(1); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
          style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}>
          <Plus size={16} /> Book Session
        </button>
      </div>

      {/* Upcoming */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: "#8A9BA8" }}>
          Upcoming & Pending
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: "#4ECDC4" }} />
          </div>
        ) : upcoming.length === 0 ? (
          <div className="rounded-2xl p-8 text-center"
            style={{ background: "white", boxShadow: "0 1px 3px rgba(13,59,68,0.06)" }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "rgba(78,205,196,0.08)" }}>
              <Calendar size={24} style={{ color: "#4ECDC4" }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: "#0D3B44" }}>No upcoming sessions</p>
            <p className="text-xs mb-4" style={{ color: "#8A9BA8" }}>Book your first session to get started.</p>
            <button onClick={() => { setShowBooking(true); setStep(1); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}>
              <Plus size={14} /> Book First Session
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(a => <AppointmentCard key={a.id} appt={a} />)}
          </div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: "#8A9BA8" }}>
            Past Sessions
          </h3>
          <div className="space-y-3">
            {past.map(a => <AppointmentCard key={a.id} appt={a} />)}
          </div>
        </div>
      )}

      {/* Booking modal */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-2xl rounded-3xl overflow-hidden"
            style={{ background: "#FAF8F3", maxHeight: "90vh", overflowY: "auto" }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b"
              style={{ borderColor: "rgba(13,59,68,0.08)" }}>
              <div>
                <h3 className="text-xl" style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}>
                  {step === 4 ? "Processing Payment..." : "Book a Session"}
                </h3>
                {step !== 4 && (
                  <div className="flex items-center gap-2 mt-1">
                    {[1,2,3].map(s => (
                      <div key={s} className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: step >= s ? "#0D3B44" : "rgba(13,59,68,0.1)", color: step >= s ? "white" : "#8A9BA8" }}>
                          {s}
                        </div>
                        {s < 3 && <div className="w-6 h-0.5 rounded" style={{ background: step > s ? "#0D3B44" : "rgba(13,59,68,0.1)" }} />}
                      </div>
                    ))}
                    <span className="text-xs ml-1" style={{ color: "#8A9BA8" }}>
                      {step === 1 ? "Choose session type" : step === 2 ? "Pick date & time" : "Review & pay"}
                    </span>
                  </div>
                )}
              </div>
              {step !== 4 && (
                <button onClick={resetBooking} className="p-2 rounded-lg hover:bg-black/5">
                  <X size={18} style={{ color: "#4A5568" }} />
                </button>
              )}
            </div>

            <div className="p-6">

              {/* Step 4 — Payment redirect */}
              {step === 4 && (
                <div className="text-center py-10">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(13,59,68,0.06)" }}>
                    {redirecting
                      ? <Loader2 size={28} className="animate-spin" style={{ color: "#0D3B44" }} />
                      : <CreditCard size={28} style={{ color: "#0D3B44" }} />}
                  </div>
                  <h4 className="text-xl mb-2" style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}>
                    {redirecting ? "Redirecting to payment..." : "Ready to pay"}
                  </h4>
                  <p className="text-sm mb-1" style={{ color: "#4A5568" }}>
                    You will be securely redirected to WiPay to complete your payment of{" "}
                    <strong>TTD ${selectedTypeObj?.price}</strong>.
                  </p>
                  <p className="text-xs flex items-center justify-center gap-1 mt-4"
                    style={{ color: "#8A9BA8" }}>
                    <Lock size={11} /> Secured by WiPay · SSL encrypted
                  </p>
                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm mt-4"
                      style={{ background: "rgba(232,96,76,0.08)", color: "#E8604C" }}>
                      <AlertCircle size={15} />{error}
                    </div>
                  )}
                </div>
              )}

              {/* Step 1 — Session type */}
              {step === 1 && (
                <div className="space-y-3">
                  {SESSION_TYPES.map(type => (
                    <button key={type.id} onClick={() => setSelectedType(type.id)}
                      className="w-full text-left p-4 rounded-xl border-2 transition-all"
                      style={{
                        borderColor: selectedType === type.id ? "#0D3B44" : "rgba(13,59,68,0.1)",
                        background:  selectedType === type.id ? "rgba(13,59,68,0.04)" : "white",
                      }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "#0D3B44" }}>{type.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#8A9BA8" }}>{type.description}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className="text-sm font-bold" style={{ color: "#0D3B44" }}>
                            {type.price === 0 ? "Free" : `TTD $${type.price}`}
                          </p>
                          <p className="text-xs" style={{ color: "#8A9BA8" }}>{type.duration} min</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  <button disabled={!selectedType} onClick={() => setStep(2)}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-2 disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}>
                    Continue
                  </button>
                </div>
              )}

              {/* Step 2 — Date & time */}
              {step === 2 && (
                <div className="space-y-4">
                  <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} />
                  {selectedDate && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8A9BA8" }}>
                        Available times —{" "}
                        {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {TIME_SLOTS.map(time => (
                          <button key={time} onClick={() => setSelectedTime(time)}
                            className="py-2 rounded-lg text-xs font-medium border-2 transition-all"
                            style={{
                              borderColor: selectedTime === time ? "#0D3B44" : "rgba(13,59,68,0.12)",
                              background:  selectedTime === time ? "#0D3B44" : "white",
                              color:       selectedTime === time ? "white" : "#22272B",
                            }}>
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl text-sm font-semibold border-2"
                      style={{ borderColor: "rgba(13,59,68,0.15)", color: "#0D3B44" }}>Back</button>
                    <button disabled={!selectedDate || !selectedTime} onClick={() => setStep(3)}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}>Continue</button>
                  </div>
                </div>
              )}

              {/* Step 3 — Review & pay */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-2xl p-5 space-y-3"
                    style={{ background: "white", border: "1px solid rgba(13,59,68,0.08)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8A9BA8" }}>
                      Booking Summary
                    </p>
                    {[
                      { label: "Session",  value: selectedTypeObj?.label ?? "" },
                      { label: "Doctor",   value: DOCTOR_NAME },
                      { label: "Date",     value: new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) },
                      { label: "Time",     value: selectedTime },
                      { label: "Duration", value: `${selectedTypeObj?.duration} minutes` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b last:border-0"
                        style={{ borderColor: "rgba(13,59,68,0.06)" }}>
                        <span className="text-xs" style={{ color: "#8A9BA8" }}>{label}</span>
                        <span className="text-sm font-medium" style={{ color: "#0D3B44" }}>{value}</span>
                      </div>
                    ))}
                    {/* Price row */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm font-bold" style={{ color: "#0D3B44" }}>Total</span>
                      <span className="text-lg font-bold" style={{ color: "#0D3B44" }}>
                        {selectedTypeObj?.price === 0 ? "Free" : `TTD $${selectedTypeObj?.price}`}
                      </span>
                    </div>
                  </div>

                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    placeholder="Anything Dr. Miller should know before your session..."
                    className="w-full px-4 py-3 rounded-xl text-sm border resize-none focus:outline-none"
                    style={{ borderColor: "rgba(13,59,68,0.15)", background: "white" }} />

                  {/* Payment notice */}
                  {selectedTypeObj && selectedTypeObj.price > 0 && (
                    <div className="flex items-start gap-3 p-4 rounded-xl"
                      style={{ background: "rgba(78,205,196,0.06)", border: "1px solid rgba(78,205,196,0.2)" }}>
                      <Lock size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#4ECDC4" }} />
                      <p className="text-xs" style={{ color: "#4A5568" }}>
                        You will be redirected to <strong>WiPay</strong> to securely complete your payment of{" "}
                        <strong>TTD ${selectedTypeObj.price}</strong>. Your session will be confirmed upon payment.
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                      style={{ background: "rgba(232,96,76,0.08)", color: "#E8604C" }}>
                      <AlertCircle size={15} />{error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl text-sm font-semibold border-2"
                      style={{ borderColor: "rgba(13,59,68,0.15)", color: "#0D3B44" }}>Back</button>
                    <button disabled={submitting} onClick={handleSubmit}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}>
                      {submitting
                        ? <><Loader2 size={15} className="animate-spin" /> Processing...</>
                        : selectedTypeObj?.price === 0
                          ? "Confirm Booking"
                          : <><CreditCard size={15} /> Pay TTD ${selectedTypeObj?.price}</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Suspense wrapper (required for useSearchParams) ────────────────────────
export default function ClientAppointmentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: "#4ECDC4" }} />
      </div>
    }>
      <ClientAppointmentsPageInner />
    </Suspense>
  );
}
