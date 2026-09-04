import type { Metadata } from 'next';
import { Manrope, Space_Mono } from 'next/font/google';
import './globals.css';

const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'] });
const spaceMono = Space_Mono({ variable: '--font-space-mono', subsets: ['latin'], weight: ['400', '700'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'CampusOS — Your campus, in sync',
  description: 'A live campus workspace for schedules, rooms, events, announcements, assignments, and AI-powered actions.',
  openGraph: {
    title: 'CampusOS',
    description: 'Your campus, in sync.',
    type: 'website',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'CampusOS — Your campus, in sync.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CampusOS',
    description: 'Your campus, in sync.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${manrope.variable} ${spaceMono.variable} antialiased`}>{children}</body></html>;
}
