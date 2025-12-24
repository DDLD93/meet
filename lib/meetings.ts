import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export const PASSWORD_SALT_ROUNDS = 10;

const ROOM_NAME_LENGTH = 8;
const ALPHANUMERIC_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

const getAppBaseUrl = () =>
  process.env.APP_BASE_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

export const resolveRequestBaseUrl = (request?: Request) => {
  if (!request) {
    return null;
  }

  try {
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const forwardedHost = request.headers.get('x-forwarded-host');
    if (forwardedProto && forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`.replace(/\/+$/, '');
    }

    const host = request.headers.get('host');
    if (host) {
      const protocol = forwardedProto ?? (host.includes('localhost') ? 'http' : 'https');
      return `${protocol}://${host}`.replace(/\/+$/, '');
    }

    const { origin } = new URL(request.url);
    return origin.replace(/\/+$/, '');
  } catch {
    return null;
  }
};

const generateRandomRoomName = (): string => {
  const bytes = crypto.randomBytes(ROOM_NAME_LENGTH);
  let result = '';
  for (let i = 0; i < ROOM_NAME_LENGTH; i++) {
    result += ALPHANUMERIC_CHARS[bytes[i] % ALPHANUMERIC_CHARS.length];
  }
  return result;
};

export const normalizeEmail = (email: string) =>
  email.trim().toLowerCase();

export const generateRoomName = async (checkUnique?: (name: string) => Promise<boolean>): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const roomName = generateRandomRoomName();
    
    // If no uniqueness check provided, return immediately
    if (!checkUnique) {
      return roomName;
    }
    
    // Check if room name is unique
    const isUnique = await checkUnique(roomName);
    if (isUnique) {
      return roomName;
    }
    
    attempts++;
  }
  
  // Fallback: if all attempts failed, return a random one anyway
  // (collision is very unlikely with 8 chars = 2.8 trillion combinations)
  return generateRandomRoomName();
};

const DEFAULT_PASSWORD_LENGTH = 12;

export const generateMeetingPassword = (length = DEFAULT_PASSWORD_LENGTH) => {
  const chars = crypto.randomBytes(length * 2).toString('base64url');
  return chars.slice(0, length);
};

export const buildJoinUrl = (
  roomName: string,
  options?: { baseUrl?: string | null },
) => {
  const baseUrl = options?.baseUrl?.replace(/\/+$/, '') ?? getAppBaseUrl();
  return `${baseUrl}/join/${roomName}`;
};

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
};

export const verifyPassword = async (
  password: string,
  hash: string,
) => bcrypt.compare(password, hash);

export const participantSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
});

export const participantsSchema = z
  .array(participantSchema)
  .transform((participants) => {
    const seen = new Set<string>();
    return participants.filter((p) => {
      const normalizedEmail = normalizeEmail(p.email);
      if (seen.has(normalizedEmail)) {
        return false;
      }
      seen.add(normalizedEmail);
      return true;
    });
  });

export const participantEmailsSchema = z
  .array(z.string().email())
  .transform((emails) => {
    const seen = new Set<string>();
    return emails
      .map((email) => normalizeEmail(email))
      .filter((email) => {
        if (seen.has(email)) {
          return false;
        }
        seen.add(email);
        return true;
      });
  });

export const buildParticipantCreateData = (
  participants: Array<{ email: string; name: string }>,
) =>
  participants.map((p) => ({
    email: normalizeEmail(p.email),
    name: p.name.trim(),
  }));

export const createInstantMeetingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120),
  participants: participantsSchema.optional(),
});

export type CreateInstantMeetingInput = z.infer<
  typeof createInstantMeetingSchema
>;

/**
 * Serialize meeting for API responses
 */
export const serializeMeeting = (meeting: {
  id: string;
  title: string;
  status: string;
  roomName: string;
  createdAt: Date;
  updatedAt?: Date;
  participants?: Array<{ email: string; name: string }>;
}) => ({
  id: meeting.id,
  title: meeting.title,
  status: meeting.status,
  roomName: meeting.roomName,
  createdAt: meeting.createdAt.toISOString(),
  updatedAt: meeting.updatedAt?.toISOString() ?? meeting.createdAt.toISOString(),
  participants: meeting.participants?.map((p) => ({
    email: p.email,
    name: p.name,
  })) ?? [],
});

/**
 * Serialize meeting with additional details for external API
 */
export const serializeMeetingDetails = (
  meeting: {
    id: string;
    title: string;
    status: string;
    roomName: string;
    createdAt: Date;
    updatedAt: Date;
    participants: Array<{ email: string; name: string }>;
  },
  options?: {
    baseUrl?: string | null;
    messageCount?: number;
  },
) => {
  const baseUrl = options?.baseUrl ?? getAppBaseUrl();
  return {
    ...serializeMeeting(meeting),
    joinUrl: buildJoinUrl(meeting.roomName, { baseUrl }),
    messageCount: options?.messageCount ?? 0,
  };
};

