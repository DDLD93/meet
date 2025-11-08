'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

export default function JoinRedirect() {
  const params = useParams<{ room: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const room = params?.room ?? '';
  const queryString = searchParams?.toString() ?? '';

  useEffect(() => {
    if (!room) {
      return;
    }

    router.replace(`/join/${room}${queryString ? `?${queryString}` : ''}`);
  }, [room, queryString, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <p className="text-sm text-slate-500">Redirecting to the meeting…</p>
    </main>
  );
}

