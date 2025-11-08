'use client';

import { useCallback, useMemo, useState } from 'react';

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

type MeetingTableProps = {
  meetings: MeetingSummary[];
  initialized: boolean;
  loading: boolean;
};

const statusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40';
    case 'SCHEDULED':
      return 'bg-sky-500/20 text-sky-200 border border-sky-400/40';
    case 'ENDED':
      return 'bg-white/10 text-white/60 border border-white/20';
    default:
      return 'bg-white/10 text-white/60 border border-white/20';
  }
};

export default function MeetingTable({ meetings, initialized, loading }: MeetingTableProps) {
  const [copyState, setCopyState] = useState<string | null>(null);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [],
  );

  const handleCopy = useCallback(async (url: string, meetingId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState(meetingId);
      setTimeout(() => setCopyState(null), 2000);
    } catch (error) {
      console.error('Failed to copy join link', error);
    }
  }, []);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 shadow-inner">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">All meetings</h2>
        <span className="text-xs font-medium uppercase tracking-wide text-white/60">
          {initialized ? `${meetings.length} total` : 'Loading…'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/80">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
            <tr>
              <th scope="col" className="px-6 py-3 font-semibold">Title</th>
              <th scope="col" className="px-6 py-3 font-semibold">Status</th>
              <th scope="col" className="px-6 py-3 font-semibold">Type</th>
              <th scope="col" className="px-6 py-3 font-semibold">Start</th>
              <th scope="col" className="px-6 py-3 font-semibold">End</th>
              <th scope="col" className="px-6 py-3 font-semibold">Join link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-white/5 text-sm">
            {!initialized ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-6 text-center text-sm text-white/50"
                >
                  {loading ? 'Loading meetings…' : 'Preparing meetings…'}
                </td>
              </tr>
            ) : meetings.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-6 text-center text-sm text-white/50"
                >
                  No meetings yet. Schedule one above to get started.
                </td>
              </tr>
            ) : (
              meetings.map((meeting) => (
                <tr key={meeting.id} className="transition-colors duration-200 hover:bg-white/10">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{meeting.title}</div>
                    {meeting.description && (
                      <div className="mt-1 text-xs text-white/60">
                        {meeting.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColor(
                        meeting.status,
                      )}`}
                    >
                      {meeting.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white">
                      {meeting.isInstant ? 'Instant' : 'Scheduled'}
                    </div>
                    <div className="text-xs text-white/60">
                      {meeting.isPublic ? 'Public' : 'Private'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white/80">
                    {formatter.format(new Date(meeting.startTime))}
                  </td>
                  <td className="px-6 py-4 text-white/80">
                    {formatter.format(new Date(meeting.endTime))}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <a
                        href={meeting.joinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-sky-300 hover:text-sky-200"
                      >
                        {meeting.joinUrl}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(meeting.joinUrl, meeting.id)}
                        className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs font-medium text-white transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80"
                      >
                        {copyState === meeting.id ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

