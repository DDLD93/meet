import { Loader2 } from 'lucide-react';

import { Nav } from '@/components/Nav';

export default function Loading() {
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
        <div className="w-full max-w-md">
          <div className="sm:bg-white/5 sm:backdrop-blur-xl sm:border sm:border-white/10 rounded-2xl p-8 sm:p-10 lg:p-12 sm:shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6">
              {/* Animated Loading Icon */}
              <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-500/10 border-2 border-red-500/30">
                <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-red-500 animate-spin" />
              </div>

              {/* Content */}
              <div className="space-y-2 sm:space-y-3">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                  Loading...
                </h2>
                <p className="text-xs sm:text-sm text-gray-400">
                  Please wait while we load the page
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

