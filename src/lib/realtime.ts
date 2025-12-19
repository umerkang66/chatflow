import { redis } from '@/lib/redis';
import { InferRealtimeEvents, Realtime } from '@upstash/realtime';
import z from 'zod';

const schema = {
  chat: {
    message: z.object({
      id: z.string(),
      sender: z.string(),
      text: z.string(),
      timestamp: z.number(),
      roomId: z.string(),
      token: z.string().optional(),
    }),
    destroy: z.object({
      isDestroyed: z.literal(true),
    }),
  },
};

export const realtime = new Realtime({ schema, redis });

export type RealtimeEvents = InferRealtimeEvents<typeof realtime>;

export type Message = z.infer<(typeof schema)['chat']['message']>;
