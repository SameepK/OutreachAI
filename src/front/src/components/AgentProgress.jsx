export default function AgentProgress({ messages, warnings = [] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Agent working...</h2>
      <div className="space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${i === messages.length - 1 ? "bg-blue-500 animate-pulse" : "bg-green-500"}`} />
            <p className="text-sm text-slate-700">{msg}</p>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">Initializing...</p>
        )}
      </div>
      {warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">{w}</div>
          ))}
        </div>
      )}
    </div>
  );
}
