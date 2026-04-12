import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://doc.ezboq.com'),
  title: {
    default: 'EzBOQ Documents - ศูนย์จัดการเอกสารภายใน EzBOQ',
    template: '%s | EzBOQ Documents'
  },
  description: "โมดูลเอกสารของ EzBOQ สำหรับออกใบเสนอราคา ใบวางบิล และใบเสร็จ ผ่าน workflow เดียวกับระบบหลัก",
  keywords: [
    'EzBOQ Documents', 'EzBOQ', 'ออกใบเสนอราคา', 'ใบวางบิล', 'ใบเสร็จรับเงิน', 'จัดการเอกสาร', 'Tax Invoice',
    'Quotation', 'Invoice', 'Receipt', 'ฟรีแลนซ์', 'SME', 'LINE OA'
  ],
  authors: [{ name: 'EzBOQ Platform' }],
  creator: 'EzBOQ Platform',
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    url: 'https://doc.ezboq.com',
    title: 'EzBOQ Documents - ศูนย์จัดการเอกสารภายใน EzBOQ',
    description: 'โมดูลเอกสารของ EzBOQ สำหรับออกใบเสนอราคา ใบวางบิล และใบเสร็จ',
    siteName: 'EzBOQ Documents',
    images: [
      {
        url: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Fezdoc_cozy_document_flow.png?alt=media&token=6632a846-af2b-49e6-8d62-78ea7548bc70',
        width: 1200,
        height: 630,
        alt: 'EzBOQ Documents - ศูนย์จัดการเอกสารภายใน EzBOQ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EzBOQ Documents - ศูนย์จัดการเอกสารภายใน EzBOQ',
    description: 'โมดูลเอกสารของ EzBOQ สำหรับออกใบเสนอราคา ใบวางบิล และใบเสร็จ',
    images: ['https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Fezdoc_cozy_document_flow_20260129.png?alt=media&token=a090b7cb-8975-4550-a868-a6a549fdbfd6'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  other: {
    'geo.region': 'TH',
    'geo.placename': 'Bangkok, Thailand',
    'content-language': 'th',
  },
};

import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/lib/auth-context';
import UnregisterServiceWorkers from '@/components/unregister-service-workers';
import ScrollToTop from '@/components/scroll-to-top';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              '@id': 'https://doc.ezboq.com/#organization',
              name: 'EzBOQ Documents',
              url: 'https://doc.ezboq.com',
              logo: 'https://firebasestorage.googleapis.com/v0/b/ezdoc-v1-th.firebasestorage.app/o/logo%2Flogo%20icon.png?alt=media',
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: '+66-00-000-0000',
                contactType: 'customer service',
                areaServed: 'TH',
                availableLanguage: 'Thai'
              },
              sameAs: [
                'https://www.facebook.com/ezdoc',
                'https://line.me/R/ti/p/@ezdoc'
              ]
            }),
          }}
        />
        {/* Unregister any previously-registered Service Workers (one-time cleanup). */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <ScrollToTop />
            <UnregisterServiceWorkers />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
