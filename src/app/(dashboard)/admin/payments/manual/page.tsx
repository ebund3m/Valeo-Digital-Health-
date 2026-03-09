"use client";

import { useState, useEffect } from "react";
import {
  collection, getDocs, addDoc, query, orderBy,
  serverTimestamp, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import {
  CreditCard, Search, CheckCircle, AlertCircle,
  Loader2, DollarSign, User, FileText, Calendar,
  ChevronDown, Receipt,
} from "lucide-react";

interface PlatformUser {
  uid:         string;
  displayName: string;
  email:       string;
  role:        string;
}

interface ManualPayment {
  id:          string;
  clientId:    string;
  clientName:  string;
  clientEmail: string;
  amount:      number;
  method:      string;
  description: string;
  reference:   string;
  recordedBy:  string;
  createdAt:   any;
}

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Zelle", "PayPal", "Cheque", "Other"];

export default function ManualPaymentPage() {
  const { user } = useAuth();
  const [clients,  setClients]  = useState<PlatformUser[]>([]);
  const [payments, setPayments] = useState<ManualPayment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [form, setForm] = useState({
    clientId:    "",
    clientName:  "",
    clientEmail: "",
    amount:      "",
    method:      "Cash",
    description: "",
    reference:   "",
    date:        new Date().toISOString().slice(0, 10),
  });

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    (async () => {
      try {
        const [clientSnap, paySnap] = await Promise.all([
          getDocs(query(collection(db, "users"), where("role", "==", "client"))),
          getDocs(query(collection(db, "manualPayments"), orderBy("createdAt", "desc"))),
        ]);
        setClients(clientSnap.docs.map(d => ({ uid: d.id, ...d.data() }) as PlatformUser));
        setPayments(paySnap.docs.map(d => ({ id: d.id, ...d.data() }) as ManualPayment));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredClients = clients.filter(c =>
    c.displayName.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  function selectClient(c: PlatformUser) {
    setForm(f => ({ ...f, clientId: c.uid, clientName: c.displayName, clientEmail: c.email }));
    setSearch(c.displayName);
  }

  async function handleSubmit() {
    if (!form.clientId)       return showToast("error", "Please select a client.");
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
                               return showToast("error", "Enter a valid amount.");
    if (!form.description.trim()) return showToast("error", "Description is required.");

    setSaving(true);
    try {
      const payload = {
        clientId:    form.clientId,
        clientName:  form.clientName,
        clientEmail: form.clientEmail,
        amount:      Number(form.amount),
        method:      form.method,
        description: form.description.trim(),
        reference:   form.reference.trim(),
        date:        form.date,
        recordedBy:  user?.displayName ?? "Admin",
        createdAt:   serverTimestamp(),
        status:      "completed",
        type:        "manual",
        currency:    "USD",
      };
      const docRef = await addDoc(collection(db, "manualPayments"), payload);
      setPayments(prev => [{ id: docRef.id, ...payload, createdAt: new Date() } as ManualPayment, ...prev]);
      setForm({
        clientId: "", clientName: "", clientEmail: "",
        amount: "", method: "Cash", description: "", reference: "",
        date: new Date().toISOString().slice(0, 10),
      });
      setSearch("");
      showToast("success", `$${Number(form.amount).toFixed(2)} USD recorded for ${form.clientName}.`);
    } catch {
      showToast("error", "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm outline-none";
  const inputStyle = { background: "#F8F9FA", border: "1px solid rgba(26,26,46,0.1)", color: "#1A1A2E" };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-medium"
          style={{ background: toast.type === "success" ? "#1A1A2E" : "#E8604C", color: "white" }}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl" style={{ fontFamily: "var(--font-dm-serif)", color: "#1A1A2E" }}>
          Manual Payment
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "#8A9BA8" }}>
          Record offline or cash payments against a client account
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Form ── */}
        <div className="lg:col-span-3 rounded-2xl p-6 space-y-5"
          style={{ background: "white", boxShadow: "0 1px 4px rgba(26,26,46,0.07)" }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(232,96,76,0.1)" }}>
              <CreditCard size={16} style={{ color: "#E8604C" }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: "#1A1A2E" }}>Record Payment</h3>
          </div>

          {/* Client selector */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8A9BA8" }}>Client *</p>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10" style={{ color: "#8A9BA8" }} />
              <input type="text" value={search}
                onChange={e => { setSearch(e.target.value); setForm(f => ({ ...f, clientId: "", clientName: "", clientEmail: "" })); }}
                placeholder="Search client by name or email..."
                className={inputCls} style={{ ...inputStyle, paddingLeft: "40px" }} />
              {search && !form.clientId && filteredClients.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-30 py-1"
                  style={{ background: "white", boxShadow: "0 4px 20px rgba(26,26,46,0.15)", maxHeight: "200px", overflowY: "auto" }}>
                  {filteredClients.map(c => (
                    <button key={c.uid} onClick={() => selectClient(c)}
                      className="w-full text-left px-4 py-3 hover:bg-black/5 transition-colors">
                      <p className="text-sm font-medium" style={{ color: "#1A1A2E" }}>{c.displayName}</p>
                      <p className="text-xs" style={{ color: "#8A9BA8" }}>{c.email}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.clientId && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: "rgba(78,205,196,0.06)", border: "1px solid rgba(78,205,196,0.2)" }}>
                <CheckCircle size={13} style={{ color: "#4ECDC4" }} />
                <span className="text-xs font-medium" style={{ color: "#2BA8A0" }}>
                  {form.clientName} · {form.clientEmail}
                </span>
              </div>
            )}
          </div>

          {/* Amount + Method */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8A9BA8" }}>Amount (USD) *</p>
              <div className="relative">
                <DollarSign size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#8A9BA8" }} />
                <input type="number" min="0" step="0.01" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className={inputCls} style={{ ...inputStyle, paddingLeft: "40px" }} />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8A9BA8" }}>Payment Method</p>
              <div className="relative">
                <select value={form.method}
                  onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
                  className={inputCls} style={{ ...inputStyle, appearance: "none", paddingRight: "36px" }}>
                  {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#8A9BA8" }} />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8A9BA8" }}>Description *</p>
            <div className="relative">
              <FileText size={15} className="absolute left-3.5 top-3.5" style={{ color: "#8A9BA8" }} />
              <textarea value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} placeholder="e.g. Individual therapy session — March 8"
                className={inputCls + " resize-none"} style={{ ...inputStyle, paddingLeft: "40px" }} />
            </div>
          </div>

          {/* Reference + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8A9BA8" }}>Reference # <span style={{ color: "#C4C4C4", fontWeight: 400 }}>(optional)</span></p>
              <input type="text" value={form.reference}
                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                placeholder="e.g. INV-001"
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8A9BA8" }}>Payment Date</p>
              <div className="relative">
                <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#8A9BA8" }} />
                <input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className={inputCls} style={{ ...inputStyle, paddingLeft: "40px" }} />
              </div>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
            style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
            {saving ? "Recording…" : "Record Payment"}
          </button>
        </div>

        {/* ── Recent Manual Payments ── */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold" style={{ color: "#8A9BA8" }}>Recent Records</h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin" style={{ color: "#4ECDC4" }} />
            </div>
          ) : payments.length === 0 ? (
            <div className="rounded-2xl py-10 text-center"
              style={{ background: "white", boxShadow: "0 1px 4px rgba(26,26,46,0.07)" }}>
              <Receipt size={24} className="mx-auto mb-2" style={{ color: "#C4C4C4" }} />
              <p className="text-sm" style={{ color: "#8A9BA8" }}>No manual payments yet</p>
            </div>
          ) : (
            payments.slice(0, 8).map(p => (
              <div key={p.id} className="rounded-2xl p-4"
                style={{ background: "white", boxShadow: "0 1px 4px rgba(26,26,46,0.07)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "#1A1A2E" }}>{p.clientName}</p>
                    <p className="text-xs truncate" style={{ color: "#8A9BA8" }}>{p.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(26,26,46,0.06)", color: "#4A5568" }}>{p.method}</span>
                      {p.reference && (
                        <span className="text-xs" style={{ color: "#C4C4C4" }}>{p.reference}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: "#0D3B44" }}>
                      ${Number(p.amount).toFixed(2)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#C4C4C4" }}>
                      {p.createdAt?.toDate
                        ? p.createdAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        : new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
