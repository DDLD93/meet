'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, Play, Square } from 'lucide-react';

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
      className={`flex flex-col gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 sm:p-4 ${
        className ?? ''
      }`}
    >
      <header className="flex items-center justify-between">
        <h2 className="text-xs sm:text-sm font-semibold text-white">
          Test your setup
        </h2>
        <button
          type="button"
          onClick={handleTogglePreview}
          disabled={loading}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/80 disabled:cursor-not-allowed disabled:opacity-50 ${
            stream
              ? 'border border-red-600/50 bg-red-600/10 text-red-400 hover:bg-red-600/20 hover:border-red-600/70'
              : 'border border-zinc-700 bg-zinc-800/50 text-white hover:bg-zinc-700 hover:border-zinc-600'
          }`}
        >
          {stream ? (
            <>
              <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Start</span>
            </>
          )}
        </button>
      </header>
      
      <div className="relative w-full overflow-hidden rounded-lg border border-zinc-800 bg-black aspect-video">
        {stream ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-900/50">
            <div className="text-center space-y-2">
              <Video className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-gray-600" />
              <p className="text-[10px] sm:text-xs text-gray-500 px-4">
                Camera preview will appear here
              </p>
            </div>
          </div>
        )}
        {!videoActive && stream && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center space-y-2">
              <VideoOff className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-gray-400" />
              <p className="text-xs sm:text-sm text-gray-300">Camera paused</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-medium text-gray-300 flex items-center gap-1.5">
                {audioActive ? (
                  <Mic className="w-3 h-3 text-green-400" />
                ) : (
                  <MicOff className="w-3 h-3 text-gray-500" />
                )}
                Microphone
              </span>
              <span className="text-[10px] text-gray-500">
                {audioActive ? 'Active' : 'Muted'}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-150 ${
                  audioActive ? 'bg-red-500' : 'bg-gray-600'
                }`}
                style={{ width: `${Math.max(2, audioLevel * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-[10px] sm:text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleToggleVideo}
            disabled={loading && !stream}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-2 text-[10px] sm:text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/80 disabled:cursor-not-allowed disabled:opacity-50 ${
              videoActive
                ? 'border border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                : 'border border-zinc-700 bg-zinc-800/50 text-white hover:bg-zinc-700 hover:border-zinc-600'
            }`}
          >
            {videoActive ? (
              <>
                <Video className="w-3.5 h-3.5" />
                <span>Camera</span>
              </>
            ) : (
              <>
                <VideoOff className="w-3.5 h-3.5" />
                <span>Camera</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleToggleAudio}
            disabled={loading && !stream}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-2 text-[10px] sm:text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/80 disabled:cursor-not-allowed disabled:opacity-50 ${
              audioActive
                ? 'border border-green-500/50 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                : 'border border-zinc-700 bg-zinc-800/50 text-white hover:bg-zinc-700 hover:border-zinc-600'
            }`}
          >
            {audioActive ? (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>Mic</span>
              </>
            ) : (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>Mic</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}


