'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import MeetingRoom from '@/components/MeetingRoom';
import { Nav } from '@/components/Nav';
import { Button } from '@/components/ui/button';
import {
  lookupMeetingIdForRoom,
  loadStoredCredentials,
  useMeetingSession,
} from '@/lib/meetingSession';

const decodeRoomName = (room: string) => {
  try {
    return decodeURIComponent(room);
  } catch {
    return room;
  }
};

export default function MeetingRoomPage() {
  const params = useParams<{ room: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const roomParam = params?.room ?? '';
  const roomName = useMemo(() => decodeRoomName(roomParam), [roomParam]);

  const [meetingId, setMeetingId] = useState<string | null>(() => {
    const fromQuery = searchParams?.get('meetingId');
    return fromQuery && fromQuery.length > 0 ? fromQuery : null;
  });

  useEffect(() => {
    if (meetingId || !roomName) {
      return;
    }
    const storedId = lookupMeetingIdForRoom(roomName);
    if (storedId) {
      setMeetingId(storedId);
    }
  }, [meetingId, roomName]);

  const { session, loading, error, refresh } = useMeetingSession(meetingId, {
    autoRefresh: true,
  });

  useEffect(() => {
    if (!meetingId || session || loading) {
      return;
    }
    const storedId = lookupMeetingIdForRoom(roomName);
    if (!storedId && typeof window !== 'undefined') {
      // Redirect to lobby
      router.replace(`/join/${encodeURIComponent(roomName)}`);
      return;
    }
    
    // If we have meetingId but no session, redirect to lobby with credentials
    if (meetingId && !session && !loading && typeof window !== 'undefined') {
      const credentials = loadStoredCredentials(meetingId);
      if (credentials) {
        const params = new URLSearchParams();
        if (credentials.email) {
          params.set('email', credentials.email);
        }
        if (credentials.name) {
          params.set('name', credentials.name);
        }
        const query = params.toString();
        router.replace(`/join/${encodeURIComponent(roomName)}${query ? `?${query}` : ''}`);
      } else {
        router.replace(`/join/${encodeURIComponent(roomName)}`);
      }
    }
  }, [loading, meetingId, roomName, router, session]);

  if (!roomName) {
    return (
      <main className="relative min-h-screen bg-black">
        <Nav />
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
          <div className="absolute top-0 right-0 h-[600px] w-[600px] bg-red-600/10 blur-[140px] rounded-full" />
          <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-red-600/5 blur-[120px] rounded-full" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 sm:px-8 lg:px-12 py-24 sm:py-32">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-10 shadow-2xl">
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              Missing room identifier.
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="relative min-h-screen bg-black">
        <Nav />
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
          <div className="absolute top-0 right-0 h-[600px] w-[600px] bg-red-600/10 blur-[140px] rounded-full" />
          <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-red-600/5 blur-[120px] rounded-full" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 sm:px-8 lg:px-12 py-24 sm:py-32">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-10 shadow-2xl">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-gray-400">
              Connecting you to the meeting…
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!meetingId || !session) {
    // Get credentials to redirect with email/name
    const credentials = meetingId ? loadStoredCredentials(meetingId) : null;
    const redirectToLobby = () => {
      if (credentials) {
        const params = new URLSearchParams();
        if (credentials.email) {
          params.set('email', credentials.email);
        }
        if (credentials.name) {
          params.set('name', credentials.name);
        }
        const query = params.toString();
        router.replace(`/join/${encodeURIComponent(roomName)}${query ? `?${query}` : ''}`);
      } else {
        router.replace(`/join/${encodeURIComponent(roomName)}`);
      }
    };

    return (
      <main className="relative min-h-screen bg-black">
        <Nav />
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
          <div className="absolute top-0 right-0 h-[600px] w-[600px] bg-red-600/10 blur-[140px] rounded-full" />
          <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-red-600/5 blur-[120px] rounded-full" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 px-6 sm:px-8 lg:px-12 py-24 sm:py-32 text-center">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-10 lg:p-12 shadow-2xl max-w-md w-full space-y-6">
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 sm:px-5 py-3 sm:py-4 text-sm text-red-400">
              We couldn&apos;t find an active meeting session. {credentials ? 'You can rejoin using your saved credentials.' : 'Please re-enter the meeting details.'}
            </div>
            <Button
              type="button"
              onClick={redirectToLobby}
              size="lg"
              className="w-full bg-red-600 text-white hover:bg-red-500 hover:shadow-[0_20px_40px_rgba(239,68,68,0.4)] transition-all duration-200"
            >
              {credentials ? 'Rejoin meeting' : 'Go back to join page'}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="relative min-h-screen bg-black">
        <Nav />
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
          <div className="absolute top-0 right-0 h-[600px] w-[600px] bg-red-600/10 blur-[140px] rounded-full" />
          <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-red-600/5 blur-[120px] rounded-full" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 px-6 sm:px-8 lg:px-12 py-24 sm:py-32 text-center">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-10 lg:p-12 shadow-2xl max-w-md w-full space-y-6">
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 sm:px-5 py-3 sm:py-4 text-sm text-red-400">
              {error}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <Button
                type="button"
                onClick={() => refresh(true)}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                Try again
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const credentials = meetingId ? loadStoredCredentials(meetingId) : null;
                  if (credentials) {
                    const params = new URLSearchParams();
                    if (credentials.email) {
                      params.set('email', credentials.email);
                    }
                    if (credentials.name) {
                      params.set('name', credentials.name);
                    }
                    const query = params.toString();
                    router.replace(`/join/${encodeURIComponent(roomName)}${query ? `?${query}` : ''}`);
                  } else {
                    router.replace(`/join/${encodeURIComponent(roomName)}`);
                  }
                }}
                size="lg"
                className="flex-1 bg-red-600 text-white hover:bg-red-500 hover:shadow-[0_20px_40px_rgba(239,68,68,0.4)] transition-all duration-200"
              >
                Return to join
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <MeetingRoom
      token={session.token}
      serverUrl={session.livekitUrl}
      meetingId={session.meetingId}
      meetingTitle={session.meetingTitle}
      roomName={session.roomName}
    />
  );
}


