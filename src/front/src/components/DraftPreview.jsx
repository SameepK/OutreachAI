import { useState } from "react";
import { API_BASE_URL } from "../api";

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
  const [creating, setCreating] = useState(false);
  const [retrying, setRetrying] = useState(null);
  const [error, setError] = useState("");

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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
      onComplete({ ...data, draftCount: localDrafts.length, usedGmail: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const skipGmail = () => {
    onComplete({ draftCount: localDrafts.length, usedGmail: false, gmail_url: null });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Review drafts</h2>
        <p className="text-slate-400 text-sm">
          {localDrafts.length} ready{localFailed.length ? `, ${localFailed.length} failed` : ""}
        </p>
      </div>

      {localDrafts.map((d, i) => (
        <div key={d.contact_id || i} className="border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="text-sm font-medium text-slate-700">
            {d.name} &lt;{d.email}&gt; — {d.role}
          </div>
          <input
            value={d.subject}
            onChange={(e) => updateDraft(i, "subject", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
          <textarea
            rows={8}
            value={d.body}
            onChange={(e) => updateDraft(i, "body", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono resize-none"
          />
        </div>
      ))}

      {localFailed.map((f) => (
        <div key={f.contact_id} className="border border-red-200 bg-red-50 rounded-lg p-4 flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-red-800">{f.name} — failed</p>
            <p className="text-xs text-red-600">{f.error}</p>
          </div>
          <button
            onClick={() => retryContact(f.contact_id)}
            disabled={retrying === f.contact_id}
            className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {retrying === f.contact_id ? "Retrying..." : "Retry"}
          </button>
        </div>
      ))}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm">← Back</button>
        {gmailConnected ? (
          <button onClick={createGmailDrafts} disabled={creating || !localDrafts.length} className="flex-[2] py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm">
            {creating ? "Creating Gmail drafts..." : "Create Gmail drafts"}
          </button>
        ) : (
          <button onClick={skipGmail} disabled={!localDrafts.length} className="flex-[2] py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">
            Done (copy from above)
          </button>
        )}
      </div>
    </div>
  );
}
