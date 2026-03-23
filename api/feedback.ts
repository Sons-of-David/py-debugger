import type { VercelRequest, VercelResponse } from '@vercel/node';

const TYPE_LABELS: Record<string, string> = {
  bug: 'bug',
  suggestion: 'suggestion',
  'code-share': 'code-share',
  other: 'other',
};

const TYPE_DISPLAY: Record<string, string> = {
  bug: 'Bug report',
  suggestion: 'Suggestion',
  'code-share': 'Interesting code',
  other: 'Other',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, type, message, json } = req.body as {
    name?: string;
    email?: string;
    type?: string;
    message?: string;
    json?: string;
  };

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;

  if (!token || !owner || !repo) {
    console.error('Missing GitHub env vars');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const typeKey = type && TYPE_LABELS[type] ? type : 'other';
  const typeDisplay = TYPE_DISPLAY[typeKey];
  const shortMessage = message.trim().slice(0, 60);
  const title = `[${typeDisplay}] ${shortMessage}${message.trim().length > 60 ? '…' : ''}`;

  const nameStr = name?.trim() || '*Anonymous*';
  const emailStr = email?.trim() || '*not provided*';

  const codeSection = json
    ? `\n## Code\nLoad this as a \`.json\` file, then use the Load option in the app.\n\n\`\`\`json\n${json}\n\`\`\``
    : '';

  const body = `**Name:** ${nameStr}
**Email:** ${emailStr}

## Message
${message.trim()}
${codeSection}`;

  const labels = ['feedback', typeKey];

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ title, body, labels }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error('GitHub API error:', response.status, text);
    return res.status(500).json({ error: 'Failed to create issue' });
  }

  const issue = await response.json() as { html_url: string; number: number };
  return res.status(200).json({ issueUrl: issue.html_url, issueNumber: issue.number });
}
