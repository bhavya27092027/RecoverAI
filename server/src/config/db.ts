import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<void> => {
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
      await mongoose.connect(memoryUri);
      console.log(`[Database (Test)] Connected to isolated in-memory test database: ${memoryUri}`);
      return;
    } catch (memErr: any) {
      console.error('[Database (Test)] Failed to initialize test in-memory database:', memErr);
      throw memErr;
    }
  }

  // Development & Production: Persistent MongoDB Connection
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/recoverai';

  try {
    console.log(`[Database] Connecting to persistent MongoDB: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ [Database] Successfully connected to persistent MongoDB at ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
    console.log(`💾 [Database] Persistent storage active — user, merchant, customer, transaction, and AI analysis data will persist across restarts.`);
  } catch (err: any) {
    console.error('\n❌ [Database Error] Could not connect to persistent MongoDB database!');
    console.error(`   Error details: ${err.message}\n`);
    console.error('----------------------------------------------------------------------');
    console.error('REQUIRED SETUP FOR PERSISTENT MONGODB STORAGE:');
    console.error('----------------------------------------------------------------------');
    console.error('Option 1 (Built-in Local DB): Run the built-in persistent local database:');
    console.error('   npm run db:local');
    console.error('   (Persists all data to server/data/db/ on port 27017)\n');
    console.error('Option 2 (Local MongoDB Service): Start your local MongoDB daemon:');
    console.error('   mongod --dbpath <your_data_dir>');
    console.error('   or: net start MongoDB\n');
    console.error('Option 3 (Docker):');
    console.error('   docker run -d -p 27017:27017 --name recoverai-mongo mongo:latest\n');
    console.error('Option 4 (MongoDB Atlas): Set MONGODB_URI in server/.env:');
    console.error('   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/recoverai\n');
    console.error('----------------------------------------------------------------------\n');
    
    // Do NOT silently fall back to in-memory database in development
    throw new Error(
      `Persistent MongoDB connection failed. Please ensure a MongoDB instance is running at ${uri} or start the local engine with 'npm run db:local'.`
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
