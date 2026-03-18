# PhishCatch — AI Email Phishing Detector

<p align="center">
  <img src="extension/icons/icon128.svg" alt="PhishCatch Logo" width="80" />
</p>

<p align="center">
  <strong>AI-powered Chrome extension that automatically scans Gmail emails for phishing threats in real time.</strong>
</p>

<p align="center">
  <a href="https://phishcatch-ginz.vercel.app">Live API</a> · Chrome Extension · Built with Claude AI
</p>

---

## What It Does

PhishCatch is a Chrome extension + serverless backend that uses **Claude AI** to analyze every email you open in Gmail. It evaluates **10+ phishing indicators** — sender spoofing, urgency tactics, suspicious links, brand impersonation, and more — and returns a **0–100 risk score** with a clear verdict: **SAFE**, **SUSPICIOUS**, or **DANGEROUS**.

Results appear instantly as a color-coded banner inside Gmail, and a popup dashboard tracks scan history with detailed breakdowns.

## Demo

| Gmail Banner (Safe) | Gmail Banner (Dangerous) | Popup Dashboard |
|---|---|---|
| Green banner with score ring | Red banner with indicators | Stats grid + scan history |

## Key Features

- **Auto-Scan** — Emails are analyzed the moment you open them, no clicks required
- **AI-Powered Analysis** — Claude evaluates sender legitimacy, URL safety, urgency cues, grammar, impersonation, and more
- **Risk Scoring** — 0–100 phishing score with SAFE / SUSPICIOUS / DANGEROUS verdicts
- **Gmail Integration** — Beautiful in-email banners with score rings, indicators, and dismiss controls
- **Dashboard** — Extension popup with aggregate stats, scan history, and click-to-expand detail views
- **Indicator Breakdown** — Each scan lists specific phishing signals found, their severity, and actionable recommendations
- **Scan History** — Last 50 scans stored locally with subject, sender, score, and timestamp
- **Configurable Backend** — Settings panel to point to your own API deployment

## Tech Stack

| Layer | Technology |
|---|---|
| **Extension** | Chrome Manifest V3, vanilla JS, CSS (no frameworks) |
| **Backend** | Next.js 14 (App Router), TypeScript, deployed on Vercel |
| **AI** | Anthropic Claude API (claude-sonnet-4-20250514) |
| **Infra** | Vercel serverless functions, Chrome Storage API |

## Architecture

```
phishcatch/
├── extension/                  # Chrome Extension (Manifest V3)
│   ├── manifest.json           # Extension config + permissions
│   ├── popup.html              # Dashboard UI
│   ├── scripts/
│   │   ├── background.js       # Service worker — API calls, scan history
│   │   ├── content.js          # Gmail DOM scraping + auto-scan
│   │   └── popup.js            # Dashboard controller + detail modals
│   └── styles/
│       ├── popup.css           # Dashboard styles (380px popup)
│       └── content.css         # Gmail banner styles
│
└── backend/                    # Next.js API (Vercel)
    └── app/api/
        ├── analyze/route.ts    # POST — Claude AI phishing analysis
        └── health/route.ts     # GET — Health check
```

### How It Works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Gmail Tab   │────▶│  Background  │────▶│  Vercel API  │
│ content.js   │     │  Service     │     │  /api/analyze │
│ extracts     │     │  Worker      │     │  Claude AI    │
│ email data   │◀────│  returns     │◀────│  returns      │
│ shows banner │     │  result      │     │  score + data │
└──────────────┘     └──────────────┘     └──────────────┘
```

1. **Content script** detects when you open an email in Gmail and extracts subject, sender, body text, and links
2. **Background service worker** sends the data to the Vercel API
3. **Claude AI** evaluates 10+ phishing indicators and returns a structured JSON response
4. **Content script** renders a color-coded banner (green/yellow/red) with the score and key findings
5. **Scan history** is persisted to Chrome local storage and displayed in the popup dashboard

## Setup

### Backend

```bash
cd backend
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev         # Local: http://localhost:3000
npx vercel --prod   # Deploy to Vercel
```

Set `ANTHROPIC_API_KEY` in Vercel → Project Settings → Environment Variables for production.

### Chrome Extension

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `extension/` folder
4. Navigate to Gmail and open any email — it scans automatically
5. Click the PhishCatch icon for the dashboard

### Configuration

Click the gear icon in the popup to set a custom API endpoint if you're self-hosting.

## API

### `POST /api/analyze`

Analyzes an email for phishing indicators.

**Request:**
```json
{
  "subject": "Urgent: Verify your account",
  "sender": "security@paypa1.com",
  "body": "Click here to verify your account or it will be suspended...",
  "links": ["https://paypa1-verify.sketchy.site/login"]
}
```

**Response:**
```json
{
  "score": 92,
  "verdict": "DANGEROUS",
  "summary": "This email exhibits multiple high-confidence phishing indicators including a spoofed sender domain and a deceptive URL.",
  "indicators": [
    { "type": "Spoofed Domain", "detail": "paypa1.com mimics paypal.com using character substitution", "severity": "high" },
    { "type": "Urgency Tactics", "detail": "Threatens account suspension to pressure immediate action", "severity": "high" },
    { "type": "Suspicious URL", "detail": "Link points to sketchy.site, not the legitimate PayPal domain", "severity": "high" }
  ],
  "recommendations": [
    "Do not click any links in this email",
    "Report this email as phishing in Gmail",
    "Navigate to PayPal directly via your browser to check account status"
  ]
}
```

## License

MIT
