"use client"

import { useState } from "react"
import { Copy, Check, RefreshCw, SendHorizonal, Sparkles, Paperclip } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface EmailPreviewProps {
  subject: string
  body: string
  recipientEmail: string
  recipientName: string
  companyName: string
  jobTitle: string
  isGenerating?: boolean
  onRegenerate: () => void
  onSend: () => void
  onBodyChange: (body: string) => void
}

export function EmailPreview({
  subject,
  body,
  recipientEmail,
  recipientName,
  companyName,
  jobTitle,
  isGenerating = false,
  onRegenerate,
  onSend,
  onBodyChange,
}: EmailPreviewProps) {
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSend = () => {
    onSend()
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  const wordCount = body ? body.split(/\s+/).filter(Boolean).length : 0

  return (
    <div className="flex h-full overflow-hidden">
      {/* Email compose area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 h-12 border-b border-border bg-[#0d0d0d] shrink-0">
          <span className="text-xs font-medium text-muted-foreground">Email Preview</span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-md hover:bg-secondary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={onRegenerate}
              disabled={isGenerating}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-md hover:bg-secondary disabled:opacity-40"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
              Regenerate
            </button>
          </div>
        </div>

        {/* Email header fields — email client style */}
        <div className="border-b border-border bg-[#0d0d0d] shrink-0">
          {/* From */}
          <div className="flex items-center gap-0 px-5 py-3 border-b border-border/60">
            <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">From</span>
            <span className="text-sm text-muted-foreground">you@yourname.com</span>
          </div>
          {/* To */}
          <div className="flex items-center gap-0 px-5 py-3 border-b border-border/60">
            <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">To</span>
            {recipientEmail ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-secondary border border-border rounded-full px-2.5 py-0.5">
                  <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-primary uppercase">
                      {recipientName ? recipientName[0] : recipientEmail[0]}
                    </span>
                  </div>
                  <span className="text-xs text-foreground/80">
                    {recipientName ? `${recipientName} ` : ""}<span className="text-muted-foreground">&lt;{recipientEmail}&gt;</span>
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground/40">—</span>
            )}
          </div>
          {/* Subject */}
          <div className="flex items-center gap-0 px-5 py-3">
            <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Subject</span>
            {isGenerating ? (
              <div className="h-4 w-64 bg-secondary rounded animate-pulse" />
            ) : subject ? (
              <span className="text-sm font-medium text-foreground">{subject}</span>
            ) : (
              <span className="text-sm text-muted-foreground/40">—</span>
            )}
          </div>
        </div>

        {/* Email body */}
        <div className="flex-1 overflow-auto px-5 pt-5 pb-4">
          {isGenerating ? (
            <div className="space-y-3 animate-fade-in-up">
              <div className="h-4 bg-secondary rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-secondary rounded w-full animate-pulse" />
              <div className="h-4 bg-secondary rounded w-5/6 animate-pulse" />
              <div className="h-4 bg-secondary rounded w-2/3 animate-pulse" />
              <div className="h-4 bg-secondary rounded w-4/5 animate-pulse" />
              <div className="mt-6 flex items-center gap-2 text-xs text-primary/60">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                Writing your personalized email...
              </div>
            </div>
          ) : (
            <Textarea
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              className="w-full min-h-[280px] bg-transparent border-0 text-foreground text-sm leading-relaxed resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 placeholder:text-muted-foreground/30"
              placeholder="Your generated email will appear here..."
            />
          )}
        </div>

        {/* Bottom action bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-[#0d0d0d] shrink-0">
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" aria-label="Attach file">
              <Paperclip className="w-4 h-4" />
            </button>
            {body && (
              <span className="text-xs text-muted-foreground">{wordCount} words</span>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!body || isGenerating}
            className={cn(
              "flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-full transition-all",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              sent
                ? "bg-emerald-600 text-white"
                : "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]"
            )}
            style={body && !sent && !isGenerating ? {
              boxShadow: "0 0 0 3px rgba(124, 58, 237, 0.25), 0 0 16px rgba(124, 58, 237, 0.3)"
            } : undefined}
          >
            {sent ? (
              <>
                <Check className="w-4 h-4" />
                Sent!
              </>
            ) : (
              <>
                <SendHorizonal className="w-4 h-4" />
                Send Email
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right: Why this works panel */}
      <div className="w-64 shrink-0 flex flex-col border-l border-border bg-[#0d0d0d] overflow-hidden">
        <div className="px-4 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Why This Works</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Personalization breakdown</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isGenerating ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 bg-secondary rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-secondary rounded w-full animate-pulse" />
                  <div className="h-3 bg-secondary rounded w-1/2 animate-pulse" />
                </div>
              ))}
            </div>
          ) : body ? (
            <ul className="space-y-4">
              {buildWhyPoints(recipientName, companyName, jobTitle).map((point, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-[9px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">{point}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground/40 text-center mt-8">
              Generate an email to see the personalization analysis.
            </p>
          )}
        </div>

        {/* AI confidence */}
        {body && !isGenerating && (
          <div className="px-4 py-3.5 border-t border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground">AI Confidence</span>
              <span className="text-[11px] font-semibold text-primary">87%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: "87%" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function buildWhyPoints(name: string, company: string, jobTitle: string): string[] {
  const points: string[] = []
  if (name) points.push(`Directly addresses ${name} by name, creating an immediate personal connection.`)
  if (company) points.push(`References ${company} specifically, signaling genuine research not mass blasting.`)
  if (jobTitle) points.push(`Framed around the ${jobTitle} role — relevant to their actual responsibilities.`)
  points.push("Under 150 words keeps it scannable — long emails get ignored.")
  points.push("Soft CTA avoids pressure and lowers the reply threshold significantly.")
  return points.slice(0, 4)
}
