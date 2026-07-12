import { Request, Response } from 'express';
import db from '../config/db';

export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const connection = await db.getConnection();
    
    // Utilization by Category
    const [utilization]: any = await connection.query(`
      SELECT c.name as category, COUNT(a.asset_id) as total,
      SUM(CASE WHEN a.lifecycle_status = 'Allocated' THEN 1 ELSE 0 END) as allocated
      FROM assets a JOIN asset_categories c ON a.category_id = c.category_id
      GROUP BY c.category_id
    `);

    // Maintenance Status distribution
    const [maintenance]: any = await connection.query(`
      SELECT status, COUNT(*) as count FROM maintenance_requests GROUP BY status
    `);

    connection.release();
    res.status(200).json({ utilization, maintenance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate analytics payload.' });
  }
};

export const getActivityFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const connection = await db.getConnection();
    
    // Synthesize a global activity feed by UNIONing recent events across normalized tables
    const [logs] = await connection.query(`
      SELECT 'Allocation' as type, al.created_at, CONCAT('Asset ', a.asset_tag, ' assigned to User #', al.assigned_to_user) as detail
      FROM allocations al JOIN assets a ON al.asset_id = a.asset_id
      UNION ALL
      SELECT 'Transfer' as type, t.created_at, CONCAT('Transfer request for Asset ', a.asset_tag, ' marked as ', t.status) as detail
      FROM transfer_requests t JOIN assets a ON t.asset_id = a.asset_id
      UNION ALL
      SELECT 'Maintenance' as type, m.created_at, CONCAT('Maintenance request for Asset ', a.asset_tag, ' is ', m.status) as detail
      FROM maintenance_requests m JOIN assets a ON m.asset_id = a.asset_id
      ORDER BY created_at DESC LIMIT 50
    `);

    connection.release();
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity logs.' });
  }
};