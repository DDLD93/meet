'use client';

import Image from 'next/image';
import { Sparkles } from 'lucide-react';

export function Nav({ showEnterpriseBadge = false }: { showEnterpriseBadge?: boolean }) {
  return (
    <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 sm:px-8 lg:px-12 py-5 sm:py-6 border-b border-white/5 bg-black/40 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/30 shadow-lg ring-1 ring-white/20">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/25 via-white/10 to-transparent" />
          <Image
            src="https://www.viniciusint.com/logo.png"
            alt="Vinicius International Logo"
            width={24}
            height={24}
            className="relative h-6 w-6 object-contain drop-shadow-lg"
            style={{
              filter: 'brightness(0) invert(1)',
            }}
          />
        </div>
        <div className="text-xl font-bold text-white">
          VINI <span className="text-red-500">MEET</span>
        </div>
      </div>
      {showEnterpriseBadge && (
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-red-500" />
          <span className="text-xs text-gray-300">Enterprise Ready</span>
        </div>
      )}
    </nav>
  );
}

