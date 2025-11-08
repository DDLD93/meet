import { NextResponse } from 'next/server';
import { z } from 'zod';

import prisma from '@/lib/prisma';
import { normalizeEmail } from '@/lib/meetings';

const messageCreateSchema = z.object({
  meetingId: z.string().uuid(),
  content: z.string().min(1, 'Message cannot be empty').max(2000),
  senderEmail: z.string().email().optional(),
  senderName: z.string().max(120).optional(),
});

const limitSchema = z
  .string()
  .transform((value) => Number.parseInt(value, 10))
  .pipe(z.number().int().min(1).max(500))
  .optional();

const serializeMessage = (message: {
  id: string;
  meetingId: string;
  senderEmail: string | null;
  senderName: string | null;
  content: string;
  createdAt: Date;
}) => ({
  id: message.id,
  meetingId: message.meetingId,
  senderEmail: message.senderEmail,
  senderName: message.senderName,
  content: message.content,
  createdAt: message.createdAt,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get('meetingId');

  if (!meetingId) {
    return NextResponse.json(
      { error: 'meetingId query parameter is required' },
      { status: 400 },
    );
  }

  const limitParam = searchParams.get('limit');
  let limit = 200;

  if (limitParam) {
    const parsedLimit = limitSchema.safeParse(limitParam);
    if (!parsedLimit.success || parsedLimit.data === undefined) {
      return NextResponse.json(
        { error: 'limit must be an integer between 1 and 500' },
        { status: 400 },
      );
    }
    limit = parsedLimit.data;
  }

  const messages = await prisma.message.findMany({
    where: { meetingId },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  return NextResponse.json({
    messages: messages.map(serializeMessage),
  });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = messageCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const meeting = await prisma.meeting.findUnique({
    where: { id: data.meetingId },
    select: { id: true },
  });

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: {
      meetingId: data.meetingId,
      content: data.content,
      senderEmail: data.senderEmail
        ? normalizeEmail(data.senderEmail)
        : null,
      senderName: data.senderName ?? null,
    },
    select: {
      id: true,
      meetingId: true,
      senderEmail: true,
      senderName: true,
      content: true,
      createdAt: true,
    },
  });

  return NextResponse.json(serializeMessage(message), { status: 201 });
}

