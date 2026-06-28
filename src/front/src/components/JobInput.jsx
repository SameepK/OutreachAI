import { useState, useEffect } from "react";
import { API_BASE_URL, fetchProfile, saveProfile } from "../api";

export default function JobInput({ onStart }) {
  const [jdUrl, setJdUrl] = useState("");
  const [jdText, setJdText] = useState("");
  const [context, setContext] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [signOff, setSignOff] = useState("Best regards");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile().then((p) => {
      if (!p) return;
      if (p.resume_text) {
        setResumeText(p.resume_text);
        setResumeFileName(p.resume_filename || "Saved resume");
      }
      if (p.linkedin) setLinkedin(p.linkedin);
      if (p.github) setGithub(p.github);
      if (p.sign_off) setSignOff(p.sign_off);
    });
  }, []);

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("File exceeds 10MB limit");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE_URL}/parse-resume`, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Parse failed");
      const { resume_text } = await res.json();
      setResumeText(resume_text);
      setResumeFileName(file.name);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resumeText.trim()) {
      setError("Please upload your resume");
      return;
    }
    if (!jdUrl.trim() && !jdText.trim()) {
      setError("Provide a job URL or paste the job description");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await saveProfile({
        resume_text: resumeText,
        resume_filename: resumeFileName,
        linkedin,
        github,
        sign_off: signOff,
      });
      onStart({
        jd_url: jdUrl.trim() || null,
        jd_text: jdText.trim() || null,
        resume_text: resumeText,
        context,
        linkedin,
        github,
        sign_off: signOff,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Job Application Agent</h2>
      <p className="text-slate-400 text-sm mb-6">
        Paste a job URL or description + your resume. The agent finds contacts and drafts emails.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Job posting URL</label>
          <input
            type="url"
            value={jdUrl}
            onChange={(e) => setJdUrl(e.target.value)}
            placeholder="https://company.com/careers/..."
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Or paste job description
          </label>
          <textarea
            rows={5}
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the full job description here..."
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Resume <span className="text-red-500">*</span>
          </label>
          {resumeText ? (
            <div className="flex items-center justify-between border border-slate-200 rounded-lg p-3 bg-slate-50">
              <span className="text-sm text-slate-700 truncate">{resumeFileName}</span>
              <button type="button" onClick={() => { setResumeText(""); setResumeFileName(""); }} className="text-xs text-red-500">Remove</button>
            </div>
          ) : (
            <input type="file" accept=".pdf,.txt,.md" onChange={(e) => handleFile(e.target.files[0])} className="text-sm" />
          )}
          {uploading && <p className="text-xs text-slate-500 mt-1">Parsing resume...</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Context (optional)</label>
          <textarea
            rows={2}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Talk, blog post, or anything specific you know about the company or person"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn</label>
            <input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">GitHub</label>
            <input type="url" value={github} onChange={(e) => setGithub(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

        <button type="submit" disabled={loading || uploading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg text-sm">
          {loading ? "Starting agent..." : "Run Agent →"}
        </button>
      </form>
    </div>
  );
}
