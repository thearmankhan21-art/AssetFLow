import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testDBConnection } from './config/db';
import authRoutes from './routes/authRoutes';

// Load environment variables from .env
dotenv.config();

// Initialize Express app
const app: Application = express();
const PORT = process.env.PORT || 5000;

// Global Middlewares
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests
app.use('/api/auth', authRoutes);

// Basic Health Check Route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'AssetFlow API is up and running smoothly.' 
  });
});

// Bootstrapping the Server
const startServer = async () => {
  try {
    // 1. Verify the database connection pool is healthy
    await testDBConnection();

    // 2. Start listening for HTTP requests
    app.listen(PORT, () => {
      console.log(`🚀 Server successfully started on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start the server. Exiting process:', error);
    process.exit(1); // Exit if the DB is unreachable
  }
};

startServer();