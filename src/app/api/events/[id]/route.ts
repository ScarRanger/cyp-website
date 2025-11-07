import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/firebase-admin';
import type { EventItem } from '@/app/types/event';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const db = getDb();
    const docRef = await db.collection('events').doc(id).get();
    if (!docRef.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const data = docRef.data() as any;
  // Ensure id from params overrides any stored id field
  const merged = { ...(data as EventItem), id };
  return NextResponse.json(merged);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load event' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const db = getDb();
    const docRef = db.collection('events').doc(id);
    const existing = await docRef.get();
    if (!existing.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const update: Record<string, any> = {};
    for (const k of ['title','date','location','shortDescription','longDescription','headerImageUrl','headerImageKey','galleryCategory']) {
      if (k in body && body[k] !== undefined) update[k] = body[k];
    }
    update.updatedAt = new Date().toISOString();
    if (update.title) {
      // Optional title -> maintain slug only if user changed title AND provided new slug explicitly (avoid accidental slug change)
      if (body.slug) update.slug = body.slug; // allow explicit slug override
    }
    await docRef.update(update);
    const finalDoc = await docRef.get();
    return NextResponse.json({ id, ...(finalDoc.data() as any) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const db = getDb();
    const docRef = db.collection('events').doc(id);
    const existing = await docRef.get();
    if (!existing.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to delete event' }, { status: 500 });
  }
}
