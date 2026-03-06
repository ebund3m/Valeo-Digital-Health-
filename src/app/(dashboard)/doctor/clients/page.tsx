"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  Search, Users, Calendar, Clock, ChevronRight,
  Loader2, Mail, Phone, MapPin, Heart, X, CheckCircle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface Client {
  uid:          string;
  displayName:  string;
  email:        string;
  phone:        string;
  city:         string;
  country:      string;
  goals:        string[];
  preferredTime: string;
  emergencyContact: { name: string; phone: string };
  createdAt:    any;
}

interface Appointment {
  id:       string;
  type:     string;
  date:     string;
  time:     string;
  duration: number;
  status:   "pending" | "approved" | "rejected" | "completed" | "cancelled";
  notes?:   string;
}

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Appointment["status"] }) {
  const map = {
    pending:   { bg: "rgba(212,168,83,0.12)",  color: "#B8860B", label: "Pending"   },
    approved:  { bg: "rgba(78,205,196,0.12)",  color: "#2BA8A0", label: "Confirmed" },
    rejected:  { bg: "rgba(232,96,76,0.12)",   color: "#E8604C", label: "Rejected"  },
    completed: { bg: "rgba(13,59,68,0.1)",     color: "#0D3B44", label: "Completed" },
    cancelled: { bg: "rgba(138,155,168,0.12)", color: "#8A9BA8", label: "Cancelled" },
  };
  const s = map[status];
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── Client drawer ──────────────────────────────────────────────────────────
function ClientDrawer({ client, appointments, onClose }: {
  client: Client; appointments: Appointment[]; onClose: () => void;
}) {
  const upcoming  = appointments.filter(a => ["pending","approved"].includes(a.status));
  const completed = appointments.filter(a => a.status === "completed");

  return (
    <div className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-md h-full overflow-y-auto"
        style={{ background: "#FAF8F3", boxShadow: "-4px 0 24px rgba(0,0,0,0.1)" }}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ background: "#FAF8F3", borderColor: "rgba(13,59,68,0.08)" }}>
          <h3 className="font-semibold" style={{ color: "#0D3B44" }}>Client Profile</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5">
            <X size={18} style={{ color: "#4A5568" }} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)", color: "white" }}>
              {client.displayName?.[0]?.toUpperCase() ?? "C"}
            </div>
            <div>
              <p className="font-semibold text-lg"
                style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}>
                {client.displayName}
              </p>
              <p className="text-xs" style={{ color: "#8A9BA8" }}>
                Client since {client.createdAt?.toDate
                  ? client.createdAt.toDate().toLocaleDateString("en-US", { month: "long", year: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total",     value: appointments.length, accent: "#0D3B44" },
              { label: "Upcoming",  value: upcoming.length,     accent: "#4ECDC4" },
              { label: "Completed", value: completed.length,    accent: "#D4A853" },
            ].map(({ label, value, accent }) => (
              <div key={label} className="rounded-xl p-3 text-center"
                style={{ background: "white", boxShadow: "0 1px 3px rgba(13,59,68,0.06)" }}>
                <p className="text-2xl font-semibold"
                  style={{ fontFamily: "var(--font-dm-serif)", color: accent }}>
                  {value}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#8A9BA8" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="rounded-2xl p-4 space-y-3"
            style={{ background: "white", boxShadow: "0 1px 3px rgba(13,59,68,0.06)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#8A9BA8" }}>Contact</p>
            {[
              { Icon: Mail,   val: client.email,  fallback: "No email" },
              { Icon: Phone,  val: client.phone,  fallback: "No phone" },
              { Icon: MapPin, val: [client.city, client.country].filter(Boolean).join(", "), fallback: "No location" },
            ].map(({ Icon, val, fallback }) => (
              <div key={fallback} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(13,59,68,0.05)" }}>
                  <Icon size={13} style={{ color: "#8A9BA8" }} />
                </div>
                <p className="text-sm" style={{ color: val ? "#22272B" : "#C4C4C4" }}>
                  {val || fallback}
                </p>
              </div>
            ))}
          </div>

          {/* Goals */}
          {client.goals?.length > 0 && (
            <div className="rounded-2xl p-4"
              style={{ background: "white", boxShadow: "0 1px 3px rgba(13,59,68,0.06)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Heart size={13} style={{ color: "#4ECDC4" }} />
                <p className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "#8A9BA8" }}>Wellness Goals</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {client.goals.map(g => (
                  <span key={g} className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ background: "rgba(78,205,196,0.1)", color: "#2BA8A0" }}>
                    {g}
                  </span>
                ))}
              </div>
              {client.preferredTime && (
                <p className="text-xs mt-3" style={{ color: "#8A9BA8" }}>
                  Prefers {client.preferredTime === "morning" ? "morning" : "afternoon"} sessions
                </p>
              )}
            </div>
          )}

          {/* Emergency contact */}
          {client.emergencyContact?.name && (
            <div className="rounded-2xl p-4"
              style={{ background: "rgba(232,96,76,0.04)", border: "1px solid rgba(232,96,76,0.12)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "#8A9BA8" }}>Emergency Contact</p>
              <p className="text-sm font-medium" style={{ color: "#0D3B44" }}>
                {client.emergencyContact.name}
              </p>
              <p className="text-xs" style={{ color: "#8A9BA8" }}>
                {client.emergencyContact.phone}
              </p>
            </div>
          )}

          {/* Session history */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "#8A9BA8" }}>Session History</p>
            {appointments.length === 0 ? (
              <div className="rounded-xl p-6 text-center"
                style={{ background: "white", boxShadow: "0 1px 3px rgba(13,59,68,0.06)" }}>
                <p className="text-sm" style={{ color: "#C4C4C4" }}>No sessions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {appointments.map(appt => (
                  <div key={appt.id} className="rounded-xl p-4 flex items-center gap-3"
                    style={{ background: "white", boxShadow: "0 1px 3px rgba(13,59,68,0.06)" }}>
                    <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(13,59,68,0.05)" }}>
                      <span className="text-xs font-bold leading-none" style={{ color: "#0D3B44" }}>
                        {new Date(appt.date + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-sm font-bold leading-none" style={{ color: "#0D3B44" }}>
                        {new Date(appt.date + "T12:00:00").getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#0D3B44" }}>
                        {appt.type}
                      </p>
                      <p className="text-xs" style={{ color: "#8A9BA8" }}>
                        {appt.time} · {appt.duration} min
                      </p>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Client card ────────────────────────────────────────────────────────────
function ClientCard({ client, apptCount, lastAppt, onClick }: {
  client: Client; apptCount: number;
  lastAppt: Appointment | null; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="w-full text-left rounded-2xl p-5 transition-all hover:-translate-y-0.5"
      style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)", color: "white" }}>
          {client.displayName?.[0]?.toUpperCase() ?? "C"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm" style={{ color: "#0D3B44" }}>
                {client.displayName}
              </p>
              <p className="text-xs mt-0.5 truncate" style={{ color: "#8A9BA8" }}>
                {client.email}
              </p>
            </div>
            <ChevronRight size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#C4C4C4" }} />
          </div>
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1 text-xs" style={{ color: "#8A9BA8" }}>
              <Calendar size={11} />
              {apptCount} session{apptCount !== 1 ? "s" : ""}
            </span>
            {client.city && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "#8A9BA8" }}>
                <MapPin size={11} />{client.city}
              </span>
            )}
            {lastAppt && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "#8A9BA8" }}>
                <Clock size={11} />
                {new Date(lastAppt.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
          {client.goals?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {client.goals.slice(0, 2).map(g => (
                <span key={g} className="px-2 py-0.5 rounded-full text-xs"
                  style={{ background: "rgba(78,205,196,0.08)", color: "#2BA8A0" }}>
                  {g}
                </span>
              ))}
              {client.goals.length > 2 && (
                <span className="px-2 py-0.5 rounded-full text-xs"
                  style={{ background: "rgba(13,59,68,0.05)", color: "#8A9BA8" }}>
                  +{client.goals.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function DoctorClientsPage() {
  const { user } = useAuth();
  const [clients,  setClients]  = useState<Client[]>([]);
  const [allAppts, setAllAppts] = useState<Record<string, Appointment[]>>({});
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<Client | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Load all appointments for this doctor
      const apptSnap = await getDocs(
        query(
          collection(db, "appointments"),
          where("doctorId", "==", user.uid),
          orderBy("createdAt", "desc")
        )
      );

      const apptsByClient: Record<string, Appointment[]> = {};
      const clientIds = new Set<string>();

      apptSnap.docs.forEach(d => {
        const data = d.data() as any;
        const cid  = data.clientId as string;
        clientIds.add(cid);
        if (!apptsByClient[cid]) apptsByClient[cid] = [];
        apptsByClient[cid].push({ id: d.id, ...data } as Appointment);
      });

      setAllAppts(apptsByClient);

      // Load user docs for each unique client
      if (clientIds.size > 0) {
        const clientDocs = await Promise.all(
          [...clientIds].map(uid =>
            getDocs(query(collection(db, "users"), where("uid", "==", uid)))
          )
        );
        const loaded: Client[] = [];
        clientDocs.forEach(snap => {
          snap.docs.forEach(d => loaded.push({ uid: d.id, ...d.data() } as Client));
        });
        loaded.sort((a, b) => a.displayName.localeCompare(b.displayName));
        setClients(loaded);
      }

      setLoading(false);
    })();
  }, [user]);

  const filtered = clients.filter(c =>
    c.displayName.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalSessions  = Object.values(allAppts).reduce((s, a) => s + a.length, 0);
  const totalCompleted = Object.values(allAppts).reduce((s, a) => s + a.filter(x => x.status === "completed").length, 0);
  const totalUpcoming  = Object.values(allAppts).reduce((s, a) => s + a.filter(x => ["pending","approved"].includes(x.status)).length, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl" style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}>
          Clients
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "#8A9BA8" }}>
          Everyone who has booked a session with you
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Clients",  value: clients.length, accent: "#0D3B44", Icon: Users },
          { label: "Total Sessions", value: totalSessions,  accent: "#4ECDC4", Icon: Calendar },
          { label: "Upcoming",       value: totalUpcoming,  accent: "#D4A853", Icon: Clock },
          { label: "Completed",      value: totalCompleted, accent: "#2BA8A0", Icon: CheckCircle },
        ].map(({ label, value, accent, Icon }) => (
          <div key={label} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: accent + "15" }}>
              <Icon size={16} style={{ color: accent }} />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none"
                style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}>
                {value}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#8A9BA8" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: "#8A9BA8" }} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-11 pr-4 py-3 rounded-xl text-sm border focus:outline-none"
          style={{ borderColor: "rgba(13,59,68,0.12)", background: "white" }} />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2">
            <X size={14} style={{ color: "#8A9BA8" }} />
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin" style={{ color: "#4ECDC4" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: "white", boxShadow: "0 1px 4px rgba(13,59,68,0.07)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "rgba(78,205,196,0.08)" }}>
            <Users size={24} style={{ color: "#4ECDC4" }} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: "#0D3B44" }}>
            {search ? "No clients found" : "No clients yet"}
          </p>
          <p className="text-xs" style={{ color: "#8A9BA8" }}>
            {search ? "Try a different name or email." : "Clients will appear here once they book a session."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map(client => {
            const appts  = allAppts[client.uid] ?? [];
            const lastAppt = appts[0] ?? null;
            return (
              <ClientCard key={client.uid} client={client}
                apptCount={appts.length} lastAppt={lastAppt}
                onClick={() => setSelected(client)} />
            );
          })}
        </div>
      )}

      {/* Drawer */}
      {selected && (
        <ClientDrawer
          client={selected}
          appointments={allAppts[selected.uid] ?? []}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
