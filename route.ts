import { generateText } from "ai"

export async function POST(req: Request) {
  const { recipientName, recipientJobTitle, companyName, recipientEmail, aiResearch, hasResume } = await req.json()

  const researchNote = aiResearch
    ? `You have researched ${companyName} and found that it is an innovative, fast-growing company known for its engineering culture and recent product launches.`
    : ""

  const resumeNote = hasResume
    ? "The sender has uploaded their resume with strong software engineering and full-stack development experience."
    : "The sender has relevant professional experience."

  const prompt = `You are an expert cold email copywriter. Write a concise, professional, personalized cold email.

Recipient: ${recipientName}${recipientJobTitle ? `, ${recipientJobTitle}` : ""}
Company: ${companyName}
${researchNote}
${resumeNote}

Rules:
- Keep it under 150 words
- Be specific, genuine, and not salesy
- Reference the company by name
- End with a clear but soft call-to-action
- Do NOT use generic phrases like "I hope this email finds you well"
- Sound like a real human, not a template

Return a JSON object with exactly two keys:
- "subject": A compelling email subject line (under 10 words)
- "body": The full email body (plain text, include greeting and sign-off with "Best,\\n[Your Name]")
- "whyPoints": An array of 3-4 short strings (max 15 words each) explaining why each personalization element works`

  try {
    const result = await generateText({
      model: "openai/gpt-4o-mini",
      prompt,
    })

    // Parse the JSON from the response
    const text = result.text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("No JSON found")
    const parsed = JSON.parse(jsonMatch[0])

    return Response.json({
      subject: parsed.subject ?? `Opportunity at ${companyName}`,
      body: parsed.body ?? "",
    })
  } catch {
    // Fallback email
    const body = `Hi ${recipientName},

I came across ${companyName} and was genuinely impressed by the work your team is doing${recipientJobTitle ? `, especially in your role as ${recipientJobTitle}` : ""}.

I'm a software engineer with experience building scalable products and I'd love to explore if there's a fit on your team. I believe I could contribute meaningfully to your engineering goals.

Would you be open to a quick 15-minute call this week?

Best,
[Your Name]`

    return Response.json({
      subject: `Excited about ${companyName}'s engineering team`,
      body,
    })
  }
}
