'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import MediaPreview from '@/components/MediaPreview';
import { Nav } from '@/components/Nav';
import { ShareButton } from '@/components/ShareButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  buildSessionFromResponse,
  ensureActiveSession,
  isSessionExpired,
  loadStoredCredentials,
  loadStoredSession,
  persistStoredCredentials,
  persistStoredSession,
  type StoredMeetingCredentials,
  type TokenResponsePayload,
} from '@/lib/meetingSession';

type JoinClientProps = {
  meetingId: string;
  meetingTitle?: string | null;
  meetingStatus: string;
  roomName: string;
  initialEmail?: string;
  initialName?: string;
};

const statusDescription = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'This meeting is currently active.';
    case 'ENDED':
      return 'This meeting has ended.';
    default:
      return '';
  }
};

export default function JoinClient({
  meetingId,
  meetingTitle,
  meetingStatus,
  roomName,
  initialEmail = '',
  initialName = '',
}: JoinClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Generate share URL
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/join/${encodeURIComponent(roomName)}`
    : '';

  // Read email and name from query params, fallback to initial props
  const emailFromQuery = searchParams?.get('email') ?? '';
  const nameFromQuery = searchParams?.get('name') ?? '';
  
  const [email, setEmail] = useState(emailFromQuery || initialEmail);
  const [name, setName] = useState(nameFromQuery || initialName);
  const [room, setRoom] = useState(roomName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = useMemo(() => meetingStatus === 'ENDED', [meetingStatus]);

  // Check if user is rejoining (has stored credentials for this meeting)
  const isRejoining = useMemo(() => {
    const stored = loadStoredCredentials(meetingId);
    return !!(stored && stored.email && stored.name);
  }, [meetingId]);

  // If rejoining, use stored credentials and make them immutable
  useEffect(() => {
    if (isRejoining) {
      const stored = loadStoredCredentials(meetingId);
      if (stored) {
        if (stored.email && !emailFromQuery) {
          setEmail(stored.email);
        }
        if (stored.name && !nameFromQuery) {
          setName(stored.name);
        }
      }
    }
  }, [isRejoining, meetingId, emailFromQuery, nameFromQuery]);

  useEffect(() => {
    setRoom(roomName);
  }, [roomName]);

  useEffect(() => {
    if (meetingStatus === 'ENDED') {
      return;
    }
    let active = true;
    const attemptResume = async () => {
      const stored = loadStoredSession(meetingId);
      if (stored && !isSessionExpired(stored)) {
        router.replace(
          `/rooms/${encodeURIComponent(stored.roomName)}?meetingId=${meetingId}`,
        );
        return;
      }
      try {
        const refreshed = await ensureActiveSession(meetingId);
        if (!active || !refreshed) {
          return;
        }
        router.replace(
          `/rooms/${encodeURIComponent(refreshed.roomName)}?meetingId=${meetingId}`,
        );
      } catch {
        // Swallow errors; user can join manually.
      }
    };
    void attemptResume();
    return () => {
      active = false;
    };
  }, [meetingId, meetingStatus, router]);

  // Update URL query params when email or name changes (only if not rejoining)
  useEffect(() => {
    if (typeof window === 'undefined' || isRejoining) return;
    
    const currentParams = new URLSearchParams(window.location.search);
    const currentEmail = currentParams.get('email') ?? '';
    const currentName = currentParams.get('name') ?? '';
    
    // Only update if values actually changed
    if (email.trim() === currentEmail && name.trim() === currentName) {
      return;
    }
    
    const params = new URLSearchParams();
    if (email.trim()) {
      params.set('email', email.trim());
    }
    if (name.trim()) {
      params.set('name', name.trim());
    }
    
    const newQuery = params.toString();
    const newUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}`;
    router.replace(newUrl, { scroll: false });
  }, [email, name, router, isRejoining]);

  useEffect(() => {
    const storedCredentials = loadStoredCredentials(meetingId);
    if (!storedCredentials) {
      return;
    }
    // Only use stored credentials if query params are not set
    if (!nameFromQuery && !initialName && storedCredentials.name) {
      setName(storedCredentials.name);
    }
    if (!emailFromQuery && !initialEmail && storedCredentials.email) {
      setEmail(storedCredentials.email);
    }
  }, [emailFromQuery, initialEmail, initialName, meetingId, nameFromQuery]);

  useEffect(() => {
    const credentials: StoredMeetingCredentials = {
      meetingId,
      roomName,
      meetingTitle,
      name,
      email: email || undefined,
    };
    persistStoredCredentials(credentials);
  }, [email, meetingId, meetingTitle, name, roomName]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (disabled) {
        return;
      }

      setError(null);
      setLoading(true);

      try {
        const response = await fetch(`/api/meetings/${meetingId}/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            name,
            metadata: JSON.stringify({
              roomName,
              meetingTitle,
            }),
          }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          const message =
            body?.error ?? 'Unable to join meeting. Please try again.';
          throw new Error(message);
        }

        const tokenPayload = (await response
          .json()
          .catch(async () => {
            const fallbackText = await response.text().catch(() => '');
            console.error('Failed to parse token response', fallbackText);
            return null;
          })) as Record<string, unknown> | null;

        if (!tokenPayload || typeof tokenPayload !== 'object') {
          setError('Received an unexpected response from the server.');
          return;
        }
        const tokenValue = tokenPayload.token;
        if (typeof tokenValue !== 'string' || tokenValue.length === 0) {
          console.error('Unexpected token payload', tokenPayload);
          setError('Unable to start the meeting session right now. Please try again.');
          return;
        }

        const livekitUrlValue = tokenPayload.livekitUrl;
        if (typeof livekitUrlValue !== 'string' || livekitUrlValue.length === 0) {
          console.error('Missing LiveKit URL in token payload', tokenPayload);
          setError('Live session is currently unavailable. Please try again later.');
          return;
        }

        const meetingPayload =
          tokenPayload.meeting && typeof tokenPayload.meeting === 'object'
            ? (tokenPayload.meeting as Record<string, unknown>)
            : {};

        const typedPayload = tokenPayload as TokenResponsePayload;
        const credentialsForSession: StoredMeetingCredentials = {
          meetingId,
          roomName,
          meetingTitle,
          name,
          email: email || undefined,
        };

        const storedSession = buildSessionFromResponse(credentialsForSession, typedPayload);
        persistStoredSession(storedSession);

        router.push(
          `/rooms/${encodeURIComponent(
            typeof tokenPayload.roomName === 'string' && tokenPayload.roomName.length > 0
              ? tokenPayload.roomName
              : roomName,
          )}?meetingId=${encodeURIComponent(
            typeof meetingPayload.id === 'string' && meetingPayload.id.length > 0
              ? meetingPayload.id
              : meetingId,
          )}`,
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to join meeting.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [
      disabled,
      email,
      meetingId,
      meetingStatus,
      meetingTitle,
      name,
      roomName,
      router,
    ],
  );

  return (
    <main className="relative min-h-screen bg-black">
      {/* Navigation Bar */}
      <Nav />

      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        <div className="absolute top-0 right-0 h-[600px] w-[600px] bg-red-600/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-red-600/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 sm:px-6 lg:px-12 py-4 sm:py-16 lg:py-24">
        <div className="w-full max-w-5xl">
          <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3 text-center">
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-red-400">
                Join
              </span>
              <div className="flex items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white">
                  {meetingTitle ?? 'Meeting'}
                </h1>
                {shareUrl && (
                  <ShareButton
                    url={shareUrl}
                    title={meetingTitle || 'Meeting'}
                    text={`Join me in ${meetingTitle || 'this meeting'}`}
                    size="sm"
                    variant="ghost"
                    className="text-white hover:text-red-400"
                  />
                )}
              </div>
              {statusDescription(meetingStatus) && (
                <span className="text-[10px] sm:text-xs text-gray-400">
                  {statusDescription(meetingStatus)}
                </span>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-6">
            <div className="sm:bg-white/5 sm:backdrop-blur-xl sm:border sm:border-white/10 rounded-2xl p-4 sm:p-6 lg:p-8 sm:shadow-2xl">
              <form
                className="space-y-4"
                onSubmit={handleSubmit}
              >
                <div className="grid gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="block text-xs sm:text-sm font-semibold text-white">
                      Display name
                    </label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(event) => !isRejoining && setName(event.target.value)}
                      placeholder="How should we introduce you?"
                      required
                      disabled={disabled || isRejoining}
                      readOnly={isRejoining}
                      autoComplete="name"
                      className="h-10 sm:h-11 bg-zinc-900/50 border-2 border-zinc-800 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/30 text-sm"
                    />
                    {isRejoining && (
                      <p className="text-[10px] sm:text-xs text-gray-400">
                        Your name is saved for this meeting and cannot be changed.
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="block text-xs sm:text-sm font-semibold text-white">
                      Email address
                    </label>
                    <Input
                      type="email"
                      value={email || ''}
                      onChange={(event) => !isRejoining && setEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                      disabled={disabled || isRejoining}
                      readOnly={isRejoining}
                      autoComplete="email"
                      className="h-10 sm:h-11 bg-zinc-900/50 border-2 border-zinc-800 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/30 text-sm"
                    />
                    {isRejoining && (
                      <p className="text-[10px] sm:text-xs text-gray-400">
                        Your email is saved for this meeting and cannot be changed.
                      </p>
                    )}
                  </div>
                </div>
                {error && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  size="lg"
                  disabled={
                    disabled ||
                    loading ||
                    !name.trim() ||
                    !email.trim()
                  }
                  className="w-full h-11 sm:h-12 bg-red-600 text-white hover:bg-red-500 hover:shadow-[0_20px_40px_rgba(239,68,68,0.4)] transition-all duration-200 disabled:hover:shadow-none disabled:hover:bg-red-600 text-sm"
                >
                  {loading ? 'Connecting…' : isRejoining ? 'Rejoin meeting' : 'Join meeting'}
                </Button>
              </form>
            </div>
            <MediaPreview className="h-full" />
          </div>
        </div>
      </div>
    </main>
  );
}

