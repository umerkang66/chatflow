'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';

import { client } from '@/lib/client';
import { useUsername } from '@/hooks/use-username';

const Page = () => {
  return (
    <Suspense>
      <Lobby />
    </Suspense>
  );
};

export default Page;

function Lobby() {
  const { username } = useUsername();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [roomId, setRoomId] = useState('');

  const wasDestroyed = searchParams.get('destroyed') === 'true';
  const error = searchParams.get('error');

  const { mutate: createRoom } = useMutation({
    mutationFn: async () => {
      const res = await client.room.create.post();
      if (res.status === 200) {
        router.push(`/room/${res.data?.roomId}`);
      }
    },
  });

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    router.push(`/room/${roomId.trim()}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {wasDestroyed && (
          <div className="bg-red-950/50 border border-red-900 p-4 text-center">
            <p className="text-red-500 text-sm font-bold">ROOM DESTROYED</p>
            <p className="text-zinc-500 text-xs mt-1">
              All messages were permanently deleted.
            </p>
          </div>
        )}

        {error === 'room-not-found' && (
          <div className="bg-red-950/50 border border-red-900 p-4 text-center">
            <p className="text-red-500 text-sm font-bold">ROOM NOT FOUND</p>
            <p className="text-zinc-500 text-xs mt-1">
              This room may have expired or never existed.
            </p>
          </div>
        )}

        {error === 'room-full' && (
          <div className="bg-red-950/50 border border-red-900 p-4 text-center">
            <p className="text-red-500 text-sm font-bold">ROOM FULL</p>
            <p className="text-zinc-500 text-xs mt-1">
              This room is at maximum capacity.
            </p>
          </div>
        )}

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-green-500">
            {'>'}private_chat
          </h1>
          <p className="text-zinc-500 text-sm">
            A private, self-destructing chat room.
          </p>
        </div>

        <div className="border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md space-y-6">
          {/* IDENTITY */}
          <div className="space-y-2">
            <label className="text-zinc-500">Your Identity</label>
            <div className="bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-400 font-mono">
              {username}
            </div>
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-3">
            <label className="text-zinc-500">Join Existing Room</label>
            <input
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              placeholder="Enter Room ID"
              className="w-full bg-zinc-950 border border-zinc-800 p-3 text-sm text-white font-mono outline-none"
            />
            <button
              type="submit"
              className="w-full border border-zinc-700 p-3 text-sm font-bold hover:bg-zinc-800 transition-colors"
            >
              JOIN ROOM
            </button>
          </form>

          <button
            onClick={() => createRoom()}
            className="w-full bg-zinc-100 text-black p-3 text-sm font-bold hover:bg-zinc-50 transition-colors"
          >
            CREATE SECURE ROOM
          </button>
        </div>
      </div>
    </main>
  );
}
