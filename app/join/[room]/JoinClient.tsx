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
  isPublic: boolean;
  roomName: string;
  initialPassword?: string;
  initialEmail?: string;
  initialName?: string;
};

const statusDescription = (status: string) => {
  switch (status) {
    case 'SCHEDULED':
      return 'This meeting is scheduled and will start soon.';
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
  isPublic,
  roomName,
  initialPassword = '',
  initialEmail = '',
  initialName = '',
}: JoinClientProps) {
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState(initialPassword);
  const [room, setRoom] = useState(roomName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  const disabled = useMemo(() => meetingStatus === 'ENDED', [meetingStatus]);

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

  useEffect(() => {
    const storedCredentials = loadStoredCredentials(meetingId);
    if (!storedCredentials) {
      return;
    }
    if (!initialName && storedCredentials.name) {
      setName(storedCredentials.name);
    }
    if (!initialEmail && storedCredentials.email) {
      setEmail(storedCredentials.email);
    }
    if (!initialPassword && storedCredentials.password) {
      setPassword(storedCredentials.password);
    }
  }, [initialEmail, initialName, initialPassword, meetingId]);

  useEffect(() => {
    const credentials: StoredMeetingCredentials = {
      meetingId,
      roomName,
      meetingTitle,
      name,
      email: email || undefined,
      password,
    };
    persistStoredCredentials(credentials);
  }, [email, meetingId, meetingTitle, name, password, roomName]);

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
            password,
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
          password,
        };

        const storedSession = buildSessionFromResponse(credentialsForSession, typedPayload);
        persistStoredSession(storedSession);

        if (typeof window !== 'undefined') {
          const sanitized = new URLSearchParams(searchParams.toString());
          sanitized.delete('password');
          sanitized.delete('email');
          sanitized.delete('name');
          const query = sanitized.toString();
          window.history.replaceState(
            null,
            '',
            `${window.location.pathname}${query ? `?${query}` : ''}`,
          );
        }

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
      isPublic,
      meetingId,
      meetingStatus,
      meetingTitle,
      name,
      password,
      roomName,
      router,
      searchParams,
    ],
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:py-16">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 opacity-40 blur-3xl filter" aria-hidden="true">
        <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.18),_transparent_40%)]" />
      </div>
      <div className="relative w-full max-w-5xl rounded-3xl border border-white/10 bg-[var(--surface-panel)]/95 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
        <div className="mb-8 space-y-5 text-center sm:mb-10">
          <div className="flex flex-col items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.4em] text-sky-200">
              Join
            </span>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              {meetingTitle ?? 'Meeting'}
            </h1>
            <div className="flex flex-col items-center gap-1 text-sm text-white/70">
              <span className="rounded-full bg-white/5 px-3 py-1 font-mono text-xs sm:text-sm">
                Room: {roomName}
              </span>
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">
                {statusDescription(meetingStatus)}
              </span>
            </div>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-8">
          <form
            className="space-y-5 rounded-2xl border border-white/10 bg-black/30 p-5 shadow-inner sm:p-6"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/90">
                  Room name
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/40 px-4 py-3 text-sm text-white/80 focus-visible:border-sky-400/60"
                  value={room}
                  readOnly
                  disabled
                />
                <p className="text-xs text-white/40">
                  This room is pre-configured. Contact the host if something looks off.
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/90">
                  Display name
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus-visible:border-sky-400/60"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="How should we introduce you?"
                  required
                  disabled={disabled}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/90">
                  Email address
                </label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus-visible:border-sky-400/60"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required={!isPublic}
                  disabled={disabled}
                  autoComplete="email"
                />
                {isPublic && (
                  <p className="text-xs text-white/50">
                    Email is optional for public meetings.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-white/90">
                  Meeting password
                </label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus-visible:border-sky-400/60"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter the meeting password"
                  required
                  disabled={disabled}
                  autoComplete="current-password"
                />
              </div>
            </div>
            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="group relative flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/50 bg-sky-500/20 px-4 py-3 text-sm font-semibold text-sky-100 transition-all duration-200 hover:bg-sky-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/40"
              disabled={
                disabled ||
                loading ||
                !password ||
                !name.trim() ||
                (!email.trim() && !isPublic)
              }
            >
              {loading ? 'Connecting…' : 'Join meeting'}
            </button>
          </form>
          <MediaPreview className="h-full" />
        </div>
      </div>
    </div>
  );
}

