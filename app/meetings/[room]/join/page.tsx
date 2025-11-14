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
    <main className="relative min-h-screen bg-black">
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-6">
        <div className="text-xl font-bold text-white">
          VINI <span className="text-red-500">MEET</span>
        </div>
      </nav>
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-red-600/10 blur-[120px] rounded-full" />
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <p className="text-sm text-gray-400">Redirecting to the meeting…</p>
      </div>
    </main>
  );
}

