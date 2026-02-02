import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qradha - Quantum Port Optimization",
  description: "Real-time intermodal port synchronization and optimization platform for the Port of Hamburg",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
