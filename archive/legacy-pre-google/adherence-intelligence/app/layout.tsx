import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YaCheck Adherence Intelligence Prototype",
  description: "Interactive prototype for medication adherence, adaptive reminders, weekly health checks, and local smart search.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
