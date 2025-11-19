'use client';

import Link from 'next/link';
import { FileX, Home, ArrowLeft } from 'lucide-react';

import { Nav } from '@/components/Nav';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="relative min-h-screen bg-black">
      {/* Navigation Bar */}
      <Nav />

      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        <div className="absolute top-0 right-0 h-[600px] w-[600px] bg-red-600/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-red-600/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 sm:px-6 lg:px-12 py-4 sm:py-24">
        <div className="w-full max-w-2xl">
          <div className="sm:bg-white/5 sm:backdrop-blur-xl sm:border sm:border-white/10 rounded-2xl p-6 sm:p-10 lg:p-12 sm:shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8">
              {/* Icon */}
              <div className="flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-red-500/10 border-2 border-red-500/30">
                <FileX className="w-10 h-10 sm:w-12 sm:h-12 text-red-500" />
              </div>

              {/* Content */}
              <div className="space-y-3 sm:space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white">
                  <span className="text-red-500">404</span>
                  <span className="block text-2xl sm:text-3xl lg:text-4xl mt-2 text-gray-300">
                    Page Not Found
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-gray-400 max-w-md mx-auto">
                  The page you&apos;re looking for doesn&apos;t exist or has been moved.
                  Let&apos;s get you back on track.
                </p>
              </div>

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 bg-red-600 text-white hover:bg-red-500 hover:shadow-[0_20px_40px_rgba(239,68,68,0.4)] transition-all duration-200"
                >
                  <Link href="/" className="flex items-center justify-center gap-2">
                    <Home className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Go Home</span>
                  </Link>
                </Button>
                <Button
                  onClick={() => window.history.back()}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 border-2 border-zinc-800 bg-zinc-900/50 text-white hover:bg-zinc-800 hover:border-zinc-700"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Go Back</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

