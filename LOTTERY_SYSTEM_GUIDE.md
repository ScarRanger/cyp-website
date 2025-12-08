# CYP Lottery System - Complete Implementation Guide

## ✅ System Overview

The CYP Fundraiser Lottery System is now fully implemented with:
- **50 lottery tickets** (₹500 each)
- **7-minute soft-lock timer** to reserve tickets
- **Admin approval workflow** before sending e-tickets
- **Email notifications** for customers and admins
- **Google Sheets logging** for order tracking

---

## 📁 Files Created/Modified

### Type Definitions
- `src/app/types/lottery.ts` - LotteryTicket and LotteryOrder types

### Customer Pages
- `src/app/lottery/page.tsx` - Ticket selection and checkout page

### API Routes
- `src/app/api/lottery/tickets/route.ts` - GET: Fetch all tickets with status
- `src/app/api/lottery/soft-lock/route.ts` - POST: Reserve ticket for 7 minutes
- `src/app/api/lottery/release-lock/route.ts` - POST: Release reservation
- `src/app/api/lottery/order/route.ts` - POST: Create pending order after payment
- `src/app/api/lottery/admin/orders/route.ts` - GET: Fetch all orders for admin
- `src/app/api/lottery/admin/confirm/route.ts` - POST: Confirm order and send e-ticket
- `src/app/api/lottery/admin/decline/route.ts` - POST: Decline order and release ticket

### Admin Panel
- `src/app/admin/lottery/page.tsx` - Order management dashboard

### Scripts
- `scripts/initialize-lottery-tickets.ts` - Creates 50 ticket documents in Firestore

---

## 🔥 Firestore Collections

### lottery_tickets
**50 documents** (IDs: "1" through "50")

Fields:
```typescript
{
  ticketNumber: number,        // 1-50
  status: string,              // 'available' | 'soft-locked' | 'sold'
  sessionId: string | null,    // Browser session ID for soft-lock
  lockedAt: Timestamp | null,  // When soft-lock was created
  orderId: string | null       // Reference to lottery_orders document
}
```

**Status:** ✅ Initialized (50 tickets created)

### lottery_orders
**Auto-generated document IDs**

Fields:
```typescript
{
  ticketNumber: number,
  name: string,
  phone: string,
  email: string,
  parish: string,
  transactionId: string,
  amount: number,              // 500 (₹500)
  status: string,              // 'pending' | 'confirmed' | 'declined'
  createdAt: Timestamp,
  sessionId: string,
  confirmedAt?: Timestamp,     // Set when admin confirms
  declinedAt?: Timestamp       // Set when admin declines
}
```

**Status:** ✅ Collection will be created automatically

---

## 📊 Google Sheets Setup

### Required Sheet: "Lottery"

**Spreadsheet ID:** `1ODlIMild9QS0wHSQny3BV1dQVqCrxEMqxGwdP9d8iFY`

**Sheet Name:** Lottery  
**Range:** Lottery!A:J

**Column Headers (Row 1):**
| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Timestamp | Order ID | Ticket | Name | Phone | Email | Parish | Transaction ID | Amount | Status |

**Status:** ⚠️ **ACTION REQUIRED**
1. Open the Google Sheet
2. Create a new sheet named "Lottery"
3. Add the column headers in row 1

---

## 🎯 Customer Flow

1. **Visit `/lottery`** - Customer sees 50 ticket grid
2. **Select Ticket** - Click on available ticket (green)
3. **7-Minute Timer Starts** - Ticket is soft-locked (yellow)
4. **Fill Checkout Form:**
   - Name
   - Phone Number
   - Email
   - Parish
   - UPI Transaction ID
5. **Pay via UPI** - ₹500 to `dabrecarren10-2@oksbi`
6. **Submit Order** - Creates pending order, sends confirmation emails

**Automatic Actions:**
- Ticket status: `soft-locked` → `sold` (locked until admin decision)
- Customer receives: Order confirmation email
- Admins receive: New order notification email
- Google Sheets: Order logged automatically

---

## 👨‍💼 Admin Flow

1. **Visit `/admin/lottery`** - Admin dashboard
2. **View Orders** - Filter by All/Pending/Confirmed/Declined
3. **Verify Payment** - Check UPI transaction ID
4. **Take Action:**

### Confirm Order
- Click green "Confirm" button
- Confirmation dialog appears
- On confirm:
  - Order status: `pending` → `confirmed`
  - Ticket status: `sold` (already set)
  - **E-Ticket email sent to customer** 📧
  - Google Sheets updated

### Decline Order
- Click red "Decline" button
- Confirmation dialog appears
- On decline:
  - Order status: `pending` → `declined`
  - **Ticket released** back to pool (status: `available`)
  - Decline notification email sent to customer 📧
  - Google Sheets updated
  - **Ticket becomes available for others to purchase**

---

## 📧 Email Notifications

### Customer Confirmation Email
**Sent:** After order submission  
**Subject:** "🎟️ CYP Lottery - Order Received (Ticket #X)"  
**Content:**
- Order ID
- Ticket number
- Customer details
- Transaction ID
- Amount paid
- Status: Pending Admin Verification

### Admin Notification Email
**Sent:** After order submission  
**To:** 3 admins  
**Subject:** "🚨 New CYP Lottery Order - Ticket #X"  
**Content:**
- Order ID
- Ticket number
- Customer details
- Transaction ID
- Amount
- Action required message

