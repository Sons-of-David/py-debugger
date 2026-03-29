import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'
import { submitFeedback } from './api/feedback'

/** Dev-only: mirrors `api/feedback` so `npm run dev` can create GitHub issues (set vars in `.env.local`). */
function localFeedbackPlugin(): Plugin {
  return {
    name: 'local-feedback',
    configureServer(server) {
      server.middlewares.use('/api/feedback', (req, res, next) => {
        if (req.method !== 'POST') return next()
        let raw = ''
        req.on('data', (chunk: Buffer) => {
          raw += chunk
        })
        req.on('end', () => {
          void (async () => {
            try {
              const parsed = JSON.parse(raw || '{}') as unknown
              const env = loadEnv(server.config.mode, process.cwd(), '')
              const result = await submitFeedback(parsed, {
                GITHUB_TOKEN: env.GITHUB_TOKEN,
                GITHUB_REPO_OWNER: env.GITHUB_REPO_OWNER,
                GITHUB_REPO_NAME: env.GITHUB_REPO_NAME,
              })
              res.writeHead(result.status, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify(result.body))
            } catch (e) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: String(e) }))
            }
          })()
        })
      })
    },
  }
}

function localSavePlugin(): Plugin {
  return {
    name: 'local-save',
    configureServer(server) {
      server.middlewares.use('/api/save-sample', (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk })
        req.on('end', () => {
          try {
            const { name, content } = JSON.parse(body) as { name: string; content: string }
            const filePath = resolve(__dirname, 'src/samples', `${name}.json`)
            writeFileSync(filePath, content, 'utf8')
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            res.writeHead(500)
            res.end(JSON.stringify({ error: String(e) }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), localFeedbackPlugin(), localSavePlugin()],
  server: {
    host: true,          // bind to 0.0.0.0 so the container's network interface is reachable
    allowedHosts: true,  // allow any Host header (needed for Codespaces / VS Code tunnels)
  },
  test: {
    environment: 'node',
  },
})
