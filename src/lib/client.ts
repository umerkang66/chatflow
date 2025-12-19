import { treaty } from '@elysiajs/eden';
import type { App } from '../app/api/[[...slugs]]/route';

const baseURL =
  process.env.NODE_ENV === 'production'
    ? 'https://chatflow-umer.vercel.app'
    : 'http://localhost:3000';

export const client = treaty<App>(baseURL).api;
