  import { NextResponse } from 'next/server';
import { getDb } from '@/app/lib/firebase-admin';
import type { EventItem } from '@/app/types/event';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const limitParam = parseInt(searchParams.get('limit') || '0', 10) || undefined;
    const db = getDb();
    if (slug) {
      const snap = await db.collection('events').where('slug', '==', slug).get();
      const items: EventItem[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as EventItem[];
      if (!items.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ items });
    }

    const snap = await db.collection('events').orderBy('date', 'desc').get();
    let items: EventItem[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as EventItem[];
    if (limitParam && items.length > limitParam) items = items.slice(0, limitParam);
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to list events' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title: string = body.title;
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });
    const slugBase = slugify(title);
    if (!slugBase) return NextResponse.json({ error: 'Invalid title' }, { status: 400 });

    const db = getDb();
    // Ensure slug uniqueness
    let slug = slugBase;
    let attempt = 1;
    while (attempt < 5) {
      const existingSnap = await db.collection('events').where('slug', '==', slug).get();
      if (existingSnap.empty) break;
      attempt += 1;
      slug = `${slugBase}-${attempt}`;
    }

    const now = new Date().toISOString();
    // Build document omitting undefined optional fields (Firestore disallows explicit undefined)
    const eventDoc: Partial<Omit<EventItem, 'id'>> = {
      title,
      slug,
      date: body.date || now,
      createdAt: now,
      updatedAt: now,
    };
    if (body.location) eventDoc.location = body.location;
    if (body.shortDescription) eventDoc.shortDescription = body.shortDescription;
    if (body.longDescription) eventDoc.longDescription = body.longDescription;
    if (body.headerImageUrl) eventDoc.headerImageUrl = body.headerImageUrl;
    if (body.headerImageKey) eventDoc.headerImageKey = body.headerImageKey;
    if (body.galleryCategory) eventDoc.galleryCategory = body.galleryCategory;

  const ref = await db.collection('events').add(eventDoc as any);
    return NextResponse.json({ id: ref.id, ...eventDoc }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create event' }, { status: 500 });
  }
}
