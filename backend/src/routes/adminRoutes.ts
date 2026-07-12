import { Router } from 'express';
import { getMasterData, promoteEmployee, createDepartment, createCategory } from '../controllers/adminController';
import { requireAdmin } from '../middlewares/roleGuard';

const router = Router();

router.use(requireAdmin);

router.get('/master-data', getMasterData);
router.put('/promote', promoteEmployee);
router.post('/departments', createDepartment); // New Route
router.post('/categories', createCategory);    // New Route

export default router;