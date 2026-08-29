import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans } from "next/font/google";
import { site } from "@/lib/site";
import RegisterServiceWorker from "@/app/components/RegisterServiceWorker";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description: site.tagline,
  // Proves domain ownership to Pinterest (Settings → Claim your website) —
  // safe to leave in permanently, it's a one-way "yes, this is my site"
  // signal, not a credential.
  other: {
    "p:domain_verify": "48ffdd5d70cc32ada98265c3cad4151f",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5b5730",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
