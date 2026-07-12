import { Request, Response } from 'express';
import db from '../config/db';

export const getAuditCycles = async (req: Request, res: Response): Promise<void> => {
  try {
    const connection = await db.getConnection();
    const [cycles] = await connection.query(`
      SELECT ac.*, d.name as department_name 
      FROM audit_cycles ac 
      LEFT JOIN departments d ON ac.scope_department_id = d.department_id 
      ORDER BY ac.created_at DESC
    `);
    connection.release();
    res.status(200).json(cycles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit cycles.' });
  }
};

export const createAuditCycle = async (req: Request, res: Response): Promise<void> => {
  const { name, scope_department_id, start_date, end_date } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.query(
      `INSERT INTO audit_cycles (name, scope_department_id, start_date, end_date, status) VALUES (?, ?, ?, ?, 'Open')`,
      [name, scope_department_id || null, start_date, end_date]
    );
    res.status(201).json({ message: 'Audit cycle initiated.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create audit cycle.' });
  } finally {
    connection.release();
  }
};

export const submitAuditRecord = async (req: Request, res: Response): Promise<void> => {
  const { audit_cycle_id, asset_id, auditor_id, verification_status, notes } = req.body;
  const connection = await db.getConnection();
  try {
    // Upsert logic: if an auditor changes their mind, it updates the existing record
    await connection.query(`
      INSERT INTO audit_records (audit_cycle_id, asset_id, auditor_id, verification_status, notes)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE verification_status = VALUES(verification_status), notes = VALUES(notes)
    `, [audit_cycle_id, asset_id, auditor_id, verification_status, notes || null]);
    res.status(200).json({ message: `Asset marked as ${verification_status}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record audit status.' });
  } finally {
    connection.release();
  }
};

export const closeAuditCycle = async (req: Request, res: Response): Promise<void> => {
  const { audit_cycle_id } = req.params;
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction(); // ACID: Start

    // 1. Lock the audit cycle
    await connection.query(`UPDATE audit_cycles SET status = 'Closed' WHERE audit_cycle_id = ?`, [audit_cycle_id]);

    // 2. Identify all 'Missing' assets from this cycle and update the master ledger automatically
    await connection.query(`
      UPDATE assets a
      JOIN audit_records ar ON a.asset_id = ar.asset_id
      SET a.lifecycle_status = 'Lost'
      WHERE ar.audit_cycle_id = ? AND ar.verification_status = 'Missing'
    `, [audit_cycle_id]);

    await connection.commit(); // ACID: Commit
    res.status(200).json({ message: 'Audit cycle closed. Discrepancies synced to master inventory.' });
  } catch (error) {
    await connection.rollback(); // ACID: Rollback
    res.status(500).json({ error: 'Database transaction failed during audit closure.' });
  } finally {
    connection.release();
  }
};