'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { FaInstagram, FaYoutube, FaChevronDown, FaChevronUp, FaHeart, FaComment, FaPlay } from 'react-icons/fa';
import { Calendar, Users, Heart, Lightbulb, MapPin, Clock, Image as ImageIcon, ArrowRight, ChevronRight, Info, HelpCircle } from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import type { FormLayout } from '@/app/types/form';
import Spinner from './Spinner';


// --- Theme Definition ---
const theme = {
  name: 'Warm Espresso',
  background: '#1C1917',
  surface: '#1C1917',
  primary: '#FB923C',
  secondary: '#FCD34D',
  text: '#FAFAFA',
  textBright: '#FAFAFA',
  border: '#FB923C30',
  gradient: 'linear-gradient(to right, #FB923C, #FCD34D)',
};

// --- Data & Constants ---
const images = [
  { src: '/bangloreputreach.jpeg', label: 'Bangalore Outreach' },
  { src: '/beachfellowship.jpeg', label: 'Beach Fellowship' },
  { src: '/borivalioutreach.jpeg', label: 'Borivali Outreach' },
  { src: '/camp2025.jpg', label: 'Camp 2025' },
  { src: '/christmasfellowship.jpeg', label: 'Christmas Fellowship' },
  { src: '/feb_recollection.jpeg', label: 'February Recollection' },
  { src: '/fellowship.jpeg', label: 'Fellowship' },
  { src: '/k24.jpeg', label: 'K24' },
  { src: '/nvrecollec.jpeg', label: 'NV Recollection' },
  { src: '/orpahnagenv.jpeg', label: 'Orphanage NV' },
  { src: '/soprts.jpeg', label: 'Sports' },
];

const featuredGalleryImages = [
  { src: '/camp2025.jpg', label: 'Camp 2025' },
  { src: '/fellowship.jpeg', label: 'Fellowship' },
  { src: '/beachfellowship.jpeg', label: 'Beach Fellowship' },
  { src: '/k24.jpeg', label: 'K24' },
  { src: '/christmasfellowship.jpeg', label: 'Christmas Fellowship' },
  { src: '/borivalioutreach.jpeg', label: 'Borivali Outreach' },
];

const verses = [
  { text: "For I know the plans I have for you, declares the Lord", ref: "Jeremiah 29:11" },
  { text: "Youth in power, hearts on fire for Christ", ref: "CYP Vision" },
  { text: "Let no one despise you for your youth", ref: "1 Timothy 4:12" },
  { text: "The Lord is my light and my salvation", ref: "Psalm 27:1" },
  { text: "Be strong and courageous", ref: "Joshua 1:9" },
];

const faqs = [
  { question: "Who can join CYP?", answer: "Any youth regardless of background is welcome! We typically serve ages 15-35." },
  { question: "Is there a membership fee?", answer: "No, joining our weekly fellowship is completely free." },
  { question: "Do I need to be Catholic?", answer: "While we are predominantly a Catholic outreach, we welcome youth from all denominations and backgrounds." },
  { question: "Where do I start?", answer: "Just show up to our Monday fellowship at 7 PM! No prior registration needed." },
];

// Instagram Posts - Manage posts by editing this array
const instagramMockImages = [
  { src: '/camp2025.jpg', likes: 234, comments: 45 },
  { src: '/fellowship.jpeg', likes: 189, comments: 32 },
  { src: '/beachfellowship.jpeg', likes: 312, comments: 58 },
  { src: '/k24.jpeg', likes: 267, comments: 41 },
  { src: '/christmasfellowship.jpeg', likes: 421, comments: 67 },
  { src: '/borivalioutreach.jpeg', likes: 198, comments: 29 },
];

type Event = {
  id: string;
  title: string;
  slug: string;
  date: Date;
  location?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  galleryCategory?: string;
};

// --- Animation Variants ---
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.04, 0.62, 0.23, 0.98] as const }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

// --- Helper Components ---

const AnimatedCounter = ({ value, suffix = "" }: { value: number, suffix?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isInView) {
      const start = 0;
      const end = value;
      const duration = 2000;
      const incrementTime = (duration / end) * 5;

      const timer = setInterval(() => {
        setCount(prev => {
          const diff = end - prev;
          const step = Math.ceil(diff / 20);
          const next = prev + (step > 0 ? step : 1);
          return next >= end ? end : next;
        });
      }, 30);

      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {count}{suffix}
      <noscript>{value}{suffix}</noscript>
    </span>
  );
};

const AccordionItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b last:border-0" style={{ borderColor: theme.border }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-4 text-left focus:outline-none"
      >
        <span className="font-semibold" style={{ color: theme.textBright }}>{question}</span>
        {isOpen ? <FaChevronUp className="w-3 h-3" style={{ color: theme.primary }} /> : <FaChevronDown className="w-3 h-3" style={{ color: `${theme.text}60` }} />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm leading-relaxed" style={{ color: theme.text, opacity: 0.8 }}>{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function HomePage() {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [currentVerseIndex, setCurrentVerseIndex] = React.useState(0);
  const [promoted, setPromoted] = React.useState<FormLayout[]>([]);
  const [loadingPromoted, setLoadingPromoted] = React.useState(true);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = React.useState(true);
  const [randomThumbs, setRandomThumbs] = React.useState<Record<string, string>>({});

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
      setCurrentVerseIndex((prev) => (prev + 1) % verses.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Data fetching (same as before)
  useEffect(() => {
    const loadPromoted = async () => {
      try {
        const formsRef = collection(db, 'forms');
        const q = query(formsRef, where('promote', '==', true), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const list: FormLayout[] = [];
        snap.forEach((d) => {
          const data = d.data();
          // Simplified date logic for brevity
          const toDate = (val: any) => val?.toDate ? val.toDate() : new Date();
          const item: FormLayout = {
            id: d.id,
            title: String(data.title ?? 'Untitled'),
            description: data.description,
            fields: data.fields || [],
            imageUrl: data.imageUrl,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
            spreadsheetId: data.spreadsheetId,
            acceptingResponses: data.acceptingResponses,
            promote: data.promote,
          };
          if (item.acceptingResponses !== false) list.push(item);
        });
        setPromoted(list);
      } catch (e) { console.error(e); }
      finally { setLoadingPromoted(false); }
    };
    loadPromoted();
  }, []);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, orderBy('date', 'desc'), limit(6));
        const snap = await getDocs(q);
        const list: Event[] = [];
        snap.forEach((d) => {
          const data = d.data();

          // Properly handle Firestore Timestamp conversion
          let eventDate: Date;
          if (data.date?.toDate) {
            // Firestore Timestamp object
            eventDate = data.date.toDate();
          } else if (data.date instanceof Date) {
            // Already a Date object
            eventDate = data.date;
          } else if (typeof data.date === 'string') {
            // ISO string or date string
            eventDate = new Date(data.date);
          } else if (typeof data.date === 'number') {
            // Unix timestamp
            eventDate = new Date(data.date);
          } else {
            // Fallback to current date
            eventDate = new Date();
          }

          list.push({
            id: d.id,
            title: String(data.title ?? ''),
            slug: String(data.slug ?? ''),
            date: eventDate,
            location: data.location,
            shortDescription: data.shortDescription,
            thumbnailUrl: data.thumbnailUrl,
            galleryCategory: data.galleryCategory,
          });
        });
        setEvents(list);
      } catch (e) { console.error(e); }
      finally { setLoadingEvents(false); }
    };
    loadEvents();
  }, []);

  // Thumbnail fetcher (simplified)
  useEffect(() => {
    if (events.length === 0) return;

    const fetchThumbnails = async () => {
      const thumbs: Record<string, string> = {};

      // Get unique gallery categories from events
      const categories = [...new Set(events.map(e => e.galleryCategory).filter(Boolean))];

      // Fetch one random image from each category
      await Promise.all(
        categories.map(async (category) => {
          if (!category) return; // Skip if category is undefined
          try {
            const res = await fetch(`/api/gallery?category=${category}&limit=20`);
            if (res.ok) {
              const data = await res.json();
              const images = data.items?.filter((item: any) => item.type === 'image') || [];
              if (images.length > 0) {
                // Pick a random image from the category
                const randomImage = images[Math.floor(Math.random() * images.length)];
                thumbs[category] = randomImage.url;
              }
            }
          } catch (error) {
            console.error(`Error fetching thumbnail for ${category}:`, error);
          }
        })
      );

      setRandomThumbs(thumbs);
    };

    fetchThumbnails();
  }, [events]);

  return (
    <main className="overflow-x-hidden relative" style={{ backgroundColor: theme.background }}>
      {/* SEO Description - Hidden text for search engines */}
      <div className="sr-only" aria-hidden="true">
        Christian Youth in Power (CYP) Vasai: Empowering young Catholics in Vasai-Virar through faith, community, service, and youth ministry.
      </div>

      {/* Paper Texture Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* 1. HERO SECTION (Optimized for Mobile) */}
      <section className="relative h-[92vh] sm:h-screen w-full overflow-hidden flex items-center justify-center z-10">
        <motion.div style={{ y: heroY }} className="absolute inset-0 w-full h-[120%] -top-[10%]">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0, scale: 1.15 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <Image
                src={images[currentImageIndex].src}
                alt="Background"
                fill
                className="object-cover"
                priority
                quality={85}
              />
              <div className="absolute inset-0 bg-gradient-to-b" style={{ background: `linear-gradient(to bottom, ${theme.background}B3, ${theme.background}4D, ${theme.background}E6)` }} />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className="relative z-10 container mx-auto px-6 text-center flex flex-col justify-end pb-24 sm:justify-center sm:pb-0 h-full">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex flex-col items-center gap-4 sm:gap-6"
          >
            <motion.div variants={fadeInUp}>
              <span className="inline-block py-1 px-3 rounded-full border text-xs font-bold tracking-widest mb-3 backdrop-blur-md uppercase" style={{ backgroundColor: `${theme.secondary}20`, borderColor: `${theme.secondary}80`, color: theme.secondary }}>
                Est. 1989
              </span>
              {/* Typography scaled for mobile */}
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold uppercase tracking-tighter drop-shadow-2xl leading-[0.9]" style={{ color: theme.textBright }}>
                Christian Youth<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r" style={{ backgroundImage: theme.gradient }}>
                  In Power
                </span>
              </h1>
            </motion.div>

            <motion.div variants={fadeInUp} className="max-w-xl mx-auto">
              <p className="text-base sm:text-xl font-light drop-shadow-md px-4" style={{ color: theme.text }}>
                Empowering the next generation for Christ. <br className="hidden sm:block" />
                A Youth Outreach of Good Shepherd Community.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="w-full max-w-lg mt-2">
              <div className="backdrop-blur-md border p-4 rounded-xl mx-2" style={{ backgroundColor: `${theme.textBright}20`, borderColor: `${theme.textBright}20` }}>
                <p className="text-lg sm:text-2xl font-serif italic mb-1" style={{ color: theme.textBright }}>
                  "{verses[currentVerseIndex].text}"
                </p>
                <p className="text-xs font-bold tracking-widest uppercase" style={{ color: theme.primary }}>
                  — {verses[currentVerseIndex].ref}
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex flex-col w-full sm:w-auto sm:flex-row gap-3 mt-4 px-4 sm:px-0">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto font-bold h-14 rounded-xl text-lg shadow-lg"
                style={{ backgroundColor: theme.primary, color: theme.background, boxShadow: `0 0 20px ${theme.primary}4D` }}
              >
                <Link href="/join" className="hover:opacity-90 transition-opacity">Join Our Family</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto font-bold h-14 rounded-xl text-lg backdrop-blur-sm border"
                style={{ backgroundColor: `${theme.textBright}20`, borderColor: `${theme.textBright}50`, color: theme.textBright }}
              >
                <Link href="/events" className="hover:opacity-90 transition-opacity">Our Events</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Mobile Scroll Hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center"
          style={{ color: `${theme.text}60` }}
        >
          <span className="text-[10px] uppercase tracking-widest mb-1">Explore</span>
          <ChevronRight className="w-5 h-5 rotate-90 animate-bounce" />
        </motion.div>
      </section>

      {/* 2. MOBILE-OPTIMIZED INFO BAR */}
      <section className="relative z-20 -mt-6 px-4">
        <div className="rounded-2xl shadow-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="p-3 rounded-full shrink-0" style={{ backgroundColor: `${theme.primary}20` }}>
              <Clock className="w-6 h-6" style={{ color: theme.primary }} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold" style={{ color: theme.textBright }}>Weekly Gathering</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm" style={{ color: theme.text, opacity: 0.7 }}>Mondays • 7:00 PM</p>
                {/* <button
                  onClick={(e) => {
                    e.preventDefault();
                    const event = {
                      title: 'CYP Weekly Fellowship',
                      description: 'Join us for our weekly youth gathering',
                      location: 'Jeevan Darshan Kendra, Vasai',
                      startDate: new Date(),
                      endDate: new Date(new Date().setHours(new Date().getHours() + 2))
                    };
                    // Create ICS format (simplified)
                    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`;
                    const blob = new Blob([icsContent], { type: 'text/calendar' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'cyp-fellowship.ics';
                    link.click();
                  }}
                  className="px-2 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
                  style={{ backgroundColor: `${theme.primary}20`, color: theme.primary, border: `1px solid ${theme.primary}50` }}
                >
                  + Add to Calendar
                </button> */}
              </div>
            </div>
          </div>

          <div className="w-full h-px sm:w-px sm:h-10" style={{ backgroundColor: theme.border }}></div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="p-3 rounded-full shrink-0" style={{ backgroundColor: `${theme.secondary}20` }}>
              <MapPin className="w-6 h-6" style={{ color: theme.secondary }} />
            </div>
            <div>
              <h3 className="font-bold" style={{ color: theme.textBright }}>Jeevan Darshan Kendra</h3>
              <a href="https://maps.app.goo.gl/q2GgBCUyaGfCgj7RA" target="_blank" rel="noopener noreferrer" className="text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: theme.primary }}>
                Get Directions <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 3. EVENTS (Horizontal Scroll on Mobile) */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: theme.textBright }}>Our Events</h2>
              <p className="text-sm sm:text-base mt-1" style={{ color: theme.text, opacity: 0.7 }}>Don't miss out on the action.</p>
            </div>
            <Link href="/events" className="hidden sm:flex items-center font-semibold hover:opacity-80 transition-opacity" style={{ color: theme.primary }}>
              View All <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>

          {loadingEvents ? (
            <div className="flex justify-center py-12">
              <Spinner label="Loading events..." />
            </div>
          ) : (
            <>
              {/* Mobile: Swipeable Carousel */}
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 -mx-4 px-4 sm:hidden no-scrollbar touch-pan-x">
                {events.length > 0 ? events.map((event) => (
                  <div key={event.id} className="min-w-[85vw] snap-center">
                    <Link href={`/events/${event.slug}`} className="block h-full group">
                      <Card className="h-full overflow-hidden border transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                          {(event.thumbnailUrl || (event.galleryCategory && randomThumbs[event.galleryCategory])) && (
                            <Image
                              src={event.thumbnailUrl || (event.galleryCategory ? randomThumbs[event.galleryCategory] : '')}
                              alt={event.title}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          )}
                          {/* Date Badge - Top Left */}
                          <div className="absolute top-3 left-3 px-3 py-2 rounded-lg font-bold shadow-lg backdrop-blur-sm" style={{ backgroundColor: theme.secondary, color: theme.background }}>
                            <div className="text-xs uppercase tracking-wider">{event.date.toLocaleDateString('en-US', { month: 'short' })}</div>
                            <div className="text-xl leading-none">{event.date.getDate()}</div>
                          </div>
                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                        </div>
                        <CardContent className="p-5 relative pt-6">
                          <h3 className="font-bold text-lg line-clamp-1 mb-2" style={{ color: theme.textBright }}>{event.title}</h3>
                          <p className="text-sm line-clamp-2 mb-4" style={{ color: theme.text, opacity: 0.7 }}>{event.shortDescription || "Join us for this amazing event!"}</p>
                          <div className="flex items-center justify-between">
                            <button className="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 group-hover:translate-y-[-2px] group-hover:shadow-lg" style={{ backgroundColor: theme.primary, color: theme.background }}>
                              View Details
                            </button>
                            <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" style={{ color: theme.primary }} />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                )) : (
                  <div className="min-w-full text-center p-8 rounded-xl" style={{ backgroundColor: `${theme.primary}20`, color: theme.textBright }}>No upcoming events.</div>
                )}
              </div>

              {/* Desktop: Grid */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {events.map(event => (
                  <Link key={event.id} href={`/events/${event.slug}`} className="group">
                    <Card className="h-full hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 overflow-hidden border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                        {(event.thumbnailUrl || (event.galleryCategory && randomThumbs[event.galleryCategory])) && (
                          <Image
                            src={event.thumbnailUrl || (event.galleryCategory ? randomThumbs[event.galleryCategory] : '')}
                            alt={event.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        )}
                        {/* Date Badge - Top Left */}
                        <div className="absolute top-4 left-4 px-3 py-2 rounded-lg font-bold shadow-lg backdrop-blur-sm" style={{ backgroundColor: theme.secondary, color: theme.background }}>
                          <div className="text-xs uppercase tracking-wider">{event.date.toLocaleDateString('en-US', { month: 'short' })}</div>
                          <div className="text-2xl leading-none">{event.date.getDate()}</div>
                        </div>
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      </div>
                      <CardContent className="p-6 relative pt-7">
                        <div className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: theme.primary }}>
                          {event.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                        <h3 className="text-xl font-bold mb-3 transition-colors" style={{ color: theme.textBright }}>{event.title}</h3>
                        <p className="line-clamp-2 text-sm mb-4" style={{ color: theme.text, opacity: 0.7 }}>{event.shortDescription}</p>
                        <button className="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 group-hover:translate-y-[-4px] group-hover:shadow-xl opacity-0 group-hover:opacity-100" style={{ backgroundColor: theme.primary, color: theme.background }}>
                          View Details →
                        </button>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              <div className="mt-6 text-center sm:hidden">
                <Button asChild variant="ghost" className="hover:opacity-80 transition-opacity" style={{ color: theme.primary }}>
                  <Link href="/events">See all events <ArrowRight className="w-4 h-4 ml-2" /></Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 4. NEW HERE? SECTION (Mobile Retention Strategy) */}
      <section className="py-16 relative overflow-hidden" style={{ backgroundColor: theme.background }}>
        <div className="absolute -right-20 top-0 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: `${theme.secondary}10` }}></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="rounded-3xl p-8 md:p-12 border shadow-2xl flex flex-col lg:flex-row items-center gap-8 lg:gap-16" style={{ background: `linear-gradient(to bottom right, ${theme.background}, ${theme.surface})`, borderColor: theme.border }}>
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4" style={{ backgroundColor: `${theme.primary}20`, color: theme.primary }}>
                <Info className="w-4 h-4" /> First Time Visitor?
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: theme.textBright }}>Welcome Home.</h2>
              <p className="text-lg leading-relaxed mb-6" style={{ color: theme.text, opacity: 0.8 }}>
                Walking into a new group can be intimidating. We've been there.
                At CYP, you're not just a face in the crowd—you're family we haven't met yet.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button asChild className="font-bold rounded-xl h-12 hover:opacity-90 transition-opacity" style={{ backgroundColor: theme.primary, color: theme.background }}>
                  <Link href="/join">I'm New Here</Link>
                </Button>
                {/* <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white hover:text-white font-bold rounded-xl h-12">
                  <Link href="https://www.youtube.com/@cyp-vasai" target="_blank" rel="noopener noreferrer">Watch Our Story</Link>
                </Button> */}
              </div>
            </div>
            {/* YouTube Embed */}
            <div className="flex-1 w-full max-w-lg">
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/5I7pDz0WHlk"
                  title="CYP Vasai - Our Story"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. STATS (Grid on mobile is fine, condensed) */}
      <section className="py-16" style={{ backgroundColor: theme.background }}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {[
              { icon: Users, label: "Active Youth", value: 120, suffix: "+", color: theme.primary },
              { icon: Calendar, label: "Years Serving", value: 35, suffix: "+", color: theme.secondary },
              { icon: Lightbulb, label: "Outreaches", value: 150, suffix: "+", color: theme.primary },
              { icon: Heart, label: "Lives Touched", value: 10000, suffix: "+", color: theme.secondary },
            ].map((stat, i) => (
              <div key={i} className="text-center p-6 rounded-2xl border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <stat.icon className="w-8 h-8 mx-auto mb-3" style={{ color: stat.color }} />
                <div className="text-3xl font-bold mb-1" style={{ color: theme.textBright }}>
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.text, opacity: 0.7 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. INSTAGRAM REELS MOCK FEED */}
      {/* <section className="py-16 bg-white border-t border-slate-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center mb-8 text-center">
            <div className="bg-gradient-to-tr from-yellow-400 to-purple-600 p-3 rounded-2xl text-white mb-4 shadow-lg shadow-purple-200">
              <FaInstagram className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">@cyp.vasai</h2>
            <p className="text-slate-500 mt-2">Watch our latest Reels & Moments</p>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 -mx-4 px-4 sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:gap-4 sm:mx-0 sm:pb-0 no-scrollbar touch-pan-x">
            {instagramMockImages.map((img, i) => (
              <div key={i} className="min-w-[45vw] sm:min-w-0 snap-center relative group aspect-[9/16] sm:aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer border border-slate-100">
                <Image 
                  src={img.src} 
                  alt="Instagram Reel" 
                  fill 
                  className="object-cover transition-transform duration-500 group-hover:scale-110" 
                />
                
                <div className="absolute top-3 right-3 bg-black/20 backdrop-blur-sm p-1.5 rounded-full">
                  <FaPlay className="w-3 h-3 text-white" />
                </div>

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white gap-3">
                  <FaPlay className="w-8 h-8 mb-2 opacity-80" />
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 font-bold text-sm">
                      <FaHeart /> {img.likes}
                    </div>
                    <div className="flex items-center gap-1 font-bold text-sm">
                      <FaComment /> {img.comments}
                    </div>
                  </div>
                </div>
                
                <a 
                  href="https://www.instagram.com/cyp.vasai/reels/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 z-10" 
                  aria-label="Watch Reel"
                ></a>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full px-8 shadow-lg shadow-purple-200">
              <a href="https://www.instagram.com/cyp.vasai/reels/" target="_blank" rel="noopener noreferrer">Watch More Reels</a>
            </Button>
          </div>
        </div>
      </section> */}

      {/* 7. FAQ SECTION (Content Suggestion) */}
      <section className="py-16" style={{ backgroundColor: theme.background }}>
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: theme.textBright }}>Frequently Asked Questions</h2>
            <p className="mt-2" style={{ color: theme.text, opacity: 0.7 }}>Common questions from new members.</p>
          </div>

          <div className="rounded-2xl shadow-sm border p-6 md:p-8" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            {faqs.map((faq, i) => (
              <AccordionItem key={i} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* 8. GALLERY (Swipeable on Mobile) */}
      <section className="py-16" style={{ backgroundColor: theme.background }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: theme.textBright }}>Captured Moments</h2>
            <Link href="/gallery" className="text-sm font-bold flex items-center hover:opacity-80 transition-opacity" style={{ color: theme.primary }}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {/* Mobile Horizontal Scroll */}
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 pb-6 -mx-4 px-4 sm:hidden no-scrollbar touch-pan-x">
            {featuredGalleryImages.map((img, i) => (
              <div key={i} className="min-w-[70vw] aspect-[4/5] snap-center relative rounded-xl overflow-hidden shadow-md">
                <Image src={img.src} alt={img.label} fill className="object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="text-white font-medium text-sm">{img.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Grid */}
          <div className="hidden sm:grid grid-cols-3 lg:grid-cols-4 gap-4">
            {featuredGalleryImages.map((img, i) => (
              <div key={i} className={`relative rounded-xl overflow-hidden shadow-md aspect-square ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
                <Image src={img.src} alt={img.label} fill className="object-cover hover:scale-110 transition-transform duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FOOTER CTA */}
      <section className="py-20 text-center px-4" style={{ backgroundColor: theme.background }}>
        <h2 className="text-3xl font-bold mb-6" style={{ color: theme.textBright }}>Ready to make a difference?</h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="font-bold h-14 px-8 rounded-xl hover:opacity-90 transition-opacity" style={{ backgroundColor: theme.primary, color: theme.background }}>
            <Link href="/join">Join Us Today</Link>
          </Button>
          <div className="flex gap-4 justify-center mt-4 sm:mt-0">
            <a href="https://www.instagram.com/cyp.vasai/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-4 rounded-xl transition-colors group" style={{ backgroundColor: `${theme.textBright}20`, color: theme.textBright }} aria-label="CYP Vasai Instagram" title="Follow CYP Vasai on Instagram">
              <FaInstagram className="w-6 h-6" />
              <span className="text-xs font-medium opacity-80 group-hover:opacity-100">@cyp.vasai</span>
            </a>
            <a href="https://www.instagram.com/cyp.youngprofessionals/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-4 rounded-xl transition-colors group" style={{ backgroundColor: `${theme.textBright}20`, color: theme.textBright }} aria-label="Young Professionals Instagram" title="Follow Young Professionals on Instagram">
              <FaInstagram className="w-6 h-6" />
              <span className="text-xs font-medium opacity-80 group-hover:opacity-100">@cyp.yp</span>
            </a>
            <a href="https://www.youtube.com/@cyp-vasai" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-4 rounded-xl transition-colors group" style={{ backgroundColor: `${theme.textBright}20`, color: theme.textBright }} aria-label="CYP Vasai YouTube" title="Subscribe to CYP Vasai on YouTube">
              <FaYoutube className="w-6 h-6" />
              <span className="text-xs font-medium opacity-80 group-hover:opacity-100">@cyp-vasai</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}