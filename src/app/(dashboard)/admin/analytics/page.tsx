"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Users, Calendar, DollarSign, TrendingUp, TrendingDown,
  ClipboardList, MessageCircle, Activity, ArrowUpRight,
  Loader2, BarChart2, PieChart, Clock, CheckCircle,
  UserCheck, AlertCircle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface UserDoc {
  uid: string; role: string; createdAt: any; onboarded?: boolean;
}
interface Appointment {
  id: string; status: string; sessionType: string;
  createdAt: any; doctorId: string; clientId: string;
}
interface Payment {
  id: string; amount: number; status: string; createdAt: any;
}
interface Assessment {
  id: string; status: string; assignedAt: any; completedAt: any;
}
interface Message {
  id: string; createdAt: any;
}

// ── Colour palette ─────────────────────────────────────────────────────────
const COLORS = {
  ocean:  "#0D3B44",
  teal:   "#4ECDC4",
  teal2:  "#2BA8A0",
  coral:  "#E8604C",
  gold:   "#D4A853",
  slate:  "#8A9BA8",
  light:  "#F5EFE0",
};

const SESSION_COLORS: Record<string, string> = {
  "Individual Therapy":    COLORS.ocean,
  "Couples Therapy":       COLORS.teal,
  "Life Coaching":         COLORS.gold,
  "Workplace Wellness":    COLORS.coral,
  "Free Consultation":     COLORS.slate,
};

// ── Helpers ────────────────────────────────────────────────────────────────
function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(+y, +m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function last6MonthKeys(): string[] {
  const keys = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "TTD", maximumFractionDigits: 0 }).format(n);

// ── Sub-components ─────────────────────────────────────────────────────────

// KPI card
function KpiCard({ label, value, sub, accent, Icon, trend, trendLabel }: {
  label: string; value: string | number; sub?: string;
  accent: string; Icon: any; trend?: number | null; trendLabel?: string;
}) {
  const up = trend != null && trend >= 0;
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: accent + "15" }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
        {trend != null && (
          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
            style={{ background: up ? "rgba(43,168,160,0.1)" : "rgba(232,96,76,0.1)",
              color: up ? COLORS.teal2 : COLORS.coral }}>
            {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-dm-serif)", color: COLORS.ocean }}>
          {value}
        </p>
        <p className="text-xs mt-0.5" style={{ color: COLORS.slate }}>{label}</p>
        {sub && <p className="text-xs mt-1" style={{ color: "#C4C4C4" }}>{sub}</p>}
        {trendLabel && <p className="text-xs mt-0.5" style={{ color: COLORS.slate }}>{trendLabel}</p>}
      </div>
    </div>
  );
}

// Horizontal bar chart (no external library)
function HBar({ label, value, max, color, suffix = "" }: {
  label: string; value: number; max: number; color: string; suffix?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: "#4A5568" }}>{label}</span>
        <span className="font-semibold" style={{ color: COLORS.ocean }}>{value}{suffix}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(13,59,68,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// Trend line chart (SVG sparkline)
function SparkLine({ data, color = COLORS.teal, height = 56 }: {
  data: number[]; color?: string; height?: number;
}) {
  const max   = Math.max(...data, 1);
  const w     = 300;
  const pts   = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - (v / max) * (height - 8) - 4;
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  const area     = `${pts[0].split(",")[0]},${height} ${pts.join(" ")} ${pts[pts.length-1].split(",")[0]},${height}`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#grad-${color.replace("#","")})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = height - (v / max) * (height - 8) - 4;
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
    </svg>
  );
}

