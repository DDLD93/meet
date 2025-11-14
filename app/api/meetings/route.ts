import { NextResponse } from 'next/server';
import { MeetingStatus } from '@prisma/client';

import prisma from '@/lib/prisma';

const serializeMeeting = (meeting: {
  id: string;
  title: string;
  status: MeetingStatus;
  roomName: string;
  createdAt: Date;
  participants: Array<{ email: string; name: string }>;
}) => ({
  id: meeting.id,
  title: meeting.title,
  status: meeting.status,
  roomName: meeting.roomName,
  createdAt: meeting.createdAt,
  participants: meeting.participants.map((p) => ({
    email: p.email,
    name: p.name,
  })),
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
      participants: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });

  return NextResponse.json({
    meetings: meetings.map(serializeMeeting),
  });
}

// POST endpoint removed - use /api/meetings/instant instead

