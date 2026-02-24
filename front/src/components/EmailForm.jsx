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
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }));
    setError("");
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    // Validate file type
    const validTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    const validExtensions = ['.pdf', '.txt', '.md'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setError("Please upload a PDF or text file (.pdf, .txt, .md)");
      return;
    }

    setUploadingResume(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch("http://localhost:8000/parse-resume", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Failed to parse resume: ${res.status}`);
      }

      const { resume_text } = await res.json();
      setResumeText(resume_text);
      setResumeFileName(file.name);
    } catch (err) {
      setError(err.message || "Failed to upload resume");
    } finally {
      setUploadingResume(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  };

  const removeResume = () => {
    setResumeText("");
    setResumeFileName("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:8000/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          resume_text: resumeText,
        }),
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

        {/* Resume Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Resume{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          {!resumeText ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-300 bg-slate-50 hover:border-slate-400"
              }`}
            >
              <input
                type="file"
                id="resume-upload"
                accept=".pdf,.txt,.md"
                onChange={handleFileInput}
                className="hidden"
              />
              <label
                htmlFor="resume-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {uploadingResume ? (
                  <>
                    <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    <span className="text-sm text-slate-600">Parsing resume...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm text-slate-600">
                      <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
                    </span>
                    <span className="text-xs text-slate-400">PDF, TXT, or MD (max 10MB)</span>
                  </>
                )}
              </label>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700 truncate">{resumeFileName}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {resumeText.substring(0, 150)}...
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeResume}
                  className="text-slate-400 hover:text-red-600 transition-colors shrink-0"
                  title="Remove resume"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

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
