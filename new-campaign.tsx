"use client"

import { useState, useCallback, useRef } from "react"
import { Upload, X, FileText, User, Building2, Mail, Briefcase, Search, Sparkles, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { EmailPreview } from "@/components/email-preview"

interface FormData {
  recipientName: string
  recipientJobTitle: string
  companyName: string
  recipientEmail: string
  aiResearch: boolean
}

interface GeneratedEmail {
  subject: string
  body: string
}

type Step = 1 | 2 | 3 | 4

const STEPS = [
  { id: 1, label: "Upload Resume" },
  { id: 2, label: "Fill Details" },
  { id: 3, label: "Generate" },
  { id: 4, label: "Send" },
]

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-0 px-6 py-4 border-b border-border">
      {STEPS.map((step, idx) => {
        const done = current > step.id
        const active = current === step.id
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all",
                  done
                    ? "bg-primary text-white"
                    : active
                    ? "bg-primary text-white ring-4 ring-primary/20"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {done ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  active ? "text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/50"
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <ChevronRight className={cn("w-3.5 h-3.5 mx-2 shrink-0", done ? "text-primary/60" : "text-border")} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function NewCampaign() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    recipientName: "",
    recipientJobTitle: "",
    companyName: "",
    recipientEmail: "",
    aiResearch: false,
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type === "application/pdf") setFile(dropped)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected?.type === "application/pdf") setFile(selected)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setGeneratedEmail(null)

    try {
      const response = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: formData.recipientName,
          recipientJobTitle: formData.recipientJobTitle,
          companyName: formData.companyName,
          recipientEmail: formData.recipientEmail,
          aiResearch: formData.aiResearch,
          hasResume: !!file,
        }),
      })
      const data = await response.json()
      setGeneratedEmail(data)
    } catch {
      setGeneratedEmail({
        subject: `Opportunity at ${formData.companyName}`,
        body: `Hi ${formData.recipientName},\n\nI came across ${formData.companyName} and was genuinely impressed by the work your team is doing.\n\nBest,\n[Your Name]`,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const isFormValid = formData.recipientName && formData.companyName && formData.recipientEmail

  // Determine current step
  const currentStep: Step = generatedEmail
    ? 4
    : isGenerating
    ? 3
    : isFormValid
    ? 3
    : file
    ? 2
    : 1

  const inputClass =
    "bg-secondary border-border text-foreground text-sm placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/60 focus-visible:border-primary/60 h-10 rounded-md"

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <StepIndicator current={currentStep} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-[340px] shrink-0 flex flex-col border-r border-border bg-[#0d0d0d] overflow-y-auto">
          {/* Panel header */}
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Campaign Setup</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Upload your resume and enter recipient details.</p>
          </div>

          <div className="flex-1 px-5 py-5 space-y-6">
            {/* Resume upload */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">
                Resume <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !file && fileInputRef.current?.click()}
                className={cn(
                  "relative rounded-lg border-2 border-dashed transition-all select-none",
                  file
                    ? "border-primary/40 bg-primary/5 cursor-default p-4"
                    : isDragging
                    ? "border-primary bg-primary/8 cursor-copy p-8"
                    : "border-border hover:border-primary/50 hover:bg-primary/[0.03] cursor-pointer p-8"
                )}
                style={isDragging ? {
                  boxShadow: "0 0 0 4px rgba(124, 58, 237, 0.12), 0 0 20px rgba(124, 58, 237, 0.15)"
                } : undefined}
              >
                {file ? (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
                      <FileText className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB &middot; PDF
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null) }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      aria-label="Remove file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center gap-2.5">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                      isDragging ? "bg-primary/20" : "bg-secondary"
                    )}>
                      <Upload className={cn("w-5 h-5 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {isDragging ? "Drop your PDF here" : "Drop PDF here"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">or click to browse files</p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileInput}
                  className="hidden"
                  aria-label="Upload PDF resume"
                />
              </div>
            </div>

            {/* Recipient fields */}
            <div>
              <h3 className="text-xs font-medium text-foreground mb-3">Recipient Details</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="recipientName" className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <User className="w-3.5 h-3.5" />
                    Full Name <span className="text-primary">*</span>
                  </label>
                  <Input
                    id="recipientName"
                    placeholder="Jane Smith"
                    value={formData.recipientName}
                    onChange={(e) => setFormData((f) => ({ ...f, recipientName: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="jobTitle" className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    Job Title
                  </label>
                  <Input
                    id="jobTitle"
                    placeholder="Head of Engineering"
                    value={formData.recipientJobTitle}
                    onChange={(e) => setFormData((f) => ({ ...f, recipientJobTitle: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="companyName" className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Company <span className="text-primary">*</span>
                  </label>
                  <Input
                    id="companyName"
                    placeholder="Acme Corp"
                    value={formData.companyName}
                    onChange={(e) => setFormData((f) => ({ ...f, companyName: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="recipientEmail" className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Email Address <span className="text-primary">*</span>
                  </label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    placeholder="jane@acmecorp.com"
                    value={formData.recipientEmail}
                    onChange={(e) => setFormData((f) => ({ ...f, recipientEmail: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* AI Research toggle */}
            <div>
              <h3 className="text-xs font-medium text-foreground mb-3">Options</h3>
              <div className={cn(
                "flex items-center justify-between rounded-lg px-4 py-3 border transition-all",
                formData.aiResearch
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-secondary/40"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                    formData.aiResearch ? "bg-primary/15" : "bg-secondary"
                  )}>
                    <Search className={cn("w-4 h-4 transition-colors", formData.aiResearch ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">AI Research</p>
                    <p className="text-xs text-muted-foreground">Deep-search company context</p>
                  </div>
                </div>
                <Switch
                  checked={formData.aiResearch}
                  onCheckedChange={(v) => setFormData((f) => ({ ...f, aiResearch: v }))}
                  aria-label="Enable AI Research"
                />
              </div>
            </div>
          </div>

          {/* Generate button */}
          <div className="px-5 pb-5 pt-2 border-t border-border">
            <button
              onClick={handleGenerate}
              disabled={!isFormValid || isGenerating}
              className={cn(
                "w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-lg transition-all",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                isGenerating
                  ? "bg-primary/20 text-primary border border-primary/30 cursor-wait"
                  : "bg-primary text-white hover:bg-primary/90 active:scale-[0.99]"
              )}
              style={isFormValid && !isGenerating ? {
                boxShadow: "0 0 0 0 transparent, 0 1px 2px rgba(0,0,0,0.4)"
              } : undefined}
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Email
                </>
              )}
            </button>
            {!isFormValid && (
              <p className="text-xs text-muted-foreground/50 text-center mt-2">
                Name, company, and email are required
              </p>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {generatedEmail || isGenerating ? (
            <EmailPreview
              subject={generatedEmail?.subject ?? ""}
              body={generatedEmail?.body ?? ""}
              recipientEmail={formData.recipientEmail}
              recipientName={formData.recipientName}
              companyName={formData.companyName}
              jobTitle={formData.recipientJobTitle}
              isGenerating={isGenerating}
              onRegenerate={handleGenerate}
              onSend={() => {}}
              onBodyChange={(body) =>
                setGeneratedEmail((e) => (e ? { ...e, body } : null))
              }
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-12 bg-background">
              <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mb-5">
                <Mail className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1.5">No email generated yet</p>
              <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-xs">
                Fill in the recipient details on the left and click{" "}
                <span className="text-primary font-medium">Generate Email</span>{" "}
                to create a personalized cold outreach.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
