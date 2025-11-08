import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export const PASSWORD_SALT_ROUNDS = 10;

const SLUG_MAX_LENGTH = 48;
const DEFAULT_ROOM_PREFIX = 'meeting';
const DEFAULT_PASSWORD_LENGTH = 6;

const getAppBaseUrl = () =>
  process.env.APP_BASE_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH);
};

const randomIdentifier = (size = 4) =>
  crypto.randomBytes(size).toString('hex');

export const normalizeEmail = (email: string) =>
  email.trim().toLowerCase();

export const generateRoomName = (title?: string) => {
  const slug = title ? slugify(title) : DEFAULT_ROOM_PREFIX;
  const identifier = randomIdentifier();
  return `${slug || DEFAULT_ROOM_PREFIX}-${identifier}`;
};

export const generateMeetingPassword = (length = DEFAULT_PASSWORD_LENGTH) => {
  const chars = crypto.randomBytes(length * 2).toString('base64url');
  return chars.slice(0, length);
};

export const buildJoinUrl = (roomName: string, password: string) => {
  const baseUrl = getAppBaseUrl();
  const searchParams = new URLSearchParams({ password });
  return `${baseUrl}/join/${roomName}?${searchParams.toString()}`;
};

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
};

export const verifyPassword = async (
  password: string,
  hash: string,
) => bcrypt.compare(password, hash);

export const participantEmailsSchema = z
  .array(z.string().email())
  .transform((emails) => [
    ...new Set(emails.map((email) => normalizeEmail(email))),
  ]);

export const buildParticipantCreateData = (emails: string[]) =>
  emails.map((email) => ({ email: normalizeEmail(email) }));

export const createMeetingSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(120),
    description: z.string().max(1024).optional(),
    startTime: z.coerce.date({ invalid_type_error: 'startTime is required' }),
    endTime: z.coerce.date({ invalid_type_error: 'endTime is required' }),
    isPublic: z.boolean().default(false),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    participants: participantEmailsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endTime <= data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'endTime must be after startTime',
      });
    }

    if (!data.isPublic && (!data.participants || data.participants.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['participants'],
        message: 'Private meetings require at least one participant email',
      });
    }
  });

export const createInstantMeetingSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(120),
    description: z.string().max(1024).optional(),
    isPublic: z.boolean().default(false),
    participants: participantEmailsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.isPublic && (!data.participants || data.participants.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['participants'],
        message: 'Private meetings require at least one participant email',
      });
    }
  });

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type CreateInstantMeetingInput = z.infer<
  typeof createInstantMeetingSchema
>;

