"use client"

import { Mail, History, Zap, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

type Page = "compose" | "history"

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

const navItems: { id: Page; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: "compose", label: "New Campaign", icon: Mail },
  { id: "history", label: "History", icon: History },
]

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 shrink-0 flex flex-col h-screen border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-sidebar-border">
        <div className="w-7 h-7 rounded-md flex items-center justify-center bg-primary">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-foreground tracking-tight">
          Outreach<span className="text-primary">AI</span>
        </span>
      </div>

      {/* Nav label */}
      <div className="px-4 pt-5 pb-1.5">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Menu</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = currentPage === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all text-left",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-normal"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Stats footer */}
      <div className="px-4 pb-5 pt-4 border-t border-sidebar-border">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Stats</p>
        <div className="space-y-2.5">
          {[
            { label: "Emails Sent", value: "1,284", icon: Mail },
            { label: "Open Rate", value: "34.2%", icon: BarChart3 },
            { label: "Reply Rate", value: "8.1%", icon: BarChart3 },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-xs font-semibold text-primary">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-sidebar-border">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Agent online</span>
        </div>
      </div>
    </aside>
  )
}
