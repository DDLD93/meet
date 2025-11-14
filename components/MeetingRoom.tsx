'use client';

import React from 'react';
import { decodePassphrase } from '@/lib/client-utils';
import { DebugMode } from '@/lib/Debug';
import { KeyboardShortcuts } from '@/lib/KeyboardShortcuts';
import { RecordingIndicator } from '@/lib/RecordingIndicator';
import { SettingsMenu } from '@/lib/SettingsMenu';
import {
  formatChatMessageLinks,
  RoomContext,
  VideoConference,
} from '@livekit/components-react';
import {
  ExternalE2EEKeyProvider,
  RoomOptions,
  VideoCodec,
  VideoPresets,
  Room,
  DeviceUnsupportedError,
  RoomConnectOptions,
  RoomEvent,
  TrackPublishDefaults,
  VideoCaptureOptions,
} from 'livekit-client';
import { useRouter } from 'next/navigation';
import { useSetupE2EE } from '@/lib/useSetupE2EE';
import { useLowCPUOptimizer } from '@/lib/usePerfomanceOptimiser';
import { ParticipantList } from './ParticipantList';

const SHOW_SETTINGS_MENU = process.env.NEXT_PUBLIC_SHOW_SETTINGS_MENU == 'true';

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
  // Default to vp9 codec and high quality (can be made configurable later)
  const codec: VideoCodec = 'vp9';
  const hq = true;

  return (
    <main data-lk-theme="default" className="h-full w-full bg-[var(--color-background)]">
      <VideoConferenceComponent
        serverUrl={serverUrl}
        token={token}
        options={{ codec, hq }}
      />
    </main>
  );
}

function VideoConferenceComponent(props: {
  serverUrl: string;
  token: string;
  options: {
    hq: boolean;
    codec: VideoCodec;
  };
}) {
  const keyProvider = new ExternalE2EEKeyProvider();
  const { worker, e2eePassphrase } = useSetupE2EE();
  const e2eeEnabled = !!(e2eePassphrase && worker);

  const [e2eeSetupComplete, setE2eeSetupComplete] = React.useState(false);

  const roomOptions = React.useMemo((): RoomOptions => {
    let videoCodec: VideoCodec | undefined = props.options.codec ? props.options.codec : 'vp9';
    if (e2eeEnabled && (videoCodec === 'av1' || videoCodec === 'vp9')) {
      videoCodec = undefined;
    }
    const videoCaptureDefaults: VideoCaptureOptions = {
      resolution: props.options.hq ? VideoPresets.h2160 : VideoPresets.h720,
    };
    const publishDefaults: TrackPublishDefaults = {
      dtx: false,
      videoSimulcastLayers: props.options.hq
        ? [VideoPresets.h1080, VideoPresets.h720]
        : [VideoPresets.h540, VideoPresets.h216],
      red: !e2eeEnabled,
      videoCodec,
    };
    return {
      videoCaptureDefaults: videoCaptureDefaults,
      publishDefaults: publishDefaults,
      adaptiveStream: true,
      dynacast: true,
      e2ee: keyProvider && worker && e2eeEnabled ? { keyProvider, worker } : undefined,
      singlePeerConnection: true,
    };
  }, [props.options.hq, props.options.codec, e2eeEnabled, keyProvider, worker]);

  const room = React.useMemo(() => new Room(roomOptions), []);

  React.useEffect(() => {
    if (e2eeEnabled) {
      keyProvider
        .setKey(decodePassphrase(e2eePassphrase!))
        .then(() => {
          room.setE2EEEnabled(true).catch((e) => {
            if (e instanceof DeviceUnsupportedError) {
              alert(
                `You're trying to join an encrypted meeting, but your browser does not support it. Please update it to the latest version and try again.`,
              );
              console.error(e);
            } else {
              throw e;
            }
          });
        })
        .then(() => setE2eeSetupComplete(true));
    } else {
      setE2eeSetupComplete(true);
    }
  }, [e2eeEnabled, room, e2eePassphrase, keyProvider]);

  const connectOptions = React.useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);

  const router = useRouter();
  const handleOnLeave = React.useCallback(() => router.push('/'), [router]);
  const handleError = React.useCallback((error: Error) => {
    console.error(error);
    alert(`Encountered an unexpected error, check the console logs for details: ${error.message}`);
  }, []);
  const handleEncryptionError = React.useCallback((error: Error) => {
    console.error(error);
    alert(
      `Encountered an unexpected encryption error, check the console logs for details: ${error.message}`,
    );
  }, []);

  React.useEffect(() => {
    room.on(RoomEvent.Disconnected, handleOnLeave);
    room.on(RoomEvent.EncryptionError, handleEncryptionError);
    room.on(RoomEvent.MediaDevicesError, handleError);

    if (e2eeSetupComplete) {
      room
        .connect(props.serverUrl, props.token, connectOptions)
        .catch((error) => {
          handleError(error);
        });
      // Enable camera and microphone by default
      room.localParticipant.setCameraEnabled(true).catch((error) => {
        handleError(error);
      });
      room.localParticipant.setMicrophoneEnabled(true).catch((error) => {
        handleError(error);
      });
    }
    return () => {
      room.off(RoomEvent.Disconnected, handleOnLeave);
      room.off(RoomEvent.EncryptionError, handleEncryptionError);
      room.off(RoomEvent.MediaDevicesError, handleError);
    };
  }, [e2eeSetupComplete, room, props.serverUrl, props.token, connectOptions, handleOnLeave, handleError, handleEncryptionError]);

  const lowPowerMode = useLowCPUOptimizer(room);

  React.useEffect(() => {
    if (lowPowerMode) {
      console.warn('Low power mode enabled');
    }
  }, [lowPowerMode]);

  const [showParticipants, setShowParticipants] = React.useState(false);

  return (
    <div className="lk-room-container relative h-full w-full bg-[var(--color-background)]">
      <RoomContext.Provider value={room}>
        <KeyboardShortcuts />
        <div className="flex h-full w-full">
          <div className="flex-1 min-w-0">
            <VideoConference
              chatMessageFormatter={formatChatMessageLinks}
              SettingsComponent={SHOW_SETTINGS_MENU ? SettingsMenu : undefined}
            />
          </div>
          {showParticipants && (
            <div className="w-full sm:w-80 lg:w-96 h-full border-l border-[var(--color-border)] bg-[var(--color-surface)]">
              <ParticipantList onClose={() => setShowParticipants(false)} />
            </div>
          )}
        </div>
        {!showParticipants && (
          <button
            onClick={() => setShowParticipants(true)}
            className="fixed top-16 sm:top-20 right-3 sm:right-4 z-[1000] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs sm:text-sm font-medium text-[var(--color-text-primary)] shadow-lg hover:bg-[var(--color-surface)]-hover transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Show participants"
          >
            Participants ({room.remoteParticipants.size + 1})
          </button>
        )}
        <DebugMode />
        <RecordingIndicator />
      </RoomContext.Provider>
    </div>
  );
}

export default MeetingRoom;
