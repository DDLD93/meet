import { NextResponse } from 'next/server';
import { MeetingStatus, type Participant } from '@prisma/client';

import prisma from '@/lib/prisma';
import {
  buildJoinUrl,
  buildParticipantCreateData,
  createMeetingSchema,
  generateRoomName,
  hashPassword,
} from '@/lib/meetings';

const serializeMeeting = (
  meeting: {
    id: string;
    title: string;
    description: string | null;
    startTime: Date;
    endTime: Date;
    status: MeetingStatus;
    isPublic: boolean;
    isInstant: boolean;
    roomName: string;
    joinUrl: string;
  } & {
    participants: Participant[];
  },
) => ({
  id: meeting.id,
  title: meeting.title,
  description: meeting.description,
  startTime: meeting.startTime,
  endTime: meeting.endTime,
  status: meeting.status,
  isPublic: meeting.isPublic,
  isInstant: meeting.isInstant,
  roomName: meeting.roomName,
  joinUrl: meeting.joinUrl,
  participants: meeting.participants.map((participant) => participant.email),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomName = searchParams.get('roomName');
  const statusParam = searchParams.get('status');
  const limitParam = searchParams.get('limit');

  let limit = 100;
  if (limitParam) {
    const parsed = Number.parseInt(limitParam, 10);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 200) {
      limit = parsed;
    }
  }

  const where: Record<string, unknown> = {};

  if (roomName) {
    where.roomName = roomName;
  }

  if (statusParam && Object.values(MeetingStatus).includes(statusParam as MeetingStatus)) {
    where.status = statusParam;
  }

  const meetings = await prisma.meeting.findMany({
    where,
    include: {
      participants: true,
    },
    orderBy: {
      startTime: 'desc',
    },
    take: limit,
  });

  return NextResponse.json({
    meetings: meetings.map(serializeMeeting),
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = await createMeetingSchema.safeParseAsync(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { title, description, startTime, endTime, isPublic, password, participants } =
      parsed.data;

    const roomName = generateRoomName(title);
    const joinUrl = buildJoinUrl(roomName, password);
    const passwordHash = await hashPassword(password);

    const meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        startTime,
        endTime,
        status: MeetingStatus.SCHEDULED,
        isPublic,
        isInstant: false,
        passwordHash,
        roomName,
        joinUrl,
        participants:
          participants && participants.length > 0
            ? {
                create: buildParticipantCreateData(participants),
              }
            : undefined,
      },
      include: {
        participants: true,
      },
    });

    return NextResponse.json(
      {
        meeting: serializeMeeting(meeting),
        password,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create meeting', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

