import { useState, useEffect, useCallback } from "react";
import JobInput from "./components/JobInput";
import AgentProgress from "./components/AgentProgress";
import ContactReview from "./components/ContactReview";
import DraftPreview from "./components/DraftPreview";
import DraftConfirmation from "./components/DraftConfirmation";
import { API_BASE_URL, parseSSEStream, checkGmailStatus, authHeaders, clearResume } from "./api";

const STEPS = [
  { key: "input", label: "Target & Resume", path: "target-resume" },
  { key: "progress", label: "Autonomous Agent", path: "autonomous-agent" },
  { key: "contacts", label: "Contacts", path: "contacts" },
  { key: "preview", label: "Drafts", path: "drafts" },
  { key: "done", label: "Sync & Send", path: "sync-send" },
];

const STAGE_TO_STEP = {
  input: 0,
  progress: 1,
  generating: 1,
  contacts: 2,
  preview: 3,
  done: 4,
};

const PHASE_TAGS = [
  "Pipeline Phase 01 // Intake & Match",
  "Pipeline Stage 2 // Research & Draft",
  "Pipeline Stage 3 // Human Review",
  "Pipeline Stage 4 // Zero Hallucinations",
  "Pipeline Stage 5 // Dispatch Complete",
];

const HERO_COPY = [
  "Drop the target job listing and your latest resume. The agent extracts company signal, maps verified contacts, and prepares grounded outreach.",
  "Scraping public company signal, querying Hunter.io for verified contacts, and drafting grounded, personalized hooks per contact.",
  "Review every discovered contact before drafting begins. Edit a name, fix an email, or add a LinkedIn URL for richer research.",
  "Every line is grounded in real signal — the job posting, your resume, and public research. Nothing is invented.",
  "Drafts are staged, never sent automatically. Review in Gmail (or copy manually) and send when you're ready.",
];

