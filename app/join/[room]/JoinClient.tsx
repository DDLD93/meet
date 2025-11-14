'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import MediaPreview from '@/components/MediaPreview';
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-background)] px-4 py-8 sm:py-12 lg:py-16">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-background via-background-alt to-background" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 opacity-30 blur-3xl filter" aria-hidden="true">
        <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.1),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(0,0,0,0.05),_transparent_40%)]" />
      </div>
      <div className="relative w-full max-w-5xl rounded-2xl sm:rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl p-4 sm:p-6 lg:p-8">
        <div className="mb-6 sm:mb-8 space-y-4 sm:space-y-5 text-center">
          <div className="flex flex-col items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              Join
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[var(--color-text-primary)]">
              {meetingTitle ?? 'Meeting'}
            </h1>
            <div className="flex flex-col items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
              <span className="rounded-full bg-[var(--color-background-alt)] px-3 py-1 font-mono text-xs sm:text-sm border border-[var(--color-border)]">
                Room: {roomName}
              </span>
              <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                {statusDescription(meetingStatus)}
              </span>
            </div>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-8">
          <form
            className="space-y-4 sm:space-y-5 rounded-xl sm:rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-alt)] p-4 sm:p-5 lg:p-6"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
                  Room name
                </label>
                <div className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-[var(--color-text-secondary)] font-mono">
                  {room}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
                  Display name
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[var(--color-background-alt)]"
                  value={name}
                  onChange={(event) => !isRejoining && setName(event.target.value)}
                  placeholder="How should we introduce you?"
                  required
                  disabled={disabled || isRejoining}
                  readOnly={isRejoining}
                  autoComplete="name"
                />
                {isRejoining && (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Your name is saved for this meeting and cannot be changed.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
                  Email address
                </label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[var(--color-background-alt)]"
                  value={email}
                  onChange={(event) => !isRejoining && setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={disabled || isRejoining}
                  readOnly={isRejoining}
                  autoComplete="email"
                />
                {isRejoining && (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Your email is saved for this meeting and cannot be changed.
                  </p>
                )}
              </div>
            </div>
            {error && (
              <div className="rounded-lg border border-error/40 bg-error/10 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-error">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="group relative flex w-full items-center justify-center gap-2 rounded-lg sm:rounded-xl border border-primary/50 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary/20 hover:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 disabled:cursor-not-allowed disabled:border-[var(--color-border)] disabled:bg-[var(--color-background-alt)] disabled:text-[var(--color-text-muted)]"
              disabled={
                disabled ||
                loading ||
                !name.trim() ||
                !email.trim()
              }
            >
              {loading ? 'Connecting…' : isRejoining ? 'Rejoin meeting' : 'Join meeting'}
            </button>
          </form>
          <MediaPreview className="h-full" />
        </div>
      </div>
    </div>
  );
}

