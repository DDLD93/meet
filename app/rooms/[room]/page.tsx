'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import MeetingRoom from '@/components/MeetingRoom';
import {
  lookupMeetingIdForRoom,
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
      router.replace(`/join/${encodeURIComponent(roomName)}`);
    }
  }, [loading, meetingId, roomName, router, session]);

  if (!roomName) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          Missing room identifier.
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          Connecting you to the meeting…
        </div>
      </main>
    );
  }

  if (!meetingId || !session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 py-12 text-center text-white/80">
        <div className="max-w-sm rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-5 py-4 text-sm text-yellow-100">
          We couldn&apos;t find an active meeting session. Please re-enter the meeting details.
        </div>
        <button
          type="button"
          onClick={() => router.replace(`/join/${encodeURIComponent(roomName)}`)}
          className="rounded-lg border border-sky-500/50 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-100 transition-colors duration-200 hover:bg-sky-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80"
        >
          Go back to join page
        </button>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 py-12 text-center text-white/80">
        <div className="max-w-sm rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-100">
          {error}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => refresh(true)}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => router.replace(`/join/${encodeURIComponent(roomName)}`)}
            className="rounded-lg border border-sky-500/50 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-100 transition-colors duration-200 hover:bg-sky-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80"
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


