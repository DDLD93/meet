# LiveKit Components & Controls Reference

Based on `@livekit/components-react` v2.9.15 and `livekit-client` v2.15.14

## Currently Used in Your Project

### From `@livekit/components-react`:
- `VideoConference` - Main video conference component
- `RoomContext` - Context provider for room state
- `formatChatMessageLinks` - Chat message formatter
- `useLocalParticipant` - Hook to access local participant
- `useParticipants` - Hook to get all participants
- `useRoomContext` - Hook to access room context
- `useMaybeLayoutContext` - Hook for layout context
- `useTrackToggle` - Hook for toggling tracks
- `TrackToggle` - Component for track toggle button
- `MediaDeviceMenu` - Component for device selection menu
- `useIsRecording` - Hook to check if recording is active
- `useKrispNoiseFilter` - Hook for noise cancellation

### From `livekit-client`:
- `Room` - Main room class
- `RoomOptions` - Room configuration options
- `RoomConnectOptions` - Connection options
- `RoomEvent` - Room event types
- `VideoCodec` - Video codec types
- `VideoPresets` - Video quality presets
- `TrackPublishDefaults` - Track publishing defaults
- `VideoCaptureOptions` - Video capture options
- `ExternalE2EEKeyProvider` - E2EE key provider
- `DeviceUnsupportedError` - Error type
- `Participant`, `RemoteParticipant` - Participant types
- `Track`, `LocalTrack`, `RemoteTrack` - Track types
- `LocalAudioTrack`, `LocalVideoTrack` - Specific track types
- `Track.Source` - Track source enum
- `DataPacket_Kind` - Data packet types

---

## Available Components from `@livekit/components-react`

### Core Components

#### 1. **VideoConference**
Main component that renders the entire video conference UI.
```tsx
<VideoConference
  chatMessageFormatter={formatChatMessageLinks}
  SettingsComponent={SettingsMenu}
  onLeave={handleLeave}
/>
```

#### 2. **RoomContext.Provider**
Provides room context to child components.
```tsx
<RoomContext.Provider value={room}>
  {/* Your components */}
</RoomContext.Provider>
```

### Track Controls

#### 3. **TrackToggle**
Button component to toggle camera/microphone.
```tsx
<TrackToggle source={Track.Source.Camera} />
<TrackToggle source={Track.Source.Microphone} />
<TrackToggle source={Track.Source.ScreenShare} />
```

#### 4. **DisconnectButton**
Button to disconnect from the room.
```tsx
<DisconnectButton>Leave</DisconnectButton>
```

#### 5. **MediaDeviceMenu**
Dropdown menu for selecting audio/video devices.
```tsx
<MediaDeviceMenu kind="audioinput" />
<MediaDeviceMenu kind="audiooutput" />
<MediaDeviceMenu kind="videoinput" />
```

### Video Components

#### 6. **VideoTrack**
Renders a video track.
```tsx
<VideoTrack trackRef={trackRef} />
```

#### 7. **AudioTrack**
Renders an audio track (hidden, plays audio).
```tsx
<AudioTrack trackRef={trackRef} />
```

#### 8. **ParticipantTile**
Complete participant tile with video and controls.
```tsx
<ParticipantTile participant={participant} />
```

#### 9. **ParticipantName**
Displays participant name.
```tsx
<ParticipantName />
```

#### 10. **ParticipantAudioTile**
Audio-only participant tile.
```tsx
<ParticipantAudioTile participant={participant} />
```

#### 11. **FocusLayout**
Layout that focuses on the active speaker.
```tsx
<FocusLayout />
```

#### 12. **GridLayout**
Grid layout for participants.
```tsx
<GridLayout />
```

#### 13. **CarouselLayout**
Carousel layout for participants.
```tsx
<CarouselLayout />
```

### Chat Components

#### 14. **Chat**
Complete chat component.
```tsx
<Chat />
```

#### 15. **ChatEntry**
Individual chat message entry.
```tsx
<ChatEntry entry={message} />
```

#### 16. **ChatInput**
Chat input field.
```tsx
<ChatInput />
```

#### 17. **MessageFormatter**
Formats chat messages (like `formatChatMessageLinks`).
```tsx
<MessageFormatter message={message} />
```

### Participant Components

#### 18. **ParticipantLoop**
Loops through participants.
```tsx
<ParticipantLoop>
  {(participant) => <ParticipantTile participant={participant} />}
</ParticipantLoop>
```

