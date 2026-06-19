import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import User from '../Models/auth.model.js';
import Game from '../Models/game.model.js';
import { GlobalLeaderboard } from '../Models/leaderboard.model.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/uod-gaming';

const runBackup = async () => {
    try {
        console.log('⏳ Connecting to MongoDB for backup...');
        await mongoose.connect(MONGO_URL);
        
        const backupDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const runDir = path.join(backupDir, `backup-${timestamp}`);
        fs.mkdirSync(runDir);

        console.log('📦 Fetching collection data...');
        const users = await User.find({});
        const games = await Game.find({});
        const leaderboards = await GlobalLeaderboard.find({});

        console.log('💾 Writing files to backups directory...');
        fs.writeFileSync(path.join(runDir, 'users.json'), JSON.stringify(users, null, 2));
        fs.writeFileSync(path.join(runDir, 'games.json'), JSON.stringify(games, null, 2));
        fs.writeFileSync(path.join(runDir, 'leaderboards.json'), JSON.stringify(leaderboards, null, 2));

        console.log(`✅ Backup completed successfully at: ${runDir}`);
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Backup process failed:', error);
        process.exit(1);
    }
};

runBackup();
