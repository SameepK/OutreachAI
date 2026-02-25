import { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export default function EmailForm({ onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    context: "",
    target_role: "",
    job_link: "",
    linkedin: "",
    github: "",
    sign_off: "Best regards",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);

  // NEW: research toggle + data
  const [useResearch, setUseResearch] = useState(false);
  const [research, setResearch] = useState("");
  const [researchLoading, setResearchLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }));
    setError("");
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
  
    // NEW: 10MB size check (must run BEFORE upload)
    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxBytes) {
      setError("File exceeds 10MB limit");
      return;
    }
  
    const validTypes = ["application/pdf", "text/plain", "text/markdown"];
    const validExtensions = [".pdf", ".txt", ".md"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  
    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      setError("Please upload a PDF or text file (.pdf, .txt, .md)");
      return;
    }
  
    setUploadingResume(true);
    setError("");
  
    try {
      const formData = new FormData();
      formData.append("file", file);
  
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || ""}/parse-resume`,
        {
          method: "POST",
          body: formData,
        }
      );
  
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

  // NEW: call backend research endpoint (only when toggle is on)
  const runResearch = async () => {
    setResearchLoading(true);
    setError("");

    try {
        const res = await fetch(`${API_BASE_URL}/research`, {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          company: form.company,
          role: form.role,
          job_url: form.job_link || "",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Research error: ${res.status}`);
      }

      const data = await res.json();
      setResearch(data.research || "");
      return data.research || "";
    } catch (err) {
      setError(err.message || "Failed to run research");
      return "";
    } finally {
      setResearchLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!resumeText || resumeText.trim() === "") {
      setError("Please upload your resume before generating");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let researchSummary = "";

      // Only hit Perplexity backend if toggle is ON
      if (useResearch) {
        researchSummary = await runResearch();
      }

      const res = await fetch(`${API_BASE_URL}/generate-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          resume_text: resumeText,
          target_role: form.target_role,
          job_link: form.job_link || "",
          linkedin: form.linkedin || "",
          github: form.github || "",
          sign_off: form.sign_off || "Best regards",
          research_summary: researchSummary, // NEW: send to backend
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${res.status}`);
      }

      const { subject, body } = await res.json();
      onSuccess({ subject, body, formData: { ...form, resumeText, researchSummary } });
    } catch (err) {
      setError(err.message || "Something went wrong. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
      {/* Section 1 — Recipient Details */}
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Recipient Details</h2>
      <p className="text-slate-400 text-sm mb-6">
        Who are you emailing and what role is this about?
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recipient fields */}
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              placeholder="Jane Smith"
              value={form.name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="jane@company.com"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-1">
              Company
            </label>
            <input
              id="company"
              type="text"
              required
              placeholder="Acme Corp"
              value={form.company}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">
              Their Role / Title
            </label>
            <input
              id="role"
              type="text"
              required
              placeholder="Head of Engineering"
              value={form.role}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label htmlFor="job_link" className="block text-sm font-medium text-slate-700 mb-1">
              Job Posting URL <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="job_link"
              type="url"
              placeholder="https://company.com/careers/job-id"
              value={form.job_link}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* NEW: Research toggle */}
        <div className="pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useResearch}
              onChange={(e) => setUseResearch(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-800">
              Enable Recipient Research (Perplexity)
            </span>
          </label>
          {useResearch && (
            <p className="text-xs text-slate-500 mt-1 ml-7">
              Uses AI web search to pull recent facts about the person and company before generating the email.
            </p>
          )}
        </div>

        {/* Show research summary if we have one */}
        {research && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">Research Summary</h3>
              {researchLoading && (
                <span className="text-xs text-slate-500">Updating…</span>
              )}
            </div>
            <p className="text-xs text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {research}
            </p>
          </div>
        )}

        {/* Section 2 — Your Information */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Your Information</h3>
          <p className="text-slate-400 text-sm mb-4">
            Tell the model about you so it can write a relevant email.
          </p>

          <div className="space-y-4">
            {/* Resume Upload - Required */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Resume <span className="text-red-500">*</span>
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
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8z"
                          />
                        </svg>
                        <span className="text-sm text-slate-600">Parsing resume...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-8 h-8 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        <span className="text-sm text-slate-600">
                          <span className="text-blue-600 font-medium">Click to upload</span> or drag
                          and drop
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
                        <svg
                          className="w-5 h-5 text-green-600 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-slate-700 truncate">
                          {resumeFileName}
                        </span>
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
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="target_role" className="block text-sm font-medium text-slate-700 mb-1">
                Role I'm applying for
              </label>
              <input
                id="target_role"
                type="text"
                required
                placeholder="Software Engineer – Backend"
                value={form.target_role}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="linkedin" className="block text-sm font-medium text-slate-700 mb-1">
                My LinkedIn URL <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="linkedin"
                type="url"
                placeholder="https://linkedin.com/in/yourprofile"
                value={form.linkedin}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="github" className="block text-sm font-medium text-slate-700 mb-1">
                My GitHub URL <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="github"
                type="url"
                placeholder="https://github.com/yourhandle"
                value={form.github}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="sign_off" className="block text-sm font-medium text-slate-700 mb-1">
                Sign-off style
              </label>
              <select
                id="sign_off"
                value={form.sign_off}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
              >
                <option value="Best regards">Best regards</option>
                <option value="Sincerely">Sincerely</option>
                <option value="Thank you">Thank you</option>
              </select>
            </div>

            <div>
              <label htmlFor="context" className="block text-sm font-medium text-slate-700 mb-1">
                Context <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="context"
                rows={3}
                placeholder="e.g. Their talk, blog post, product launch, or why this team."
                value={form.context}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || researchLoading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
        >
          {loading || researchLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              {useResearch ? "Researching & generating…" : "Generating email…"}
            </>
          ) : (
            useResearch ? "Generate Email with Research →" : "Generate Email →"
          )}
        </button>
      </form>
    </div>
  );
}
