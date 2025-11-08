'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import MeetingRoom from '@/components/MeetingRoom';

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

type TokenResponse = {
  token: string;
  livekitUrl: string;
  roomName: string;
  meeting: {
    id: string;
    title: string | null;
    status: string;
    isPublic: boolean;
  };
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<TokenResponse | null>(null);

  const searchParams = useSearchParams();

  const disabled = useMemo(() => meetingStatus === 'ENDED', [meetingStatus]);

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
        console.log({tokenPayload})

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

        setSession({
          token: tokenValue,
          livekitUrl: livekitUrlValue,
          roomName:
            typeof tokenPayload.roomName === 'string' && tokenPayload.roomName.length > 0
              ? tokenPayload.roomName
              : roomName,
          meeting: {
            id:
              typeof meetingPayload.id === 'string' && meetingPayload.id.length > 0
                ? meetingPayload.id
                : meetingId,
            title:
              typeof meetingPayload.title === 'string' || meetingPayload.title === null
                ? (meetingPayload.title as string | null)
                : meetingTitle ?? null,
            status:
              typeof meetingPayload.status === 'string' && meetingPayload.status.length > 0
                ? meetingPayload.status
                : meetingStatus,
            isPublic:
              typeof meetingPayload.isPublic === 'boolean'
                ? meetingPayload.isPublic
                : isPublic,
          },
        });

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
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to join meeting.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [disabled, email, meetingId, meetingTitle, name, password, roomName, searchParams],
  );

  if (session) {
    return (
      <MeetingRoom
        token={session.token}
        serverUrl={session.livekitUrl}
        meetingId={session.meeting.id}
        meetingTitle={session.meeting.title ?? meetingTitle}
      />
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950" />
      <div className="absolute inset-0 -z-10 opacity-40 blur-3xl filter">
        <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.18),_transparent_40%)]" />
      </div>
      <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-[var(--surface-panel)]/95 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="mb-8 space-y-3 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-sky-200">
            Join
          </span>
          <h1 className="text-3xl font-semibold text-white">
            {meetingTitle ?? 'Meeting'}
          </h1>
          <div className="flex flex-col items-center gap-1 text-sm text-white/70">
            <span className="rounded-full bg-white/5 px-3 py-1 font-mono text-xs">
              Room: {roomName}
            </span>
            <span className="text-xs uppercase tracking-[0.3em] text-white/50">
              {statusDescription(meetingStatus)}
            </span>
          </div>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
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
      </div>
    </div>
  );
}

