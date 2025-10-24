"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/app/components/ui/button";
import { Separator } from "@/app/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { MapPin, Clock } from "lucide-react";


const mapsUrl = "https://maps.app.goo.gl/q2GgBCUyaGfCgj7RA";
const mapsEmbed = "https://www.google.com/maps?q=Jeevan+Darshan+Kendra,+Giriz&output=embed";

export default function JoinPage() {
  return (
    <main>
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-amber-50 via-white to-sky-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 flex items-center justify-between"
          >
            <h1 className="text-3xl font-semibold uppercase tracking-[-0.02em] text-slate-900 sm:text-4xl">
              Join CYP
            </h1>
            <Separator className="ml-4 hidden flex-1 sm:block" />
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-slate-900">Join us at Jeevan Darshan Kendra, Giriz</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-5 w-5 text-sky-600" />
                      <div>
                        <p className="font-medium text-slate-900">Jeevan Darshan Kendra, Giriz</p>
                        <p className="text-slate-600">Vasai</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <p className="text-slate-800">Every Monday, 7:00 PM – 9:00 PM</p>
                    </div>
                    <div className="pt-2">
                      <Button asChild size="lg" className="bg-sky-600 text-white hover:bg-sky-700">
                        <Link href={mapsUrl} target="_blank" rel="noopener noreferrer" aria-label="Open location in Google Maps">
                          Open in Google Maps
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="relative overflow-hidden rounded-xl border border-sky-100 bg-white shadow-sm">
                <div className="relative aspect-video w-full">
                  <iframe
                    className="h-full w-full"
                    src={mapsEmbed}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    aria-label="Map for Jeevan Darshan Kendra, Giriz"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}
