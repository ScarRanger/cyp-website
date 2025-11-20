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
  { question: "Who can join CYP?", answer: "Any youth regardless of background is welcome! We typically serve ages 15-30." },
  { question: "Is there a membership fee?", answer: "No, joining our weekly fellowship is completely free." },
  { question: "Do I need to be Catholic?", answer: "While we are a Catholic outreach, we welcome youth from all denominations and backgrounds." },
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

  return <span ref={ref}>{count}{suffix}</span>;
};

const AccordionItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-4 text-left focus:outline-none"
      >
        <span className="font-semibold text-slate-900">{question}</span>
        {isOpen ? <FaChevronUp className="text-sky-500 w-3 h-3" /> : <FaChevronDown className="text-slate-400 w-3 h-3" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-slate-600 text-sm leading-relaxed">{answer}</p>
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
    // ... (Keep existing thumbnail fetching logic) ...
  }, [events]);

  return (
    <main className="overflow-x-hidden bg-slate-50">

      {/* 1. HERO SECTION (Optimized for Mobile) */}
      <section className="relative h-[92vh] sm:h-screen w-full overflow-hidden flex items-center justify-center">
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
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/90" />
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
              <span className="inline-block py-1 px-3 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold tracking-widest mb-3 backdrop-blur-md uppercase">
                Est. 1989
              </span>
              {/* Typography scaled for mobile */}
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold text-white uppercase tracking-tighter drop-shadow-2xl leading-[0.9]">
                Christian Youth<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
                  In Power
                </span>
              </h1>
            </motion.div>

            <motion.div variants={fadeInUp} className="max-w-xl mx-auto">
              <p className="text-base sm:text-xl text-slate-200 font-light drop-shadow-md px-4">
                Empowering the next generation for Christ. <br className="hidden sm:block" />
                A Youth Outreach of Good Shepherd Community.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="w-full max-w-lg mt-2">
              <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-xl mx-2">
                <p className="text-lg sm:text-2xl font-serif italic text-white mb-1">
                  "{verses[currentVerseIndex].text}"
                </p>
                <p className="text-amber-400 text-xs font-bold tracking-widest uppercase">
                  — {verses[currentVerseIndex].ref}
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex flex-col w-full sm:w-auto sm:flex-row gap-3 mt-4 px-4 sm:px-0">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto bg-amber-500 text-slate-950 hover:bg-amber-400 hover:text-slate-950 font-bold h-14 rounded-xl text-lg shadow-lg shadow-amber-500/20"
              >
                <Link href="/join">Join Our Family</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white font-bold h-14 rounded-xl text-lg backdrop-blur-sm"
              >
                <Link href="/events">Our Events</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Mobile Scroll Hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 flex flex-col items-center"
        >
          <span className="text-[10px] uppercase tracking-widest mb-1">Explore</span>
          <ChevronRight className="w-5 h-5 rotate-90 animate-bounce" />
        </motion.div>
      </section>

      {/* 2. MOBILE-OPTIMIZED INFO BAR */}
      <section className="relative z-20 -mt-6 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-100">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="bg-sky-100 p-3 rounded-full shrink-0">
              <Clock className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Weekly Gathering</h3>
              <p className="text-slate-500 text-sm">Mondays • 7:00 PM</p>
            </div>
          </div>

          <div className="w-full h-px bg-slate-100 sm:w-px sm:h-10"></div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="bg-amber-100 p-3 rounded-full shrink-0">
              <MapPin className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Jeevan Darshan Kendra</h3>
              <Link href="https://maps.app.goo.gl/q2GgBCUyaGfCgj7RA" className="text-sky-600 text-sm font-medium flex items-center gap-1">
                Get Directions <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. EVENTS (Horizontal Scroll on Mobile) */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Our Events</h2>
              <p className="text-slate-500 text-sm sm:text-base mt-1">Don't miss out on the action.</p>
            </div>
            <Link href="/events" className="hidden sm:flex items-center text-sky-600 font-semibold hover:underline">
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
                    <Link href={`/events/${event.slug}`} className="block h-full">
                      <div className="bg-white rounded-2xl overflow-hidden shadow-md h-full border border-slate-100">
                        <div className="relative h-48">
                          {/* Image Logic */}
                          <Image
                            src={event.thumbnailUrl || (event.galleryCategory ? randomThumbs[event.galleryCategory] : null) || '/fellowship.jpeg'}
                            alt={event.title}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute top-3 right-3 bg-white/90 px-2 py-1 rounded-md text-xs font-bold text-slate-900 uppercase shadow-sm">
                            {event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="font-bold text-lg text-slate-900 line-clamp-1 mb-1">{event.title}</h3>
                          <p className="text-slate-500 text-sm line-clamp-2 mb-4">{event.shortDescription || "Join us for this amazing event!"}</p>
                          <span className="text-sky-600 text-sm font-bold flex items-center">
                            Details <ChevronRight className="w-4 h-4 ml-1" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                )) : (
                  <div className="min-w-full text-center p-8 bg-slate-100 rounded-xl text-slate-500">No upcoming events.</div>
                )}
              </div>

              {/* Desktop: Grid */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {events.map(event => (
                  <Link key={event.id} href={`/events/${event.slug}`} className="group">
                    <Card className="h-full hover:shadow-xl transition-all duration-300 overflow-hidden border-slate-200">
                      <div className="relative h-52 overflow-hidden">
                        <Image
                          src={event.thumbnailUrl || (event.galleryCategory ? randomThumbs[event.galleryCategory] : null) || '/fellowship.jpeg'}
                          alt={event.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <CardContent className="p-6">
                        <div className="text-xs font-bold text-amber-600 mb-2 uppercase tracking-wide">
                          {event.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-sky-600 transition-colors">{event.title}</h3>
                        <p className="text-slate-600 line-clamp-2 text-sm">{event.shortDescription}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              <div className="mt-6 text-center sm:hidden">
                <Button asChild variant="ghost" className="text-sky-600">
                  <Link href="/events">See all events <ArrowRight className="w-4 h-4 ml-2" /></Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 4. NEW HERE? SECTION (Mobile Retention Strategy) */}
      <section className="bg-slate-900 py-16 relative overflow-hidden">
        <div className="absolute -right-20 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 md:p-12 border border-white/5 shadow-2xl flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold uppercase tracking-wider mb-4">
                <Info className="w-4 h-4" /> First Time Visitor?
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Welcome Home.</h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                Walking into a new group can be intimidating. We've been there.
                At CYP, you're not just a face in the crowd—you're family we haven't met yet.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button asChild className="bg-sky-500 hover:bg-sky-400 text-white hover:text-white font-bold rounded-xl h-12">
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
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {[
              { icon: Users, label: "Active Youth", value: 120, suffix: "+" },
              { icon: Calendar, label: "Years Serving", value: 35, suffix: "+" },
              { icon: Lightbulb, label: "Outreaches", value: 150, suffix: "+" },
              { icon: Heart, label: "Lives Touched", value: 10000, suffix: "+" },
            ].map((stat, i) => (
              <div key={i} className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <stat.icon className="w-8 h-8 mx-auto mb-3 text-sky-600" />
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. INSTAGRAM REELS MOCK FEED */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center mb-8 text-center">
            <div className="bg-gradient-to-tr from-yellow-400 to-purple-600 p-3 rounded-2xl text-white mb-4 shadow-lg shadow-purple-200">
              <FaInstagram className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">@cyp.vasai</h2>
            <p className="text-slate-500 mt-2">Watch our latest Reels & Moments</p>
          </div>

          {/* Feed Container */}
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 -mx-4 px-4 sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:gap-4 sm:mx-0 sm:pb-0 no-scrollbar touch-pan-x">
            {instagramMockImages.map((img, i) => (
              <div key={i} className="min-w-[45vw] sm:min-w-0 snap-center relative group aspect-[9/16] sm:aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer border border-slate-100">
                <Image 
                  src={img.src} 
                  alt="Instagram Reel" 
                  fill 
                  className="object-cover transition-transform duration-500 group-hover:scale-110" 
                />
                
                {/* Reel Icon (Top Right) */}
                <div className="absolute top-3 right-3 bg-black/20 backdrop-blur-sm p-1.5 rounded-full">
                  <FaPlay className="w-3 h-3 text-white" />
                </div>

                {/* Hover Overlay */}
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
      </section>

      {/* 7. FAQ SECTION (Content Suggestion) */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Frequently Asked Questions</h2>
            <p className="text-slate-500 mt-2">Common questions from new members.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* 8. GALLERY (Swipeable on Mobile) */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Captured Moments</h2>
            <Link href="/gallery" className="text-sky-600 text-sm font-bold flex items-center">
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
      <section className="py-20 bg-slate-900 text-center px-4">
        <h2 className="text-3xl text-white font-bold mb-6">Ready to make a difference?</h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-amber-500 text-slate-950 hover:bg-amber-400 hover:text-slate-950 font-bold h-14 px-8 rounded-xl">
            <Link href="/join">Join Us Today</Link>
          </Button>
          <div className="flex gap-4 justify-center mt-4 sm:mt-0">
            <a href="https://www.instagram.com/cyp.vasai/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 bg-white/10 p-4 rounded-xl text-white hover:bg-pink-600 transition-colors group" aria-label="CYP Vasai Instagram" title="Follow CYP Vasai on Instagram">
              <FaInstagram className="w-6 h-6" />
              <span className="text-xs font-medium opacity-80 group-hover:opacity-100">@cyp.vasai</span>
            </a>
            <a href="https://www.instagram.com/cyp.youngprofessionals/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 bg-white/10 p-4 rounded-xl text-white hover:bg-purple-600 transition-colors group" aria-label="Young Professionals Instagram" title="Follow Young Professionals on Instagram">
              <FaInstagram className="w-6 h-6" />
              <span className="text-xs font-medium opacity-80 group-hover:opacity-100">@cyp.yp</span>
            </a>
            <a href="https://www.youtube.com/@cyp-vasai" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 bg-white/10 p-4 rounded-xl text-white hover:bg-red-600 transition-colors group" aria-label="CYP Vasai YouTube" title="Subscribe to CYP Vasai on YouTube">
              <FaYoutube className="w-6 h-6" />
              <span className="text-xs font-medium opacity-80 group-hover:opacity-100">@cyp-vasai</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}