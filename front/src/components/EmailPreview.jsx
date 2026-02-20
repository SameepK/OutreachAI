import { useState } from "react";

export default function EmailPreview({ emailData, onSent, onBack }) {
  const { formData } = emailData;

  const [subject, setSubject] = useState(emailData.subject);
  const [body, setBody] = useState(emailData.body);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setSending(true);
    setError("");

    try {
      const res = await fetch("http://localhost:8000/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_name: formData.name,
          to_email: formData.email,
          company: formData.company,
          role: formData.role,
          subject,
          body,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${res.status}`);
      }

      // Bubble the final subject up so SentConfirmation can display it
      emailData.subject = subject;
      onSent();
    } catch (err) {
      setError(err.message || "Failed to send. Check your RESEND_API_KEY.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800 mb-1">Review Your Email</h2>
        <p className="text-slate-400 text-sm">
          Edit the subject or body before sending to{" "}
          <span className="text-slate-600 font-medium">{formData.name}</span> at{" "}
          <span className="text-slate-600 font-medium">{formData.company}</span>.
        </p>
      </div>

      {/* To field (read-only) */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          To
        </label>
        <div className="px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-sm">
          {formData.name} &lt;{formData.email}&gt;
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      {/* Body */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Body
        </label>
        <textarea
          rows={12}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={sending}
          className="flex-1 py-3 rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          ← Go Back
        </button>
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex-[2] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
        >
          {sending ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Sending…
            </>
          ) : (
            "Send Email ✉"
          )}
        </button>
      </div>
    </div>
  );
}
