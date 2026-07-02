import express from 'express';
import { SimParams } from '../engine/types';
import { runOrchestrator } from '../engine/orchestrator';
import { BASE_SCENARIO } from '../engine/scenario';

const router = express.Router();

router.get('/scenario', (_req, res) => {
  res.json({
    faults: BASE_SCENARIO.faults,
    totalClients: BASE_SCENARIO.totalClients,
    inventory: BASE_SCENARIO.inventory,
  });
});

router.post('/simulate', async (req, res) => {
  const params: SimParams = {
    minuteSLA: Number(req.body.minuteSLA ?? 60),
    switchableFaults: Number(req.body.switchableFaults ?? 22),
    limitedParts: Number(req.body.limitedParts ?? 0) as 0 | 1,
    storm2Window: req.body.storm2Window ?? 'T+6h',
    availableCrews: Number(req.body.availableCrews ?? 22),
    instructions: req.body.instructions || undefined,
  };

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data: object) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    await runOrchestrator(params, send);
  } catch (err) {
    console.error('Orchestrator error:', err);
    send({ type: 'done', elapsed: 'T+error' });
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

export default router;
