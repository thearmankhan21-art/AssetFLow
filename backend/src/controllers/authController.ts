import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required.' });
    return;
  }

  try {
    const connection = await db.getConnection();
    
    // Check if user already exists
    const [existingUsers]: any = await connection.query(
      'SELECT email FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      connection.release();
      res.status(409).json({ error: 'Email is already registered.' });
      return;
    }

    // Hash password (Observability: log securely, never log plain text passwords)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user with strict 'Employee' role
    const [result]: any = await connection.query(
      `INSERT INTO users (name, email, password_hash, role, status) 
       VALUES (?, ?, ?, 'Employee', 'Active')`,
      [name, email, passwordHash]
    );

    connection.release();
    console.log(`[Auth] New employee registered: ${email}`);

    res.status(201).json({ 
      message: 'Account created successfully. You are assigned the Employee role by default.' 
    });
  } catch (error) {
    console.error('[Auth Error] Registration failed:', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const connection = await db.getConnection();
    
    // Fetch user
    const [users]: any = await connection.query(
      'SELECT user_id, name, email, password_hash, role, department_id, status FROM users WHERE email = ?',
      [email]
    );
    connection.release();

    const user = users[0];

    if (!user || user.status === 'Inactive') {
      res.status(401).json({ error: 'Invalid credentials or inactive account.' });
      return;
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    // Generate JWT for session validation
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        role: user.role, 
        departmentId: user.department_id 
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    console.log(`[Auth] User logged in: ${email} (${user.role})`);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[Auth Error] Login failed:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
};