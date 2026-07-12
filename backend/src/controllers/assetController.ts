import { Request, Response } from 'express';
import db from '../config/db';

export const getAssets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, category, status } = req.query;
    const connection = await db.getConnection();

    let query = `
      SELECT a.asset_id, a.asset_tag, a.name, a.serial_number, a.condition_status, a.lifecycle_status, a.is_shared_resource, c.name as category_name
      FROM assets a
      LEFT JOIN asset_categories c ON a.category_id = c.category_id
      WHERE 1=1
    `;
    const queryParams: any[] = [];

    // Apply dynamic filters[cite: 4]
    if (search) {
      query += ` AND (a.asset_tag LIKE ? OR a.name LIKE ? OR a.serial_number LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) {
      query += ` AND a.category_id = ?`;
      queryParams.push(category);
    }
    if (status) {
      query += ` AND a.lifecycle_status = ?`;
      queryParams.push(status);
    }

    query += ` ORDER BY a.created_at DESC`;

    const [assets] = await connection.query(query, queryParams);
    connection.release();

    res.status(200).json(assets);
  } catch (error) {
    console.error('[Asset API] Fetch Assets Error:', error);
    res.status(500).json({ error: 'Failed to retrieve asset directory.' });
  }
};

export const registerAsset = async (req: Request, res: Response): Promise<void> => {
  const { name, category_id, serial_number, acquisition_date, condition_status, is_shared_resource } = req.body;

  if (!name || !category_id) {
    res.status(400).json({ error: 'Asset name and category are required.' });
    return;
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Auto-generate Asset Tag (AF-XXXX)[cite: 4]
    const [rows]: any = await connection.query('SELECT COUNT(*) as count FROM assets');
    const nextNumber = rows[0].count + 1;
    const assetTag = `AF-${nextNumber.toString().padStart(4, '0')}`;

    // 2. Insert Asset (lifecycle_status defaults to 'Available' in DB schema)[cite: 3]
    await connection.query(
      `INSERT INTO assets (asset_tag, name, category_id, serial_number, acquisition_date, condition_status, is_shared_resource) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [assetTag, name, category_id, serial_number || null, acquisition_date || null, condition_status || 'Good', is_shared_resource || false]
    );

    await connection.commit();
    console.log(`[Asset API] Registered new asset: ${assetTag}`);
    res.status(201).json({ message: 'Asset registered successfully.', asset_tag: assetTag });
  } catch (error: any) {
    await connection.rollback();
    console.error('[Asset API] Failed to register asset:', error);
    res.status(500).json({ error: 'Database error while registering asset.' });
  } finally {
    connection.release();
  }
};