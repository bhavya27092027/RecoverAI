import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { MongoBinary } from 'mongodb-memory-server-core';

async function startPersistentLocalMongo() {
  const dbDir = path.resolve(__dirname, '..', '..', 'data', 'db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log('================================================================');
  console.log('   RecoverAI — Persistent Local MongoDB Engine (Port 27017)');
  console.log('================================================================\n');
  console.log(`[Storage Path] Persisting data to: ${dbDir}`);

  try {
    const mongodPath = await MongoBinary.getPath();
    console.log(`[Binary Path]  Using MongoDB binary: ${mongodPath}\n`);

    const mongoProcess = spawn(mongodPath, ['--dbpath', dbDir, '--port', '27017'], {
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    mongoProcess.stdout.on('data', (data: Buffer) => {
      const msg = data.toString();
      if (msg.includes('Waiting for connections')) {
        console.log('🚀 [MongoDB] Persistent database is READY and listening on mongodb://localhost:27017/recoverai');
        console.log('💾 [MongoDB] All user accounts, customers, transactions, and AI analyses will persist across restarts.\n');
      }
    });

    mongoProcess.stderr.on('data', (data: Buffer) => {
      console.error(`[MongoDB Error] ${data.toString()}`);
    });

    mongoProcess.on('close', (code) => {
      console.log(`[MongoDB] Process exited with code ${code}`);
    });

    const cleanup = () => {
      console.log('\n[MongoDB] Gracefully shutting down persistent database...');
      mongoProcess.kill('SIGINT');
      setTimeout(() => process.exit(0), 1000);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (err) {
    console.error('Failed to start local MongoDB engine:', err);
    process.exit(1);
  }
}

startPersistentLocalMongo();
