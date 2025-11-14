'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="text-xl font-bold text-white">
            VINI <span className="text-red-500">MEET</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-red-500" />
          <span className="text-xs text-gray-400">Enterprise Ready</span>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative flex min-h-screen">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
          <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-red-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] bg-red-600/5 blur-[100px] rounded-full" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex w-full max-w-6xl mx-auto items-center px-8 py-20">
          <div className="w-full max-w-2xl mx-auto">
            
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-5xl lg:text-7xl font-bold text-white leading-[1.1]">
                  Video calls with
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600">
                    anyone, anytime
                  </span>
                </h1>
                
                <p className="text-lg text-gray-400 max-w-lg">
                  Professional video conferencing with a modern interface. 
                  Start instantly or join with a code.
                </p>
              </div>

              {/* Action Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleCreateMeeting}
                    disabled={creating}
                    className="group relative px-8 py-4 bg-red-600 text-white rounded-xl font-semibold 
                               hover:bg-red-500 transition-all duration-200 hover:shadow-[0_20px_40px_rgba(239,68,68,0.4)]
                               disabled:opacity-60 disabled:hover:shadow-none disabled:hover:bg-red-600 flex items-center justify-center gap-3"
                  >
                    <Video className="h-5 w-5" />
                    <span>{creating ? 'Creating...' : 'Start a meeting for free'}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  
                  <div className="relative flex-1 max-w-sm">
                    <Input
                      type="text"
                      placeholder="Enter code or paste link"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      onKeyPress={handleJoinKeyPress}
                      className="h-14 w-full pl-5 pr-28 bg-zinc-900/50 border border-zinc-800 text-white 
                                 placeholder:text-gray-500 rounded-xl focus:border-red-500 
                                 focus:ring-2 focus:ring-red-500/30"
                    />
                    <button
                      onClick={handleJoinMeeting}
                      disabled={joining || !joinCode.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-white text-black 
                                 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joining ? '...' : 'Join'}
                    </button>
                  </div>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-6 pt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>No downloads</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>HD quality</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Secure & encrypted</span>
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