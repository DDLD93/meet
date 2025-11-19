import { useIsRecording } from '@livekit/components-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Circle } from 'lucide-react';

export function RecordingIndicator() {
  const isRecording = useIsRecording();
  const [wasRecording, setWasRecording] = React.useState(false);

  React.useEffect(() => {
    if (isRecording !== wasRecording) {
      setWasRecording(isRecording);
      if (isRecording) {
        toast('This meeting is being recorded', {
          duration: 3000,
          icon: '🎥',
        });
      }
    }
  }, [isRecording, wasRecording]);

  if (!isRecording) {
    return null;
  }

  return (
    <div className="fixed top-16 sm:top-20 left-2 sm:left-3 z-[1000] flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 backdrop-blur-sm px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-lg">
      <Circle className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" />
      <span className="text-xs sm:text-sm font-medium text-red-400">
        <span className="hidden sm:inline">Recording</span>
        <span className="sm:hidden">Rec</span>
      </span>
    </div>
  );
}

