export default function MessagesLoading() {
  return (
    <div className="min-h-screen animate-pulse" style={{ background: "var(--surface-2)" }}>
      <div className="bg-white border-b h-14" style={{ borderColor: "var(--border-faint)" }} />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="h-6 w-24 rounded-lg mb-6" style={{ background: "var(--border)" }} />
        <div className="h-9 w-72 rounded-lg mb-4" style={{ background: "var(--border-faint)" }} />
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-faint)" }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white flex items-center gap-4 px-5 py-4" style={{ borderTop: i === 0 ? "none" : "1px solid var(--border-faint)" }}>
              <div className="w-11 h-11 rounded-xl shrink-0" style={{ background: "var(--border-faint)" }} />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <div className="h-3.5 w-28 rounded" style={{ background: "var(--border-faint)" }} />
                  <div className="h-3 w-12 rounded" style={{ background: "var(--border-faint)" }} />
                </div>
                <div className="h-3 w-48 rounded" style={{ background: "var(--border-faint)" }} />
                <div className="h-5 w-16 rounded-full" style={{ background: "var(--border-faint)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
