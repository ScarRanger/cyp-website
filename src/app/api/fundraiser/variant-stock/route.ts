import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  const credentials = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '', 'base64').toString('utf-8')
  );

  initializeApp({
    credential: cert(credentials)
  });
}

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, variantId } = body;

    if (!productId || !variantId) {
      return NextResponse.json(
        { error: 'Missing productId or variantId' },
        { status: 400 }
      );
    }

    // Get the product document
    const productRef = db.collection('fundraiser_items').doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const productData = productDoc.data();
    
    if (!productData?.variants) {
      return NextResponse.json(
        { error: 'Product has no variants' },
        { status: 400 }
      );
    }

    // Update the variant's inStock status
    const updatedVariants = productData.variants.map((variant: any) => {
      if (variant.id === variantId) {
        return { ...variant, inStock: false };
      }
      return variant;
    });

    // Update Firestore
    await productRef.update({
      variants: updatedVariants
    });

    return NextResponse.json({ 
      success: true,
      message: `Variant ${variantId} marked as out of stock`
    });

  } catch (error) {
    console.error('Error marking variant out of stock:', error);
    return NextResponse.json(
      { error: 'Failed to update variant stock status' },
      { status: 500 }
    );
  }
}