#### 19. **ConnectionQualityIndicator**
Shows connection quality.
```tsx
<ConnectionQualityIndicator />
```

#### 20. **ParticipantContextIfNeeded**
Provides participant context if needed.
```tsx
<ParticipantContextIfNeeded>
  {/* Components */}
</ParticipantContextIfNeeded>
```

### Control Components

#### 21. **ControlBar**
Pre-built control bar with common controls.
```tsx
<ControlBar controls={{ microphone: true, camera: true, screenShare: true }} />
```

#### 22. **StartMediaButton**
Button to start media (camera/mic).
```tsx
<StartMediaButton />
```

#### 23. **ClearPinButton**
Button to clear pinned participant.
```tsx
<ClearPinButton />
```

#### 24. **PinButton**
Button to pin a participant.
```tsx
<PinButton />
```

### Layout Components

#### 25. **LayoutContextProvider**
Provides layout context.
```tsx
<LayoutContextProvider>
  {/* Your layout */}
</LayoutContextProvider>
```

#### 26. **StageProps**
Props for stage components.

### Utility Components

#### 27. **RoomAudioRenderer**
Renders room audio.
```tsx
<RoomAudioRenderer />
```

#### 28. **TrackMutedIndicator**
Shows when a track is muted.
```tsx
<TrackMutedIndicator source={Track.Source.Microphone} />
```

#### 29. **TrackLoop**
Loops through tracks.
```tsx
<TrackLoop sources={[Track.Source.Camera, Track.Source.ScreenShare]}>
  {(trackRef) => <VideoTrack trackRef={trackRef} />}
</TrackLoop>
```

---

## Available Hooks from `@livekit/components-react`

### Room Hooks

1. **useRoomContext()** - Get room instance
2. **useMaybeRoomContext()** - Get room instance (nullable)
3. **useRoomAudioPlayback()** - Room audio playback hook
4. **useIsMuted()** - Check if track is muted
5. **useIsSpeaking()** - Check if participant is speaking
6. **useIsRecording()** - Check if room is recording
7. **useConnectionState()** - Get connection state
8. **useConnectionQuality()** - Get connection quality

### Participant Hooks

9. **useLocalParticipant()** - Get local participant
10. **useParticipants()** - Get all participants
11. **useRemoteParticipants()** - Get remote participants
12. **useParticipant()** - Get specific participant
13. **useParticipantInfo()** - Get participant info
14. **useParticipantPermissions()** - Get participant permissions

### Track Hooks

15. **useTracks()** - Get tracks
16. **useTrack()** - Get specific track
17. **useTrackToggle()** - Toggle track on/off
18. **useMediaDevices()** - Get media devices
19. **useAudioTrack()** - Get audio track
20. **useVideoTrack()** - Get video track
21. **useScreenShareTrack()** - Get screen share track
22. **useLocalAudioTrack()** - Get local audio track
23. **useLocalVideoTrack()** - Get local video track
24. **useRemoteAudioTrack()** - Get remote audio track
25. **useRemoteVideoTrack()** - Get remote video track

### Layout Hooks

26. **useLayoutContext()** - Get layout context
27. **useMaybeLayoutContext()** - Get layout context (nullable)
28. **usePinnedTracks()** - Get pinned tracks
29. **usePersistentUserChoices()** - Persistent user choices

### Chat Hooks

30. **useChat()** - Chat functionality
31. **useDataChannel()** - Data channel functionality

### Device Hooks

32. **useMediaDevices()** - Get media devices
33. **useMediaDeviceSelect()** - Select media device

### Noise Filter Hooks

34. **useKrispNoiseFilter()** - Krisp noise cancellation

---

## Available Classes & Types from `livekit-client`

### Core Classes

1. **Room** - Main room class
   ```tsx
   const room = new Room(roomOptions);
   await room.connect(serverUrl, token, connectOptions);
   ```

2. **LocalParticipant** - Local participant instance
   ```tsx
   room.localParticipant.setMicrophoneEnabled(true);
   room.localParticipant.setCameraEnabled(true);
   room.localParticipant.setScreenShareEnabled(true);
   ```

3. **RemoteParticipant** - Remote participant instance

4. **LocalTrack** - Local track instance
5. **RemoteTrack** - Remote track instance
6. **LocalAudioTrack** - Local audio track
7. **LocalVideoTrack** - Local video track
8. **RemoteAudioTrack** - Remote audio track
9. **RemoteVideoTrack** - Remote video track

