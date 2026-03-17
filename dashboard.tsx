"use client"

import { TrendingUp, Mail, MousePointerClick, Reply, PlusCircle, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const stats = [
  { label: "Emails Sent", value: "1,284", delta: "+12%", icon: Mail, positive: true },
  { label: "Open Rate", value: "34.2%", delta: "+5.1%", icon: MousePointerClick, positive: true },
  { label: "Reply Rate", value: "8.7%", delta: "+1.3%", icon: Reply, positive: true },
  { label: "Campaigns", value: "47", delta: "+3", icon: BarChart3, positive: true },
]

const recentActivity = [
  { name: "Jane Smith", company: "Stripe", status: "Opened", time: "2h ago", color: "text-emerald-400" },
  { name: "Alex Mercer", company: "Vercel", status: "Replied", time: "4h ago", color: "text-primary" },
  { name: "Maria Garcia", company: "Shopify", status: "Sent", time: "6h ago", color: "text-muted-foreground" },
  { name: "Tom Chen", company: "Linear", status: "Opened", time: "1d ago", color: "text-emerald-400" },
  { name: "Sara Lee", company: "Notion", status: "Bounced", time: "1d ago", color: "text-destructive-foreground" },
]

interface DashboardProps {
  onNewCampaign: () => void
}

export function Dashboard({ onNewCampaign }: DashboardProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back! Here&apos;s your outreach overview.</p>
        </div>
        <Button
          onClick={onNewCampaign}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold hidden sm:flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          New Campaign
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, delta, icon: Icon, positive }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <div className={cn("flex items-center gap-1 mt-1.5", positive ? "text-emerald-400" : "text-destructive-foreground")}>
              <TrendingUp className="w-3 h-3" />
              <span className="text-xs font-medium">{delta} this month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Activity + CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Recent Activity</p>
            <span className="text-xs text-muted-foreground">Last 7 days</span>
          </div>
          <div className="divide-y divide-border">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                    {item.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={cn("text-xs font-semibold", item.color)}>{item.status}</span>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Launch Card */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 flex flex-col items-center justify-center text-center p-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
            <PlusCircle className="w-7 h-7 text-primary" />
          </div>
          <p className="text-base font-bold text-foreground mb-2 text-balance">Start a New Campaign</p>
          <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
            Generate AI-personalized cold emails in seconds with your resume.
          </p>
          <Button
            onClick={onNewCampaign}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full"
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  )
}
