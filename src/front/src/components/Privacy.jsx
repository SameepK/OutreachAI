export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-12 flex flex-col gap-6 text-ink font-body">
      <h1 className="font-headline font-bold text-3xl uppercase tracking-tight">Privacy Policy</h1>
      <p className="text-ink/60 text-sm">Last updated: {new Date().toISOString().slice(0, 10)}</p>

      <section className="flex flex-col gap-2">
        <h2 className="font-headline font-bold text-lg uppercase">What this app does</h2>
        <p>
          OutreachAI helps you draft personalized outreach emails for a job application: you provide a job posting
          and your resume, and the app researches the company and named contacts, then drafts emails grounded in
          that research. Optionally, you can connect your Gmail account so drafts are created directly in your
          Gmail Drafts folder instead of being copy-pasted.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-headline font-bold text-lg uppercase">What we store</h2>
        <p>
          Nothing. Your resume text, the job posting, researched contacts, and generated drafts exist only in this
          server's memory for the duration of your visit, tied to an anonymous session cookie. Nothing is written
          to a database or disk. Restarting the server, or your session going idle for a few hours, erases it
          permanently. We do not log, analyze, or retain your resume content, email addresses you draft to, or the
          content of any draft.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-headline font-bold text-lg uppercase">Gmail access</h2>
        <p>
          If you choose to connect Gmail, we request the <code>gmail.compose</code> scope — the narrowest scope
          Google offers for this purpose. This scope only allows creating new draft emails; it cannot read your
          existing mail, cannot send anything on your behalf, and cannot access any mail outside of drafts this app
          itself creates. Every draft is staged for your review in your own Gmail account — nothing is ever sent
          automatically.
        </p>
        <p>
          Your Gmail OAuth token is held only in server memory for your session, the same as everything else on
          this page, and is discarded when your session ends.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-headline font-bold text-lg uppercase">Third-party services</h2>
        <p>
          To research companies and contacts, this app calls Groq (email drafting), Hunter.io (contact discovery),
          and Perplexity (public research). We send only what's needed for that specific lookup (e.g. a company
          name or domain) — never your resume or Gmail data.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-headline font-bold text-lg uppercase">Contact</h2>
        <p>Questions about this policy or how the app handles your data can be sent to the site owner.</p>
      </section>
    </div>
  );
}
