import { randomUUID } from 'crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import prisma from '@/lib/prisma';
import {
  createLiveKitToken,
  livekitUrl,
} from '@/lib/livekit';
import { normalizeEmail, verifyPassword } from '@/lib/meetings';

const tokenRequestSchema = z.object({
  email: z
    .union([z.string().email(), z.literal('')])
    .optional()
    .transform((value) => (value ? value.trim() : undefined)),
  password: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
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

    const { password, name, metadata } = result.data;
    const email = result.data.email ? normalizeEmail(result.data.email) : undefined;

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

    const passwordMatches = await verifyPassword(password, meeting.passwordHash);
    if (!passwordMatches) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 },
      );
    }

    if (!meeting.isPublic) {
      if (!email) {
        return NextResponse.json(
          { error: 'Email is required for private meetings' },
          { status: 400 },
        );
      }
      const authorized = meeting.participants.some(
        (participant) => participant.email === email,
      );
      if (!authorized) {
        return NextResponse.json(
          { error: 'Participant not authorized' },
          { status: 403 },
        );
      }
    }

    const identity = email ?? `guest-${randomUUID()}`;
    const displayName = name?.trim() || email || 'Guest';

    const token = await createLiveKitToken({
      identity,
      name: displayName,
      roomName: meeting.roomName,
      metadata,
      roomAdmin: false,
    });
    console.log({token})

    return NextResponse.json(
      {
        token,
        livekitUrl: livekitUrl(),
        roomName: meeting.roomName,
        meeting: {
          id: meeting.id,
          title: meeting.title,
          status: meeting.status,
          isPublic: meeting.isPublic,
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

