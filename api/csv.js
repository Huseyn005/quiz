import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
    try {
        const fileParam = req.query.file;

        if (!fileParam) {
            res.status(400).send('Missing ?file= parameter');
            return;
        }

        const fileName = fileParam.split(/[\\/]/).pop();
        const base = fileName.replace(/\.csv$/i, '');
        const key = `csv:${base}`;

        const csv = await redis.get(key);

        if (!csv) {
            res.status(404).send(`No data found for key: ${key}`);
            return;
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(csv);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error: ' + err.message);
    }
}
