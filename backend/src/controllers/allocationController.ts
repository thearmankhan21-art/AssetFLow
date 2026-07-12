import { Request, Response } from 'express';
import db from '../config/db';

export const getAllocationsAndTransfers = async (req: Request, res: Response): Promise<void> => {
  try {
    const connection = await db.getConnection();
    
    const [allocations] = await connection.query(`
      SELECT al.allocation_id, al.expected_return_date, al.status, 
             a.asset_tag, a.name as asset_name, u.name as assignee_name
      FROM allocations al
      JOIN assets a ON al.asset_id = a.asset_id
      JOIN users u ON al.assigned_to_user = u.user_id
      WHERE al.status = 'Active'
      ORDER BY al.created_at DESC
    `);

    const [transfers] = await connection.query(`
      SELECT t.transfer_id, t.status, t.created_at,
             a.asset_tag, a.name as asset_name, 
             req.name as requested_by_name, hold.name as current_holder_name
      FROM transfer_requests t
      JOIN assets a ON t.asset_id = a.asset_id
      JOIN users req ON t.requested_by = req.user_id
      JOIN users hold ON t.current_holder = hold.user_id
      WHERE t.status = 'Pending'
      ORDER BY t.created_at ASC
    `);

    connection.release();
    res.status(200).json({ allocations, transfers });
  } catch (error) {
    console.error('[Allocation API] Fetch Error:', error);
    res.status(500).json({ error: 'Failed to retrieve allocation data.' });
  }
};

export const allocateAsset = async (req: Request, res: Response): Promise<void> => {
  const { asset_id, assigned_to_user, expected_return_date } = req.body;

  if (!asset_id || !assigned_to_user) {
    res.status(400).json({ error: 'Asset and User must be selected.' });
    return;
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction(); // ACID: Start

    // Validation: Check if already allocated to prevent double-allocation[cite: 3, 4]
    const [existing]: any = await connection.query(
      `SELECT al.allocation_id, u.name as holder_name, u.user_id as holder_id
       FROM allocations al JOIN users u ON al.assigned_to_user = u.user_id 
       WHERE al.asset_id = ? AND al.status = 'Active'`,
      [asset_id]
    );

    if (existing.length > 0) {
      await connection.rollback();
      res.status(409).json({ 
        error: `Conflict: Asset is currently held by ${existing[0].holder_name}.`,
        current_holder_id: existing[0].holder_id,
        current_holder_name: existing[0].holder_name
      });
      return;
    }

    // Insert new allocation[cite: 3]
    await connection.query(
      `INSERT INTO allocations (asset_id, assigned_to_user, expected_return_date) VALUES (?, ?, ?)`,
      [asset_id, assigned_to_user, expected_return_date || null]
    );

    // Update asset lifecycle status[cite: 3, 4]
    await connection.query(
      `UPDATE assets SET lifecycle_status = 'Allocated' WHERE asset_id = ?`,
      [asset_id]
    );

    await connection.commit(); // ACID: Commit
    res.status(201).json({ message: 'Asset allocated successfully.' });
  } catch (error: any) {
    await connection.rollback(); // ACID: Rollback
    console.error('[Allocation API] Failed to allocate:', error);
    res.status(500).json({ error: 'Database error during allocation.' });
  } finally {
    connection.release();
  }
};

export const requestTransfer = async (req: Request, res: Response): Promise<void> => {
  const { asset_id, requested_by, current_holder } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.query(
      `INSERT INTO transfer_requests (asset_id, requested_by, current_holder) VALUES (?, ?, ?)`,
      [asset_id, requested_by, current_holder]
    );
    res.status(201).json({ message: 'Transfer request submitted successfully.' });
  } catch (error) {
    console.error('[Allocation API] Transfer Request Error:', error);
    res.status(500).json({ error: 'Failed to submit transfer request.' });
  } finally {
    connection.release();
  }
};

export const approveTransfer = async (req: Request, res: Response): Promise<void> => {
  const { transfer_id } = req.params;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Get transfer details[cite: 3]
    const [transfers]: any = await connection.query(
      `SELECT asset_id, requested_by FROM transfer_requests WHERE transfer_id = ?`,
      [transfer_id]
    );
    
    if (transfers.length === 0) throw new Error('Transfer request not found.');
    const { asset_id, requested_by } = transfers[0];

    // 2. Mark old allocation as 'Returned'[cite: 3, 4]
    await connection.query(
      `UPDATE allocations SET status = 'Returned' WHERE asset_id = ? AND status = 'Active'`,
      [asset_id]
    );

    // 3. Create new allocation[cite: 3]
    await connection.query(
      `INSERT INTO allocations (asset_id, assigned_to_user) VALUES (?, ?)`,
      [asset_id, requested_by]
    );

    // 4. Mark transfer as Approved[cite: 3, 4]
    await connection.query(
      `UPDATE transfer_requests SET status = 'Approved' WHERE transfer_id = ?`,
      [transfer_id]
    );

    await connection.commit();
    res.status(200).json({ message: 'Transfer approved and asset re-allocated.' });
  } catch (error: any) {
    await connection.rollback();
    console.error('[Allocation API] Approve Transfer Error:', error);
    res.status(500).json({ error: 'Failed to process transfer approval.' });
  } finally {
    connection.release();
  }
};

export const returnAsset = async (req: Request, res: Response): Promise<void> => {
  const { allocation_id } = req.params;
  const { condition_notes } = req.body; // Captured during return flow
  
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [allocs]: any = await connection.query(`SELECT asset_id FROM allocations WHERE allocation_id = ?`, [allocation_id]);
    if (allocs.length === 0) throw new Error('Allocation not found.');
    const asset_id = allocs[0].asset_id;

    // Mark allocation as returned[cite: 3, 4]
    await connection.query(`UPDATE allocations SET status = 'Returned' WHERE allocation_id = ?`, [allocation_id]);

    // Revert asset status back to Available
    await connection.query(`UPDATE assets SET lifecycle_status = 'Available' WHERE asset_id = ?`, [asset_id]);

    // Logic to save condition_notes would go here (e.g., in an audit log table)

    await connection.commit();
    res.status(200).json({ message: 'Asset returned successfully.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to process return.' });
  } finally {
    connection.release();
  }
};