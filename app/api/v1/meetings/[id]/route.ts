import { NextResponse } from 'next/server';
import { MeetingStatus } from '@prisma/client';
import { z } from 'zod';

import prisma from '@/lib/prisma';
import { validateApiKey } from '@/lib/api-auth';
import {
  serializeMeetingDetails,
  resolveRequestBaseUrl,
} from '@/lib/meetings';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const updateMeetingSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  status: z.enum([MeetingStatus.ACTIVE, MeetingStatus.ENDED]).optional(),
});

/**
 * GET /api/v1/meetings/[id]
 * Get detailed information about a specific meeting
 * Requires: X-API-Key header
 */
export async function GET(request: Request, { params }: RouteContext) {
  const validation = validateApiKey(request);
  if (!validation.valid) {
    return validation.error!;
  }

  try {
    const { id } = await params;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        participants: {
          select: {
            email: true,
            name: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json(
        {
          error: 'Meeting not found',
          code: 'NOT_FOUND',
        },
        { status: 404 },
      );
    }

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

    return NextResponse.json({
      data,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to get meeting details', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/v1/meetings/[id]
 * Update meeting details (title, status)
 * Requires: X-API-Key header
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const validation = validateApiKey(request);
  if (!validation.valid) {
    return validation.error!;
  }

  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = updateMeetingSchema.safeParse(payload);

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

    const updateData: { title?: string; status?: MeetingStatus } = {};

    if (parsed.data.title !== undefined) {
      updateData.title = parsed.data.title;
    }

    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          error: 'No fields to update',
          code: 'NO_UPDATE_FIELDS',
        },
        { status: 400 },
      );
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id },
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
    });

    if (!meeting) {
      return NextResponse.json(
        {
          error: 'Meeting not found',
          code: 'NOT_FOUND',
        },
        { status: 404 },
      );
    }

    const updated = await prisma.meeting.update({
      where: { id },
      data: updateData,
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
    });

    const baseUrl = resolveRequestBaseUrl(request);

    const data = serializeMeetingDetails(
      {
        id: updated.id,
        title: updated.title,
        status: updated.status,
        roomName: updated.roomName,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        participants: updated.participants,
      },
      {
        baseUrl,
        messageCount: updated._count.messages,
      },
    );

    return NextResponse.json({
      data,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to update meeting', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/v1/meetings/[id]
 * Delete a meeting (soft delete by setting status to ENDED)
 * Requires: X-API-Key header
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const validation = validateApiKey(request);
  if (!validation.valid) {
    return validation.error!;
  }

  try {
    const { id } = await params;

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!meeting) {
      return NextResponse.json(
        {
          error: 'Meeting not found',
          code: 'NOT_FOUND',
        },
        { status: 404 },
      );
    }

    // Soft delete by setting status to ENDED
    await prisma.meeting.update({
      where: { id },
      data: {
        status: MeetingStatus.ENDED,
      },
    });

    return NextResponse.json(
      {
        data: {
          id,
          deleted: true,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Failed to delete meeting', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 },
    );
  }
}

