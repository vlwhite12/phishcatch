import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic();

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { subject, sender, body, links } = await request.json();

    if (!body && !subject) {
      return NextResponse.json({ error: "Email body or subject is required" }, { status: 400 });
    }

    const emailContent = `
Subject: ${subject || "(no subject)"}
From: ${sender || "(unknown sender)"}
Links found in email: ${links?.length ? links.join(", ") : "none"}

Email Body:
${body || "(empty)"}
`.trim();

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are an expert email security analyst. Analyze this email for phishing indicators and return a JSON response.

Evaluate these factors:
1. Sender legitimacy (spoofed domains, free email providers impersonating companies)
2. Urgency/pressure tactics ("act now", "account suspended", "verify immediately")
3. Suspicious links (mismatched display text vs URL, URL shorteners, lookalike domains)
4. Grammar and spelling errors typical of phishing
5. Requests for sensitive info (passwords, SSN, credit cards, login credentials)
6. Impersonation of known brands or authority figures
7. Too-good-to-be-true offers
8. Mismatched reply-to addresses
9. Generic greetings vs personalized content
10. Attachment references or download requests

Return ONLY valid JSON in this exact format:
{
  "score": <number 0-100, where 0 is safe and 100 is definitely phishing>,
  "verdict": "<SAFE|SUSPICIOUS|DANGEROUS>",
  "summary": "<one sentence summary>",
  "indicators": [
    {"type": "<indicator category>", "detail": "<specific finding>", "severity": "<low|medium|high>"}
  ],
  "recommendations": ["<actionable recommendation>"]
}

Email to analyze:
${emailContent}`,
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse analysis" }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return NextResponse.json(analysis, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (error: unknown) {
    console.error("Analysis error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
