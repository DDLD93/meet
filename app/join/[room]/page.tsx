'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FileX, Home, ArrowLeft } from 'lucide-react';

import { Nav } from '@/components/Nav';
import { Button } from '@/components/ui/button';
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
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4 sm:px-6 lg:px-12 py-4 sm:py-24">
          <div className="w-full max-w-2xl">
            <div className="sm:bg-white/5 sm:backdrop-blur-xl sm:border sm:border-white/10 rounded-2xl p-6 sm:p-10 lg:p-12 sm:shadow-2xl">
              <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8">
                {/* Icon */}
                <div className="flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-red-500/10 border-2 border-red-500/30">
                  <FileX className="w-10 h-10 sm:w-12 sm:h-12 text-red-500" />
                </div>

                {/* Content */}
                <div className="space-y-3 sm:space-y-4">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                    Meeting Not Found
                  </h1>
                  <p className="text-sm sm:text-base text-gray-400 max-w-md mx-auto">
                    This meeting is no longer available or doesn&apos;t exist.
                  </p>
                  <div className="mt-4 p-3 sm:p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <p className="text-xs sm:text-sm text-gray-300">
                      Meeting not found or is no longer available.
                    </p>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  <Button
                    asChild
                    size="lg"
                    className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 bg-red-600 text-white hover:bg-red-500 hover:shadow-[0_20px_40px_rgba(239,68,68,0.4)] transition-all duration-200"
                  >
                    <Link href="/" className="flex items-center justify-center gap-2">
                      <Home className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Go Home</span>
                    </Link>
                  </Button>
                  <Button
                    onClick={() => window.history.back()}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 border-2 border-zinc-800 bg-zinc-900/50 text-white hover:bg-zinc-800 hover:border-zinc-700"
                  >
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Go Back</span>
                  </Button>
                </div>
              </div>
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

