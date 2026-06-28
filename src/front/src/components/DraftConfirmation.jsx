export default function DraftConfirmation({ result, onReset }) {
  const { draftCount, usedGmail, gmail_url, created } = result || {};

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">
        {usedGmail ? `${draftCount} draft${draftCount !== 1 ? "s" : ""} in Gmail` : `${draftCount} email${draftCount !== 1 ? "s" : ""} ready`}
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        {usedGmail
          ? "Open Gmail, review each draft, and send when ready."
          : "Copy each email from the preview and send manually, or connect Gmail next time."}
      </p>
      {usedGmail && gmail_url && (
        <a
          href={gmail_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mb-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          Open Gmail Drafts →
        </a>
      )}
      {created?.length > 0 && (
        <p className="text-xs text-slate-400 mb-4">{created.length} draft(s) created successfully</p>
      )}
      <button onClick={onReset} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">
        Start new application
      </button>
    </div>
  );
}
