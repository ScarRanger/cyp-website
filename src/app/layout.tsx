import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import { CartProvider } from "./providers/CartProvider";
import Script from "next/script";
import { s } from "framer-motion/client";

export const metadata: Metadata = {
  metadataBase: new URL('https://www.cypvasai.org'),

  // Optimized Title and Description (from previous step)
  title: {
    default: 'Catholic Youth Group Vasai | Christian Youth in Power (CYP)',
    template: '%s | CYP Vasai',
  },
  description: 'Christian Youth in Power (CYP) Vasai: Empowering young Catholics in Vasai-Virar through faith, community, service, and youth ministry. Join our main prayer group every Monday at 7 PM in Giriz.',
  keywords: [
    'Catholic Youth Group Vasai',
    'Christian Youth in Power Vasai',
    'CYP Vasai',
    'Youth Ministry Vasai',
    'Catholic Youth Retreats',
    'Vasai Church Youth Group',
    'Faith Formation Vasai',
    'Young Adult Ministry Vasai',
    'Christian Events Vasai-Virar',
    'CYP',
    'Prayer Group Vasai',
    'Christian Youth',
    'Catholic Youth',
    'Catholic Community Vasai',
  ],
  authors: [{ name: 'Christian Youth in Power Vasai' }],
  creator: 'Christian Youth in Power Vasai',
  publisher: 'Christian Youth in Power Vasai',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://www.cypvasai.org', 
    siteName: 'Christian Youth in Power Vasai',
    title: 'Catholic Youth Group Vasai | Christian Youth in Power (CYP)',
    description: 'Empowering young Catholics in Vasai-Virar through faith, community, and service. Join us every Monday at 7 PM.',
    images: [
      {
        url: '/cyplogo_circle.png',
        width: 512,
        height: 512,
        alt: 'CYP Vasai Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Catholic Youth Group Vasai | Christian Youth in Power (CYP)',
    description: 'Empowering young Catholics in Vasai-Virar through faith, community, and service.',
    images: ['/cyplogo_circle.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // *** PLACEHOLDER FOR GOOGLE VERIFICATION CODE ***
  verification: {
    // 1. Get the code (the content value) from Google Search Console
    // 2. Uncomment the line below and replace 'YOUR_UNIQUE_CODE'
    // google: 'YOUR_UNIQUE_CODE', 
  },
  alternates: {
    canonical: 'https://www.cypvasai.org', 
  },
  category: 'Religion & Spirituality',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/cyplogo_circle.png" />
        <link rel="apple-touch-icon" href="/cyplogo_circle.png" />
        <meta name="theme-color" content="#FB923C" />
        
        {/* UPDATED SCHEMA.ORG WITH SOCIAL LINKS */}
        <Script
          id="schema-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Christian Youth in Power Vasai',
              alternateName: 'CYP Vasai',
              url: 'https://www.cypvasai.org',
              logo: 'https://www.cypvasai.org/cyp-schema-logo.png',
              description: 'Catholic youth organization empowering young people through faith, community, and service in Vasai',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Vasai',
                addressRegion: 'Maharashtra',
                addressCountry: 'IN',
                postalCode: '401201',
                streetAddress: '9QCR+W55, Giriz Rd, Nardoli Gaon, Vasai West, Giriz, Vasai-Virar, Maharashtra 401201',
              },
              event: {
                '@type': 'Event',
                name: 'CYP Weekly Meeting',
                startDate: '2024-01-01T19:00',
                endDate: '2024-01-01T21:00',
                eventSchedule: {
                  '@type': 'Schedule',
                  byDay: 'Monday',
                  startTime: '19:00',
                  endTime: '21:00',
                },
                location: {
                  '@type': 'Place',
                  name: 'Jeevan Darshan Kendra',
                  address: {
                    '@type': 'PostalAddress',
                    addressLocality: 'Giriz, Vasai',
                    addressRegion: 'Maharashtra',
                    addressCountry: 'IN',
                  },
                },
              },
              // *** ADDED SOCIAL MEDIA LINKS HERE ***
              sameAs: [
                'https://www.youtube.com/@cyp-vasai',
                'https://www.instagram.com/cyp.youngprofessionals/',
                'https://www.instagram.com/cyp.vasai/',
              ],
            }),
          }}
        />
      </head>
      <body suppressHydrationWarning className="antialiased">
        <CartProvider>
          <Header />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}