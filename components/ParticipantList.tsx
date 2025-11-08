'use client';

import { useMemo } from 'react';
import type { Participant } from 'livekit-client';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';

const participantName = (participant: Participant | undefined | null) =>
  participant?.name || participant?.identity || 'Participant';

const participantMicrophoneStatus = (participant: Participant) =>
  participant.isMicrophoneEnabled ? 'Mic on' : 'Mic muted';

const participantCameraStatus = (participant: Participant) =>
  participant.isCameraEnabled ? 'Camera on' : 'Camera off';

export function ParticipantList() {
  const remoteParticipants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const participants = useMemo(() => {
    const list: Participant[] = [];
    if (localParticipant) {
      list.push(localParticipant);
    }
    return list.concat(remoteParticipants);
  }, [localParticipant, remoteParticipants]);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/90 tracking-wide">
          Participants
          <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/70">
            {participants.length}
          </span>
        </h2>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 text-sm">
        {participants.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-xs text-white/50">
            No one is here yet. Invite your team to join.
          </div>
        ) : (
          <ul className="space-y-2">
            {participants.map((participant, index) => {
              const isLocal = participant.isLocal;
              const isSpeaking = participant.isSpeaking;
              return (
                <li
                  key={`${participant.sid ?? participant.identity ?? 'participant'}-${index}`}
                  className={`rounded-xl border px-3 py-3 transition-colors duration-200 ${
                    isLocal
                      ? 'border-sky-500/40 bg-sky-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <span>{participantName(participant)}</span>
                      {isLocal && (
                        <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
                          You
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isSpeaking ? 'text-emerald-300' : 'text-white/50'
                      }`}
                    >
                      {isSpeaking ? 'Speaking' : 'Idle'}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-white/60">
                    <span>{participantMicrophoneStatus(participant)}</span>
                    <span aria-hidden className="text-white/30">
                      •
                    </span>
                    <span>{participantCameraStatus(participant)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

export default ParticipantList;

