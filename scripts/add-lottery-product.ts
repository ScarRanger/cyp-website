import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin
if (getApps().length === 0) {
  const credentials = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '', 'base64').toString('utf-8')
  );

  initializeApp({
    credential: cert(credentials)
  });
}

const db = getFirestore();

async function addLotteryProduct() {
  console.log('Adding lottery ticket product...');

  const lotteryProduct = {
    name: 'CYP Fundraiser Lottery',
    description: `Win exciting prizes! Buy your lucky ticket now.\n\nPrizes:\n🥇 1st Prize: Smartphone\n🥈 2nd Prize: Home Theatre\n🥉 3rd Prize: Air Fryer\n🏅 4th Prize: Mixer\n🏅 5th Prize: Iron\n🎁 6th-8th Prize: Consolation Prizes\n\nTicket Price: ₹100\nTotal 50 tickets available (1-50)`,
    price: 100,
    category: 'Lottery',
    images: ['/lottery-ticket-preview.jpg'],
    active: true,
    inStock: true,
    isLottery: true, // Special flag to identify lottery product
    createdAt: new Date(),
  };

  try {
    const docRef = await db.collection('fundraiser_items').add(lotteryProduct);
    console.log('✅ Lottery product added successfully!');
    console.log('Document ID:', docRef.id);
    console.log('\nProduct details:');
    console.log('- Name:', lotteryProduct.name);
    console.log('- Price: ₹', lotteryProduct.price);
    console.log('- Category:', lotteryProduct.category);
    console.log('\nNote: Make sure to add a lottery ticket image at /public/lottery-ticket-preview.jpg');
  } catch (error) {
    console.error('Error adding lottery product:', error);
    process.exit(1);
  }
}

addLotteryProduct()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
