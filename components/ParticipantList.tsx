'use client';

import { useMemo, useCallback } from 'react';
import type { Participant, RemoteParticipant } from 'livekit-client';
import {
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useMaybeLayoutContext,
} from '@livekit/components-react';
import { Mic, MicOff, Video, VideoOff, User } from 'lucide-react';

const participantName = (participant: Participant | undefined | null) =>
  participant?.name || participant?.identity || 'Participant';

type ParticipantListProps = {
  className?: string;
  onClose?: () => void;
};

export function ParticipantList({ className, onClose }: ParticipantListProps) {
  const remoteParticipants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const layoutContext = useMaybeLayoutContext();

  const participants = useMemo(() => {
    const list: Participant[] = [];
    const seen = new Set<string>();
    
    // Add local participant first if it exists
    if (localParticipant) {
      const localKey = localParticipant.sid || localParticipant.identity;
      if (localKey && !seen.has(localKey)) {
        list.push(localParticipant);
        seen.add(localKey);
      }
    }
    
    // Add remote participants, skipping any duplicates
    remoteParticipants.forEach((participant) => {
      const key = participant.sid || participant.identity;
      if (key && !seen.has(key)) {
        list.push(participant);
        seen.add(key);
      }
    });
    
    return list;
  }, [localParticipant, remoteParticipants]);

  const handleMuteRemote = useCallback(
    async (participant: RemoteParticipant) => {
      if (!room || !room.localParticipant.permissions?.canPublish) return;

      try {
        const microphonePublication = participant.getTrackPublication('microphone');
        if (microphonePublication?.isMuted) {
          await room.localParticipant.setSubscribed(microphonePublication.trackSid, true);
          await microphonePublication.setMuted(false);
        } else {
          await microphonePublication?.setMuted(true);
        }
      } catch (error) {
        console.error('Failed to mute/unmute remote participant', error);
      }
    },
    [room],
  );

  const canManageParticipants = room?.localParticipant.permissions?.canPublish ?? false;

  return (
    <div
      className={`flex flex-col h-full min-h-0 bg-[var(--color-surface)] border-l border-[var(--color-border)] ${className ?? ''}`}
    >
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-3 sm:px-4">
        <h2 className="m-0 text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          Participants
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-2 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {participants.length}
          </span>
        </h2>
        {(layoutContext || onClose) && (
          <button
            onClick={() => {
              if (onClose) {
                onClose();
              } else if (layoutContext) {
                layoutContext.widget.dispatch?.({ msg: 'toggle_participants' });
              }
            }}
            className="bg-transparent border-none text-[var(--color-text-muted)] cursor-pointer text-2xl leading-none p-1 flex items-center justify-center hover:text-[var(--color-text-primary)] transition-colors rounded-lg hover:bg-[var(--color-surface)]-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close participants panel"
          >
            ×
          </button>
        )}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {participants.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <User className="w-8 h-8 mb-2 text-[var(--color-text-light)] opacity-50" />
            <p className="m-0 text-sm text-[var(--color-text-muted)]">
              No participants yet
            </p>
          </div>
        ) : (
          <ul className="list-none m-0 p-0">
            {participants.map((participant, index) => {
              const isLocal = participant.isLocal;
              const isSpeaking = participant.isSpeaking;
              const micEnabled = participant.isMicrophoneEnabled;
              const cameraEnabled = participant.isCameraEnabled;
              // Use sid if available, otherwise identity, with index as final fallback
              const uniqueKey = participant.sid || participant.identity || `participant-${index}`;

              return (
                <li
                  key={uniqueKey}
                  className={`px-3 py-3 sm:px-4 border-b border-[var(--color-border)] last:border-b-0 transition-colors ${
                    isSpeaking ? 'bg-primary/5' : 'bg-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                          isLocal
                            ? 'bg-primary text-white'
                            : 'bg-[var(--color-background-alt)] text-[var(--color-text-primary)] border border-[var(--color-border)]'
                        }`}
                      >
                        {participantName(participant)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[var(--color-text-primary)] overflow-hidden text-ellipsis whitespace-nowrap">
                            {participantName(participant)}
                          </span>
                          {isLocal && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-primary text-white flex-shrink-0">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                          <span className="flex items-center gap-1">
                            {micEnabled ? (
                              <Mic className="w-3 h-3" />
                            ) : (
                              <MicOff className="w-3 h-3" />
                            )}
                            <span className="hidden sm:inline">{micEnabled ? 'Mic on' : 'Mic off'}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            {cameraEnabled ? (
                              <Video className="w-3 h-3" />
                            ) : (
                              <VideoOff className="w-3 h-3" />
                            )}
                            <span className="hidden sm:inline">{cameraEnabled ? 'Camera on' : 'Camera off'}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    {isSpeaking && (
                      <div
                        className="w-2 h-2 rounded-full bg-primary flex-shrink-0"
                        style={{
                          animation: 'lk-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        }}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ParticipantList;
