import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;

/**
 * Safely masks user credentials from MongoDB connection strings for logging
 */
export const sanitizeMongoUri = (uri: string): string => {
  if (!uri) return '';
  return uri.replace(/\/\/(.*?)@/, (_match, credentials) => {
    const parts = credentials.split(':');
    const username = parts[0] || 'user';
    return `//${username}:****@`;
  });
};

export const connectDB = async (): Promise<void> => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTestEnv =
    process.env.NODE_ENV === 'test' || process.env.USE_MEMORY_DB === 'true';

  // Automated test environment uses isolated in-memory Mongo engine
  if (isTestEnv) {
    try {
      if (!memoryServer) {
        memoryServer = await MongoMemoryServer.create({
          instance: {
            dbName: 'recoverai_test',
          },
        });
      }
      const memoryUri = memoryServer.getUri();
      await mongoose.connect(memoryUri, { dbName: 'recoverai_test' });
      console.log(`[Database (Test)] Connected to isolated in-memory test database.`);
      return;
    } catch (memErr: any) {
      console.error('[Database (Test)] Failed to initialize test in-memory database:', memErr.message);
      throw memErr;
    }
  }

  // Production validation: MONGODB_URI must be provided
  if (isProduction && !process.env.MONGODB_URI) {
    throw new Error(
      '[Startup Error] MONGODB_URI environment variable is required in production mode. Please configure your MongoDB Atlas connection string.'
    );
  }

  // Development & Production: Persistent MongoDB Connection (Atlas or Local)
  const rawUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/recoverai';
  const sanitizedUri = sanitizeMongoUri(rawUri);

  try {
    console.log(`[Database] Connecting to persistent MongoDB: ${sanitizedUri}`);
    
    await mongoose.connect(rawUri, {
      dbName: 'recoverai',
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ [Database] Successfully connected to persistent MongoDB at ${sanitizedUri}`);
    console.log(`💾 [Database] Persistent storage active — user, merchant, customer, transaction, and AI analysis data will persist across restarts.`);
  } catch (err: any) {
    console.error('\n❌ [Database Error] Could not connect to persistent MongoDB database!');
    console.error(`   Target host: ${sanitizedUri}`);
    console.error(`   Error details: ${err.message}\n`);
    console.error('----------------------------------------------------------------------');
    console.error('REQUIRED SETUP FOR PERSISTENT MONGODB STORAGE:');
    console.error('----------------------------------------------------------------------');
    console.error('Option 1 (MongoDB Atlas): Set MONGODB_URI in server/.env or environment:');
    console.error('   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/recoverai?retryWrites=true&w=majority\n');
    console.error('Option 2 (Built-in Local DB): Run the built-in persistent local database:');
    console.error('   npm run db:local');
    console.error('   (Persists all data to server/data/db/ on port 27017)\n');
    console.error('Option 3 (Local MongoDB Service): Start your local MongoDB daemon:');
    console.error('   mongod --dbpath <your_data_dir>');
    console.error('   or: net start MongoDB\n');
    console.error('Option 4 (Docker):');
    console.error('   docker run -d -p 27017:27017 --name recoverai-mongo mongo:latest\n');
    console.error('----------------------------------------------------------------------\n');
    
    throw new Error(
      `Persistent MongoDB connection failed to ${sanitizedUri}. Please verify your MongoDB Atlas credentials/IP whitelist or start the local engine with 'npm run db:local'.`
    );
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
    console.log('[Database] Disconnected from database.');
  } catch (error) {
    console.error('[Database] Error during disconnect:', error);
  }
};
