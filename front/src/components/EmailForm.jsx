import { useState } from "react";

const FIELDS = [
  { id: "name", label: "Full Name", type: "text", placeholder: "Jane Smith" },
  { id: "email", label: "Email Address", type: "email", placeholder: "jane@company.com" },
  { id: "company", label: "Company", type: "text", placeholder: "Acme Corp" },
  { id: "role", label: "Role / Title", type: "text", placeholder: "Head of Engineering" },
];

export default function EmailForm({ onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    context: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:8000/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${res.status}`);
      }

      const { subject, body } = await res.json();
      onSuccess({ subject, body, formData: form });
    } catch (err) {
      setError(err.message || "Something went wrong. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
      <h2 className="text-xl font-semibold text-slate-800 mb-1">Recipient Details</h2>
      <p className="text-slate-400 text-sm mb-6">
        Fill in who you're emailing — the AI will craft a personalised cold email.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {FIELDS.map(({ id, label, type, placeholder }) => (
          <div key={id}>
            <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
              {label}
            </label>
            <input
              id={id}
              type={type}
              required
              placeholder={placeholder}
              value={form[id]}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        ))}

        <div>
          <label htmlFor="context" className="block text-sm font-medium text-slate-700 mb-1">
            Context{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="context"
            rows={3}
            placeholder="e.g. They recently raised a Series B and are hiring for AI tooling…"
            value={form.context}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Generating email…
            </>
          ) : (
            "Generate Email →"
          )}
        </button>
      </form>
    </div>
  );
}
