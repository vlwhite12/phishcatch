export default function Home() {
  return (
    <div style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1>🛡️ PhishCatch API</h1>
      <p>AI-powered email phishing detection. This API powers the PhishCatch Chrome extension.</p>
      <code>POST /api/analyze</code> — Analyze an email for phishing indicators.
    </div>
  );
}
