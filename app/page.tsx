'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Nav } from '@/components/Nav';

export default function Home() {
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const router = useRouter();

  const extractRoomName = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Try to parse as URL
    try {
      const url = new URL(trimmed);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const joinIndex = pathParts.indexOf('join');
      if (joinIndex !== -1 && pathParts[joinIndex + 1]) {
        return decodeURIComponent(pathParts[joinIndex + 1]);
      }
    } catch {
      // Not a URL, treat as room name/code
    }

    // If it contains a slash, try to extract room name from path-like string
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/').filter(Boolean);
      const joinIndex = parts.indexOf('join');
      if (joinIndex !== -1 && parts[joinIndex + 1]) {
        return decodeURIComponent(parts[joinIndex + 1]);
      }
      // If it ends with a room name, use the last part
      const lastPart = parts[parts.length - 1];
      if (lastPart && !lastPart.includes('.')) {
        return decodeURIComponent(lastPart);
      }
    }

    // Otherwise, treat the whole input as room name
    return trimmed;
  };

  const handleCreateMeeting = useCallback(async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/meetings/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Meeting', isPublic: true }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Failed to create meeting.');
      }

      const data = (await response.json()) as { meeting: { roomName: string } };
      router.push(`/join/${encodeURIComponent(data.meeting.roomName)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create meeting.');
    } finally {
      setCreating(false);
    }
  }, [router]);

  const handleJoinMeeting = useCallback(() => {
    const roomName = extractRoomName(joinCode);
    if (!roomName) {
      toast.error('Please enter a valid meeting code or link.');
      return;
    }

    setJoining(true);
    router.push(`/join/${encodeURIComponent(roomName)}`);
  }, [joinCode, router]);

  const handleJoinKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleJoinMeeting();
      }
    },
    [handleJoinMeeting],
  );

  return (
    <main className="min-h-screen bg-black">
      {/* Navigation Bar */}
      <Nav showEnterpriseBadge />

      {/* Hero Section */}
      <div className="relative flex min-h-screen">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
          <div className="absolute top-0 right-0 h-[600px] w-[600px] bg-red-600/10 blur-[140px] rounded-full" />
          <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-red-600/5 blur-[120px] rounded-full" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex w-full max-w-5xl mx-auto items-center px-4 sm:px-6 lg:px-12 py-4 sm:py-24">
          <div className="w-full">
            {/* Glassmorphism Panel */}
            <div className="relative sm:bg-white/5 sm:backdrop-blur-xl sm:border sm:border-white/10 rounded-2xl m-0 sm:m-12 p-6 sm:p-10 lg:p-12 sm:shadow-2xl">
              <div className="space-y-6 sm:space-y-10">
                <div className="space-y-4 sm:space-y-6">
                  <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold text-red-500 leading-[1.1]">
                    <span className="text-white">Video calls with</span>
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600">
                      anyone, anytime
                    </span>
                  </h1>
                  
                  <p className="text-sm sm:text-base lg:text-lg text-gray-400 max-w-xl">
                    Professional video conferencing with a modern interface. 
                    Start instantly or join with a code.
                  </p>
                </div>

                {/* Action Section */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button
                      onClick={handleCreateMeeting}
                      disabled={creating}
                      size="lg"
                      className="group h-12 sm:h-14 px-6 sm:px-8 bg-red-600 text-white rounded-xl font-semibold 
                                 hover:bg-red-500 transition-all duration-200 hover:shadow-[0_20px_40px_rgba(239,68,68,0.4)]
                                 disabled:opacity-60 disabled:hover:shadow-none disabled:hover:bg-red-600 
                                 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base"
                    >
                      <Video className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span>{creating ? 'Creating...' : 'Start a meeting for free'}</span>
                      <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                    
                    <div className="relative flex-1 max-w-sm">
                      <Input
                        type="text"
                        placeholder="Enter code or paste link"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        onKeyPress={handleJoinKeyPress}
                        className="h-12 sm:h-14 w-full pl-4 sm:pl-5 pr-24 sm:pr-28 bg-zinc-900/50 border-2 border-zinc-800 text-white 
                                   placeholder:text-gray-500 rounded-xl focus:border-red-500 
                                   focus:ring-2 focus:ring-red-500/30 text-sm sm:text-base"
                      />
                      <Button
                        onClick={handleJoinMeeting}
                        disabled={joining || !joinCode.trim()}
                        size="sm"
                        className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white text-gray-900 
                                   rounded-lg font-semibold hover:bg-gray-50 transition-colors
                                   disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-xs sm:text-sm"
                      >
                        {joining ? '...' : 'Join'}
                      </Button>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-4 sm:gap-6 pt-1 sm:pt-2">
                    <div className="flex items-center gap-2.5 text-sm text-gray-400">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span>No downloads</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-gray-400">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span>HD quality</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-gray-400">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span>Secure & encrypted</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}