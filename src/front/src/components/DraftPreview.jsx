import { useState } from "react";
import { API_BASE_URL, authHeaders } from "../api";

function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export default function DraftPreview({
  drafts,
  failed,
  applicationId,
  gmailConnected,
  onComplete,
  onBack,
  onDraftsUpdate,
}) {
  const [localDrafts, setLocalDrafts] = useState(drafts);
  const [localFailed, setLocalFailed] = useState(failed);
  const [activeIndex, setActiveIndex] = useState(0);
  const [creating, setCreating] = useState(false);
  const [retrying, setRetrying] = useState(null);
  const [error, setError] = useState("");

  const active = localDrafts[activeIndex] || localDrafts[0];

  const updateDraft = (index, field, value) => {
    setLocalDrafts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const retryContact = async (contactId) => {
    setRetrying(contactId);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/agent/generate-emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ application_id: applicationId, contact_ids: [contactId] }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Retry failed");
      const data = await res.json();
      if (data.drafts?.length) {
        setLocalDrafts((prev) => [...prev, ...data.drafts]);
        setLocalFailed((prev) => prev.filter((f) => f.contact_id !== contactId));
        onDraftsUpdate?.(data);
      }
      if (data.failed?.length) {
        setError(data.failed[0].error);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setRetrying(null);
    }
  };

  const createGmailDrafts = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/gmail/create-drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          drafts: localDrafts.map((d) => ({
            contact_id: d.contact_id,
            to_email: d.email,
            subject: d.subject,
            body: d.body,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Draft creation failed");
      const data = await res.json();
      onComplete({ ...data, draftCount: localDrafts.length, usedGmail: true, drafts: localDrafts });
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const skipGmail = () => {
    onComplete({ draftCount: localDrafts.length, usedGmail: false, gmail_url: null, drafts: localDrafts });
  };

  const wordCount = (text) => (text || "").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="tag bg-yellow/20 border-ink text-ink">
          {localDrafts.length} ready{localFailed.length ? ` / ${localFailed.length} failed` : ""}
        </span>
        <span className="text-xs font-headline uppercase tracking-wider text-ink/50 flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px] text-blue" aria-hidden="true">verified_user</span>
          Grounded in resume + researched signal only
        </span>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* Left: recipient queue */}
        <div className="w-full xl:w-80 shrink-0 flex flex-col gap-3">
          <div className="flex items-center gap-2 pb-1">
            <span className="font-headline font-bold text-sm uppercase tracking-wider text-ink">Recipient Queue</span>
            <span className="px-2 py-0.5 text-[11px] font-headline font-bold bg-ink text-white">{localDrafts.length} Ready</span>
          </div>

          <div className="flex flex-col gap-3">
            {localDrafts.map((d, i) => {
              const isActive = i === activeIndex;
              return (
                <button
                  type="button"
                  key={d.contact_id || i}
                  onClick={() => setActiveIndex(i)}
                  className={`text-left p-4 shadow-brutal-xs transition-all ${
                    isActive ? "bg-surface-bright ring-2 ring-ink" : "bg-surface-container hover:bg-surface-bright"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 bg-ink text-white font-headline font-bold text-xs flex items-center justify-center shrink-0">
                        {initials(d.name)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-headline font-bold text-sm text-ink tracking-tight truncate">{d.name}</span>
                        <span className="font-body text-xs text-ink/50 truncate">{d.role}</span>
                      </div>
                    </div>
                    {isActive && (
                      <span className="px-2 py-0.5 text-[10px] font-headline font-bold uppercase tracking-wider bg-surface-container text-ink shadow-sm flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-red" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="font-body text-xs text-ink/50 truncate">{d.subject}</p>
                </button>
              );
            })}

            {localFailed.map((f) => (
              <div key={f.contact_id} className="p-4 bg-red/5 border-2 border-red shadow-brutal-xs">
                <p className="text-sm font-bold text-red truncate">{f.name} — failed</p>
                <p className="text-xs text-red/70 truncate mb-2">{f.error}</p>
                <button
                  onClick={() => retryContact(f.contact_id)}
                  disabled={retrying === f.contact_id}
                  className="btn-danger w-full disabled:opacity-50"
                >
                  {retrying === f.contact_id ? "Retrying..." : "Retry"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: active draft editor */}
        <div className="flex-1 w-full">
          {active ? (
            <div className="bg-surface-bright p-6 sm:p-8 shadow-brutal flex flex-col gap-5">
              <div className="flex flex-col gap-3 p-4 bg-surface-container-lowest shadow-brutal-xs">
                <div className="flex items-center gap-2">
                  <span className="font-headline text-xs uppercase tracking-wider font-bold text-ink/50 w-14">To:</span>
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-surface-container font-headline text-xs text-ink font-bold">
                    <span>{active.name}</span>
                    <span className="text-ink/50 font-normal font-body">&lt;{active.email}&gt;</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-headline text-xs uppercase tracking-wider font-bold text-ink/50 w-14">Subject:</span>
                  <input
                    className="font-headline font-bold text-sm"
                    value={active.subject}
                    onChange={(e) => updateDraft(activeIndex, "subject", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-surface-container-high px-4 py-2 text-xs font-headline">
                <span className="font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">edit_note</span>
                  Body
                </span>
                <span className="text-ink/50 font-medium">{wordCount(active.body)} words</span>
              </div>

              <textarea
                rows={12}
                value={active.body}
                onChange={(e) => updateDraft(activeIndex, "body", e.target.value)}
                className="font-mono text-xs bg-surface-container-lowest shadow-inner p-4"
              />
            </div>
          ) : (
            <div className="bg-surface-bright p-8 shadow-brutal text-center text-ink/50 text-sm">
              No drafts to review — all contacts failed generation.
            </div>
          )}
        </div>
      </div>

      {error && <div className="bg-red/10 border-2 border-red text-red text-sm font-medium px-4 py-3">{error}</div>}

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1">← Back</button>
        {gmailConnected ? (
          <button onClick={createGmailDrafts} disabled={creating || !localDrafts.length} className="btn-primary flex-[2] disabled:opacity-50 disabled:cursor-not-allowed">
            {creating ? "Creating Gmail drafts..." : "Create Gmail Drafts →"}
          </button>
        ) : (
          <button onClick={skipGmail} disabled={!localDrafts.length} className="btn-primary flex-[2] disabled:opacity-50">
            Done (copy from above)
          </button>
        )}
      </div>
    </div>
  );
}
