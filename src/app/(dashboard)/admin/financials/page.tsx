"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection, getDocs, orderBy, query, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DollarSign, TrendingUp, TrendingDown, Users,
  Search, X, Loader2, CheckCircle, Clock,
  XCircle, ArrowUpRight, Filter, Download,
  Calendar, CreditCard, AlertCircle, BarChart2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
type PaymentStatus = "pending" | "completed" | "failed" | "refunded" | "cancelled";

interface Payment {
  id:            string;
  clientId:      string;
  clientName?:   string;
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
}

interface UserDoc { uid: string; displayName: string; email: string; role: string; }

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<PaymentStatus, { label:string; bg:string; color:string; Icon:any }> = {
  completed: { label:"Paid",      bg:"rgba(78,205,196,0.12)",  color:"#2BA8A0", Icon:CheckCircle  },
  pending:   { label:"Pending",   bg:"rgba(212,168,83,0.12)",  color:"#B8860B", Icon:Clock        },
  failed:    { label:"Failed",    bg:"rgba(232,96,76,0.12)",   color:"#E8604C", Icon:XCircle      },
  refunded:  { label:"Refunded",  bg:"rgba(138,155,168,0.12)", color:"#8A9BA8", Icon:ArrowUpRight },
  cancelled: { label:"Cancelled", bg:"rgba(138,155,168,0.12)", color:"#8A9BA8", Icon:XCircle      },
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

// ── Mini sparkline bar ─────────────────────────────────────────────────────
function MonthlyBar({ label, value, max }: { label:string; value:number; max:number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-8 rounded-t-lg flex items-end justify-center"
        style={{ height: "48px", background: "rgba(13,59,68,0.05)" }}>
        <div className="w-full rounded-t-lg transition-all"
          style={{ height: `${pct}%`, background: "linear-gradient(180deg, #4ECDC4, #0D3B44)", minHeight: pct > 0 ? "4px" : "0" }} />
      </div>
      <span className="text-xs" style={{ color: "#C4C4C4" }}>{label}</span>
    </div>
  );
}

// ── Revenue chart strip ────────────────────────────────────────────────────
function RevenueChart({ payments }: { payments: Payment[] }) {
  const months = useMemo(() => {
    const now    = new Date();
    const result: { label:string; value:number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short" });
      const value = payments
        .filter(p => {
          if (p.status !== "completed" || !p.createdAt?.toDate) return false;
          const pd = p.createdAt.toDate();
          return `${pd.getFullYear()}-${String(pd.getMonth()+1).padStart(2,"0")}` === key;
        })
        .reduce((sum, p) => sum + p.amount, 0);
      result.push({ label, value });
    }
    return result;
  }, [payments]);

  const max = Math.max(...months.map(m => m.value), 1);

  return (
    <div className="rounded-2xl p-5" style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: "#0D3B44" }}>Monthly Revenue</p>
          <p className="text-xs" style={{ color: "#8A9BA8" }}>Last 6 months — completed payments</p>
        </div>
        <BarChart2 size={18} style={{ color: "#8A9BA8" }} />
      </div>
      <div className="flex items-end gap-2 justify-between">
        {months.map(m => (
          <div key={m.label} className="flex-1">
            <MonthlyBar label={m.label} value={m.value} max={max} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Export CSV helper ──────────────────────────────────────────────────────
function exportCSV(payments: Payment[]) {
  const headers = ["Date","Client","Session Type","Amount","Currency","Status","Reference","Provider"];
  const rows    = payments.map(p => [
    p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : "",
    p.clientName ?? p.clientId,
    p.sessionType ?? "",
    p.amount,
    p.currency ?? "TTD",
    p.status,
    p.reference ?? "",
    p.provider ?? "WiPay",
  ]);
  const csv = [headers, ...rows].map(r => r.map(String).map(v => `"${v.replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a"); a.href = url;
  a.download = `valeo-payments-${new Date().toISOString().split("T")[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users,    setUsers]    = useState<Record<string, UserDoc>>({});
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<"all" | PaymentStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    (async () => {
      const [paySnap, userSnap] = await Promise.all([
        getDocs(query(collection(db, "payments"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "users")),
      ]);

      const userMap: Record<string, UserDoc> = {};
      userSnap.docs.forEach(d => { userMap[d.id] = { uid: d.id, ...d.data() } as UserDoc; });
      setUsers(userMap);

      const loaded = paySnap.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          ...data,
          clientName: userMap[data.clientId]?.displayName ?? "Unknown Client",
        } as Payment;
      });
      setPayments(loaded);
      setLoading(false);
    })();
  }, []);

  // ── Metrics ──────────────────────────────────────────────────────────────
  const revenue      = payments.filter(p => p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const refunded     = payments.filter(p => p.status === "refunded").reduce((s, p) => s + p.amount, 0);
  const pendingTotal = payments.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const uniqueClients = new Set(payments.filter(p => p.status === "completed").map(p => p.clientId)).size;

  const now   = new Date();
  const thisM = payments.filter(p => {
    if (p.status !== "completed" || !p.createdAt?.toDate) return false;
    const d = p.createdAt.toDate();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, p) => s + p.amount, 0);

  const lastM = payments.filter(p => {
    if (p.status !== "completed" || !p.createdAt?.toDate) return false;
    const d   = p.createdAt.toDate();
    const lm  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  }).reduce((s, p) => s + p.amount, 0);

  const monthGrowth = lastM > 0 ? Math.round(((thisM - lastM) / lastM) * 100) : null;

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style:"currency", currency:"TTD", maximumFractionDigits:0 }).format(n);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => payments.filter(p => {
    const matchStatus = filter === "all" || p.status === filter;
    const matchSearch = !search ||
      (p.clientName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.sessionType ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.reference ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFrom = !dateFrom || (p.createdAt?.toDate && p.createdAt.toDate() >= new Date(dateFrom));
    const matchTo   = !dateTo   || (p.createdAt?.toDate && p.createdAt.toDate() <= new Date(dateTo + "T23:59:59"));
    return matchStatus && matchSearch && matchFrom && matchTo;
  }), [payments, filter, search, dateFrom, dateTo]);

  const filteredRevenue = filtered.filter(p => p.status === "completed").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl" style={{ fontFamily: "var(--font-dm-serif)", color: "#1A1A2E" }}>
            Financials
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "#8A9BA8" }}>
            Platform revenue, transactions, and billing overview
          </p>
        </div>
        <button onClick={() => exportCSV(filtered)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 hover:-translate-y-0.5 transition-all"
          style={{ borderColor: "rgba(26,26,46,0.15)", color: "#1A1A2E" }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label:   "Total Revenue",
            value:   fmt(revenue),
            sub:     `${fmt(thisM)} this month`,
            accent:  "#0D3B44",
            Icon:    DollarSign,
            trend:   monthGrowth,
          },
          {
            label:   "Pending",
            value:   fmt(pendingTotal),
            sub:     `${payments.filter(p=>p.status==="pending").length} transactions`,
            accent:  "#D4A853",
            Icon:    Clock,
            trend:   null,
          },
          {
            label:   "Refunded",
            value:   fmt(refunded),
            sub:     `${payments.filter(p=>p.status==="refunded").length} transactions`,
            accent:  "#8A9BA8",
            Icon:    ArrowUpRight,
            trend:   null,
          },
          {
            label:   "Paying Clients",
            value:   uniqueClients,
            sub:     `${payments.filter(p=>p.status==="completed").length} paid sessions`,
            accent:  "#4ECDC4",
            Icon:    Users,
            trend:   null,
          },
        ].map(({ label, value, sub, accent, Icon, trend }) => (
          <div key={label} className="rounded-2xl p-5"
            style={{ background: "white", boxShadow: "0 1px 4px rgba(26,26,46,0.07)" }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: accent + "12" }}>
                <Icon size={16} style={{ color: accent }} />
              </div>
              {trend !== null && (
                <span className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: trend >= 0 ? "#2BA8A0" : "#E8604C" }}>
                  {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-dm-serif)", color: "#1A1A2E" }}>
              {value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#8A9BA8" }}>{label}</p>
            <p className="text-xs mt-1" style={{ color: "#C4C4C4" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <RevenueChart payments={payments} />

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#8A9BA8" }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by client, session type, or reference..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none"
              style={{ borderColor: "rgba(26,26,46,0.12)", background: "white" }} />
            {search && <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2"><X size={13} style={{ color: "#8A9BA8" }} /></button>}
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all"
            style={{
              borderColor: showFilters ? "#1A1A2E" : "rgba(26,26,46,0.12)",
              background:  showFilters ? "rgba(26,26,46,0.04)" : "white",
              color: "#1A1A2E",
            }}>
            <Filter size={14} /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 rounded-2xl"
            style={{ background: "white", boxShadow: "0 1px 4px rgba(26,26,46,0.07)" }}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "#8A9BA8" }}>Status</label>
              <div className="flex gap-2 flex-wrap">
                {(["all","completed","pending","failed","refunded"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize"
                    style={{
                      background: filter === f ? "#1A1A2E" : "rgba(26,26,46,0.04)",
                      color:      filter === f ? "white"   : "#4A5568",
                    }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "#8A9BA8" }}>Date From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs border focus:outline-none"
                style={{ borderColor: "rgba(26,26,46,0.12)", background: "#FAFAFA" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "#8A9BA8" }}>Date To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs border focus:outline-none"
                style={{ borderColor: "rgba(26,26,46,0.12)", background: "#FAFAFA" }} />
            </div>
            {(search || filter !== "all" || dateFrom || dateTo) && (
              <div className="flex items-end">
                <button onClick={() => { setSearch(""); setFilter("all"); setDateFrom(""); setDateTo(""); }}
                  className="text-xs font-semibold hover:underline" style={{ color: "#E8604C" }}>
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "white", boxShadow: "0 1px 4px rgba(26,26,46,0.07)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin" style={{ color: "#4ECDC4" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <CreditCard size={24} className="mx-auto mb-3" style={{ color: "#4ECDC4" }} />
            <p className="text-sm font-medium" style={{ color: "#1A1A2E" }}>No transactions found</p>
            <p className="text-xs mt-1" style={{ color: "#8A9BA8" }}>Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(26,26,46,0.07)" }}>
                    {[
                      { label: "Client",       cls: "" },
                      { label: "Session",      cls: "hidden sm:table-cell" },
                      { label: "Date",         cls: "hidden md:table-cell" },
                      { label: "Amount",       cls: "" },
                      { label: "Status",       cls: "" },
                      { label: "Reference",    cls: "hidden lg:table-cell" },
                    ].map(({ label, cls }) => (
                      <th key={label}
                        className={`text-left py-3 px-4 first:px-5 last:px-5 text-xs font-semibold uppercase tracking-wider ${cls}`}
                        style={{ color: "#8A9BA8" }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b hover:bg-black/[0.015] transition-colors"
                      style={{ borderColor: "rgba(26,26,46,0.05)" }}>
                      {/* Client */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: "rgba(13,59,68,0.07)", color: "#0D3B44" }}>
                            {(p.clientName ?? "?")[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: "#1A1A2E" }}>{p.clientName ?? "—"}</p>
                            <p className="text-xs" style={{ color: "#C4C4C4" }}>
                              {users[p.clientId]?.email ?? ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* Session */}
                      <td className="py-3.5 px-4 hidden sm:table-cell">
                        <p className="text-sm" style={{ color: "#4A5568" }}>{p.sessionType || "—"}</p>
                      </td>
                      {/* Date */}
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <p className="text-sm" style={{ color: "#4A5568" }}>
                          {p.createdAt?.toDate
                            ? p.createdAt.toDate().toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })
                            : "—"}
                        </p>
                      </td>
                      {/* Amount */}
                      <td className="py-3.5 px-4">
                        <p className="text-sm font-semibold"
                          style={{ color: p.status === "refunded" ? "#8A9BA8" : "#1A1A2E",
                            textDecoration: p.status === "refunded" ? "line-through" : "none" }}>
                          {new Intl.NumberFormat("en-US",{style:"currency",currency:p.currency||"TTD"}).format(p.amount)}
                        </p>
                      </td>
                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={p.status} />
                      </td>
                      {/* Reference */}
                      <td className="py-3.5 px-5 hidden lg:table-cell">
                        <p className="text-xs font-mono" style={{ color: "#C4C4C4" }}>
                          {p.reference ? `#${p.reference.slice(-10).toUpperCase()}` : "—"}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div className="px-5 py-3.5 border-t flex items-center justify-between flex-wrap gap-2"
              style={{ borderColor: "rgba(26,26,46,0.06)" }}>
              <p className="text-xs" style={{ color: "#8A9BA8" }}>
                {filtered.length} transaction{filtered.length !== 1 ? "s" : ""} · {filter !== "all" || dateFrom || dateTo ? "filtered" : "all time"}
              </p>
              <p className="text-sm font-semibold" style={{ color: "#1A1A2E" }}>
                Filtered revenue:{" "}
                <span style={{ color: "#2BA8A0" }}>{fmt(filteredRevenue)}</span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
