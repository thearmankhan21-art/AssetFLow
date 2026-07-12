import { Router } from 'express';
import { getAuditCycles, createAuditCycle, submitAuditRecord, closeAuditCycle } from '../controllers/auditController';
import { requireAdmin, requireAssetManagerOrAdmin } from '../middlewares/roleGuard';

const router = Router();
router.get('/', getAuditCycles);
router.post('/', requireAdmin, createAuditCycle);
router.post('/record', submitAuditRecord); // Auditors use this
router.put('/:audit_cycle_id/close', requireAdmin, closeAuditCycle);
export default router;