export const metadata = {
  title: "PhishCatch API",
  description: "AI-powered email phishing detection API",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
