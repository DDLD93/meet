import { MeetingStatus } from '@prisma/client';

import prisma from '@/lib/prisma';
import { deleteRoom } from './livekit';

export type SchedulerMeetingSummary = {
  id: string;
  title: string;
  roomName: string;
  startTime: Date;
  endTime: Date;
  status: MeetingStatus;
  isInstant: boolean;
};

const meetingSummarySelect = {
  id: true,
  title: true,
  roomName: true,
  startTime: true,
  endTime: true,
  status: true,
  isInstant: true,
} satisfies Record<string, boolean>;

export const activateScheduledMeetings = async (
  now = new Date(),
): Promise<SchedulerMeetingSummary[]> => {
  const scheduled = await prisma.meeting.findMany({
    where: {
      status: MeetingStatus.SCHEDULED,
      startTime: {
        lte: now,
      },
    },
    select: meetingSummarySelect,
  });

  if (scheduled.length === 0) {
    return [];
  }

  const activated = await prisma.$transaction(
    scheduled.map((meeting) =>
      prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: MeetingStatus.ACTIVE },
        select: meetingSummarySelect,
      }),
    ),
  );

  return activated;
};

export const endExpiredMeetings = async (
  now = new Date(),
): Promise<SchedulerMeetingSummary[]> => {
  const active = await prisma.meeting.findMany({
    where: {
      status: MeetingStatus.ACTIVE,
      endTime: {
        lte: now,
      },
    },
    select: meetingSummarySelect,
  });

  if (active.length === 0) {
    return [];
  }

  const ended = await prisma.$transaction(
    active.map((meeting) =>
      prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: MeetingStatus.ENDED },
        select: meetingSummarySelect,
      }),
    ),
  );

  await Promise.all(
    ended.map(async (meeting) => {
      try {
        await deleteRoom(meeting.roomName);
      } catch (error) {
        console.error(
          `Failed to delete LiveKit room for meeting ${meeting.id}`,
          error,
        );
      }
    }),
  );

  return ended;
};

export const runSchedulerCycle = async (now = new Date()) => {
  const activated = await activateScheduledMeetings(now);
  const ended = await endExpiredMeetings(now);

  return {
    timestamp: now.toISOString(),
    activated,
    ended,
  };
};

