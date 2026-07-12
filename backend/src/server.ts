import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testDBConnection } from './config/db';
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes'; //
// Add this import at the top
import adminRoutes from './routes/adminRoutes';



// Load environment variables from .env
dotenv.config();

// Initialize Express app
const app: Application = express();
const PORT = process.env.PORT || 5005;

// Global Middlewares
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes); 


app.use('/api/admin', adminRoutes);

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
    await testDBConnection();
    app.listen(PORT, () => {
      console.log(`🚀 Server successfully started on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start the server. Exiting process:', error);
    process.exit(1);
  }
};

startServer();