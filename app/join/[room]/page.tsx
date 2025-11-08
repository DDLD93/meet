'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import JoinClient from './JoinClient';

type MeetingSummary = {
  id: string;
  title: string | null;
  status: string;
  isPublic: boolean;
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

  const initialPassword = searchParams?.get('password') ?? '';
  const initialEmail = searchParams?.get('email') ?? '';
  const initialName = searchParams?.get('name') ?? '';

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
        <p className="text-sm text-slate-500">Loading meeting…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      </main>
    );
  }

  if (notFound || !meeting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Meeting not found or is no longer available.
        </div>
      </main>
    );
  }

  return (
    <JoinClient
      meetingId={meeting.id}
      meetingTitle={meeting.title}
      meetingStatus={meeting.status}
      isPublic={meeting.isPublic}
      roomName={roomName}
      initialPassword={initialPassword}
      initialEmail={initialEmail}
      initialName={initialName}
    />
  );
}

