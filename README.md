# PhishCatch — AI Email Phishing Detector

A beautiful Chrome extension that automatically scans your Gmail emails for phishing threats using AI, powered by Claude.

## Architecture

```
extension/        → Chrome Extension (Manifest V3)
  ├── manifest.json
  ├── popup.html  → Dashboard UI with scan history & stats
  ├── scripts/
  │   ├── background.js  → Service worker, API communication
  │   ├── content.js     → Gmail content script, auto-scanning
  │   └── popup.js       → Popup controller
  └── styles/
      ├── popup.css      → Popup styles
      └── content.css    → Gmail banner styles

backend/          → Next.js API (deployed on Vercel)
  └── app/api/
      ├── analyze/route.ts  → Claude AI phishing analysis endpoint
      └── health/route.ts   → Health check
```

## Features

- **Auto-scan**: Automatically scans emails when you open them in Gmail
- **AI Analysis**: Uses Claude to evaluate 10+ phishing indicators
- **Phishing Score**: 0-100 score with SAFE / SUSPICIOUS / DANGEROUS verdicts
- **Gmail Banner**: Shows results directly in Gmail with a beautiful banner
- **Dashboard**: Popup with scan history, stats, and detailed reports
- **Click-to-detail**: Click any scan to see full indicator breakdown

## Setup

### Backend (Vercel)

1. `cd backend && npm install`
2. Set `ANTHROPIC_API_KEY` environment variable
3. `npx vercel` to deploy (or `npm run dev` for local)

### Chrome Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `extension/` folder
4. Click the PhishCatch icon to open the dashboard
5. Go to Settings (gear icon) and set your API URL if not using the default

## How It Works

1. When you open an email in Gmail, the content script extracts the subject, sender, body, and links
2. This data is sent to the backend API
3. Claude AI analyzes the email against 10+ phishing indicators
4. Results are displayed as a banner in Gmail and saved to scan history
5. The popup dashboard shows aggregated stats and detailed reports
