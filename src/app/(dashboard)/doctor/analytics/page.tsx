export default function AnalyticsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="rounded-2xl p-8 text-center" style={{ background: "white", boxShadow: "0 1px 4px rgba(10,46,53,0.07)" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(212,168,83,0.08)" }}>
          <span className="text-3xl">📊</span>
        </div>
        <h2 style={{ fontFamily: "var(--font-dm-serif)", color: "#0A2E35", fontSize: "24px", marginBottom: "8px" }}>Analytics</h2>
        <p style={{ color: "#8A9BA8", fontSize: "14px" }}>Practice analytics and insights coming soon.</p>
      </div>
    </div>
  );
}
