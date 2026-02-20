import { useState } from "react";
import EmailForm from "./components/EmailForm";
import EmailPreview from "./components/EmailPreview";
import SentConfirmation from "./components/SentConfirmation";

export default function App() {
  const [stage, setStage] = useState("form"); // "form" | "preview" | "sent"
  const [emailData, setEmailData] = useState(null); // { subject, body, formData }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-800 tracking-tight">
            Cold Email Agent
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            AI-generated cold emails, sent in seconds
          </p>
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {["form", "preview", "sent"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    stage === s
                      ? "bg-blue-600 text-white"
                      : ["form", "preview", "sent"].indexOf(stage) > i
                      ? "bg-green-500 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {["form", "preview", "sent"].indexOf(stage) > i ? "✓" : i + 1}
                </div>
                {i < 2 && (
                  <div
                    className={`w-10 h-0.5 ${
                      ["form", "preview", "sent"].indexOf(stage) > i
                        ? "bg-green-400"
                        : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {stage === "form" && (
          <EmailForm
            onSuccess={(data) => {
              setEmailData(data);
              setStage("preview");
            }}
          />
        )}

        {stage === "preview" && emailData && (
          <EmailPreview
            emailData={emailData}
            onSent={() => setStage("sent")}
            onBack={() => setStage("form")}
          />
        )}

        {stage === "sent" && emailData && (
          <SentConfirmation
            emailData={emailData}
            onReset={() => {
              setEmailData(null);
              setStage("form");
            }}
          />
        )}
      </div>
    </div>
  );
}
