import { Router } from 'express';
import { getAnalytics, getActivityFeed } from '../controllers/insightController';

const router = Router();
router.get('/analytics', getAnalytics);
router.get('/feed', getActivityFeed);
export default router;