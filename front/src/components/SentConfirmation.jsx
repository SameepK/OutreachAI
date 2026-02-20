export default function SentConfirmation({ emailData, onReset }) {
  const { formData, subject } = emailData;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center space-y-6">
      {/* Success icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      {/* Headline */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Email Sent!</h2>
        <p className="text-slate-500 mt-2 text-sm">
          Your cold email has been delivered successfully.
        </p>
      </div>

      {/* Details card */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-5 text-left space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-16 pt-0.5 shrink-0">
            To
          </span>
          <span className="text-slate-700 text-sm">
            <span className="font-semibold">{formData.name}</span> at{" "}
            <span className="font-semibold">{formData.company}</span>
            <br />
            <span className="text-slate-500">{formData.email}</span>
          </span>
        </div>
        <div className="border-t border-slate-200" />
        <div className="flex items-start gap-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-16 pt-0.5 shrink-0">
            Subject
          </span>
          <span className="text-slate-700 text-sm">{subject}</span>
        </div>
      </div>

      {/* Reset button */}
      <button
        onClick={onReset}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
      >
        Send Another Email
      </button>
    </div>
  );
}
