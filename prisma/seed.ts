import { addMinutes } from 'date-fns';
import bcrypt from 'bcryptjs';

import { prisma } from '../lib/prisma';
import { generateMeetingPassword, generateRoomName } from '../lib/meetings';

async function main() {
  await prisma.message.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.meeting.deleteMany();

  const now = new Date();

  const seedMeetings = [
    {
      title: 'Design Sync',
      description: 'Weekly product design alignment meeting.',
      isPublic: false,
      password: 'design23',
      startOffsetMinutes: -30,
      durationMinutes: 60,
      participants: ['ava@example.com', 'liam@example.com', 'noah@example.com'],
    },
    {
      title: 'Town Hall',
      description: 'Company-wide updates and Q&A.',
      isPublic: true,
      password: generateMeetingPassword(),
      startOffsetMinutes: 120,
      durationMinutes: 90,
      participants: [],
    },
    {
      title: 'Incident Review',
      description: 'Post-mortem for the recent infrastructure incident.',
      isPublic: false,
      password: 'infraSecure1',
      startOffsetMinutes: -180,
      durationMinutes: 45,
      participants: ['sophia@example.com', 'ethan@example.com'],
    },
    {
      title: 'Product AMA',
      description: 'Live session with the product team.',
      isPublic: true,
      password: generateMeetingPassword(),
      startOffsetMinutes: 360,
      durationMinutes: 60,
      participants: ['olivia@example.com'],
    },
  ];

  for (const meeting of seedMeetings) {
    const startTime = addMinutes(now, meeting.startOffsetMinutes);
    const endTime = addMinutes(startTime, meeting.durationMinutes);

    const roomName = generateRoomName(meeting.title);
    const joinUrl = `http://localhost:3000/join/${roomName}?password=${meeting.password}`;
    const passwordHash = await bcrypt.hash(meeting.password, 10);

    const created = await prisma.meeting.create({
      data: {
        title: meeting.title,
        description: meeting.description,
        startTime,
        endTime,
        status: startTime <= now && endTime >= now ? 'ACTIVE' : startTime > now ? 'SCHEDULED' : 'ENDED',
        isPublic: meeting.isPublic,
        isInstant: false,
        passwordHash,
        roomName,
        joinUrl,
        participants: {
          create: meeting.participants.map((email) => ({
            email,
          })),
        },
      },
    });

    if (meeting.participants.length > 0) {
      await prisma.message.createMany({
        data: [
          {
            meetingId: created.id,
            senderEmail: meeting.participants[0],
            senderName: 'Moderator',
            content: `Welcome to the ${meeting.title.toLowerCase()}!`,
          },
          {
            meetingId: created.id,
            senderEmail: meeting.participants[1] ?? meeting.participants[0],
            senderName: 'Team Member',
            content: 'Notes and resources will be shared here.',
          },
        ],
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

