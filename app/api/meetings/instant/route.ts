import { NextResponse } from 'next/server';
import { MeetingStatus } from '@prisma/client';

import prisma from '@/lib/prisma';
import {
  buildParticipantCreateData,
  createInstantMeetingSchema,
  generateRoomName,
} from '@/lib/meetings';

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

    const { title, participants } = parsed.data;

    // Generate unique 8-character room name
    const roomName = await generateRoomName(async (name) => {
      const existing = await prisma.meeting.findUnique({
        where: { roomName: name },
        select: { id: true },
      });
      return !existing;
    });

    const meeting = await prisma.meeting.create({
      data: {
        title,
        status: MeetingStatus.ACTIVE,
        roomName,
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
          status: meeting.status,
          roomName: meeting.roomName,
          participants: meeting.participants.map((p) => ({
            email: p.email,
            name: p.name,
          })),
        },
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