### Track Sources (Track.Source)

- `Track.Source.Camera` - Camera video
- `Track.Source.Microphone` - Microphone audio
- `Track.Source.ScreenShare` - Screen share video
- `Track.Source.ScreenShareAudio` - Screen share audio
- `Track.Source.Unknown` - Unknown source

### Video Codecs (VideoCodec)

- `'vp8'` - VP8 codec
- `'vp9'` - VP9 codec
- `'h264'` - H.264 codec
- `'av1'` - AV1 codec

### Video Presets (VideoPresets)

- `VideoPresets.h90` - 160x90
- `VideoPresets.h180` - 320x180
- `VideoPresets.h216` - 384x216
- `VideoPresets.h360` - 640x360
- `VideoPresets.h540` - 960x540
- `VideoPresets.h720` - 1280x720
- `VideoPresets.h1080` - 1920x1080
- `VideoPresets.h1440` - 2560x1440
- `VideoPresets.h2160` - 3840x2160

### Room Events (RoomEvent)

- `RoomEvent.Connected` - Room connected
- `RoomEvent.Disconnected` - Room disconnected
- `RoomEvent.Reconnecting` - Room reconnecting
- `RoomEvent.Reconnected` - Room reconnected
- `RoomEvent.ParticipantConnected` - Participant joined
- `RoomEvent.ParticipantDisconnected` - Participant left
- `RoomEvent.TrackPublished` - Track published
- `RoomEvent.TrackUnpublished` - Track unpublished
- `RoomEvent.TrackSubscribed` - Track subscribed
- `RoomEvent.TrackUnsubscribed` - Track unsubscribed
- `RoomEvent.TrackMuted` - Track muted
- `RoomEvent.TrackUnmuted` - Track unmuted
- `RoomEvent.DataReceived` - Data received
- `RoomEvent.EncryptionError` - Encryption error
- `RoomEvent.MediaDevicesError` - Media device error

### Connection States

- `ConnectionState.Connecting` - Connecting
- `ConnectionState.Connected` - Connected
- `ConnectionState.Reconnecting` - Reconnecting
- `ConnectionState.Disconnected` - Disconnected

### Connection Quality

- `ConnectionQuality.Excellent` - Excellent
- `ConnectionQuality.Good` - Good
- `ConnectionQuality.Poor` - Poor
- `ConnectionQuality.Lost` - Lost
- `ConnectionQuality.Unknown` - Unknown

---

## Example Usage Patterns

### Custom Control Bar
```tsx
import { useLocalParticipant, TrackToggle, DisconnectButton } from '@livekit/components-react';
import { Track } from 'livekit-client';

function CustomControls() {
  const { localParticipant } = useLocalParticipant();
  
  return (
    <div className="controls">
      <TrackToggle source={Track.Source.Microphone}>Mic</TrackToggle>
      <TrackToggle source={Track.Source.Camera}>Camera</TrackToggle>
      <TrackToggle source={Track.Source.ScreenShare}>Share</TrackToggle>
      <DisconnectButton>Leave</DisconnectButton>
    </div>
  );
}
```

### Custom Participant List
```tsx
import { useParticipants, ParticipantTile } from '@livekit/components-react';

function CustomParticipantList() {
  const participants = useParticipants();
  
  return (
    <div>
      {participants.map((participant) => (
        <ParticipantTile key={participant.identity} participant={participant} />
      ))}
    </div>
  );
}
```

### Custom Layout
```tsx
import { FocusLayout, GridLayout, CarouselLayout } from '@livekit/components-react';

function CustomLayout() {
  return (
    <FocusLayout>
      {/* Active speaker shown large */}
    </FocusLayout>
    // OR
    <GridLayout>
      {/* Grid of all participants */}
    </GridLayout>
    // OR
    <CarouselLayout>
      {/* Carousel of participants */}
    </CarouselLayout>
  );
}
```

### Custom Chat
```tsx
import { Chat, ChatInput, ChatEntry } from '@livekit/components-react';

function CustomChat() {
  return (
    <div>
      <Chat />
      {/* OR custom implementation */}
      <ChatInput />
      <ChatEntry entry={message} />
    </div>
  );
}
```

---

## Additional Resources

- [LiveKit Components React Docs](https://docs.livekit.io/client-sdk-react/)
- [LiveKit Client SDK Docs](https://docs.livekit.io/client-sdk-js/)
- [LiveKit Examples](https://github.com/livekit-examples)

