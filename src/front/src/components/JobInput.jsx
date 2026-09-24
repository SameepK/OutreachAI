import { useState, useEffect } from "react";
import { API_BASE_URL, fetchProfile, saveProfile } from "../api";

export default function JobInput({ onStart }) {
  const [tab, setTab] = useState("url"); // "url" | "paste"
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

  const readyCount = resumeText.trim() && (jdUrl.trim() || jdText.trim()) ? 1 : 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Column 1: Target Job Intake */}
        <div className="lg:col-span-7 bg-surface-container-lowest border-2 border-ink shadow-brutal flex flex-col">
          <div className="p-5 sm:p-6 border-b-2 border-ink bg-surface-container-low flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="step-number">01</span>
              <h2 className="font-headline font-bold text-lg uppercase tracking-tight text-ink">Target Job Listing</h2>
            </div>
            <div className="flex items-center gap-1 bg-surface-container p-1 border border-ink text-xs font-headline">
              <button
                type="button"
                onClick={() => setTab("url")}
                className={`px-2.5 py-0.5 transition-all ${tab === "url" ? "bg-ink text-white font-bold" : "text-ink/60"}`}
              >
                URL Sync
              </button>
              <button
                type="button"
                onClick={() => setTab("paste")}
                className={`px-2.5 py-0.5 transition-all ${tab === "paste" ? "bg-ink text-white font-bold" : "text-ink/60"}`}
              >
                Raw Paste
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4 flex-1">
            {tab === "url" ? (
              <div className="space-y-2">
                <label className="block text-xs font-headline font-bold uppercase tracking-wider text-ink">
                  Job Board URL / Posting Link
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 text-[18px]" aria-hidden="true">
                    link
                  </span>
                  <input
                    type="url"
                    value={jdUrl}
                    onChange={(e) => setJdUrl(e.target.value)}
                    placeholder="Paste LinkedIn, Greenhouse, Lever link..."
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-ink/50">The agent fetches and parses this posting when you launch it.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-headline font-bold uppercase tracking-wider text-ink">
                  Job Description
                </label>
                <textarea
                  rows={9}
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the full job description here..."
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-headline font-bold uppercase tracking-wider text-ink">
                Context <span className="text-ink/40 font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Talk, blog post, or anything specific you know about the company or person"
              />
            </div>
          </div>
        </div>

        {/* Column 2: Resume Intake */}
        <div className="lg:col-span-5 bg-surface-container-lowest border-2 border-ink shadow-brutal flex flex-col">
          <div className="p-5 sm:p-6 border-b-2 border-ink bg-surface-container-low flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="step-number">02</span>
              <h2 className="font-headline font-bold text-lg uppercase tracking-tight text-ink">Your Resume Base</h2>
            </div>
            {resumeText && (
              <span className="px-2 py-0.5 bg-surface-bright border border-ink text-[10px] font-headline uppercase font-bold text-blue">
                Indexed
              </span>
            )}
          </div>

          <div className="p-5 sm:p-6 space-y-6 flex-1">
            <div>
              <label className="block text-xs font-headline font-bold uppercase tracking-wider text-ink mb-1.5">
                Resume <span className="text-red">*</span>
              </label>
              {resumeText ? (
                <div className="border-2 border-ink bg-white p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-red text-white font-bold font-headline text-xs border border-ink flex items-center justify-center shrink-0">
                      DOC
                    </div>
                    <div className="min-w-0">
                      <div className="font-headline font-bold text-xs sm:text-sm text-ink truncate">{resumeFileName}</div>
                      <div className="text-[11px] font-body text-ink/50">Parsed &amp; ready</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setResumeText(""); setResumeFileName(""); }}
                    className="p-1.5 hover:bg-surface-container-high border border-transparent hover:border-ink text-ink/60 hover:text-red transition-all shrink-0"
                    title="Remove resume"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">swap_horiz</span>
                  </button>
                </div>
              ) : (
                <input type="file" accept=".pdf,.txt,.md" onChange={(e) => handleFile(e.target.files[0])} />
              )}
              {uploading && <p className="text-xs font-medium mt-1.5">Parsing resume...</p>}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-headline font-bold uppercase tracking-wider mb-1.5">LinkedIn</label>
                <input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
              </div>
              <div>
                <label className="block text-xs font-headline font-bold uppercase tracking-wider mb-1.5">GitHub</label>
                <input type="url" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/..." />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final execution bar */}
      <div className="bg-ink text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-2 border-ink shadow-[8px_8px_0px_#e63b2e]">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="font-headline font-bold text-xl uppercase tracking-tight">
            {readyCount ? "Parameters Calibrated" : "Awaiting Target & Resume"}
          </h4>
          <p className="font-body text-xs sm:text-sm text-white/60">
            The agent will parse the posting, scrape public company signal, and find verified contacts via Hunter.io.
          </p>
        </div>
        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full sm:w-auto px-8 py-4 bg-yellow text-ink hover:bg-white border-2 border-white font-headline font-bold text-sm uppercase tracking-wider transition-all transform active:translate-x-1 active:translate-y-1 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{loading ? "Starting Agent..." : "Start Agent & Find Contacts"}</span>
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_forward</span>
        </button>
      </div>

      {error && <div className="bg-red/10 border-2 border-red text-red text-sm font-medium px-4 py-3">{error}</div>}
    </form>
  );
}
