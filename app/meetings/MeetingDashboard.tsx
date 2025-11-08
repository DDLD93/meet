'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import MeetingTable from '@/components/MeetingTable';

type MeetingSummary = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  isPublic: boolean;
  isInstant: boolean;
  startTime: string;
  endTime: string;
  roomName: string;
  joinUrl: string;
  participants: string[];
};

type ScheduleFormState = {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isPublic: boolean;
  password: string;
  participants: string;
};

const PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$#!';

const generatePassword = (length = 10) => {
  try {
    if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
      const buffer = new Uint8Array(length);
      globalThis.crypto.getRandomValues(buffer);
      return Array.from(buffer, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]).join(
        '',
      );
    }
    throw new Error('crypto unavailable');
  } catch {
    return Math.random().toString(36).slice(2, 2 + length);
  }
};

const createDefaultFormState = (): ScheduleFormState => ({
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  isPublic: true,
  password: generatePassword(),
  participants: '',
});

const normalizeParticipants = (value: string) =>
  value
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

export default function MeetingDashboard() {
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<ScheduleFormState>(createDefaultFormState);
  const [creating, setCreating] = useState(false);
  const [lastCreatedLink, setLastCreatedLink] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const inputClass =
    'w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus-visible:border-sky-400/60';
  const labelClass = 'text-sm font-medium text-white/80';
  const primaryButtonClass =
    'rounded-xl border border-sky-500/40 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-100 transition-colors duration-200 hover:bg-sky-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/40';
  const regeneratePassword = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      password: generatePassword(),
    }));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/meetings');
      if (!response.ok) {
        throw new Error('Failed to fetch meetings');
      }

      const data = (await response.json()) as { meetings: MeetingSummary[] };
      setMeetings(
        data.meetings.map((meeting) => ({
          ...meeting,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh meetings.');
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleInstantMeeting = useCallback(async () => {
    const title = window.prompt('Instant meeting title', 'Instant Meeting');
    if (!title) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/meetings/instant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          isPublic: true,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Failed to create instant meeting');
      }

      const data = await response.json();
      const meeting = data.meeting as MeetingSummary;
      setMeetings((prev) => [meeting, ...prev]);
      setLastCreatedLink(data.meeting.joinUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create instant meeting.');
    } finally {
      setCreating(false);
    }
  }, []);

  const handleFormChange = useCallback(
    (field: keyof ScheduleFormState, value: string | boolean) => {
      setFormState((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [],
  );

  const handleScheduleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!formState.isPublic && normalizeParticipants(formState.participants).length === 0) {
        setError('Private meetings require at least one participant email.');
        return;
      }

      setCreating(true);
      setError(null);

      try {
        const response = await fetch('/api/meetings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: formState.title,
            description: formState.description || undefined,
            startTime: formState.startTime,
            endTime: formState.endTime,
            isPublic: formState.isPublic,
            password: formState.password,
            participants: normalizeParticipants(formState.participants),
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? 'Failed to schedule meeting');
        }

        const data = await response.json();
        const meeting = data.meeting as MeetingSummary;
        setMeetings((prev) => [meeting, ...prev]);
        setLastCreatedLink(data.meeting.joinUrl);
        setFormState(createDefaultFormState());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to schedule meeting.');
      } finally {
        setCreating(false);
      }
    },
    [formState],
  );

  const canSchedule = useMemo(() => {
    if (!formState.title.trim()) return false;
    if (!formState.startTime || !formState.endTime) return false;
    if (!formState.password || formState.password.length < 6) return false;
    if (!formState.isPublic && normalizeParticipants(formState.participants).length === 0) {
      return false;
    }
    return true;
  }, [formState]);

  return (
    <div className="flex flex-col gap-6 text-white">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-inner sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.4em] text-sky-300/70">Control center</p>
          <h1 className="text-3xl font-semibold text-white">Meetings dashboard</h1>
          <p className="text-sm text-white/70">
            Schedule meetings, launch instant sessions, and manage join links.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={refresh}
            className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-white/40"
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh list'}
          </button>
          <button
            type="button"
            onClick={handleInstantMeeting}
            className="rounded-xl border border-sky-500/40 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-100 transition-colors duration-200 hover:bg-sky-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/40"
            disabled={creating}
          >
            Start instant meeting
          </button>
        </div>
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-inner">
        <h2 className="text-lg font-semibold text-white">Schedule meeting</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleScheduleSubmit} autoComplete="off">
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={formState.title}
              onChange={(event) => handleFormChange('title', event.target.value)}
              className={inputClass}
              required
              placeholder="Weekly Sync"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Password</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formState.password}
                onChange={(event) => handleFormChange('password', event.target.value)}
                className={inputClass}
                minLength={6}
                required
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={regeneratePassword}
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80"
                title="Generate a new password"
              >
                New
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Start time</label>
            <input
              type="datetime-local"
              value={formState.startTime}
              onChange={(event) => handleFormChange('startTime', event.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>End time</label>
            <input
              type="datetime-local"
              value={formState.endTime}
              onChange={(event) => handleFormChange('endTime', event.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div className="md:col-span-2 flex flex-col gap-2">
            <label className={labelClass}>Description</label>
            <textarea
              value={formState.description}
              onChange={(event) => handleFormChange('description', event.target.value)}
              className="min-h-[80px] w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus-visible:border-sky-400/60"
              placeholder="Add agenda or notes (optional)"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Meeting type</label>
            <select
              value={formState.isPublic ? 'public' : 'private'}
              onChange={(event) => handleFormChange('isPublic', event.target.value === 'public')}
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white focus-visible:border-sky-400/60"
            >
              <option value="public">Public (password only)</option>
              <option value="private">Private (password + email allowlist)</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Participants (comma separated)</label>
            <textarea
              value={formState.participants}
              onChange={(event) => handleFormChange('participants', event.target.value)}
              className="min-h-[80px] w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-white/40 focus-visible:border-sky-400/60"
              placeholder="alice@example.com, bob@example.com"
              disabled={formState.isPublic}
            />
            {!formState.isPublic && (
              <p className="text-xs text-white/50">
                Private meetings require at least one participant email.
              </p>
            )}
          </div>
          <div className="md:col-span-2 flex items-center justify-end gap-3">
            <button type="submit" className={primaryButtonClass} disabled={creating || !canSchedule}>
              {creating ? 'Scheduling…' : 'Schedule meeting'}
            </button>
          </div>
        </form>
        {error && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </section>

      {lastCreatedLink && (
        <section className="rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <p className="font-medium">Meeting created successfully</p>
          <p className="mt-2 break-all">
            Shareable join link:{' '}
            <a
              href={lastCreatedLink}
              className="font-medium text-white underline decoration-dotted underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              {lastCreatedLink}
            </a>
          </p>
        </section>
      )}

      <MeetingTable meetings={meetings} initialized={initialized} loading={loading} />
    </div>
  );
}

