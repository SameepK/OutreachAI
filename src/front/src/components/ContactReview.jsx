import { useState } from "react";

function emptyContact() {
  return { name: "", role: "", email: "", confidence: 0, email_status: "ok", reason: "" };
}

export default function ContactReview({ contacts: initial, jobDetails, onConfirm, onBack }) {
  const [contacts, setContacts] = useState(
    initial.length ? initial.map((c) => ({ ...c })) : [emptyContact()]
  );
  const [error, setError] = useState("");

  const update = (index, field, value) => {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const addRow = () => setContacts((prev) => [...prev, emptyContact()]);
  const removeRow = (index) => setContacts((prev) => prev.filter((_, i) => i !== index));

  const handleConfirm = () => {
    const valid = contacts.filter((c) => c.name.trim());
    if (!valid.length) {
      setError("Add at least one contact with a name");
      return;
    }
    setError("");
    onConfirm(valid);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Review contacts</h2>
      <p className="text-slate-400 text-sm mb-4">
        {jobDetails?.company_name} — {jobDetails?.role_title}. Edit or add contacts before drafting.
      </p>

      <div className="space-y-4">
        {contacts.map((c, i) => (
          <div key={i} className="border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase">Contact {i + 1}</span>
              {contacts.length > 1 && (
                <button type="button" onClick={() => removeRow(i)} className="text-xs text-red-500">Remove</button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                placeholder="Name"
                value={c.name}
                onChange={(e) => update(i, "name", e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <input
                placeholder="Role / title"
                value={c.role}
                onChange={(e) => update(i, "role", e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <input
                placeholder="Email"
                value={c.email}
                onChange={(e) => update(i, "email", e.target.value)}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  c.email_status === "warning" ? "border-amber-400 bg-amber-50" : "border-slate-200"
                }`}
              />
              <div className="text-xs text-slate-500 flex items-center">
                {c.confidence > 0 && <span>Confidence: {c.confidence}%</span>}
                {c.email_status === "warning" && (
                  <span className="ml-2 text-amber-600 font-medium">Low confidence — verify email</span>
                )}
              </div>
            </div>
            {c.reason && <p className="text-xs text-slate-500">{c.reason}</p>}
          </div>
        ))}
      </div>

      <button type="button" onClick={addRow} className="mt-4 text-sm text-blue-600 hover:text-blue-700">
        + Add contact
      </button>

      {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="flex-1 py-3 rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm">← Back</button>
        <button onClick={handleConfirm} className="flex-[2] py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">
          Confirm & generate emails →
        </button>
      </div>
    </div>
  );
}
