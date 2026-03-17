"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { NewCampaign } from "@/components/new-campaign"
import { History } from "@/components/history"

type Page = "compose" | "history"

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>("compose")

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {currentPage === "compose" && <NewCampaign />}
        {currentPage === "history" && <History />}
      </main>
    </div>
  )
}
