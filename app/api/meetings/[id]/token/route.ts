import { NextResponse } from 'next/server';
import { z } from 'zod';

import prisma from '@/lib/prisma';
import {
  createLiveKitToken,
  livekitUrl,
} from '@/lib/livekit';
import { normalizeEmail } from '@/lib/meetings';

const tokenRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  metadata: z.string().max(1024).optional(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const payload = await request.json();
    const result = tokenRequestSchema.safeParse(payload);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: result.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { email, name, metadata } = result.data;
    const normalizedEmail = normalizeEmail(email);
    const trimmedName = name.trim();

    const { id } = await params;

    const meeting = await prisma.meeting.findUnique({
      where: {
        id,
      },
      include: {
        participants: true,
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Create or update participant record
    await prisma.participant.upsert({
      where: {
        meetingId_email: {
          meetingId: id,
          email: normalizedEmail,
        },
      },
      create: {
        email: normalizedEmail,
        name: trimmedName,
        meetingId: id,
      },
      update: {
        name: trimmedName,
      },
    });

    const token = await createLiveKitToken({
      identity: normalizedEmail,
      name: trimmedName,
      roomName: meeting.roomName,
      metadata,
      roomAdmin: false,
    });

    return NextResponse.json(
      {
        token,
        livekitUrl: livekitUrl(),
        roomName: meeting.roomName,
        meeting: {
          id: meeting.id,
          title: meeting.title,
          status: meeting.status,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    console.error('Failed to issue meeting token', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

