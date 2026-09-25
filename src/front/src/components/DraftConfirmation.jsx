function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export default function DraftConfirmation({ result, onReset }) {
  const { draftCount, usedGmail, gmail_url, created, drafts = [] } = result || {};

  return (
    <div className="flex flex-col gap-8">
      {/* Top meta bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-ink text-white px-3 py-1 text-xs font-headline font-bold uppercase tracking-widest">
            <span className="material-symbols-outlined text-[14px] text-yellow" aria-hidden="true">check_circle</span>
            Stage 05
          </div>
          {usedGmail && (
            <div className="inline-flex items-center gap-2 bg-surface-container-high px-3 py-1 text-xs font-mono font-medium text-ink">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>Gmail Sync: 200 OK</span>
            </div>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="flex flex-col gap-3">
        <h1 className="font-headline font-bold text-3xl sm:text-5xl text-ink tracking-tight uppercase">
          {usedGmail
            ? `${draftCount} Draft${draftCount !== 1 ? "s" : ""} Staged in Gmail`
            : `${draftCount} Email${draftCount !== 1 ? "s" : ""} Ready`}
        </h1>
        <p className="text-ink/60 font-body text-sm sm:text-base max-w-3xl leading-relaxed">
          {usedGmail
            ? "Drafts have been safely populated in your connected Gmail account. Nothing is ever sent automatically — review and send from your inbox."
            : "Copy each email from the previous screen and send manually, or connect Gmail next time to stage them automatically."}
        </p>
      </div>

      {/* Celebration panel */}
      <div className="w-full bg-surface-container p-6 sm:p-8 shadow-brutal flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 max-w-2xl">
          <div className="w-16 h-16 shrink-0 bg-yellow flex items-center justify-center border-2 border-ink">
            <span className="material-symbols-outlined text-ink text-3xl" aria-hidden="true">mark_email_read</span>
          </div>
          <div className="space-y-2">
            <h2 className="font-headline font-bold text-xl text-ink uppercase">
              {draftCount} grounded draft{draftCount !== 1 ? "s" : ""} created
            </h2>
            <p className="text-xs text-ink/60 font-body leading-normal">
              Each draft is personalized against real, researched signal — your resume, the job posting, and public
              company research. Nothing invented.
            </p>
          </div>
        </div>

        {usedGmail && gmail_url && (
          <a
            href={gmail_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-4 bg-ink text-white font-headline text-sm font-bold uppercase tracking-wider hover:bg-red transition-all shadow-brutal-sm shrink-0"
          >
            <span>Open Gmail Drafts</span>
            <span className="material-symbols-outlined text-base" aria-hidden="true">arrow_outward</span>
          </a>
        )}
      </div>

      {/* Human-in-the-loop guarantee */}
      <div className="bg-surface-container-high p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-ink text-xl shrink-0 mt-0.5" aria-hidden="true">shield</span>
          <p className="text-xs font-body text-ink leading-relaxed">
            <strong className="font-headline uppercase text-ink">Human-in-the-loop guarantee:</strong> you retain
            100% control to inspect, edit, or discard each draft before it's ever sent.
          </p>
        </div>
        {created?.length > 0 && (
          <span className="text-[10px] font-headline font-bold uppercase tracking-wider text-ink/50 shrink-0">
            {created.length} draft(s) created successfully
          </span>
        )}
      </div>

      {/* Staged drafts list — real data */}
      {drafts.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between bg-surface-bright p-4 shadow-brutal-xs">
            <div className="flex items-center gap-3">
              <span className="font-headline font-bold text-base uppercase text-ink">Staged Drafts</span>
              <span className="px-2 py-0.5 text-xs font-headline font-bold bg-ink text-white">
                {drafts.length} of {draftCount} Ready
              </span>
            </div>
          </div>
          {drafts.map((d, i) => (
            <div
              key={d.contact_id || i}
              className="bg-surface-container p-5 hover:bg-surface-container-high transition-colors shadow-brutal-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-10 h-10 bg-ink text-white font-headline font-bold text-base flex items-center justify-center shrink-0">
                  {initials(d.name)}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-headline font-bold text-sm text-ink uppercase">{d.name}</span>
                    <span className="text-[11px] font-headline uppercase px-2 py-0.5 bg-surface-bright text-ink/60 font-medium">
                      {d.role}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-ink/50 truncate max-w-md">{d.subject}</p>
                </div>
              </div>
              {usedGmail && gmail_url && (
                <a
                  className="p-1.5 bg-surface-bright text-ink hover:text-red transition-colors shrink-0"
                  href={gmail_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in Gmail"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">open_in_new</span>
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <button onClick={onReset} className="btn-primary w-full sm:w-auto self-start px-10">
        Start New Application →
      </button>
    </div>
  );
}
