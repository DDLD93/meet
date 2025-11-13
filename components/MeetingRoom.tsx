'use client';

import { useState } from 'react';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';

import ChatPanel from './ChatPanel';
import ControlsBar from './ControlsBar';
import ParticipantList from './ParticipantList';

type MeetingRoomProps = {
  token: string;
  serverUrl: string;
  meetingId: string;
  meetingTitle?: string | null;
  roomName?: string | null;
  persistChat?: boolean;
};

export function MeetingRoom({
  token,
  serverUrl,
  meetingId,
  meetingTitle,
  roomName,
  persistChat = true,
}: MeetingRoomProps) {
  const [activeMobilePanel, setActiveMobilePanel] = useState<'participants' | 'chat'>(
    'participants',
  );

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      video
      audio
      connect
      data-lk-theme="default"
      className="relative flex min-h-screen w-full flex-col bg-slate-950 text-white"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.26),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.22),_transparent_40%)]" />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6 md:px-6 lg:flex-row lg:gap-6">
        <section className="flex min-h-0 flex-1 flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <header className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.38em] text-sky-200/70">
                Live session
              </p>
              <h1 className="text-2xl font-semibold text-white">
                {meetingTitle ?? 'Untitled meeting'}
              </h1>
              {roomName ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
                  Room: <span className="font-mono text-white/90">{roomName}</span>
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-sky-300" />
              Secure • Encrypted
            </div>
          </header>
          <div className="relative flex-1 min-h-[260px] overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-inner">
            <VideoConference />
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 shadow-inner">
            <ControlsBar meetingId={meetingId} />
          </div>
        </section>

        <aside className="hidden w-full max-w-xs flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl lg:flex xl:max-w-sm">
          <ParticipantList />
          <ChatPanel
            meetingId={meetingId}
            persistMessages={persistChat}
            className="flex min-h-0 flex-1 flex-col"
          />
        </aside>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-6 lg:hidden">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-inner backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveMobilePanel('participants')}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors duration-200 ${
                activeMobilePanel === 'participants'
                  ? 'border-sky-400/60 bg-sky-500/30 text-white shadow'
                  : 'border-white/10 bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Participants
            </button>
            <button
              type="button"
              onClick={() => setActiveMobilePanel('chat')}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors duration-200 ${
                activeMobilePanel === 'chat'
                  ? 'border-sky-400/60 bg-sky-500/30 text-white shadow'
                  : 'border-white/10 bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Chat
            </button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
            {activeMobilePanel === 'participants' ? (
              <ParticipantList className="min-h-[220px]" />
            ) : (
              <ChatPanel
                meetingId={meetingId}
                persistMessages={persistChat}
                className="min-h-[220px]"
              />
            )}
          </div>
        </div>
      </div>
    </LiveKitRoom>
  );
}

export default MeetingRoom;

