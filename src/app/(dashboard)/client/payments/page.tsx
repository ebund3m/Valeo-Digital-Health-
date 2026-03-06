"use client";

import { useState, useEffect } from "react";
import {
  collection, query, where, getDocs, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  CreditCard, CheckCircle, Clock, AlertCircle,
  XCircle, Download, ChevronDown, ChevronUp,
  Loader2, Receipt, DollarSign, Calendar,
  ArrowUpRight, Lock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
type PaymentStatus = "pending" | "completed" | "failed" | "refunded" | "cancelled";

interface Payment {
  id:            string;
  clientId:      string;
  doctorId:      string;
  appointmentId: string;
  amount:        number;
  currency:      string;
  status:        PaymentStatus;
  sessionType:   string;
  sessionDate?:  string;
  reference?:    string;
  provider:      string;
  createdAt:     any;
  updatedAt:     any;
  receiptUrl?:   string;
}

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<PaymentStatus, {
  label: string; bg: string; color: string; Icon: any;
}> = {
  completed: { label:"Paid",       bg:"rgba(78,205,196,0.12)",  color:"#2BA8A0", Icon:CheckCircle },
  pending:   { label:"Pending",    bg:"rgba(212,168,83,0.12)",  color:"#B8860B", Icon:Clock       },
  failed:    { label:"Failed",     bg:"rgba(232,96,76,0.12)",   color:"#E8604C", Icon:XCircle     },
  refunded:  { label:"Refunded",   bg:"rgba(138,155,168,0.12)", color:"#8A9BA8", Icon:ArrowUpRight },
  cancelled: { label:"Cancelled",  bg:"rgba(138,155,168,0.12)", color:"#8A9BA8", Icon:XCircle     },
};

function StatusBadge({ status }: { status: PaymentStatus }) {
  const s = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const { Icon } = s;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <Icon size={10} />{s.label}
    </span>
  );
}

