'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { Nav } from '@/components/Nav';

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
      <Nav />
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
        <div className="absolute top-0 right-0 h-[600px] w-[600px] bg-red-600/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-red-600/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 sm:px-8 lg:px-12 py-24 sm:py-32">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-10 shadow-2xl">
          <p className="text-sm text-gray-400">Redirecting to the meeting…</p>
        </div>
      </div>
    </main>
  );
}

