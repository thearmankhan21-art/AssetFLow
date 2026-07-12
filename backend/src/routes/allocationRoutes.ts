import { Router } from 'express';
import { 
  getAllocationsAndTransfers, allocateAsset, 
  requestTransfer, approveTransfer, returnAsset 
} from '../controllers/allocationController';
import { requireAssetManagerOrAdmin } from '../middlewares/roleGuard';

const router = Router();

// Retrieve directory data
router.get('/', getAllocationsAndTransfers);

// Core Workflow Routes (Protected)[cite: 4]
router.post('/allocate', requireAssetManagerOrAdmin, allocateAsset);
router.post('/transfer', requestTransfer); // Anyone can request a transfer
router.put('/transfers/:transfer_id/approve', requireAssetManagerOrAdmin, approveTransfer);
router.put('/:allocation_id/return', requireAssetManagerOrAdmin, returnAsset);

export default router;