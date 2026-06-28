import { useState, useEffect, useCallback } from "react";
import JobInput from "./components/JobInput";
import AgentProgress from "./components/AgentProgress";
import ContactReview from "./components/ContactReview";
import DraftPreview from "./components/DraftPreview";
import DraftConfirmation from "./components/DraftConfirmation";
import { API_BASE_URL, parseSSEStream, checkGmailStatus } from "./api";

const STAGES = ["input", "progress", "contacts", "generating", "preview", "done"];

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
        headers: { "Content-Type": "application/json" },
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
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/agent/confirm-contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: applicationId,
          contacts: confirmedContacts,
        }),
      });

      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Generation failed");

      await parseSSEStream(res, (event) => {
        if (event.type === "step") {
          setProgressMessages((prev) => [...prev, event.message]);
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

  const stageIndex = STAGES.indexOf(stage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="w-24" />
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Job Application Agent</h1>
            <div className="w-24 text-right">
              {gmailConnected ? (
                <span className="text-xs text-green-600 font-medium">Gmail ✓</span>
              ) : (
                <a
                  href={`${API_BASE_URL}/auth/gmail/login`}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Connect Gmail
                </a>
              )}
            </div>
          </div>
          <p className="text-slate-500 text-sm">JD + resume → contacts → personalized drafts</p>
          <div className="flex items-center justify-center gap-1 mt-6 flex-wrap">
            {["Input", "Agent", "Contacts", "Drafts", "Done"].map((label, i) => (
              <div key={label} className="flex items-center gap-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    stageIndex > i ? "bg-green-500 text-white" : stageIndex === i ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {stageIndex > i ? "✓" : i + 1}
                </div>
                <span className="text-xs text-slate-500 hidden sm:inline">{label}</span>
                {i < 4 && <div className={`w-4 h-0.5 ${stageIndex > i ? "bg-green-400" : "bg-slate-200"}`} />}
              </div>
            ))}
          </div>
        </div>

        {error && stage === "input" && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        {stage === "input" && <JobInput onStart={runAgent} />}

        {(stage === "progress" || stage === "generating") && (
          <AgentProgress messages={progressMessages} warnings={warnings} />
        )}

        {stage === "contacts" && (
          <ContactReview
            contacts={contacts}
            jobDetails={jobDetails}
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
            }}
            onBack={() => setStage("contacts")}
          />
        )}

        {stage === "done" && confirmation && (
          <DraftConfirmation result={confirmation} onReset={reset} />
        )}
      </div>
    </div>
  );
}