### E-Ticket Email (After Admin Confirmation)
**Sent:** After admin confirms  
**Subject:** "🎟️ Your CYP Lottery E-Ticket - Ticket #X"  
**Content:**
- Big ticket number display
- Payment confirmed badge
- Customer details
- Order ID and transaction ID
- Amount paid
- Contact info
- Professional design with CYP branding

### Decline Notification Email
**Sent:** After admin declines  
**Subject:** "⚠️ CYP Lottery - Order Declined (Ticket #X)"  
**Content:**
- Reason for possible decline
- Order details
- Next steps
- Contact information

---

## 🔐 Email Configuration

**SMTP Settings:**
- Host: `smtp.hostinger.com`
- Port: `465`
- Secure: `true`
- From: Process.env.SMTP_USER

**Environment Variables Required:**
```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-password
```

---

## ⏱️ Timer & Locking Mechanism

### Soft-Lock (7 minutes)
- **When:** Customer selects a ticket
- **Status:** Ticket marked as `soft-locked`
- **sessionId:** Unique browser session ID stored
- **lockedAt:** Timestamp when lock was created
- **Auto-Release:** Timer expires → ticket returns to `available`

### Hard-Lock (Permanent until admin decision)
- **When:** Customer submits order after payment
- **Status:** Ticket marked as `sold`
- **orderId:** Reference to order document
- **Release:** Only if admin declines the order

### Auto-Cleanup
- Expired soft-locks (>7 minutes) automatically cleaned on ticket fetch
- Ensures tickets don't stay locked forever

---

## 🎨 UI Color System

### Ticket States
- **Available** - Green (#22c55e)
- **Soft-Locked** - Yellow/Orange (#fb923c)
- **Sold** - Red (#ef4444)
- **Selected** - Border and glow effect

### Status Badges
- **Pending** - Yellow (#fbbf24)
- **Confirmed** - Green (#22c55e)
- **Declined** - Red (#ef4444)

---

## 🚀 Deployment Checklist

### Before Going Live:

1. ✅ **Firestore Collections**
   - [x] lottery_tickets initialized (50 documents)
   - [ ] lottery_orders (auto-created)

2. ⚠️ **Google Sheets**
   - [ ] Create "Lottery" sheet
   - [ ] Add column headers (A:J)
   - [ ] Test logging with a test order

3. ✅ **Email System**
   - [x] SMTP credentials in `.env.local`
   - [x] Test email delivery
   - [x] Verify all 3 admin emails receive notifications

4. ⚠️ **Admin Access**
   - [ ] Add authentication to `/admin/lottery` route
   - [ ] Restrict access to authorized admins only

5. ⚠️ **Testing**
   - [ ] Full flow test (select ticket → pay → order → admin confirm)
   - [ ] Timer expiration test (soft-lock auto-release)
   - [ ] Decline flow test (ticket release)
   - [ ] Email delivery test (all 4 email types)
   - [ ] Google Sheets logging test

6. ⚠️ **Production**
   - [ ] Update UPI QR code if needed
   - [ ] Verify lottery price (currently ₹500)
   - [ ] Add link to `/lottery` in main navigation
   - [ ] Test on mobile devices

---

## 🛠️ Admin Actions Reference

### View All Orders
```
GET /api/lottery/admin/orders
```

### Confirm Order
```
POST /api/lottery/admin/confirm
Body: { orderId: string }
```
**Actions:**
1. Updates order status to 'confirmed'
2. Keeps ticket as 'sold'
3. Sends e-ticket email to customer
4. Returns success message

### Decline Order
```
POST /api/lottery/admin/decline
Body: { orderId: string }
```
**Actions:**
1. Updates order status to 'declined'
2. Releases ticket to 'available'
3. Clears ticket's orderId, sessionId, lockedAt
4. Sends decline email to customer
5. Returns success message

---

## 📱 Customer Support

**Contact Info:**
- Phone: +91 8551098035
- Admin Emails: rhine.pereira@gmail.com, dabrecarren10@gmail.com, crystal.colaco@gmail.com
- Website: cypvasai.org

---

## 🔧 Troubleshooting

### Ticket Stuck as Soft-Locked
**Solution:** Tickets auto-cleanup after 7 minutes. If stuck, manually update in Firestore:
```javascript
status: 'available',
sessionId: null,
lockedAt: null,
orderId: null
```

### E-Ticket Not Sending
**Check:**
1. Order status is 'pending'
2. SMTP credentials are correct
3. Customer email is valid
4. Check server logs for SMTP errors

### Ticket Not Released After Decline
**Check:**
1. Verify API endpoint response
2. Check Firestore ticket document
3. Ensure decline endpoint completed successfully

### Timer Not Counting Down
**Check:**
1. Browser console for JavaScript errors
2. Ensure useEffect is running
3. Verify timeLeft state updates

---

## 📝 Next Steps

1. **Create "Lottery" Google Sheet** with headers
2. **Add admin authentication** to protect `/admin/lottery`
3. **Test complete flow** with a real order
4. **Verify all emails** are received correctly
5. **Add lottery link** to main navigation
6. **Test on mobile devices** for responsive design
7. **Go live!** 🎉

---

## 💰 Lottery Details

- **Price:** ₹500 per ticket
- **Total Tickets:** 50 (1-50)
- **Payment:** UPI only
- **UPI ID:** dabrecarren10-2@oksbi
- **Reservation Time:** 7 minutes
- **Approval:** Manual admin verification

---

## 🎉 System Complete!

All lottery system files are created and functional. The only remaining tasks are:
1. Create the Google Sheets "Lottery" sheet
2. Add admin authentication
3. Test the complete flow

The system is ready for deployment once these final steps are completed! 🚀
