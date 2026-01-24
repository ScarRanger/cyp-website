import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import { CartProvider } from "./providers/CartProvider";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL('https://www.cypvasai.org'),

  // Optimized Title and Description
  title: {
    default: 'Catholic Youth Group Vasai | Christian Youth in Power (CYP)',
    template: '%s | CYP Vasai',
  },
  description: 'Christian Youth in Power (CYP) Vasai: Empowering young Catholics in Vasai-Virar through faith, community, service, and youth ministry. Join our main prayer group every Monday at 7 PM in Giriz.',
  applicationName: 'CYP Vasai',
  referrer: 'origin-when-cross-origin',
  colorScheme: 'dark light',
  keywords: [
    // Primary Keywords
    'Catholic Youth Group Vasai',
    'Christian Youth in Power Vasai',
    'Christian Youth in Power',
    'CYP Vasai',
    'Youth Ministry Vasai',
    'Catholic Youth Vasai Virar',
    
    // Location-Based
    'Vasai Church Youth Group',
    'Giriz Youth Fellowship',
    'Vasai West Youth Ministry',
    'Mumbai Catholic Youth',
    'Maharashtra Youth Ministry',
    
    // Activity-Based
    'Catholic Youth Retreats',
    'Faith Formation Vasai',
    'Young Adult Ministry',
    'Christian Youth Events',
    'Prayer Group Vasai',
    'Youth Outreach Program',
    'Catholic Community Service',
    
    // Audience-Specific
    'Young Catholics India',
    'Catholic Teenagers Vasai',
    'Christian Youth Fellowship',
    'Young Adult Catholic Community',
    
    // Event-Based
    'Monday Prayer Meeting Vasai',
    'Weekly Youth Gathering',
    'Catholic Youth Camp',
    'Christian Youth Conference',
    
    // Community & Values
    'Catholic Faith Community',
    'Christian Youth Empowerment',
    'Faith-Based Youth Group',
    'Catholic Worship Community',
    'Good Shepherd Community',
  ],
  authors: [{ name: 'Christian Youth in Power Vasai' }],
  creator: 'Christian Youth in Power Vasai',
  publisher: 'Christian Youth in Power Vasai',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    title: 'CYP Vasai',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://www.cypvasai.org', 
    siteName: 'CYP Vasai - Christian Youth in Power',
    title: 'Catholic Youth Group Vasai | Christian Youth in Power (CYP)',
    description: 'Empowering young Catholics in Vasai-Virar through faith, community, and service. Join us every Monday at 7 PM.',
    images: [
      {
        url: 'https://www.cypvasai.org/cyplogo_circle.png',
        width: 512,
        height: 512,
        alt: 'CYP Vasai Logo - Catholic Youth Group',
        type: 'image/png',
      },
    ],
    countryName: 'India',
    emails: ['contact@cypvasai.org'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Catholic Youth Group Vasai | Christian Youth in Power (CYP)',
    description: 'Empowering young Catholics in Vasai-Virar through faith, community, and service.',
    images: ['https://www.cypvasai.org/cyplogo_circle.png'],
    site: '@cypvasai',
    creator: '@cypvasai',
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
  icons: {
    icon: [
      { url: '/cyplogo_circle.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/cyplogo_circle.png', sizes: '512x512', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/cyplogo_circle.png', color: '#FB923C' },
    ],
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
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/cyplogo_circle.png" />
        <link rel="apple-touch-icon" href="/cyplogo_circle.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <meta name="theme-color" content="#FB923C" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#FB923C" />
        <meta name="msapplication-TileImage" content="/cyplogo_circle.png" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* UPDATED SCHEMA.ORG WITH SOCIAL LINKS */}
        <Script
          id="schema-org"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Christian Youth in Power Vasai',
              alternateName: ['CYP Vasai', 'Catholic Youth in Power Vasai'],
              url: 'https://www.cypvasai.org',
              logo: {
                '@type': 'ImageObject',
                url: 'https://www.cypvasai.org/cyplogo_circle.png',
                width: 512,
                height: 512,
                contentUrl: 'https://www.cypvasai.org/cyplogo_circle.png',
                caption: 'CYP Vasai - Catholic Youth Group Logo',
              },
              image: {
                '@type': 'ImageObject',
                url: 'https://www.cypvasai.org/cyplogo_circle.png',
                width: 512,
                height: 512,
              },
              brand: {
                '@type': 'Brand',
                name: 'CYP Vasai',
                logo: 'https://www.cypvasai.org/cyplogo_circle.png',
              },
              description: 'Catholic youth organization empowering young people through faith, community, and service in Vasai',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Vasai',
                addressRegion: 'Maharashtra',
                addressCountry: 'IN',
                postalCode: '401201',
                streetAddress: '9QCR+W55, Giriz Rd, Nardoli Gaon, Vasai West, Giriz, Vasai-Virar, Maharashtra 401201',
              },
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'General Inquiries',
                areaServed: 'IN',
                availableLanguage: ['English', 'Hindi', 'Marathi'],
              },
              foundingDate: '1989',
              keywords: 'Catholic Youth, Christian Youth Ministry, Faith Formation, Youth Retreats, Vasai',
              email: 'admin@cypvasai.org',
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
        
        {/* WebSite Schema for Search */}
        <Script
          id="website-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Christian Youth in Power Vasai',
              alternateName: 'CYP Vasai',
              url: 'https://www.cypvasai.org',
              description: 'Catholic youth organization empowering young people through faith, community, and service in Vasai',
              inLanguage: 'en-IN',
              publisher: {
                '@type': 'Organization',
                name: 'Christian Youth in Power Vasai',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://www.cypvasai.org/cyplogo_circle.png',
                },
              },
            }),
          }}
        />
      </head>
      <body suppressHydrationWarning className="antialiased">
        <CartProvider>
          <Header />
          {children}
        </CartProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}