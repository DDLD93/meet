'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LogIn } from 'lucide-react';
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
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4 py-8 sm:py-12">
      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)]">vini meet</h1>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] uppercase tracking-wider">vinicius international video conference</p>
          </div>
          <p className="text-sm sm:text-base text-[var(--color-text-secondary)]">Create or join a meeting</p>
        </div>

        <div className="space-y-4">
          <Button
            size="lg"
            className="w-full"
            onClick={handleCreateMeeting}
            disabled={creating}
          >
            <Plus className="mr-2 h-4 w-4" />
            {creating ? 'Creating...' : 'Create Meeting'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[var(--color-border-dark)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--color-background)] px-2 text-[var(--color-text-muted)]">Or</span>
            </div>
          </div>

          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Enter meeting code or link"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyPress={handleJoinKeyPress}
              className="w-full"
            />
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleJoinMeeting}
              disabled={joining || !joinCode.trim()}
            >
              <LogIn className="mr-2 h-4 w-4" />
              {joining ? 'Joining...' : 'Join Meeting'}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}