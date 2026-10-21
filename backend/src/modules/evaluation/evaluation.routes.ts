import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  runBenchmark,
  listRuns,
  getRun,
} from './evaluation.controller';

const router = Router();

router.use(authenticate);

router.post('/run', runBenchmark);
router.get('/runs', listRuns);
router.get('/runs/:id', getRun);

export default router;
