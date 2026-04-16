// server/src/routes/ai.js
import express from 'express'
import { z } from 'zod'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { validate } from '../lib/validate.js'
import { classifyComplaint, narrateAnomaly, matchEntity } from '../lib/ai.js'

const router = express.Router()
router.use(requireAuth)

// ────────────────────────────────────────────────────────────────────
// POST /ai/classify-complaint
// ────────────────────────────────────────────────────────────────────
const classifySchema = z.object({ text: z.string().min(1).max(2000) })

router.post('/classify-complaint',
  requirePermission('complaints.write'),
  validate(classifySchema),
  async (req, res) => {
    try {
      const result = await classifyComplaint(req.valid.text)
      res.json(result)
    } catch (err) {
      console.error('[ai/classify]', err)
      res.json({ category: null, priority: 'medium', title: null })
    }
  }
)

// ────────────────────────────────────────────────────────────────────
// POST /ai/narrate-anomaly  (cached; 30-min TTL)
// ────────────────────────────────────────────────────────────────────
const narrateSchema = z.object({
  metric: z.string().min(1),
  current_value: z.number().nullable(),
  baseline: z.number().nullable(),
  period_label: z.string().optional(),
  series: z.array(z.any()).optional(),
  breakdown: z.any().optional(),
})

const narrateCache = new Map()
const TTL = Number(process.env.AI_NARRATE_CACHE_TTL_MS || 30 * 60 * 1000)

setInterval(() => {
  const now = Date.now()
  for (const [k, v] of narrateCache.entries()) {
    if (now - v.ts > TTL) narrateCache.delete(k)
  }
}, 5 * 60 * 1000).unref()

router.post('/narrate-anomaly',
  requirePermission('reports.read'),
  validate(narrateSchema),
  async (req, res) => {
    const key = `${req.tenantId}:${JSON.stringify(req.valid)}`
    const cached = narrateCache.get(key)
    if (cached && Date.now() - cached.ts < TTL) {
      return res.json({ narration: cached.narration, cached: true })
    }
    try {
      const narration = await narrateAnomaly(
        req.valid.metric,
        req.valid.current_value,
        req.valid.baseline,
        req.valid.breakdown || req.valid.series || null
      )
      narrateCache.set(key, { narration, ts: Date.now() })
      res.json({ narration })
    } catch (err) {
      console.error('[ai/narrate]', err)
      res.json({ narration: null })
    }
  }
)

// ────────────────────────────────────────────────────────────────────
// POST /ai/match-entity
// ────────────────────────────────────────────────────────────────────
const matchSchema = z.object({
  name: z.string().min(1),
  candidates: z.array(z.object({ id: z.string(), name: z.string() })).max(20),
})

router.post('/match-entity',
  requirePermission('rooms.write'),
  validate(matchSchema),
  async (req, res) => {
    try {
      const result = await matchEntity(req.valid.name, req.valid.candidates)
      res.json(result || { match_index: null, confidence: 0, reason: 'No candidates' })
    } catch (err) {
      console.error('[ai/match]', err)
      res.json({ match_index: null, confidence: 0, reason: 'AI unavailable' })
    }
  }
)

export default router
