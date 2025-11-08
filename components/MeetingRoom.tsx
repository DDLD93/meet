'use client';

import { LiveKitRoom, VideoConference } from '@livekit/components-react';

import ChatPanel from './ChatPanel';
import ControlsBar from './ControlsBar';
import ParticipantList from './ParticipantList';

type MeetingRoomProps = {
  token: string;
  serverUrl: string;
  meetingId: string;
  meetingTitle?: string | null;
  persistChat?: boolean;
};

export function MeetingRoom({
  token,
  serverUrl,
  meetingId,
  meetingTitle,
  persistChat = true,
}: MeetingRoomProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      video
      audio
      connect
      data-lk-theme="default"
      className="relative flex h-screen w-full items-stretch"
    >
      <div className="flex h-full w-full flex-col gap-6 px-6 py-6 lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl border border-white/10 bg-[var(--surface-elevated)]/90 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <header className="flex flex-col items-start justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.4em] text-sky-300/70">
                Live session
              </p>
              <h1 className="text-2xl font-semibold text-white">
                {meetingTitle ?? 'Untitled meeting'}
              </h1>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-sky-300" />
              Secure • Encrypted
            </div>
          </header>
          <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-white/5 bg-black/30 shadow-inner">
            <VideoConference />
          </div>
          <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 shadow-inner">
            <ControlsBar />
          </div>
        </div>
        <aside className="flex w-full shrink-0 flex-col gap-4 rounded-2xl border border-white/10 bg-[var(--surface-panel)] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl lg:w-96">
          <ParticipantList />
          <ChatPanel meetingId={meetingId} persistMessages={persistChat} />
        </aside>
      </div>
    </LiveKitRoom>
  );
}

export default MeetingRoom;

