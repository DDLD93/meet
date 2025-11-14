'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import MeetingRoom from '@/components/MeetingRoom';
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
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4 sm:px-6 py-8 sm:py-12">
        <div className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          Missing room identifier.
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4 sm:px-6 py-8 sm:py-12">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
          Connecting you to the meeting…
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
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-background)] px-4 sm:px-6 py-8 sm:py-12 text-center">
        <div className="max-w-sm rounded-lg border border-warning/40 bg-warning/10 px-4 sm:px-5 py-3 sm:py-4 text-sm text-warning">
          We couldn&apos;t find an active meeting session. {credentials ? 'You can rejoin using your saved credentials.' : 'Please re-enter the meeting details.'}
        </div>
        <button
          type="button"
          onClick={redirectToLobby}
          className="rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary/20 hover:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80"
        >
          {credentials ? 'Rejoin meeting' : 'Go back to join page'}
        </button>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-background)] px-4 sm:px-6 py-8 sm:py-12 text-center">
        <div className="max-w-sm rounded-lg border border-error/40 bg-error/10 px-4 sm:px-5 py-3 sm:py-4 text-sm text-error">
          {error}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => refresh(true)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-all duration-200 hover:bg-[var(--color-surface)]-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80"
          >
            Try again
          </button>
          <button
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
            className="rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary/20 hover:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80"
          >
            Return to join
          </button>
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


