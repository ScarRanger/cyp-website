# CYP Vasai - Christian Youth in Power

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-Private-red.svg)](LICENSE)

> **The official digital ecosystem for the Catholic Youth in Power (CYP) Vasai community.**

This platform serves as the central hub for youth empowerment, combining faith, fellowship, and modern technology. It facilitates event management, secure ticket scanning, media streaming, and community engagement through a robust, scalable web application.

🌐 **Live Site:** [www.cypvasai.org](https://www.cypvasai.org)

---

## 📋 Table of Contents

- [Core Modules](#-core-modules)
- [Technical Architecture](#-technical-architecture)
- [Project Structure](#-project-structure)
- [Scripts & Automation](#-scripts--automation)
- [Configuration](#-configuration)
- [Contributing](#-contributing)

---

## 🧩 Core Modules

### 📱 Progressive Web App (PWA) & Scanner
Designed for reliable offline usage in low-connectivity environments.
- **Offline-First Ticket Scanning**: `concert-scan` module works without internet, syncing data later.
- **Installable Experience**: Fully compliant PWA with manifest and service workers.
- **Duplicate Detection**: Local caching prevents ticket reuse across multiple entry points.

### 🎟️ Lottery Management System
High-performance ticketing engine.
- **Real-Time Availability**: Powered by Supabase Realtime subscriptions.
- **Scalability**: Tested for 100+ concurrent users and 1,000+ tickets.
- **Security**: QR signature verification maintains ticket authenticity.
- **Automated Fulfillment**: E-tickets and confirmation emails sent instantly via Resend.

### 🎥 CYP Talks & Media Gallery
A dedicated streaming and media platform.
- **Adaptive Streaming**: HLS video delivery via AWS CloudFront for optimal playback quality.
- **Google Photos Integration**: Dynamic gallery syncing with OAuth 2.0.
- **Large Asset Management**: Admin tools for uploading multi-gigabyte video files directly to S3.

### 🎫 Event & Team Management
- **Event Registration**: Dynamic event creation with SEO-optimized pages.
- **Team Showcases**: Dedicated sections for ministry teams (`/teams`) and organization history (`/history`).
- **Dynamic Form Builder**: Custom drag-and-drop forms for surveys and feedback.

### 🤝 Community & Fundraising
- **Fundraiser Store**: E-commerce functionality for community support.
- **Member Registration**: Seamless onboarding for new community members.

---

## 🛠️ Technical Architecture

### Frontend
- **Framework**: Next.js 16.1 (App Router)
- **UI Library**: React 19.1
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS 4.1, Framer Motion
- **State/Form**: React Hook Form, Zod

### Backend & Cloud Services
- **Database**: Supabase (PostgreSQL) + Realtime
- **Auth**: Firebase Authentication (Google Sign-In)
- **CMS/Storage**: AWS S3 (Storage), AWS CloudFront (CDN)
- **Email**: Resend & Nodemailer (SMTP)
- **Additional**: Appwrite, Google APIs (Photos, Sheets)

---

## 📁 Project Structure

```
cyp-website/
├── public/                      # Static assets & PWA manifest
├── scripts/                     # Operational & Maintenance scripts
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── admin/               # Protected Admin Dashboard
│   │   ├── api/                 # Backend API Routes
│   │   ├── concert/             # Concert details
│   │   ├── concert-scan/        # Offline PWA Scanner
│   │   ├── events/              # Event management
│   │   ├── forms/               # Dynamic form renderer
│   │   ├── fundraiser/          # Donation & Store
│   │   ├── gallery/             # Media gallery
│   │   ├── lottery/             # Lottery booking system
│   │   ├── talks/               # Video streaming platform
│   │   └── teams/               # Team listings
│   ├── lib/                     # Service clients (S3, Firebase, Supabase, etc.)
│   └── types/                   # TypeScript definitions
├── cgs_schema.sql               # Database Schema
├── next.config.ts               # Next.js & PWA Configuration
└── package.json                 # Project Dependencies
```

---

## ⚙️ Configuration

Key configuration files:
- **`next.config.ts`**: Handles PWA plugins, image domains, and security headers.
- **`.env.local`**: Stores confidential API keys for Firebase, AWS, and Supabase.
- **`manifest.json`**: Controls PWA behavior (icons, theme colors).

---

## 🤝 Contributing

We welcome contributions from the CYP Tech Team!

1.  **Branching**: Create a feature branch (`git checkout -b feature/amazing-feature`).
2.  **Standards**: Ensure strict TypeScript typing and run linters.
3.  **Testing**: Verify functionality in `pnpm dev`.
4.  **Pull Request**: Submit a PR describing your changes.

---

## 📄 License

**© CYP Vasai**. All rights reserved.
This project is proprietary software developed for the Christian Youth in Power community.

---

**Made with ❤️ by the CYP Tech Team**
