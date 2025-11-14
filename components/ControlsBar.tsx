'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';

import { clearSessionOnly, loadStoredCredentials } from '@/lib/meetingSession';

const buttonBase =
  'flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] shadow-sm transition-all duration-200 hover:bg-[var(--color-surface)]-hover hover:border-[var(--color-border)]-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:border-[var(--color-border)]-light disabled:bg-[var(--color-background-alt)] disabled:text-[var(--color-text-muted)] sm:px-4';

type ControlsBarProps = {
  meetingId: string;
};

export function ControlsBar({ meetingId }: ControlsBarProps) {
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
      // Clear session but keep credentials for rejoining
      clearSessionOnly(meetingId);
      
      // Get credentials to redirect to lobby with email/name
      const credentials = loadStoredCredentials(meetingId);
      if (credentials?.roomName) {
        const params = new URLSearchParams();
        if (credentials.email) {
          params.set('email', credentials.email);
        }
        if (credentials.name) {
          params.set('name', credentials.name);
        }
        const query = params.toString();
        router.push(`/join/${encodeURIComponent(credentials.roomName)}${query ? `?${query}` : ''}`);
      } else {
        router.push('/');
      }
    }
  }, [meetingId, room, router]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-2 sm:px-0">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleMicrophone}
          className={buttonBase}
          aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          <span className="hidden sm:inline">{micEnabled ? 'Mute' : 'Unmute'}</span>
          <span className="sm:hidden">{micEnabled ? 'Mute' : 'Unmute'}</span>
        </button>
        <button
          type="button"
          onClick={toggleCamera}
          className={buttonBase}
          aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
        >
          <span className="hidden sm:inline">{cameraEnabled ? 'Stop Video' : 'Start Video'}</span>
          <span className="sm:hidden">{cameraEnabled ? 'Stop' : 'Start'}</span>
        </button>
        <button
          type="button"
          onClick={toggleScreenShare}
          className={buttonBase}
          aria-label={screenShareEnabled ? 'Stop screen share' : 'Start screen share'}
        >
          <span className="hidden sm:inline">{screenShareEnabled ? 'Stop Share' : 'Share Screen'}</span>
          <span className="sm:hidden">{screenShareEnabled ? 'Stop' : 'Share'}</span>
        </button>
      </div>
      <button
        type="button"
        onClick={leaveMeeting}
        className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary/20 hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
        aria-label="Leave meeting"
      >
        Leave
      </button>
    </div>
  );
}

export default ControlsBar;

