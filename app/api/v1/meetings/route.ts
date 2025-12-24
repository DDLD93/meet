import { NextResponse } from 'next/server';
import { MeetingStatus } from '@prisma/client';

import prisma from '@/lib/prisma';
import { validateApiKey } from '@/lib/api-auth';
import {
  buildParticipantCreateData,
  createInstantMeetingSchema,
  generateRoomName,
  serializeMeetingDetails,
  resolveRequestBaseUrl,
} from '@/lib/meetings';

/**
 * GET /api/v1/meetings
 * List meetings with pagination and filtering
 * Requires: X-API-Key header
 */
export async function GET(request: Request) {
  const validation = validateApiKey(request);
  if (!validation.valid) {
    return validation.error!;
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');

  let limit = 50;
  if (limitParam) {
    const parsed = Number.parseInt(limitParam, 10);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 200) {
      limit = parsed;
    }
  }

  let offset = 0;
  if (offsetParam) {
    const parsed = Number.parseInt(offsetParam, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      offset = parsed;
    }
  }

  const where: Record<string, unknown> = {};

  if (statusParam && Object.values(MeetingStatus).includes(statusParam as MeetingStatus)) {
    where.status = statusParam;
  }

  const [meetings, total] = await Promise.all([
    prisma.meeting.findMany({
      where,
      include: {
        participants: {
          select: {
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    }),
    prisma.meeting.count({ where }),
  ]);

  const baseUrl = resolveRequestBaseUrl(request);

  const data = meetings.map((meeting) =>
    serializeMeetingDetails(
      {
        id: meeting.id,
        title: meeting.title,
        status: meeting.status,
        roomName: meeting.roomName,
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
        participants: meeting.participants,
      },
      {
        baseUrl,
        messageCount: meeting._count.messages,
      },
    ),
  );

  return NextResponse.json({
    data,
    meta: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * POST /api/v1/meetings
 * Create a new instant meeting
 * Requires: X-API-Key header
 */
export async function POST(request: Request) {
  const validation = validateApiKey(request);
  if (!validation.valid) {
    return validation.error!;
  }

  try {
    const payload = await request.json();
    const parsed = await createInstantMeetingSchema.safeParseAsync(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
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
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    const baseUrl = resolveRequestBaseUrl(request);

    const data = serializeMeetingDetails(
      {
        id: meeting.id,
        title: meeting.title,
        status: meeting.status,
        roomName: meeting.roomName,
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
        participants: meeting.participants,
      },
      {
        baseUrl,
        messageCount: meeting._count.messages,
      },
    );

    return NextResponse.json(
      {
        data,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create meeting via external API', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}

