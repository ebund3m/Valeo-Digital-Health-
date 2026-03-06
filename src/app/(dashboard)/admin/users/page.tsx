"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, orderBy, query, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  Users, Search, Plus, X, Loader2, Shield,
  CheckCircle, AlertCircle, Mail,
  MoreVertical, UserX, UserCheck, ChevronDown,
} from "lucide-react";

type Role = "client" | "doctor" | "admin";

interface PlatformUser {
  uid:         string;
  displayName: string;
  email:       string;
  role:        Role;
  isActive:    boolean;
  onboarded:   boolean;
  createdAt:   any;
}

function RoleBadge({ role }: { role: Role }) {
  const map = {
    client: { bg: "rgba(78,205,196,0.12)",  color: "#2BA8A0" },
    doctor: { bg: "rgba(212,168,83,0.12)",  color: "#B8860B" },
    admin:  { bg: "rgba(232,96,76,0.12)",   color: "#E8604C" },
  };
  const s = map[role];
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
      style={{ background: s.bg, color: s.color }}>
      {role}
    </span>
  );
}

function UserRow({ user, onToggleActive, onChangeRole, acting }: {
  user: PlatformUser;
  onToggleActive: (uid: string, active: boolean) => void;
  onChangeRole:   (uid: string, role: Role) => void;
  acting: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const isActing = acting === user.uid;

  return (
    <tr className="border-b transition-colors hover:bg-black/[0.015]"
      style={{ borderColor: "rgba(13,59,68,0.06)" }}>

      {/* User */}
      <td className="py-4 px-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #1A1A2E, #2D2D4E)", color: "white" }}>
            {user.displayName?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#1A1A2E" }}>{user.displayName}</p>
            <p className="text-xs" style={{ color: "#8A9BA8" }}>{user.email}</p>
          </div>
        </div>
      </td>

      {/* Role — clickable dropdown */}
      <td className="py-4 px-4">
        <div className="relative">
          <button onClick={() => { setRoleOpen(!roleOpen); setMenuOpen(false); }}
            className="flex items-center gap-1">
            <RoleBadge role={user.role} />
            <ChevronDown size={11} style={{ color: "#8A9BA8" }} />
          </button>
          {roleOpen && (
            <div className="absolute top-8 left-0 z-30 rounded-xl overflow-hidden py-1"
              style={{ background: "white", boxShadow: "0 4px 16px rgba(13,59,68,0.14)", minWidth: "130px" }}>
              {(["client","doctor","admin"] as Role[]).filter(r => r !== user.role).map(r => (
                <button key={r} disabled={isActing}
                  onClick={() => { onChangeRole(user.uid, r); setRoleOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs capitalize hover:bg-black/5 disabled:opacity-50"
                  style={{ color: "#22272B" }}>
                  Set as {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium"
          style={{ color: user.isActive !== false ? "#2BA8A0" : "#8A9BA8" }}>
          <span className="w-2 h-2 rounded-full"
            style={{ background: user.isActive !== false ? "#4ECDC4" : "#C4C4C4" }} />
          {user.isActive !== false ? "Active" : "Inactive"}
        </span>
      </td>

      {/* Onboarding */}
      <td className="py-4 px-4 hidden lg:table-cell">
        {user.role === "client" ? (
          user.onboarded
            ? <span className="flex items-center gap-1 text-xs" style={{ color: "#2BA8A0" }}>
                <CheckCircle size={11} /> Done
              </span>
            : <span className="flex items-center gap-1 text-xs" style={{ color: "#D4A853" }}>
                <AlertCircle size={11} /> Pending
              </span>
        ) : (
          <span className="text-xs" style={{ color: "#C4C4C4" }}>—</span>
        )}
      </td>

      {/* Joined */}
      <td className="py-4 px-4 hidden md:table-cell">
        <span className="text-xs" style={{ color: "#8A9BA8" }}>
          {user.createdAt?.toDate
            ? user.createdAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "—"}
        </span>
      </td>

      {/* Actions */}
      <td className="py-4 px-5">
        <div className="relative flex justify-end">
          {isActing
            ? <Loader2 size={15} className="animate-spin" style={{ color: "#4ECDC4" }} />
            : (
              <button onClick={() => { setMenuOpen(!menuOpen); setRoleOpen(false); }}
                className="p-1.5 rounded-lg hover:bg-black/5">
                <MoreVertical size={15} style={{ color: "#8A9BA8" }} />
              </button>
            )}
          {menuOpen && (
            <div className="absolute top-8 right-0 z-30 rounded-xl overflow-hidden py-1"
              style={{ background: "white", boxShadow: "0 4px 16px rgba(13,59,68,0.14)", minWidth: "170px" }}>
              <button onClick={() => { onToggleActive(user.uid, user.isActive === false); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 hover:bg-black/5"
                style={{ color: user.isActive !== false ? "#E8604C" : "#2BA8A0" }}>
                {user.isActive !== false
                  ? <><UserX size={13} /> Deactivate</>
                  : <><UserCheck size={13} /> Reactivate</>}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(user.email); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 hover:bg-black/5"
                style={{ color: "#4A5568" }}>
                <Mail size={13} /> Copy Email
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users,   setUsers]   = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState<"all"|Role>("all");
  const [acting,  setActing]  = useState<string | null>(null);
  const [toast,   setToast]   = useState<{ type: "success"|"error"; msg: string } | null>(null);

  function showToast(type: "success"|"error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
        setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() }) as PlatformUser));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleToggleActive(uid: string, newActive: boolean) {
    setActing(uid);
    try {
      await updateDoc(doc(db, "users", uid), { isActive: newActive, updatedAt: serverTimestamp() });
      setUsers(p => p.map(u => u.uid === uid ? { ...u, isActive: newActive } : u));
      showToast("success", `Account ${newActive ? "reactivated" : "deactivated"}.`);
    } catch {
      showToast("error", "Failed to update account.");
    } finally {
      setActing(null);
    }
  }

  async function handleChangeRole(uid: string, role: Role) {
    setActing(uid);
    try {
      await updateDoc(doc(db, "users", uid), { role, updatedAt: serverTimestamp() });
      setUsers(p => p.map(u => u.uid === uid ? { ...u, role } : u));
      showToast("success", `Role updated to ${role}.`);
    } catch {
      showToast("error", "Failed to update role.");
    } finally {
      setActing(null);
    }
  }

  const filtered = users.filter(u =>
    (filter === "all" || u.role === filter) &&
    (u.displayName.toLowerCase().includes(search.toLowerCase()) ||
     u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const counts = {
    all:    users.length,
    client: users.filter(u => u.role === "client").length,
    doctor: users.filter(u => u.role === "doctor").length,
    admin:  users.filter(u => u.role === "admin").length,
    active: users.filter(u => u.isActive !== false).length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-medium"
          style={{ background: toast.type === "success" ? "#1A1A2E" : "#E8604C", color: "white" }}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl" style={{ fontFamily: "var(--font-dm-serif)", color: "#1A1A2E" }}>Users</h2>
          <p className="text-sm mt-0.5" style={{ color: "#8A9BA8" }}>Manage all platform accounts and roles</p>
        </div>
        <button onClick={() => router.push("/admin/users/add-doctor")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:-translate-y-0.5 transition-all"
          style={{ background: "linear-gradient(135deg, #1A1A2E, #2D2D4E)" }}>
          <Plus size={15} /> Add Doctor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: counts.all,    accent: "#1A1A2E", Icon: Users },
          { label: "Clients",     value: counts.client, accent: "#4ECDC4", Icon: Users },
          { label: "Doctors",     value: counts.doctor, accent: "#D4A853", Icon: Shield },
          { label: "Active",      value: counts.active, accent: "#2BA8A0", Icon: CheckCircle },
        ].map(({ label, value, accent, Icon }) => (
          <div key={label} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "white", boxShadow: "0 1px 4px rgba(26,26,46,0.07)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: accent + "15" }}>
              <Icon size={16} style={{ color: accent }} />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none"
                style={{ fontFamily: "var(--font-dm-serif)", color: "#1A1A2E" }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: "#8A9BA8" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(["all","client","doctor","admin"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
              style={{
                background: filter === f ? "#1A1A2E" : "white",
                color:      filter === f ? "white" : "#4A5568",
                boxShadow:  filter === f ? "none" : "0 1px 3px rgba(26,26,46,0.07)",
              }}>
              {f === "all" ? `All (${counts.all})` : `${f.charAt(0).toUpperCase() + f.slice(1)}s (${counts[f as Role]})`}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: "#8A9BA8" }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none"
            style={{ borderColor: "rgba(26,26,46,0.12)", background: "white" }} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <X size={13} style={{ color: "#8A9BA8" }} />
            </button>
          )}
        </div>
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
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "rgba(78,205,196,0.08)" }}>
              <Users size={24} style={{ color: "#4ECDC4" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "#1A1A2E" }}>No users found</p>
            <p className="text-xs mt-1" style={{ color: "#8A9BA8" }}>
              {search ? "Try a different search term." : "Users appear here after registration."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(26,26,46,0.07)" }}>
                  {[
                    { label: "User",        cls: "" },
                    { label: "Role",        cls: "" },
                    { label: "Status",      cls: "" },
                    { label: "Onboarding",  cls: "hidden lg:table-cell" },
                    { label: "Joined",      cls: "hidden md:table-cell" },
                    { label: "",            cls: "" },
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
                {filtered.map(u => (
                  <UserRow key={u.uid} user={u}
                    onToggleActive={handleToggleActive}
                    onChangeRole={handleChangeRole}
                    acting={acting} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t flex items-center justify-between"
            style={{ borderColor: "rgba(26,26,46,0.06)" }}>
            <p className="text-xs" style={{ color: "#8A9BA8" }}>
              Showing {filtered.length} of {users.length} users
            </p>
            {search && (
              <button onClick={() => setSearch("")} className="text-xs font-medium hover:underline"
                style={{ color: "#1A1A2E" }}>Clear search</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
