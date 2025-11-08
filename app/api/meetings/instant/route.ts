import { NextResponse } from 'next/server';
import { MeetingStatus } from '@prisma/client';

import prisma from '@/lib/prisma';
import {
  buildJoinUrl,
  buildParticipantCreateData,
  createInstantMeetingSchema,
  generateMeetingPassword,
  generateRoomName,
  hashPassword,
} from '@/lib/meetings';

const DEFAULT_MEETING_DURATION_MINUTES = 60;

const calculateEndTime = (start: Date) => {
  return new Date(start.getTime() + DEFAULT_MEETING_DURATION_MINUTES * 60_000);
};

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = await createInstantMeetingSchema.safeParseAsync(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { title, description, isPublic, participants } = parsed.data;

    const startTime = new Date();
    const endTime = calculateEndTime(startTime);
    const roomName = generateRoomName(title);
    const password = generateMeetingPassword();
    const joinUrl = buildJoinUrl(roomName, password);
    const passwordHash = await hashPassword(password);

    const meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        startTime,
        endTime,
        status: MeetingStatus.ACTIVE,
        isPublic,
        isInstant: true,
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
        meeting: {
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
        },
        password,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create instant meeting', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

