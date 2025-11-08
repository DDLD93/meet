'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';

const buttonBase =
  'flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 shadow-sm transition-colors duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-slate-400';

export function ControlsBar() {
  const router = useRouter();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  const micEnabled = localParticipant?.isMicrophoneEnabled ?? false;
  const cameraEnabled = localParticipant?.isCameraEnabled ?? false;
  const screenShareEnabled = localParticipant?.isScreenShareEnabled ?? false;

  const toggleMicrophone = useCallback(async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setMicrophoneEnabled(!micEnabled);
    } catch (error) {
      console.error('Failed to toggle microphone', error);
    }
  }, [localParticipant, micEnabled]);

  const toggleCamera = useCallback(async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setCameraEnabled(!cameraEnabled);
    } catch (error) {
      console.error('Failed to toggle camera', error);
    }
  }, [cameraEnabled, localParticipant]);

  const toggleScreenShare = useCallback(async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setScreenShareEnabled(!screenShareEnabled);
    } catch (error) {
      console.error('Failed to toggle screen share', error);
    }
  }, [localParticipant, screenShareEnabled]);

  const leaveMeeting = useCallback(async () => {
    try {
      await room.disconnect();
    } catch (error) {
      console.error('Failed to leave room', error);
    } finally {
      router.push('/meetings');
    }
  }, [room, router]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleMicrophone}
          className={buttonBase}
          aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {micEnabled ? 'Mute' : 'Unmute'}
        </button>
        <button
          type="button"
          onClick={toggleCamera}
          className={buttonBase}
          aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
        >
          {cameraEnabled ? 'Stop Video' : 'Start Video'}
        </button>
        <button
          type="button"
          onClick={toggleScreenShare}
          className={buttonBase}
          aria-label={screenShareEnabled ? 'Stop screen share' : 'Start screen share'}
        >
          {screenShareEnabled ? 'Stop Share' : 'Share Screen'}
        </button>
      </div>
      <button
        type="button"
        onClick={leaveMeeting}
        className="rounded-lg border border-red-500/40 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-100 transition-colors duration-200 hover:bg-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80"
        aria-label="Leave meeting"
      >
        Leave
      </button>
    </div>
  );
}

export default ControlsBar;

