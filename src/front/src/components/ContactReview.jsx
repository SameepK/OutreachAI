import { useState } from "react";
import { findMoreContacts } from "../api";

const DEPARTMENTS = [
  { value: "hr", label: "HR / Recruiting" },
  { value: "it", label: "Engineering" },
  { value: "sales", label: "Sales" },
  { value: "marketing", label: "Marketing" },
  { value: "management", label: "Product / Management" },
  { value: "executive", label: "Executive" },
  { value: "finance", label: "Finance" },
  { value: "operations", label: "Operations" },
];

function emptyContact() {
  return { name: "", role: "", email: "", linkedin_url: "", confidence: 0, email_status: "ok", reason: "", included: true };
}

function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export default function ContactReview({ contacts: initial, jobDetails, applicationId, onConfirm, onBack }) {
  const [contacts, setContacts] = useState(
    initial.length ? initial.map((c) => ({ ...c, included: true })) : [emptyContact()]
  );
  const [error, setError] = useState("");
  const [department, setDepartment] = useState("it");
  const [findingMore, setFindingMore] = useState(false);

  const handleFindMore = async () => {
    setFindingMore(true);
    setError("");
    try {
      const found = await findMoreContacts(applicationId, department);
      const existingKeys = new Set(
        contacts.map((c) => (c.email || c.name || "").toLowerCase())
      );
      const newOnes = found
        .filter((c) => !existingKeys.has((c.email || c.name || "").toLowerCase()))
        .map((c) => ({ ...emptyContact(), ...c, included: true }));
      if (!newOnes.length) {
        setError("Hunter.io returned contacts, but they're already in your list.");
      } else {
        setContacts((prev) => [...prev, ...newOnes]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setFindingMore(false);
    }
  };

  const update = (index, field, value) => {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const addRow = () => setContacts((prev) => [...prev, emptyContact()]);
  const removeRow = (index) => setContacts((prev) => prev.filter((_, i) => i !== index));
  const setAllIncluded = (included) => setContacts((prev) => prev.map((c) => ({ ...c, included })));

  const selected = contacts.filter((c) => c.included && c.name.trim());
  const avgConfidence = contacts.length
    ? Math.round(contacts.reduce((sum, c) => sum + (c.confidence || 0), 0) / contacts.length)
    : 0;

  const handleConfirm = () => {
    if (!selected.length) {
      setError("Select at least one contact with a name");
      return;
    }
    setError("");
    onConfirm(selected);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Title row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <p className="text-sm text-ink/60">
            <span className="font-bold text-ink">{jobDetails?.company_name}</span>
            {" / "}
            {jobDetails?.role_title}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => setAllIncluded(true)} className="chip chip-inactive">
            Select All ({contacts.length})
          </button>
          <button type="button" onClick={() => setAllIncluded(false)} className="chip chip-inactive">
            Deselect
          </button>
        </div>
      </div>

      {/* Find more contacts in a different department */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-surface-container-low border-2 border-ink/10">
        <span className="text-xs font-headline uppercase tracking-wider text-ink/60 shrink-0">
          Not the right people? Search a different department:
        </span>
        <div className="relative shrink-0">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="appearance-none pr-9 font-headline text-xs font-bold uppercase tracking-wide cursor-pointer w-full sm:w-auto"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <span
            className="material-symbols-outlined text-[18px] text-ink absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          >
            expand_more
          </span>
        </div>
        <button
          type="button"
          onClick={handleFindMore}
          disabled={findingMore || !applicationId}
          className="chip chip-inactive disabled:opacity-50 whitespace-nowrap"
        >
          {findingMore ? "Searching Hunter.io..." : "Find more contacts"}
        </button>
      </div>

      {/* Metric strip — real numbers from the discovered contacts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-tile">
          <div className="flex items-center justify-between text-xs font-headline uppercase tracking-wider text-ink/60">
            <span>Total Leads</span>
            <span className="material-symbols-outlined text-[18px] text-ink" aria-hidden="true">group</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl lg:text-4xl font-headline font-bold text-ink">{String(contacts.length).padStart(2, "0")}</span>
          </div>
          <div className="absolute bottom-0 left-0 h-1 bg-ink w-full" />
        </div>
        <div className="stat-tile">
          <div className="flex items-center justify-between text-xs font-headline uppercase tracking-wider text-ink/60">
            <span>Avg Confidence</span>
            <span className="material-symbols-outlined text-[18px] text-blue" aria-hidden="true">verified</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl lg:text-4xl font-headline font-bold text-blue">{avgConfidence}%</span>
          </div>
          <div className="absolute bottom-0 left-0 h-1 bg-blue w-full" />
        </div>
        <div className="stat-tile">
          <div className="flex items-center justify-between text-xs font-headline uppercase tracking-wider text-ink/60">
            <span>Selected</span>
            <span className="material-symbols-outlined text-[18px] text-red" aria-hidden="true">how_to_reg</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl lg:text-4xl font-headline font-bold text-red">{String(selected.length).padStart(2, "0")}</span>
          </div>
          <div className="absolute bottom-0 left-0 h-1 bg-red w-full" />
        </div>
      </div>

      {/* Contact card grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {contacts.map((c, i) => (
          <div
            key={i}
            onClick={() => update(i, "included", !c.included)}
            className={`cursor-pointer p-6 sm:p-7 flex flex-col justify-between gap-5 shadow-brutal-sm transition-all ${
              c.included ? "bg-surface-bright ring-2 ring-ink" : "bg-surface-container-low opacity-70"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 bg-ink text-white font-headline font-bold text-sm flex items-center justify-center shrink-0">
                  {initials(c.name || "?")}
                </div>
                <div className="min-w-0">
                  <h3 className="font-headline font-bold text-base text-ink truncate">{c.name || "Unnamed contact"}</h3>
                  <p className="text-xs font-headline uppercase font-medium text-ink/60 truncate">{c.role || "Role unknown"}</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={c.included}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => update(i, "included", e.target.checked)}
                className="w-5 h-5 accent-ink cursor-pointer shrink-0 mt-1"
              />
            </div>

            <div onClick={(e) => e.stopPropagation()} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input placeholder="Name" value={c.name} onChange={(e) => update(i, "name", e.target.value)} />
                <input placeholder="Role / title" value={c.role} onChange={(e) => update(i, "role", e.target.value)} />
                <input
                  placeholder="Email"
                  value={c.email}
                  onChange={(e) => update(i, "email", e.target.value)}
                  className={c.email_status === "warning" ? "!border-yellow !bg-yellow/10 sm:col-span-2" : "sm:col-span-2"}
                />
                <div className="sm:col-span-2 space-y-1">
                  <input
                    placeholder="LinkedIn URL (optional)"
                    value={c.linkedin_url || ""}
                    onChange={(e) => update(i, "linkedin_url", e.target.value)}
                  />
                  <p className="text-[11px] text-ink/50 font-medium normal-case">
                    Adding a LinkedIn URL helps verify this person actually works
                    here, reducing the chance of a mismatched or wrong-person draft.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 text-[11px] font-headline uppercase">
                <div className="flex items-center gap-2">
                  {c.confidence > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-tertiary-container text-ink font-bold">
                      <span className="material-symbols-outlined text-[12px]" aria-hidden="true">check_circle</span> {c.confidence}% Conf.
                    </span>
                  )}
                  {c.email_status === "warning" && (
                    <span className="font-bold text-ink bg-yellow px-2 py-0.5">Verify email</span>
                  )}
                </div>
                {contacts.length > 1 && (
                  <button type="button" onClick={() => removeRow(i)} className="text-red font-bold hover:underline">
                    Remove
                  </button>
                )}
              </div>
              {c.reason && <p className="text-xs text-ink/50 font-medium normal-case">{c.reason}</p>}
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={addRow} className="text-xs font-headline font-bold uppercase tracking-wide text-blue self-start">
        + Add contact
      </button>

      {error && <div className="bg-red/10 border-2 border-red text-red text-sm font-medium px-4 py-3">{error}</div>}

      {/* Sticky bottom action bar */}
      <div className="sticky bottom-6 z-40 w-full max-w-4xl mx-auto">
        <div className="bg-ink text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-brutal">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-yellow text-ink flex items-center justify-center font-headline font-bold text-sm">
              {selected.length}
            </div>
            <span className="font-headline font-bold text-sm uppercase tracking-wide">Contacts Selected</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button type="button" onClick={onBack} className="px-4 py-2.5 bg-transparent hover:bg-white/10 text-xs font-headline font-bold uppercase tracking-wider text-white transition-colors">
              ← Back
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2.5 bg-yellow hover:bg-white text-ink text-xs font-headline font-bold uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              Generate {selected.length || ""} Personalized Drafts →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
