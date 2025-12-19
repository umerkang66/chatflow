import { Elysia } from 'elysia';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { authMiddleware } from './auth';
import { redis } from '@/lib/redis';
import { Message, realtime } from '@/lib/realtime';

const ROOM_TTL_SECONDS = 60 * 10;

const rooms = new Elysia({ prefix: '/room' })
  .post('/create', async () => {
    const roomId = nanoid();

    await redis.hset(`meta:${roomId}`, {
      // which users are connected to the chatroom, can only be two
      connected: [],
      createdAt: Date.now(),
    });

    await redis.expire(`meta:${roomId}`, ROOM_TTL_SECONDS);

    return { roomId };
  })
  .use(authMiddleware)
  .get(
    '/ttl',
    async ({ auth }) => {
      const ttl = await redis.ttl(`meta:${auth.roomId}`);
      return { ttl: ttl > 0 ? ttl : 0 };
    },
    { query: z.object({ roomId: z.string() }) }
  )
  .delete(
    '/',
    async ({ auth: { roomId } }) => {
      await realtime
        .channel(roomId)
        .emit('chat.destroy', { isDestroyed: true });

      await Promise.all([
        redis.del(roomId),
        redis.del(`meta:${roomId}`),
        redis.del(`messages:${roomId}`),
      ]);
    },
    { query: z.object({ roomId: z.string() }) }
  );

const messages = new Elysia({ prefix: '/messages' })
  .use(authMiddleware)
  .post(
    '/',
    async ({ auth, body }) => {
      const { sender, text } = body;
      const { roomId, token } = auth;

      const roomExists = await redis.exists(`meta:${roomId}`);

      if (!roomExists) throw new Error('Room does not exist');

      const message: Message = {
        id: nanoid(),
        sender,
        text,
        timestamp: Date.now(),
        roomId,
      };

      // add message to history
      await redis.rpush(`messages:${roomId}`, {
        ...message,
        token,
      });

      await realtime.channel(roomId).emit('chat.message', message);

      // housekeeping
      const remaining = await redis.ttl(`meta:${roomId}`);

      await Promise.all([
        redis.expire(`meta:${roomId}`, remaining),
        redis.expire(`messages:${roomId}`, remaining),
        redis.expire(roomId, remaining),
      ]);
    },
    {
      query: z.object({ roomId: z.string() }),
      body: z.object({
        sender: z.string().max(100),
        text: z.string().max(1000),
      }),
    }
  )
  .get(
    '/',
    async ({ auth: { roomId, token } }) => {
      const messages = await redis.lrange<Message>(`messages:${roomId}`, 0, -1);

      return {
        messages: messages.map(message => ({
          ...message,
          token: token === token ? token : undefined,
        })),
      };
    },
    // this is because auth middleware expects the roomId
    { query: z.object({ roomId: z.string() }) }
  );

const app = new Elysia({ prefix: '/api' }).use(rooms).use(messages);

export const GET = app.fetch;
export const POST = app.fetch;
export const DELETE = app.fetch;

export type App = typeof app;
