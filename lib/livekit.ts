import {
  AccessToken,
  AccessTokenOptions,
  Room,
  RoomCreateOptions,
  RoomServiceClient,
} from 'livekit-server-sdk';

type LiveKitConfig = {
  url: string;
  apiKey: string;
  apiSecret: string;
};

const getEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required LiveKit environment variable: ${key}`);
  }
  return value;
};

export const getLiveKitConfig = (): LiveKitConfig => ({
  url: getEnv('LIVEKIT_URL'),
  apiKey: getEnv('LIVEKIT_API_KEY'),
  apiSecret: getEnv('LIVEKIT_API_SECRET'),
});

const globalForLiveKit = globalThis as unknown as {
  roomService?: RoomServiceClient;
};

export const getRoomServiceClient = () => {
  if (!globalForLiveKit.roomService) {
    const { url, apiKey, apiSecret } = getLiveKitConfig();
    globalForLiveKit.roomService = new RoomServiceClient(url, apiKey, apiSecret);
  }
  return globalForLiveKit.roomService;
};

export const createRoom = async (
  roomName: string,
  options?: RoomCreateOptions,
): Promise<Room> => {
  const roomService = getRoomServiceClient();
  try {
    return await roomService.createRoom({
      name: roomName,
      ...options,
    });
  } catch (error) {
    if (error instanceof Error && /already exists/i.test(error.message)) {
      return roomService.getRoom(roomName);
    }
    throw error;
  }
};

export const ensureRoomExists = async (
  roomName: string,
  options?: RoomCreateOptions,
) => createRoom(roomName, options);

export const deleteRoom = async (roomName: string) => {
  const roomService = getRoomServiceClient();
  try {
    await roomService.deleteRoom(roomName);
  } catch (error) {
    // Ignore not found errors to keep idempotent behaviour
    if (!(error instanceof Error && error.message.includes('not found'))) {
      throw error;
    }
  }
};

export type CreateTokenParams = {
  identity: string;
  name?: string;
  roomName: string;
  ttlSeconds?: number;
  metadata?: string;
  roomAdmin?: boolean;
};

const DEFAULT_TTL_SECONDS = 60 * 15; // 15 minutes

export const createLiveKitToken = ({
  identity,
  name,
  roomName,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  metadata,
  roomAdmin = false,
}: CreateTokenParams) => {
  const { apiKey, apiSecret } = getLiveKitConfig();
  const tokenOptions: AccessTokenOptions = {
    identity,
    name,
    ttl: ttlSeconds,
  };

  const token = new AccessToken(apiKey, apiSecret, tokenOptions);
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    roomAdmin,
  });

  if (metadata) {
    token.metadata = metadata;
  }

  return token.toJwt();
};

export const livekitUrl = () => getLiveKitConfig().url;

