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
      className={`flex flex-col h-full min-h-0 bg-zinc-950 border-l border-zinc-800 ${className ?? ''}`}
    >
      <header className="flex items-center justify-between border-b border-zinc-800 px-3 sm:px-4 py-2.5 sm:py-3">
        <h2 className="m-0 text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
          Participants
          <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
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
            className="bg-transparent border-none text-gray-400 cursor-pointer text-xl leading-none p-1.5 flex items-center justify-center hover:text-white transition-colors rounded-lg hover:bg-zinc-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/80"
            aria-label="Close participants panel"
          >
            ×
          </button>
        )}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {participants.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <User className="w-8 h-8 mb-2 text-gray-600 opacity-50" />
            <p className="m-0 text-xs sm:text-sm text-gray-400">
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
                  className={`px-3 sm:px-4 py-2.5 sm:py-3 border-b border-zinc-800 last:border-b-0 transition-colors ${
                    isSpeaking ? 'bg-red-500/5' : 'bg-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0 ${
                          isLocal
                            ? 'bg-red-600 text-white'
                            : 'bg-zinc-900 text-white border border-zinc-700'
                        }`}
                      >
                        {participantName(participant)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                          <span className="text-xs sm:text-sm font-medium text-white overflow-hidden text-ellipsis whitespace-nowrap">
                            {participantName(participant)}
                          </span>
                          {isLocal && (
                            <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold uppercase bg-red-600/20 text-red-400 border border-red-500/30 flex-shrink-0">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            {micEnabled ? (
                              <Mic className="w-3 h-3 text-green-400" />
                            ) : (
                              <MicOff className="w-3 h-3 text-gray-500" />
                            )}
                            <span className="hidden sm:inline">{micEnabled ? 'Mic on' : 'Mic off'}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            {cameraEnabled ? (
                              <Video className="w-3 h-3 text-green-400" />
                            ) : (
                              <VideoOff className="w-3 h-3 text-gray-500" />
                            )}
                            <span className="hidden sm:inline">{cameraEnabled ? 'Camera on' : 'Camera off'}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    {isSpeaking && (
                      <div
                        className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"
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
