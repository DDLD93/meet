import { NextResponse } from 'next/server';

import { runSchedulerCycle } from '@/lib/scheduler';

export async function POST() {
  const result = await runSchedulerCycle(new Date());
  return NextResponse.json(result);
}

export async function GET() {
  const result = await runSchedulerCycle(new Date());
  return NextResponse.json(result);
}

