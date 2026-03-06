export default function AdminSettingsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="rounded-2xl p-8 text-center" style={{ background: "white", boxShadow: "0 1px 4px rgba(26,26,46,0.07)" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(26,26,46,0.06)" }}>
          <span className="text-3xl">⚙️</span>
        </div>
        <h2 style={{ fontFamily: "var(--font-dm-serif)", color: "#1A1A2E", fontSize: "24px", marginBottom: "8px" }}>Platform Settings</h2>
        <p style={{ color: "#8A9BA8", fontSize: "14px" }}>Platform configuration, notification settings, and system preferences coming soon.</p>
      </div>
    </div>
  );
}
