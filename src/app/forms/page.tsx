"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { FormLayout } from "@/app/types/form";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Separator } from "@/app/components/ui/separator";
import { Calendar, Users, Eye, ClipboardList } from "lucide-react";
import Image from "next/image";

export default function FormsPage() {
  const [forms, setForms] = useState<FormLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const formsRef = collection(db, "forms");
        const q = query(formsRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const result: FormLayout[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const toDate = (val: unknown): Date => {
            if (!val) return new Date();
            const maybeTs = val as { toDate?: () => Date };
            if (typeof maybeTs?.toDate === "function") return maybeTs.toDate();
            if (val instanceof Date) return val;
            if (typeof val === "string" || typeof val === "number") {
              const d = new Date(val);
              return isNaN(d.getTime()) ? new Date() : d;
            }
            return new Date();
          };
          result.push({
            id: doc.id,
            ...data,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
          } as FormLayout);
        });
        setForms(result);
      } catch (e) {
        setError("Failed to load forms");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, []);

  return (
    <main>
      <section className="bg-gradient-to-b from-amber-50 via-white to-sky-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 flex items-center justify-between"
          >
            <h1 className="text-3xl font-semibold uppercase tracking-[-0.02em] text-slate-900">Available Forms</h1>
            <Separator className="ml-4 hidden flex-1 sm:block" />
          </motion.div>

          {loading && (
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-400 border-t-sky-500" aria-label="Loading" />
            </div>
          )}

          {error && !loading && (
            <div className="mx-auto max-w-xl rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {forms.length === 0 && (
                <motion.div
                  className="sm:col-span-2 lg:col-span-3"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="overflow-hidden">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-50 to-sky-50" />
                      <div className="relative p-8 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                          <ClipboardList className="h-7 w-7 text-sky-600" />
                        </div>
                        <CardTitle className="mb-2 text-slate-900">No Forms Available</CardTitle>
                        <p className="mx-auto mb-6 max-w-2xl text-slate-600">
                          There are currently no active forms to fill out. Check back soon or connect with us to stay updated on upcoming registrations and sign-ups.
                        </p>
                        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
                          {/* <Button asChild className="bg-sky-600 text-white hover:bg-sky-700">
                            <Link href="/events" aria-label="Explore CYP events">
                              Explore Events
                            </Link>
                          </Button> */}
                          <Button asChild variant="outline">
                            <Link href="/join" aria-label="Join Christian Youth in Power">
                              Join CYP
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}

              {forms.map((form, i) => (
                <motion.div
                  key={form.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <Card className="overflow-hidden">
                    {form.imageUrl && (
                      <div className="relative h-44 w-full overflow-hidden">
                        <Image src={form.imageUrl} alt={form.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <CardTitle className="line-clamp-2 text-slate-900">{form.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {form.description && (
                        <p className="mb-4 line-clamp-3 text-slate-700">{form.description}</p>
                      )}
                      <div className="mb-3 flex items-center text-sm text-slate-500">
                        <Calendar className="mr-1 h-4 w-4" />
                        Created {form.createdAt?.toLocaleDateString?.() ?? ""}
                      </div>
                      <div className="mb-4 flex items-center text-sm text-slate-500">
                        <Users className="mr-1 h-4 w-4" />
                        {form.fields.length} field{form.fields.length !== 1 ? "s" : ""}
                      </div>
                      <Button asChild size="md" className="w-full bg-sky-600 text-white hover:bg-sky-700">
                        <Link href={`/forms/${form.id}`} aria-label={`Open form ${form.title}`}>
                          <span className="mr-2 inline-flex items-center justify-center align-middle"><Eye className="h-4 w-4" /></span>
                          Fill Out Form
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}