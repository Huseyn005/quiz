import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { readdirSync, readFileSync } from 'fs';
import { Redis } from '@upstash/redis';
import { extname, basename } from 'path';

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

const files = readdirSync('.').filter(file => extname(file).toLowerCase() === '.csv');

async function main() {
    if (files.length === 0) {
        console.log('❗ No CSV files found in this directory.');
        return;
    }

    for (const file of files) {
        const keyName = `csv:${basename(file, '.csv')}`; // e.g. fiziologiya.csv → csv:fiziologiya

        console.log(`📁 Reading: ${file}`);
        const csvString = readFileSync(file, 'utf8');

        console.log(`⬆️ Uploading to Redis key: "${keyName}" ...`);
        await redis.set(keyName, csvString);

        console.log(`✅ Uploaded ${file} → ${keyName}\n`);
    }

    console.log('🎉 All CSV files uploaded automatically!');
}

main().catch(console.error);
