'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { FaInstagram, FaYoutube } from 'react-icons/fa';
import { Calendar, Users, Heart, Lightbulb, MapPin, Clock, Image as ImageIcon } from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/app/lib/firebase';
import type { FormLayout } from '@/app/types/form';
import Spinner from './Spinner';

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

// Featured gallery images for mini gallery
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

const testimonials = [
  {
    name: "Maria D.",
    role: "CYP Member since 2020",
    text: "CYP has transformed my faith journey. The community here feels like family, and I've grown so much spiritually through the outreaches and fellowship.",
    image: "/fellowship.jpeg"
  },
  {
    name: "Joshua R.",
    role: "Young Professional",
    text: "Being part of CYP has equipped me with leadership skills and a deeper understanding of my purpose. The mentorship and support are incredible.",
    image: "/k24.jpeg"
  },
  {
    name: "Sarah M.",
    role: "Youth Leader",
    text: "Through CYP, I discovered my calling to serve. Every camp, every outreach, every prayer meeting has shaped who I am today.",
    image: "/christmasfellowship.jpeg"
  },
];

export default function HomePage() {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [currentVerseIndex, setCurrentVerseIndex] = React.useState(0);
  const [promoted, setPromoted] = React.useState<FormLayout[]>([]);
  const [loadingPromoted, setLoadingPromoted] = React.useState(true);
  const [promotedError, setPromotedError] = React.useState<string | null>(null);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = React.useState(true);
  const [randomThumbs, setRandomThumbs] = React.useState<Record<string, string>>({});

  // Rotate background images every 5 seconds
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
      setCurrentVerseIndex((prev) => (prev + 1) % verses.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const loadPromoted = async () => {
      try {
        const formsRef = collection(db, 'forms');
        const q = query(formsRef, where('promote', '==', true), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const list: FormLayout[] = [];
        snap.forEach((d) => {
          const data = d.data();
          const toDate = (val: unknown): Date => {
            if (!val) return new Date();
            const maybeTs = val as { toDate?: () => Date };
            if (typeof maybeTs?.toDate === 'function') return maybeTs.toDate();
            if (val instanceof Date) return val;
            if (typeof val === 'string' || typeof val === 'number') {
              const nd = new Date(val);
              return isNaN(nd.getTime()) ? new Date() : nd;
            }
            return new Date();
          };
          const item: FormLayout = {
            id: d.id,
            title: String(data.title ?? 'Untitled'),
            description: data.description,
            fields: Array.isArray(data.fields) ? data.fields : [],
            imageUrl: data.imageUrl,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
            spreadsheetId: data.spreadsheetId,
            acceptingResponses: data.acceptingResponses,
            promote: data.promote,
          };
          if (item.acceptingResponses !== false) {
            list.push(item);
          }
        });
        setPromoted(list);
      } catch (e) {
        console.error('Error loading promoted forms:', e);
        setPromotedError('Failed to load promoted forms');
      } finally {
        setLoadingPromoted(false);
      }
    };
    loadPromoted();
  }, []);

  React.useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, orderBy('date', 'desc'), limit(3));
        const snap = await getDocs(q);
        const list: Event[] = [];
        snap.forEach((d) => {
          const data = d.data();
          const toDate = (val: unknown): Date => {
            if (!val) return new Date();
            const maybeTs = val as { toDate?: () => Date };
            if (typeof maybeTs?.toDate === 'function') return maybeTs.toDate();
            if (val instanceof Date) return val;
            if (typeof val === 'string' || typeof val === 'number') {
              const nd = new Date(val);
              return isNaN(nd.getTime()) ? new Date() : nd;
            }
            return new Date();
          };
          list.push({
            id: d.id,
            title: String(data.title ?? ''),
            slug: String(data.slug ?? ''),
            date: toDate(data.date),
            location: data.location,
            shortDescription: data.shortDescription,
            thumbnailUrl: data.thumbnailUrl,
            galleryCategory: data.galleryCategory,
          });
        });

        setEvents(list);
      } catch (e) {
        console.error('Error loading events:', e);
      } finally {
        setLoadingEvents(false);
      }
    };
    loadEvents();
  }, []);

  // Fetch random gallery images for events
  React.useEffect(() => {
    if (events.length === 0) return;
    
    const neededCategories = new Set<string>();
    for (const ev of events) {
      if (!ev.thumbnailUrl && ev.galleryCategory && !randomThumbs[ev.galleryCategory]) {
        neededCategories.add(ev.galleryCategory);
      }
    }
    
    if (neededCategories.size === 0) return;
    
    (async () => {
      const updates: Record<string, string> = {};
      await Promise.all(
        Array.from(neededCategories).map(async (cat) => {
          try {
            const params = new URLSearchParams();
            params.set('category', cat);
            params.set('limit', '50');
            const res = await fetch(`/api/gallery?${params.toString()}`, { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            const items = (data.items as any[]) || [];
            if (items.length === 0) return;
            
            // Prefer images; fallback to video thumbnails
            const imageItems = items.filter((it) => it?.type === 'image' && (it.thumbnailUrl || it.url));
            const videoThumbs = items.filter((it) => it?.type === 'video' && it.thumbnailUrl);
            const pool = imageItems.length > 0 ? imageItems : videoThumbs;
            
            if (pool.length === 0) return;
            
            const pick = pool[Math.floor(Math.random() * pool.length)];
            updates[cat] = pick.thumbnailUrl || pick.url;
          } catch {
            // ignore per-category errors
          }
        })
      );
      
      if (Object.keys(updates).length > 0) {
        setRandomThumbs((prev) => ({ ...prev, ...updates }));
      }
    })();
  }, [events, randomThumbs]);

  return (
    <main>
      {/* 1. HERO SECTION - Dynamic Background with Verse */}
      <section className="relative isolate overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0"
          >
            <Image
              src={images[currentImageIndex].src}
              alt={images[currentImageIndex].label}
              fill
              className="object-cover brightness-[0.85] saturate-[1.1]"
              loading="eager"
              quality={90}
              sizes="100vw"
              priority={currentImageIndex === 0}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/70" />
          </motion.div>
        </AnimatePresence>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-40">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl font-bold uppercase tracking-tight text-white drop-shadow-lg sm:text-6xl">
                Christian Youth in Power
              </h1>
              <p className="mt-4 text-lg font-medium text-amber-100 drop-shadow sm:text-xl">
                A Youth Outreach of The Community of the Good Shepherd
              </p>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentVerseIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.6 }}
                  className="mt-8 border-l-4 border-amber-400 bg-black/30 backdrop-blur-sm px-6 py-4 rounded-r-lg"
                >
                  <p className="text-xl italic text-white sm:text-2xl">
                    "{verses[currentVerseIndex].text}"
                  </p>
                  <p className="mt-2 text-sm text-amber-200">
                    — {verses[currentVerseIndex].ref}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="mt-10 flex flex-wrap gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-amber-500 text-slate-900 hover:bg-amber-400 shadow-xl ring-2 ring-white/40 font-semibold"
                >
                  <Link href="/join">Join Us Today</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="bg-white/10 backdrop-blur-sm text-white border-white/40 hover:bg-white/20 shadow-xl font-semibold"
                >
                  <Link href="/events">Explore Events</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex flex-col items-center gap-2 text-white/80"
          >
            <span className="text-sm">Scroll to explore</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* 2. EVENTS SECTION */}
      <section className="bg-gradient-to-b from-sky-50 to-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Our Events
            </h2>
            <p className="mt-3 text-lg text-slate-700">
              Join us for life-changing experiences and fellowship
            </p>
          </motion.div>

          {loadingEvents ? (
            <div className="flex justify-center py-12">
              <Spinner label="Loading events" />
            </div>
          ) : events.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <Link href={`/events/${event.slug}`} className="block h-full">
                    <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow cursor-pointer">
                      {(() => {
                        const imgSrc = event.thumbnailUrl || (event.galleryCategory ? randomThumbs[event.galleryCategory] : undefined);
                        if (!imgSrc) {
                          return (
                            <div className="relative h-56 w-full bg-gradient-to-br from-amber-100 to-sky-100 flex items-center justify-center">
                              <ImageIcon className="h-16 w-16 text-slate-400" />
                            </div>
                          );
                        }
                        return (
                          <div className="relative h-56 w-full overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imgSrc}
                              alt={event.title}
                              className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                const img = e.currentTarget as HTMLImageElement;
                                img.onerror = null;
                                img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="%23f3f4f6"/></svg>';
                              }}
                            />
                          </div>
                        );
                      })()}
                      <CardHeader>
                        <CardTitle className="text-slate-900 line-clamp-2">{event.title}</CardTitle>
                        <div className="flex flex-col gap-1 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {event.date.toLocaleDateString('en-US', { 
                                month: 'long', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {event.shortDescription && (
                          <p className="text-slate-700 line-clamp-3 mb-4">{event.shortDescription}</p>
                        )}
                        <div className="text-sky-600 font-semibold flex items-center gap-2">
                          Learn More
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-slate-600">No upcoming events at the moment. Check back soon!</p>
            </Card>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-10 text-center"
          >
            <Button asChild size="lg" variant="outline" className="font-semibold">
              <Link href="/events">View All Events</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* 3. IMPACT STATS */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Our Impact
            </h2>
            <p className="mt-3 text-lg text-slate-300">
              Building God's kingdom, one youth at a time
            </p>
          </motion.div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Calendar, label: "Years of Ministry", value: "35+", color: "amber", bgColor: "bg-amber-500/30", iconColor: "text-amber-300" },
              { icon: Users, label: "Active Youth", value: "120+", color: "sky", bgColor: "bg-sky-500/30", iconColor: "text-sky-300" },
              { icon: Heart, label: "Lives Transformed", value: "500+", color: "rose", bgColor: "bg-rose-500/30", iconColor: "text-rose-300" },
              { icon: Lightbulb, label: "Events & Outreaches", value: "150+", color: "emerald", bgColor: "bg-emerald-500/30", iconColor: "text-emerald-300" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-center p-6 hover:bg-white/15 transition-colors">
                  <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-8 w-8 ${stat.iconColor}`} />
                  </div>
                  <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-sm text-slate-300">{stat.label}</div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. MISSION & VISION */}
      <section className="bg-gradient-to-b from-white to-amber-50/60 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Who We Are
            </h2>
          </motion.div>

          <div className="grid gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="p-8 h-full bg-white shadow-lg border-t-4 border-t-amber-500">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h3>
                <p className="text-lg text-slate-700 leading-relaxed">
                  Christian Youth in Power (CYP) is the Youth Outreach of The Community of the Good
                  Shepherd — a covenanted SOS community. We are a movement of Christian youth who
                  aspire to be and make disciples of Jesus Christ, evangelizing and forming future
                  leaders in the power of the Holy Spirit for the Church and society.
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="p-8 h-full bg-white shadow-lg border-t-4 border-t-sky-500">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Our Vision</h3>
                <ul className="space-y-3 text-lg text-slate-700">
                  <li className="flex items-start gap-3">
                    <Heart className="h-6 w-6 text-sky-600 shrink-0 mt-1" />
                    <span>Empowering youth to live as authentic disciples of Christ</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Users className="h-6 w-6 text-sky-600 shrink-0 mt-1" />
                    <span>Building a community rooted in faith, fellowship, and service</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Lightbulb className="h-6 w-6 text-sky-600 shrink-0 mt-1" />
                    <span>Equipping leaders for the Church and society through the Holy Spirit</span>
                  </li>
                </ul>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12"
          >
            <div className="relative w-full overflow-hidden rounded-xl border border-sky-100 bg-white shadow-lg">
              <div className="relative aspect-video w-full">
                <iframe
                  className="h-full w-full"
                  src="https://www.youtube.com/embed/5I7pDz0WHlk"
                  title="CYP introduction video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5. TESTIMONIALS */}
      {/* <section className="bg-gradient-to-b from-amber-50/60 to-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Lives Transformed
            </h2>
            <p className="mt-3 text-lg text-slate-700">
              Hear from youth whose lives have been changed through CYP
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <Card className="p-6 h-full bg-white shadow-lg hover:shadow-xl transition-shadow">
                  <div className="mb-4 relative h-24 w-24 mx-auto rounded-full overflow-hidden border-4 border-amber-400">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="text-center mb-4">
                    <h4 className="font-bold text-slate-900">{testimonial.name}</h4>
                    <p className="text-sm text-slate-600">{testimonial.role}</p>
                  </div>
                  <p className="text-slate-700 italic leading-relaxed">
                    "{testimonial.text}"
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section> */}

      {/* MINI GALLERY */}
      <section className="bg-gradient-to-b from-white to-sky-50/60 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Photo Gallery
            </h2>
            <p className="mt-3 text-lg text-slate-700">
              Captured moments from our events and fellowship
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {featuredGalleryImages.map((img, i) => (
              <motion.div
                key={img.src}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group relative aspect-square overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow"
              >
                <Image
                  src={img.src}
                  alt={img.label}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-white font-semibold text-sm">{img.label}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-10 text-center"
          >
            <Button asChild size="lg" className="bg-sky-600 hover:bg-sky-700 font-semibold shadow-lg">
              <Link href="/gallery">
                <ImageIcon className="h-5 w-5 mr-2" />
                View Full Gallery
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* PROMOTED FORMS - Register Now */}
      {(!loadingPromoted && promoted.length > 0) && (
        <section className="bg-gradient-to-b from-white to-sky-50/60 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Register Now
              </h2>
              <p className="mt-3 text-lg text-slate-700">
                Sign up for upcoming programs and activities
              </p>
            </motion.div>

            {promotedError && (
              <div className="mb-6 rounded border border-red-200 bg-red-50 p-4 text-red-700 text-center">
                {promotedError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {promoted.map((form, i) => (
                <motion.div
                  key={form.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
                    {form.imageUrl && (
                      <div className="relative h-48 w-full overflow-hidden">
                        <Image
                          src={form.imageUrl}
                          alt={form.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <CardTitle className="line-clamp-2 text-slate-900">{form.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {form.description && (
                        <p className="mb-4 line-clamp-3 text-slate-700">{form.description}</p>
                      )}
                      <Button asChild size="md" className="w-full bg-sky-600 text-white hover:bg-sky-700">
                        <Link href={`/forms/${form.id}`}>Register</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. JOIN US AT */}
      <section className="bg-gradient-to-b from-sky-50/60 to-amber-50/60 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Join Us
            </h2>
            <p className="mt-3 text-lg text-slate-700">
              Be part of our vibrant community of faith
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="p-8 bg-white shadow-lg border-l-4 border-l-amber-500 h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <MapPin className="h-6 w-6 text-amber-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Location</h3>
                    <p className="text-slate-700 mb-3">
                      Jeevan Darshan Kendra, Grirz<br />
                      Vasai, Maharashtra
                    </p>
                    <Link 
                      href="https://maps.app.goo.gl/q2GgBCUyaGfCgj7RA" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                    >
                      <MapPin className="h-4 w-4" />
                      View on Google Maps
                    </Link>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="p-8 bg-white shadow-lg border-l-4 border-l-sky-500 h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-sky-100 rounded-lg">
                    <Clock className="h-6 w-6 text-sky-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Meeting Times</h3>
                    <p className="text-slate-700">
                      Every Monday 7:00pm - 9:00pm<br />
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-10 text-center"
          >
            <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold shadow-lg">
              <Link href="/join">Get Involved Today</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* 7. FOLLOW US - Social Media */}
      <section className="bg-gradient-to-b from-amber-50/60 to-slate-900 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Stay Connected
            </h2>
            <p className="mt-3 text-lg text-slate-700">
              Follow us on social media for updates, photos, and inspiration
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto"
          >
            <Button
              asChild
              size="lg"
              className="h-auto py-6 bg-gradient-to-r from-pink-500 to-amber-400 text-white hover:from-pink-600 hover:to-amber-500 shadow-xl"
            >
              <Link
                href="https://www.instagram.com/cyp.vasai/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-3"
              >
                <FaInstagram className="h-10 w-10" />
                <div>
                  <div className="font-bold">CYP Vasai</div>
                  <div className="text-sm opacity-90">@cyp.vasai</div>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              className="h-auto py-6 bg-gradient-to-r from-pink-500 to-amber-400 text-white hover:from-pink-600 hover:to-amber-500 shadow-xl"
            >
              <Link
                href="https://www.instagram.com/cyp.youngprofessionals/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-3"
              >
                <FaInstagram className="h-10 w-10" />
                <div>
                  <div className="font-bold">Young Professionals</div>
                  <div className="text-sm opacity-90">@cyp.youngprofessionals</div>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              className="h-auto py-6 bg-red-600 text-white hover:bg-red-700 shadow-xl"
            >
              <Link
                href="https://www.youtube.com/@cyp-vasai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-3"
              >
                <FaYoutube className="h-10 w-10" />
                <div>
                  <div className="font-bold">YouTube</div>
                  <div className="text-sm opacity-90">@cyp-vasai</div>
                </div>
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </main>
  );
}