// ── Payment card ───────────────────────────────────────────────────────────
function PaymentCard({ payment }: { payment: Payment }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[payment.status] ?? STATUS_CONFIG.pending;

  const formattedDate = payment.createdAt?.toDate
    ? payment.createdAt.toDate().toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric", year: "numeric"
      })
    : "—";

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency", currency: payment.currency || "TTD",
  }).format(payment.amount);

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>

      {/* Main row */}
      <div className="flex items-center gap-4 p-5">
        {/* Icon */}
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: cfg.bg }}>
          <Receipt size={18} style={{ color: cfg.color }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: "#0D3B44" }}>
                {payment.sessionType || "Therapy Session"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#8A9BA8" }}>{formattedDate}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-base font-bold" style={{
                fontFamily: "var(--font-dm-serif)",
                color: payment.status === "refunded" ? "#8A9BA8" : "#0D3B44",
                textDecoration: payment.status === "refunded" ? "line-through" : "none",
              }}>
                {formattedAmount}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#C4C4C4" }}>{payment.currency || "TTD"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={payment.status} />
            {payment.reference && (
              <span className="text-xs font-mono" style={{ color: "#C4C4C4" }}>
                #{payment.reference.slice(-8).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-black/5 flex-shrink-0">
          {expanded
            ? <ChevronUp size={15} style={{ color: "#8A9BA8" }} />
            : <ChevronDown size={15} style={{ color: "#8A9BA8" }} />}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 pt-0 border-t" style={{ borderColor: "rgba(13,59,68,0.06)" }}>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: "Payment Provider", value: payment.provider || "WiPay" },
              { label: "Session Type",     value: payment.sessionType || "—" },
              { label: "Session Date",     value: payment.sessionDate
                  ? new Date(payment.sessionDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                  : "—" },
              { label: "Transaction Ref",  value: payment.reference || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-3"
                style={{ background: "rgba(13,59,68,0.02)" }}>
                <p className="text-xs" style={{ color: "#8A9BA8" }}>{label}</p>
                <p className="text-sm font-medium mt-0.5 truncate" style={{ color: "#0D3B44" }}>{value}</p>
              </div>
            ))}
          </div>

          {payment.status === "completed" && (
            <div className="mt-3 flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(78,205,196,0.06)", border: "1px solid rgba(78,205,196,0.15)" }}>
              <div className="flex items-center gap-2">
                <CheckCircle size={13} style={{ color: "#2BA8A0" }} />
                <p className="text-xs font-medium" style={{ color: "#2BA8A0" }}>Payment confirmed</p>
              </div>
              {payment.receiptUrl && (
                <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: "#0D3B44" }}>
                  <Download size={11} /> Receipt
                </a>
              )}
            </div>
          )}

          {payment.status === "failed" && (
            <div className="mt-3 px-3 py-2.5 rounded-xl flex items-center gap-2"
              style={{ background: "rgba(232,96,76,0.06)", border: "1px solid rgba(232,96,76,0.15)" }}>
              <AlertCircle size={13} style={{ color: "#E8604C" }} />
              <p className="text-xs" style={{ color: "#E8604C" }}>
                Payment was not processed. Please try booking again or contact support.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ClientPaymentsPage() {
  const { user } = useAuth();

  const [payments, setPayments]   = useState<Payment[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [filter,   setFilter]     = useState<"all" | PaymentStatus>("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDocs(
        query(
          collection(db, "payments"),
          where("clientId", "==", user.uid),
          orderBy("createdAt", "desc")
        )
      );
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Payment));
      setLoading(false);
    })();
  }, [user]);

  const filtered = payments.filter(p => filter === "all" || p.status === filter);

  // Aggregate stats
  const totalSpent = payments
    .filter(p => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalSessions = payments.filter(p => p.status === "completed").length;
  const pendingCount  = payments.filter(p => p.status === "pending").length;

  const formatCurrency = (amt: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "TTD" }).format(amt);

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl" style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}>
          Payments
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "#8A9BA8" }}>
          Your billing history and transaction records
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Spent",    value: formatCurrency(totalSpent), accent: "#0D3B44", Icon: DollarSign },
          { label: "Sessions Paid",  value: totalSessions,              accent: "#4ECDC4", Icon: Calendar   },
          { label: "Pending",        value: pendingCount,               accent: "#D4A853", Icon: Clock      },
        ].map(({ label, value, accent, Icon }) => (
          <div key={label} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: accent + "12" }}>
              <Icon size={16} style={{ color: accent }} />
            </div>
            <div>
              <p className="text-lg font-bold leading-none"
                style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}>
                {value}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#8A9BA8" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "completed", "pending", "failed", "refunded"] as const).map(f => {
          const count = f === "all" ? payments.length : payments.filter(p => p.status === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
              style={{
                background: filter === f ? "#0D3B44" : "white",
                color:      filter === f ? "white"   : "#4A5568",
                boxShadow:  filter === f ? "none"    : "0 1px 3px rgba(13,59,68,0.07)",
              }}>
              {f === "all" ? `All (${count})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${count})`}
            </button>
          );
        })}
      </div>

      {/* Payment list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin" style={{ color: "#4ECDC4" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "rgba(78,205,196,0.08)" }}>
            <CreditCard size={24} style={{ color: "#4ECDC4" }} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: "#0D3B44" }}>
            {filter === "all" ? "No payments yet" : `No ${filter} payments`}
          </p>
          <p className="text-xs" style={{ color: "#8A9BA8" }}>
            {filter === "all"
              ? "Payments will appear here after you book a session."
              : "Try viewing all payments."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => <PaymentCard key={p.id} payment={p} />)}
        </div>
      )}

      {/* Security note */}
      <div className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: "rgba(13,59,68,0.03)", border: "1px solid rgba(13,59,68,0.07)" }}>
        <Lock size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#8A9BA8" }} />
        <p className="text-xs" style={{ color: "#8A9BA8" }}>
          Payments are processed securely by WiPay. Valeo does not store your card details.
          For billing questions, contact <span style={{ color: "#0D3B44" }}>support@valeoexperience.com</span>
        </p>
      </div>
    </div>
  );
}
