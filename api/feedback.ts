import type { VercelRequest, VercelResponse } from '@vercel/node';
import { submitFeedback } from './feedback-shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const result = await submitFeedback(req.body, process.env as Record<string, string | undefined>);
  return res.status(result.status).json(result.body);
}
