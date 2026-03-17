"use client"

import { Mail, MousePointerClick, Reply, AlertCircle, Search, History as HistoryIcon } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

type Status = "Sent" | "Opened" | "Replied" | "Bounced"

interface EmailRecord {
  id: string
  recipientName: string
  recipientEmail: string
  company: string
  subject: string
  sentAt: string
  status: Status
}

const mockHistory: EmailRecord[] = [
  { id: "1", recipientName: "Alex Mercer", recipientEmail: "alex@vercel.com", company: "Vercel", subject: "Exploring engineering opportunities at Vercel", sentAt: "Mar 11", status: "Replied" },
  { id: "2", recipientName: "Jane Smith", recipientEmail: "jane@stripe.com", company: "Stripe", subject: "Full-stack engineer passionate about payments", sentAt: "Mar 10", status: "Opened" },
  { id: "3", recipientName: "Maria Garcia", recipientEmail: "maria@shopify.com", company: "Shopify", subject: "Excited about your platform engineering team", sentAt: "Mar 10", status: "Sent" },
  { id: "4", recipientName: "Tom Chen", recipientEmail: "tom@linear.app", company: "Linear", subject: "Interested in shaping developer tooling", sentAt: "Mar 9", status: "Opened" },
  { id: "5", recipientName: "Sara Lee", recipientEmail: "sara@notion.so", company: "Notion", subject: "Building the future of collaborative software", sentAt: "Mar 8", status: "Bounced" },
  { id: "6", recipientName: "James Wu", recipientEmail: "james@figma.com", company: "Figma", subject: "Design-forward engineering perspective", sentAt: "Mar 7", status: "Replied" },
  { id: "7", recipientName: "Priya Patel", recipientEmail: "priya@anthropic.com", company: "Anthropic", subject: "AI safety research and engineering alignment", sentAt: "Mar 6", status: "Sent" },
]

const statusConfig: Record<Status, {
  label: string
  badgeClass: string
  icon: React.FC<{ className?: string }>
}> = {
  Replied:  { label: "Replied",  badgeClass: "bg-primary/15 text-primary",           icon: Reply },
  Opened:   { label: "Opened",   badgeClass: "bg-emerald-500/15 text-emerald-400",   icon: MousePointerClick },
  Sent:     { label: "Sent",     badgeClass: "bg-secondary text-muted-foreground",   icon: Mail },
  Bounced:  { label: "Bounced",  badgeClass: "bg-red-500/15 text-red-400",           icon: AlertCircle },
}

export function History() {
  const [search, setSearch] = useState("")

  const filtered = mockHistory.filter(
    (e) =>
      e.recipientName.toLowerCase().includes(search.toLowerCase()) ||
      e.company.toLowerCase().includes(search.toLowerCase()) ||
      e.subject.toLowerCase().includes(search.toLowerCase())
  )

  const stats = [
    { label: "Total Sent",  value: mockHistory.length, color: "text-foreground" },
    { label: "Opened",      value: mockHistory.filter((e) => e.status === "Opened" || e.status === "Replied").length, color: "text-emerald-400" },
    { label: "Replied",     value: mockHistory.filter((e) => e.status === "Replied").length, color: "text-primary" },
    { label: "Bounced",     value: mockHistory.filter((e) => e.status === "Bounced").length, color: "text-red-400" },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-border bg-[#0d0d0d] shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <HistoryIcon className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-semibold text-foreground">Campaign History</h1>
        </div>
        <p className="text-xs text-muted-foreground">All outreach emails and their delivery status.</p>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4">
          {stats.map(({ label, value, color }) => (
            <div key={label}>
              <p className={cn("text-xl font-bold tabular-nums", color)}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mt-4 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
          <input
            placeholder="Search emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[2fr_3fr_100px_100px] gap-4 px-6 py-2.5 border-b border-border bg-[#0d0d0d] sticky top-0 z-10 shrink-0">
        {["Recipient", "Subject", "Sent", "Status"].map((col) => (
          <span key={col} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {col}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Mail className="w-8 h-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground/50">No emails found</p>
          </div>
        ) : (
          filtered.map((email) => {
            const { label, badgeClass } = statusConfig[email.status]
            return (
              <div
                key={email.id}
                className="grid grid-cols-[2fr_3fr_100px_100px] gap-4 px-6 py-4 items-center border-b border-border/50 hover:bg-secondary/30 transition-colors"
              >
                {/* Recipient */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary">{email.recipientName[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{email.recipientName}</p>
                    <p className="text-xs text-muted-foreground truncate">{email.company}</p>
                  </div>
                </div>

                {/* Subject */}
                <div className="min-w-0">
                  <p className="text-sm text-foreground/80 truncate">{email.subject}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{email.recipientEmail}</p>
                </div>

                {/* Date */}
                <span className="text-xs text-muted-foreground whitespace-nowrap">{email.sentAt}</span>

                {/* Status badge */}
                <div>
                  <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", badgeClass)}>
                    {label}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
