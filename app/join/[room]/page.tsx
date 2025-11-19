'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import { Nav } from '@/components/Nav';
import JoinClient from './JoinClient';

type MeetingSummary = {
  id: string;
  title: string | null;
  status: string;
  roomName: string;
};

export default function JoinPage() {
  const params = useParams<{ room: string }>();
  const searchParams = useSearchParams();

  const roomParam = params?.room ?? '';
  const roomName = useMemo(() => {
    try {
      return decodeURIComponent(roomParam);
    } catch {
      return roomParam;
    }
  }, [roomParam]);

  const [meeting, setMeeting] = useState<MeetingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchMeeting = async () => {
      if (!roomName) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const response = await fetch(
          `/api/meetings?roomName=${encodeURIComponent(roomName)}&limit=1`,
          {
            headers: {
              Accept: 'application/json',
            },
          },
        );

        if (!response.ok) {
          throw new Error('Failed to load meeting details.');
        }

        const data = (await response.json()) as { meetings: MeetingSummary[] };
        const match = data.meetings[0] ?? null;

        if (cancelled) {
          return;
        }

        if (!match) {
          setNotFound(true);
          setMeeting(null);
        } else {
          setMeeting(match);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Unable to load meeting details.';
          setError(message);
          setMeeting(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchMeeting();

    return () => {
      cancelled = true;
    };
  }, [roomName]);

  const initialEmail = searchParams?.get('email') ?? '';
  const initialName = searchParams?.get('name') ?? '';

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
            <p className="text-sm text-gray-400">Loading meeting…</p>
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
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 sm:px-8 lg:px-12 py-24 sm:py-32">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-10 shadow-2xl">
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (notFound || !meeting) {
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
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white">
              Meeting not found or is no longer available.
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <JoinClient
      meetingId={meeting.id}
      meetingTitle={meeting.title}
      meetingStatus={meeting.status}
      roomName={roomName}
      initialEmail={initialEmail}
      initialName={initialName}
    />
  );
}

