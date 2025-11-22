import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
    title: '404 - Page Not Found',
    description: 'The page you are looking for could not be found. Return to CYP Vasai homepage.',
    robots: {
        index: false,
        follow: true,
    },
};

// Warm Espresso Theme Colors
const theme = {
    background: '#1C1917',
    surface: '#1C1917',
    primary: '#FB923C',
    text: '#FAFAFA',
    border: '#FB923C30',
};

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: theme.background }}>
            <div className="text-center max-w-2xl">
                <div className="mb-8">
                    <h1 className="text-9xl font-bold mb-4" style={{ color: theme.primary }}>404</h1>
                    <h2 className="text-3xl font-bold mb-4" style={{ color: theme.text }}>Page Not Found</h2>
                    <p className="text-lg opacity-70 mb-4" style={{ color: theme.text }}>
                        The page you're looking for doesn't exist or has been moved.
                    </p>

                    {/* Bible Verse */}
                    <div className="mt-6 mb-8 p-6 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: 'rgba(251, 146, 60, 0.05)' }}>
                        <p className="text-lg italic mb-2" style={{ color: theme.text }}>
                            "Ask and it will be given to you; seek and you will find; knock and the door will be opened to you."
                        </p>
                        <p className="text-sm font-semibold" style={{ color: theme.primary }}>
                            - Matthew 7:7
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                        asChild
                        size="lg"
                        className="font-semibold"
                        style={{ backgroundColor: theme.primary, color: '#1C1917' }}
                    >
                        <Link href="/">
                            <Home className="mr-2 h-5 w-5" />
                            Go to Homepage
                        </Link>
                    </Button>

                    <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="font-semibold"
                        style={{
                            borderColor: theme.border,
                            color: theme.text,
                            backgroundColor: 'transparent'
                        }}
                    >
                        <Link href="/events">
                            View Events
                        </Link>
                    </Button>
                </div>

                <div className="mt-12 pt-8 border-t" style={{ borderColor: theme.border }}>
                    <p className="text-sm opacity-60" style={{ color: theme.text }}>
                        Need help? Visit our <Link href="/join" className="underline hover:opacity-80" style={{ color: theme.primary }}>Join page</Link> to connect with us.
                    </p>
                </div>
            </div>
        </div>
    );
}
