export default function DashboardLoading() {
  return (
    <div className="min-h-screen animate-pulse" style={{ background: "var(--surface-2)" }}>
      <div className="bg-white border-b h-14" style={{ borderColor: "var(--border-faint)" }} />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="h-6 w-32 rounded-lg mb-1" style={{ background: "var(--border)" }} />
        <div className="h-4 w-48 rounded-lg mb-6" style={{ background: "var(--border-faint)" }} />
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 h-16" style={{ border: "1px solid var(--border-faint)" }} />
          ))}
        </div>
        <div className="flex gap-1 mb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-lg" style={{ background: "var(--border-faint)" }} />
          ))}
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-faint)" }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white flex items-center gap-4 px-5 py-4" style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-faint)" }}>
              <div className="w-9 h-9 rounded-lg shrink-0" style={{ background: "var(--border-faint)" }} />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 rounded" style={{ background: "var(--border-faint)" }} />
                <div className="h-3 w-56 rounded" style={{ background: "var(--border-faint)" }} />
              </div>
              <div className="h-6 w-16 rounded-full" style={{ background: "var(--border-faint)" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