// Month bar chart
function MonthBars({ months, dataKey, color }: {
  months: { key: string; [k: string]: any }[];
  dataKey: string; color: string;
}) {
  const max = Math.max(...months.map(m => m[dataKey]), 1);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {months.map(m => {
        const pct = (m[dataKey] / max) * 100;
        return (
          <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-lg flex items-end" style={{ height: "56px" }}>
              <div className="w-full rounded-t-lg transition-all duration-700"
                style={{ height: `${Math.max(pct, 2)}%`, background: color, minHeight: m[dataKey] > 0 ? "4px" : "0" }} />
            </div>
            <span className="text-xs" style={{ color: "#C4C4C4", fontSize: "10px" }}>
              {monthLabel(m.key)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Donut chart (SVG)
function Donut({ segments, size = 100 }: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return (
    <div className="flex items-center justify-center rounded-full border-4"
      style={{ width: size, height: size, borderColor: "rgba(13,59,68,0.08)" }}>
      <span className="text-xs" style={{ color: "#C4C4C4" }}>No data</span>
    </div>
  );
  const r   = 36;
  const cx  = 50; const cy = 50;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(13,59,68,0.06)" strokeWidth="14" />
      {segments.map(seg => {
        const dash = (seg.value / total) * circ;
        const el = (
          <circle key={seg.label} cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color} strokeWidth="14"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
        );
        offset += dash;
        return el;
      })}
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: "14px", fontWeight: 700, fill: COLORS.ocean }}>
        {total}
      </text>
    </svg>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AdminAnalyticsPage() {
  const [users,       setUsers]       = useState<UserDoc[]>([]);
  const [appts,       setAppts]       = useState<Appointment[]>([]);
  const [payments,    setPayments]    = useState<Payment[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [period,      setPeriod]      = useState<"6m" | "3m" | "1m">("6m");

  useEffect(() => {
    (async () => {
      const [uSnap, aSnap, pSnap, asSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(query(collection(db, "appointments"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "payments"),    orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "assessments"), orderBy("assignedAt", "desc"))),
      ]);
      setUsers(uSnap.docs.map(d => ({ uid: d.id, ...d.data() }) as UserDoc));
      setAppts(aSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Appointment));
      setPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Payment));
      setAssessments(asSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Assessment));
      setLoading(false);
    })();
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────
  const now     = new Date();
  const months6 = last6MonthKeys();
  const months3 = months6.slice(3);
  const months1 = months6.slice(5);
  const activeMonths = period === "6m" ? months6 : period === "3m" ? months3 : months1;

  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  // Users
  const clients    = users.filter(u => u.role === "client");
  const doctors    = users.filter(u => u.role === "doctor");
  const newClientsThisMonth = clients.filter(u => {
    const d = toDate(u.createdAt); return d && monthKey(d) === thisMonth;
  }).length;
  const newClientsLastMonth = clients.filter(u => {
    const d = toDate(u.createdAt); return d && monthKey(d) === lastMonth;
  }).length;

  // Appointments
  const completedAppts  = appts.filter(a => a.status === "completed");
  const pendingAppts    = appts.filter(a => a.status === "pending");
  const cancelledAppts  = appts.filter(a => a.status === "cancelled");
  const apptThisMonth   = completedAppts.filter(a => { const d = toDate(a.createdAt); return d && monthKey(d) === thisMonth; }).length;
  const apptLastMonth   = completedAppts.filter(a => { const d = toDate(a.createdAt); return d && monthKey(d) === lastMonth; }).length;

  // Revenue
  const totalRevenue   = payments.filter(p => p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const revenueThisM   = payments.filter(p => p.status === "completed" && toDate(p.createdAt) && monthKey(toDate(p.createdAt)!) === thisMonth).reduce((s, p) => s + p.amount, 0);
  const revenueLastM   = payments.filter(p => p.status === "completed" && toDate(p.createdAt) && monthKey(toDate(p.createdAt)!) === lastMonth).reduce((s, p) => s + p.amount, 0);

  // Monthly breakdowns
  const monthlyData = useMemo(() => activeMonths.map(key => {
    const newClients  = clients.filter(u => { const d = toDate(u.createdAt); return d && monthKey(d) === key; }).length;
    const sessions    = completedAppts.filter(a => { const d = toDate(a.createdAt); return d && monthKey(d) === key; }).length;
    const revenue     = payments.filter(p => p.status === "completed" && toDate(p.createdAt) && monthKey(toDate(p.createdAt)!) === key).reduce((s, p) => s + p.amount, 0);
    const assessDone  = assessments.filter(a => { const d = toDate(a.completedAt); return d && monthKey(d) === key; }).length;
    return { key, newClients, sessions, revenue, assessDone };
  }), [activeMonths, clients, completedAppts, payments, assessments]);

  // Session type breakdown
  const sessionTypes = useMemo(() => {
    const counts: Record<string, number> = {};
    completedAppts.forEach(a => {
      const t = a.sessionType || "Other";
      counts[t] = (counts[t] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value, color: SESSION_COLORS[label] ?? COLORS.slate }));
  }, [completedAppts]);

  // Assessment completion rate
  const assessTotal     = assessments.length;
  const assessCompleted = assessments.filter(a => a.status === "completed").length;
  const assessRate      = assessTotal > 0 ? Math.round((assessCompleted / assessTotal) * 100) : 0;

  // Appointment completion rate
  const apptTotal = appts.length;
  const apptRate  = apptTotal > 0 ? Math.round((completedAppts.length / apptTotal) * 100) : 0;

  // Retention proxy: clients with >1 completed session
  const sessionsByClient: Record<string, number> = {};
  completedAppts.forEach(a => { sessionsByClient[a.clientId] = (sessionsByClient[a.clientId] ?? 0) + 1; });
  const returningClients = Object.values(sessionsByClient).filter(n => n > 1).length;
  const retentionRate    = clients.length > 0 ? Math.round((returningClients / clients.length) * 100) : 0;

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={28} className="animate-spin" style={{ color: COLORS.teal }} />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl" style={{ fontFamily: "var(--font-dm-serif)", color: COLORS.ocean }}>
            Analytics
          </h2>
          <p className="text-sm mt-0.5" style={{ color: COLORS.slate }}>
            Platform performance and clinical activity overview
          </p>
        </div>
        {/* Period selector */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(13,59,68,0.06)" }}>
          {(["1m", "3m", "6m"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: period === p ? "white" : "transparent",
                color:      period === p ? COLORS.ocean : COLORS.slate,
                boxShadow:  period === p ? "0 1px 3px rgba(13,59,68,0.1)" : "none",
              }}>
              {p === "1m" ? "1 Month" : p === "3m" ? "3 Months" : "6 Months"}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total Clients" Icon={Users} accent={COLORS.ocean}
          value={clients.length}
          sub={`+${newClientsThisMonth} this month`}
          trend={pctChange(newClientsThisMonth, newClientsLastMonth)}
        />
        <KpiCard
          label="Sessions Completed" Icon={Calendar} accent={COLORS.teal}
          value={completedAppts.length}
          sub={`${apptThisMonth} this month`}
          trend={pctChange(apptThisMonth, apptLastMonth)}
        />
        <KpiCard
          label="Total Revenue" Icon={DollarSign} accent={COLORS.gold}
          value={fmt(totalRevenue)}
          sub={`${fmt(revenueThisM)} this month`}
          trend={pctChange(revenueThisM, revenueLastM)}
        />
        <KpiCard
          label="Assessments Sent" Icon={ClipboardList} accent={COLORS.coral}
          value={assessTotal}
          sub={`${assessCompleted} completed · ${assessRate}% rate`}
        />
      </div>

      {/* ── Charts row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Sessions over time */}
        <div className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: COLORS.ocean }}>Sessions Over Time</p>
              <p className="text-xs" style={{ color: COLORS.slate }}>Completed appointments per month</p>
            </div>
            <BarChart2 size={16} style={{ color: COLORS.slate }} />
          </div>
          <MonthBars months={monthlyData} dataKey="sessions" color={COLORS.teal} />
          <div className="mt-3 flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: COLORS.slate }}>
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLORS.teal }} />
              Completed sessions
            </span>
          </div>
        </div>

        {/* Session type breakdown */}
        <div className="rounded-2xl p-5"
          style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: COLORS.ocean }}>Session Types</p>
              <p className="text-xs" style={{ color: COLORS.slate }}>All completed</p>
            </div>
            <PieChart size={16} style={{ color: COLORS.slate }} />
          </div>
          <div className="flex justify-center mb-4">
            <Donut segments={sessionTypes} size={100} />
          </div>
          <div className="space-y-2">
            {sessionTypes.length === 0 ? (
              <p className="text-xs text-center" style={{ color: "#C4C4C4" }}>No sessions yet</p>
            ) : sessionTypes.map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-xs truncate" style={{ color: "#4A5568", maxWidth: "130px" }}>{s.label}</span>
                </div>
                <span className="text-xs font-semibold" style={{ color: COLORS.ocean }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Charts row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue trend */}
        <div className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-sm font-semibold" style={{ color: COLORS.ocean }}>Revenue Trend</p>
              <p className="text-xs" style={{ color: COLORS.slate }}>TTD — completed payments</p>
            </div>
            <TrendingUp size={16} style={{ color: COLORS.slate }} />
          </div>
          <p className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-dm-serif)", color: COLORS.ocean }}>
            {fmt(totalRevenue)}
          </p>
          <SparkLine data={monthlyData.map(m => m.revenue)} color={COLORS.gold} />
          <div className="flex justify-between mt-2">
            {monthlyData.map(m => (
              <span key={m.key} className="text-xs" style={{ color: "#C4C4C4", fontSize: "10px" }}>
                {monthLabel(m.key)}
              </span>
            ))}
          </div>
        </div>

        {/* Client growth */}
        <div className="rounded-2xl p-5"
          style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-sm font-semibold" style={{ color: COLORS.ocean }}>Client Growth</p>
              <p className="text-xs" style={{ color: COLORS.slate }}>New registrations</p>
            </div>
            <UserCheck size={16} style={{ color: COLORS.slate }} />
          </div>
          <p className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-dm-serif)", color: COLORS.ocean }}>
            {clients.length}
          </p>
          <SparkLine data={monthlyData.map(m => m.newClients)} color={COLORS.ocean} />
          <div className="flex justify-between mt-2">
            {monthlyData.map(m => (
              <span key={m.key} className="text-xs" style={{ color: "#C4C4C4", fontSize: "10px" }}>
                {monthLabel(m.key)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Health metrics row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Platform health */}
        <div className="rounded-2xl p-5"
          style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: COLORS.ocean }}>Platform Health</p>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: "#4A5568" }}>Appointment completion</span>
                <span className="text-xs font-semibold" style={{ color: COLORS.ocean }}>{apptRate}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(13,59,68,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${apptRate}%`, background: COLORS.teal }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: "#4A5568" }}>Assessment completion</span>
                <span className="text-xs font-semibold" style={{ color: COLORS.ocean }}>{assessRate}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(13,59,68,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${assessRate}%`, background: COLORS.coral }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: "#4A5568" }}>Client retention</span>
                <span className="text-xs font-semibold" style={{ color: COLORS.ocean }}>{retentionRate}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(13,59,68,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${retentionRate}%`, background: COLORS.gold }} />
              </div>
            </div>
          </div>
        </div>

        {/* Appointment status */}
        <div className="rounded-2xl p-5"
          style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: COLORS.ocean }}>Appointment Status</p>
          <div className="space-y-3">
            {[
              { label:"Completed",  value: completedAppts.length,  color: COLORS.teal,  Icon: CheckCircle  },
              { label:"Pending",    value: pendingAppts.length,    color: COLORS.gold,  Icon: Clock        },
              { label:"Cancelled",  value: cancelledAppts.length,  color: COLORS.coral, Icon: AlertCircle  },
            ].map(({ label, value, color, Icon }) => (
              <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: color + "0D" }}>
                <Icon size={14} style={{ color }} />
                <span className="text-sm flex-1" style={{ color: "#4A5568" }}>{label}</span>
                <span className="text-sm font-bold" style={{ color: COLORS.ocean }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="rounded-2xl p-5"
          style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
          <p className="text-sm font-semibold mb-4" style={{ color: COLORS.ocean }}>Quick Stats</p>
          <div className="space-y-3">
            {[
              { label: "Active doctors",       value: doctors.length,          accent: COLORS.ocean  },
              { label: "Avg. sessions/client", value: clients.length > 0 ? (completedAppts.length / clients.length).toFixed(1) : "0", accent: COLORS.teal },
              { label: "Pending assessments",  value: assessments.filter(a => a.status === "pending").length, accent: COLORS.gold },
              { label: "Returning clients",    value: returningClients,         accent: COLORS.coral  },
              { label: "Total appointments",   value: appts.length,             accent: COLORS.slate  },
            ].map(({ label, value, accent }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b last:border-0"
                style={{ borderColor: "rgba(13,59,68,0.05)" }}>
                <span className="text-xs" style={{ color: "#4A5568" }}>{label}</span>
                <span className="text-sm font-bold" style={{ color: accent }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Assessment activity ── */}
      <div className="rounded-2xl p-5"
        style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: COLORS.ocean }}>Assessment Activity</p>
            <p className="text-xs" style={{ color: COLORS.slate }}>Assigned vs completed per month</p>
          </div>
          <Activity size={16} style={{ color: COLORS.slate }} />
        </div>
        <div className="space-y-3">
          {monthlyData.map(m => {
            const assigned = assessments.filter(a => {
              const d = toDate(a.assignedAt); return d && monthKey(d) === m.key;
            }).length;
            const completed = m.assessDone;
            const maxVal = Math.max(assigned, 1);
            return (
              <div key={m.key} className="grid grid-cols-[80px_1fr] gap-3 items-center">
                <span className="text-xs text-right" style={{ color: COLORS.slate }}>
                  {monthLabel(m.key)}
                </span>
                <div className="space-y-1">
                  <HBar label={`Assigned (${assigned})`} value={assigned} max={maxVal} color={COLORS.ocean + "90"} />
                  <HBar label={`Completed (${completed})`} value={completed} max={maxVal} color={COLORS.teal} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
