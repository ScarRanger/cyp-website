import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
let db: FirebaseFirestore.Firestore;

try {
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  
  if (!serviceAccountBase64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is not set. Please check your .env.local file.');
  }

  const serviceAccount = JSON.parse(
    Buffer.from(serviceAccountBase64, 'base64').toString('utf-8')
  );

  initializeApp({
    credential: cert(serviceAccount)
  });

  db = getFirestore();
  console.log('✓ Firebase Admin initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  process.exit(1);
}

async function addStockToVariants(
  productId: string,
  productTitle: string,
  stockPerVariant: number = 1
) {
  try {
    console.log(`\nFetching product "${productTitle}" (${productId})...`);

    // Get the product document
    const productRef = db.collection('fundraiser_items').doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      console.error('❌ Product not found!');
      return;
    }

    const productData = productDoc.data();

    if (!productData?.variants) {
      console.error('❌ Product has no variants!');
      return;
    }

    console.log(`Found ${productData.variants.length} variants`);

    // Add inStock property to each variant
    const updatedVariants = productData.variants.map((variant: any) => {
      return {
        ...variant,
        inStock: variant.inStock !== undefined ? variant.inStock : (stockPerVariant > 0)
      };
    });

    // Update Firestore
    await productRef.update({
      variants: updatedVariants
    });

    console.log(`\n✓ Successfully updated all variants!`);
    console.log('\n=== UPDATED VARIANTS ===');
    updatedVariants.forEach((v: any, idx: number) => {
      console.log(`${idx + 1}. ${v.name}: inStock = ${v.inStock}`);
    });

  } catch (error) {
    console.error('Error adding stock to variants:', error);
    throw error;
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: tsx scripts/add-variant-stock.ts <product-id> <product-title> [stock-per-variant]');
  console.log('');
  console.log('Examples:');
  console.log('  tsx scripts/add-variant-stock.ts WnkeGrohKYURuaIkVqBz "Christmas Hoop" 1');
  console.log('  tsx scripts/add-variant-stock.ts tt2ISHMNi4NNZQSCWfi2 "Wreath" 1');
  console.log('');
  console.log('Note: stock-per-variant defaults to 1. Set to 1 for in stock, 0 for out of stock');
  process.exit(1);
}

const [productId, productTitle, stockArg] = args;
const stockPerVariant = stockArg ? parseInt(stockArg) : 1;

console.log('=== Add Variant Stock Script ===');
console.log(`Product ID: ${productId}`);
console.log(`Product Title: ${productTitle}`);
console.log(`Stock per variant: ${stockPerVariant} (inStock: ${stockPerVariant > 0})`);
console.log('=================================');

addStockToVariants(productId, productTitle, stockPerVariant)
  .then(() => {
    console.log('\n✓ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Failed:', error);
    process.exit(1);
  });
