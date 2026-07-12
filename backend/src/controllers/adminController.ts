import { Request, Response } from 'express';
import db from '../config/db';

export const getMasterData = async (req: Request, res: Response): Promise<void> => {
  try {
    const connection = await db.getConnection();
    
    // Fetch Departments, Categories, and Employees concurrently for the 3 tabs[cite: 6]
    const [
      [departments],
      [categories],
      [employees]
    ] = await Promise.all([
      connection.query(`
        SELECT d.department_id, d.name, d.status, u.name as head_name 
        FROM departments d LEFT JOIN users u ON d.head_id = u.user_id
      `),
      connection.query(`SELECT category_id, name, custom_fields FROM asset_categories`),
      connection.query(`SELECT user_id, name, email, role, status FROM users`)
    ]);

    connection.release();

    res.status(200).json({ departments, categories, employees });
  } catch (error) {
    console.error('[Admin API] Fetch Master Data Error:', error);
    res.status(500).json({ error: 'Failed to retrieve organizational data.' });
  }
};

export const promoteEmployee = async (req: Request, res: Response): Promise<void> => {
  const { targetUserId, newRole } = req.body;
  
  const validRoles = ['Admin', 'Asset Manager', 'Department Head', 'Employee'];
  if (!validRoles.includes(newRole)) {
    res.status(400).json({ error: 'Invalid role assignment.' });
    return;
  }

  const connection = await db.getConnection();
  
  try {
    // ACID Property: Start Transaction
    await connection.beginTransaction();

    // The Admin promotes an Employee to Department Head or Asset Manager[cite: 6]
    const [result]: any = await connection.query(
      'UPDATE users SET role = ? WHERE user_id = ?',
      [newRole, targetUserId]
    );

    if (result.affectedRows === 0) {
      throw new Error('User not found.');
    }

    // ACID Property: Commit Transaction
    await connection.commit();
    console.log(`[Admin API] User ${targetUserId} promoted to ${newRole}`);
    
    res.status(200).json({ message: `Role successfully updated to ${newRole}` });
  } catch (error: any) {
    // ACID Property: Rollback on failure
    await connection.rollback();
    console.error('[Admin API] Transaction Failed. Rolled back:', error);
    res.status(500).json({ error: error.message || 'Failed to update user role.' });
  } finally {
    connection.release();
  }
};


export const createDepartment = async (req: Request, res: Response): Promise<void> => {
  const { name, status } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Department name is required.' });
    return;
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction(); // ACID: Start

    await connection.query(
      `INSERT INTO departments (name, status) VALUES (?, ?)`,
      [name, status || 'Active']
    );

    await connection.commit(); // ACID: Commit
    console.log(`[Admin API] New department created: ${name}`);
    res.status(201).json({ message: 'Department created successfully.' });
  } catch (error: any) {
    await connection.rollback(); // ACID: Rollback on error
    console.error('[Admin API] Failed to create department:', error);
    res.status(500).json({ error: 'Database error while creating department.' });
  } finally {
    connection.release();
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction(); // ACID: Start

    await connection.query(
      `INSERT INTO asset_categories (name) VALUES (?)`,
      [name]
    );

    await connection.commit(); // ACID: Commit
    console.log(`[Admin API] New category created: ${name}`);
    res.status(201).json({ message: 'Category created successfully.' });
  } catch (error: any) {
    await connection.rollback(); // ACID: Rollback on error
    console.error('[Admin API] Failed to create category:', error);
    res.status(500).json({ error: 'Database error while creating category.' });
  } finally {
    connection.release();
  }
};