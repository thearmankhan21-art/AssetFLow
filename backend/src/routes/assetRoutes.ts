import { Router } from 'express';
import { getAssets, registerAsset } from '../controllers/assetController';
import { requireAssetManagerOrAdmin } from '../middlewares/roleGuard';

const router = Router();

// Everyone logged in can view and search the directory
router.get('/', getAssets);

// Only Admins and Asset Managers can register new items[cite: 4]
router.post('/register', requireAssetManagerOrAdmin, registerAsset);

export default router;