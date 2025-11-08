import { NextResponse } from 'next/server';
import { z } from 'zod';

import prisma from '@/lib/prisma';
import {
  normalizeEmail,
  participantEmailsSchema,
} from '@/lib/meetings';

const updateParticipantsSchema = z.object({
  participants: participantEmailsSchema,
});

const removeParticipantSchema = z.object({
  email: z.string().email(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const serializeParticipants = (emails: string[]) => ({
  participants: emails,
});

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      participants: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  return NextResponse.json(
    serializeParticipants(
      meeting.participants.map((participant) => participant.email),
    ),
  );
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const payload = await request.json();
  const parsed = updateParticipantsSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    select: {
      id: true,
      isPublic: true,
    },
  });

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  const participants = parsed.data.participants;
  if (!meeting.isPublic && participants.length === 0) {
    return NextResponse.json(
      { error: 'Private meetings require at least one participant' },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.participant.deleteMany({
      where: { meetingId: meeting.id },
    });

    if (participants.length > 0) {
      await tx.participant.createMany({
        data: participants.map((email) => ({
          meetingId: meeting.id,
          email,
        })),
        skipDuplicates: true,
      });
    }
  });

  const updated = await prisma.participant.findMany({
    where: { meetingId: meeting.id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(
    serializeParticipants(updated.map((participant) => participant.email)),
  );
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const payload = await request.json();
  const parsed = removeParticipantSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    select: {
      id: true,
      isPublic: true,
    },
  });

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  const email = normalizeEmail(parsed.data.email);

  const participant = await prisma.participant.findUnique({
    where: {
      meetingId_email: {
        meetingId: meeting.id,
        email,
      },
    },
  });

  if (!participant) {
    return NextResponse.json(
      { error: 'Participant not found' },
      { status: 404 },
    );
  }

  if (!meeting.isPublic) {
    const participantCount = await prisma.participant.count({
      where: { meetingId: meeting.id },
    });

    if (participantCount <= 1) {
      return NextResponse.json(
        { error: 'Private meetings must retain at least one participant' },
        { status: 400 },
      );
    }
  }

  await prisma.participant.delete({
    where: {
      meetingId_email: {
        meetingId: meeting.id,
        email,
      },
    },
  });

  const remaining = await prisma.participant.findMany({
    where: { meetingId: meeting.id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(
    serializeParticipants(remaining.map((item) => item.email)),
  );
}

