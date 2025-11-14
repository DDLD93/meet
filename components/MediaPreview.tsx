'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type MediaPreviewProps = {
  className?: string;
  onStatusChange?: (status: {
    hasVideo: boolean;
    hasAudio: boolean;
    error?: string | null;
  }) => void;
};

const formatErrorMessage = (error: unknown) => {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Access to camera or microphone was denied. Update your browser permissions to continue.';
    }
    if (error.name === 'NotFoundError') {
      return 'No camera or microphone was found. Attach a device or try a different browser.';
    }
    if (error.name === 'NotReadableError') {
      return 'Camera or microphone is currently in use by another application.';
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong while starting the preview.';
};

const stopStream = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      // ignore
    }
  });
};

export default function MediaPreview({ className, onStatusChange }: MediaPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoActive, setVideoActive] = useState(false);
  const [audioActive, setAudioActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const status = useMemo(
    () => ({
      hasVideo: stream?.getVideoTracks().some((track) => track.readyState === 'live') ?? false,
      hasAudio: stream?.getAudioTracks().some((track) => track.readyState === 'live') ?? false,
      error,
    }),
    [error, stream],
  );

  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }
    if (stream) {
      videoElement.srcObject = stream;
      void videoElement.play().catch(() => {
        // On mobile autoplay may fail until user interaction; ignore.
      });
    } else {
      videoElement.srcObject = null;
    }
  }, [stream]);

  const cleanupAudioAnalyser = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    audioContextRef.current?.close().catch(() => {
      // ignore errors when closing
    });
    audioContextRef.current = null;
  }, []);

  const updateAudioMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) {
      return;
    }
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(dataArray);
    const average =
      dataArray.reduce((acc, value) => acc + Math.abs(value - 128), 0) / dataArray.length;
    const normalized = Math.min(1, average / 40);
    setAudioLevel(normalized);
    frameRef.current = requestAnimationFrame(updateAudioMeter);
  }, []);

  const prepareAudioAnalyser = useCallback(
    (streamWithAudio: MediaStream) => {
      cleanupAudioAnalyser();
      try {
        const AudioContextConstructor =
          window.AudioContext || (window as unknown as { webkitAudioContext?: AudioContext }).webkitAudioContext;
        if (!AudioContextConstructor) {
          return;
        }
        const audioContext = new AudioContextConstructor();
        const source = audioContext.createMediaStreamSource(streamWithAudio);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        sourceRef.current = source;
        frameRef.current = requestAnimationFrame(updateAudioMeter);
      } catch (err) {
        console.error('Failed to initialize audio analyser', err);
      }
    },
    [cleanupAudioAnalyser, updateAudioMeter],
  );

  const startPreview = useCallback(
    async (constraints?: MediaStreamConstraints) => {
      cleanupAudioAnalyser();
      stopStream(stream);
      setLoading(true);
      setError(null);
      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          video: constraints?.video ?? (videoActive ? true : { width: 1280, height: 720 }),
          audio: constraints?.audio ?? audioActive,
        });
        setStream(nextStream);
        setVideoActive(nextStream.getVideoTracks().length > 0);
        setAudioActive(nextStream.getAudioTracks().length > 0);
        if (nextStream.getAudioTracks().length > 0) {
          prepareAudioAnalyser(nextStream);
        }
      } catch (err) {
        setStream(null);
        const message = formatErrorMessage(err);
        setError(message);
        cleanupAudioAnalyser();
      } finally {
        setLoading(false);
      }
    },
    [audioActive, cleanupAudioAnalyser, prepareAudioAnalyser, stream, videoActive],
  );

  const handleTogglePreview = useCallback(() => {
    if (stream) {
      setStream(null);
      cleanupAudioAnalyser();
      stopStream(stream);
      setAudioLevel(0);
      return;
    }
    void startPreview({ video: true, audio: true });
  }, [cleanupAudioAnalyser, startPreview, stream]);

  const handleToggleVideo = useCallback(() => {
    if (!stream) {
      setVideoActive((prev) => !prev);
      void startPreview({ video: !videoActive, audio: audioActive });
      return;
    }
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !videoActive;
    });
    setVideoActive((prev) => !prev);
  }, [audioActive, startPreview, stream, videoActive]);

  const handleToggleAudio = useCallback(() => {
    if (!stream) {
      setAudioActive((prev) => !prev);
      void startPreview({ video: videoActive, audio: !audioActive });
      return;
    }
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !audioActive;
    });
    setAudioActive((prev) => !prev);
  }, [audioActive, startPreview, stream, videoActive]);

  useEffect(() => {
    return () => {
      cleanupAudioAnalyser();
      stopStream(stream);
    };
  }, [cleanupAudioAnalyser, stream]);

  return (
    <section
      className={`flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-5 ${
        className ?? ''
      }`}
    >
      <header className="flex flex-col gap-2">
        <h2 className="text-base font-bold uppercase tracking-wider text-white">
          Test your setup
        </h2>
        <p className="text-xs text-gray-400">
          Verify camera framing and microphone levels before you join the room.
        </p>
      </header>
      <div className="relative w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
        {stream ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-40 w-full object-cover sm:h-48 lg:h-56"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-zinc-900/50 text-center text-xs text-gray-500 sm:h-48 lg:h-56">
            Camera preview will appear here once you start testing.
          </div>
        )}
        {!videoActive && stream && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm font-medium text-white">
            Camera paused
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">Mic level</span>
          <div className="h-2 rounded-full bg-zinc-800">
            <div
              className="h-2 rounded-full bg-red-500 transition-[width] duration-150"
              style={{ width: `${Math.max(4, audioLevel * 100)}%` }}
            />
          </div>
          <span className="text-[11px] text-gray-500">
            {audioActive
              ? 'Speak into your microphone to see the meter move.'
              : 'Microphone muted.'}
          </span>
        </div>
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-[11px] text-red-400">
            {error}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleTogglePreview}
            className="flex-1 rounded-xl border border-red-600/50 bg-red-600/10 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition-all duration-200 hover:bg-red-600/20 hover:border-red-600/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/80 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-red-600/10"
            disabled={loading}
          >
            {stream ? 'Stop Test' : 'Start Test'}
          </button>
          <button
            type="button"
            onClick={handleToggleVideo}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition-all duration-200 hover:bg-zinc-700 hover:border-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/80 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading && !stream}
          >
            {videoActive ? 'Pause Camera' : 'Enable Camera'}
          </button>
          <button
            type="button"
            onClick={handleToggleAudio}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition-all duration-200 hover:bg-zinc-700 hover:border-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/80 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading && !stream}
          >
            {audioActive ? 'Mute Mic' : 'Enable Mic'}
          </button>
        </div>
      </div>
    </section>
  );
}


