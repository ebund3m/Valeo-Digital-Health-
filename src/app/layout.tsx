import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const dmSans = DM_Sans({
  subsets:  ["latin"],
  variable: "--font-dm-sans",
});

const dmSerif = DM_Serif_Display({
  weight:   "400",
  subsets:  ["latin"],
  variable: "--font-dm-serif",
  style:    ["normal", "italic"],
});

export const metadata: Metadata = {
  title:       "The Valeo Experience | Caribbean Mental Health Platform",
  description: "Expert psychological support rooted in Caribbean understanding.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmSerif.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}