export default function App() {
  const [stage, setStage] = useState("input");
  const [agentInput, setAgentInput] = useState(null);
  const [progressMessages, setProgressMessages] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [applicationId, setApplicationId] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [jobDetails, setJobDetails] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [failed, setFailed] = useState([]);
  const [confirmation, setConfirmation] = useState(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    checkGmailStatus().then((s) => setGmailConnected(s.connected));
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected") {
      setGmailConnected(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const runAgent = useCallback(async (input) => {
    setAgentInput(input);
    setStage("progress");
    setProgressMessages([]);
    setWarnings([]);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/agent/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          jd_text: input.jd_text,
          jd_url: input.jd_url,
          resume_text: input.resume_text,
          context: input.context,
          linkedin: input.linkedin,
          github: input.github,
          sign_off: input.sign_off,
        }),
      });

      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Agent failed");

      let streamError = null;
      await parseSSEStream(res, (event) => {
        if (event.type === "step") {
          setProgressMessages((prev) => [...prev, event.message]);
        } else if (event.type === "warning") {
          setWarnings((prev) => [...prev, event.message]);
        } else if (event.type === "error") {
          streamError = event.message;
        } else if (event.type === "contacts_ready") {
          setApplicationId(event.application_id);
          setContacts(event.data || []);
          setJobDetails(event.job_details);
          setStage("contacts");
        }
      });

      if (streamError) {
        setError(streamError);
        setStage("input");
      }
    } catch (e) {
      setError(e.message);
      setStage("input");
    }
  }, []);

  const confirmContacts = async (confirmedContacts) => {
    setStage("generating");
    setProgressMessages([]);
    setWarnings([]);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/agent/confirm-contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          application_id: applicationId,
          contacts: confirmedContacts,
        }),
      });

      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Generation failed");

      await parseSSEStream(res, (event) => {
        if (event.type === "step") {
          setProgressMessages((prev) => [...prev, event.message]);
        } else if (event.type === "warning") {
          setWarnings((prev) => [...prev, event.message]);
        } else if (event.type === "error") {
          setError(event.message);
        } else if (event.type === "drafts_ready") {
          setDrafts(event.drafts || []);
          setFailed(event.failed || []);
          setStage("preview");
        }
      });
    } catch (e) {
      setError(e.message);
      setStage("contacts");
    }
  };

  const reset = () => {
    setStage("input");
    setAgentInput(null);
    setProgressMessages([]);
    setWarnings([]);
    setApplicationId(null);
    setContacts([]);
    setJobDetails(null);
    setDrafts([]);
    setFailed([]);
    setConfirmation(null);
    setError("");
  };

  const currentStep = STAGE_TO_STEP[stage] ?? 0;

  return (
    <div className="min-h-[100dvh] bg-surface flex flex-col">
      {/* Fixed header */}
      <header className="fixed top-0 w-full z-50 bg-surface-bright border-b-2 border-ink">
        <div className="h-16 w-full px-4 sm:px-6 lg:px-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-7 h-7 bg-red border-2 border-ink flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[16px]" aria-hidden="true">flare</span>
            </div>
            <span className="font-headline font-bold text-lg tracking-tight uppercase text-ink">OutreachAI</span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-headline font-bold uppercase tracking-wider bg-yellow text-ink border border-ink">
              v2.4
            </span>
          </div>

          <nav className="hidden xl:flex items-center gap-1 overflow-x-auto">
            {STEPS.map((step, i) => (
              <div key={step.key} className="flex items-center">
                <span
                  className={`px-3 py-1.5 text-xs font-headline uppercase tracking-wide transition-all whitespace-nowrap ${
                    currentStep === i
                      ? "bg-ink text-white font-bold border-2 border-ink"
                      : currentStep > i
                      ? "text-ink/70 font-medium border border-transparent"
                      : "text-ink/40 font-medium border border-transparent"
                  }`}
                >
                  {i + 1}. {step.label}
                </span>
                {i < STEPS.length - 1 && <span className="text-ink/20 text-xs">/</span>}
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {gmailConnected ? (
              <span className="tag bg-blue/10 border-blue text-blue">Gmail Connected</span>
            ) : (
              <a
                href={`${API_BASE_URL}/auth/gmail/login`}
                className="tag hover:bg-ink hover:text-white transition-colors"
              >
                Connect Gmail
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full pt-16 bg-surface">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 py-8 md:py-12">
          <div className="max-w-2xl space-y-3 mb-8">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-ink text-white text-xs font-headline uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-yellow animate-pulse" />
              {PHASE_TAGS[currentStep]}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-bold uppercase tracking-tight text-ink leading-none">
              {STEPS[currentStep].label}
            </h1>
            <p className="text-ink/60 font-body text-sm sm:text-base leading-relaxed max-w-xl">
              {HERO_COPY[currentStep]}
            </p>
          </div>

          {error && stage === "input" && (
            <div className="mb-6 bg-red/10 border-2 border-red text-red text-sm font-medium px-4 py-3">
              {error}
            </div>
          )}

          {stage === "input" && <JobInput onStart={runAgent} />}

          {(stage === "progress" || stage === "generating") && (
            <AgentProgress messages={progressMessages} warnings={warnings} />
          )}

          {stage === "contacts" && (
            <ContactReview
              contacts={contacts}
              jobDetails={jobDetails}
              applicationId={applicationId}
              onConfirm={confirmContacts}
              onBack={reset}
            />
          )}

          {stage === "preview" && (
            <DraftPreview
              drafts={drafts}
              failed={failed}
              applicationId={applicationId}
              gmailConnected={gmailConnected}
              onComplete={(result) => {
                setConfirmation(result);
                setStage("done");
                clearResume().catch(() => {});
              }}
              onBack={() => setStage("contacts")}
            />
          )}

          {stage === "done" && confirmation && (
            <DraftConfirmation result={confirmation} onReset={reset} />
          )}
        </div>
      </main>

      <footer className="w-full bg-surface-container-low border-t-2 border-ink py-6">
        <div className="w-full px-4 sm:px-6 lg:px-12 flex items-center justify-center text-xs font-headline uppercase tracking-wider text-ink/60">
          <span className="text-ink font-bold">© 2025 OutreachAI</span>
        </div>
      </footer>
    </div>
  );
}
