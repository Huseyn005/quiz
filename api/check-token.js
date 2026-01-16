import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    try {
        const token = req.body?.token?.trim();
        if (!token) {
            return res.status(400).json({ ok: false, error: 'Token is required' });
        }

        const forwarded = req.headers['x-forwarded-for'];
        const clientIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0] || req.socket?.remoteAddress || 'unknown';

        const key = `token:${token}`;
        let data = await redis.get(key);

        if (data === null) {
            return res.status(401).json({ ok: false, error: 'Invalid token.' });
        }

        // Normalize stored value
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch {
                data = {};
            }
        }

        const savedIp = data.ip;

        if (savedIp && savedIp !== clientIp) {
            return res.status(403).json({
                ok: false,
                error: 'This token is already used on another network.',
            });
        }

        const firstUse = !savedIp;
        if (firstUse) {
            await redis.set(key, JSON.stringify({ ip: clientIp }));
        }

        return res.status(200).json({ ok: true, firstUse });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ ok: false, error: 'Server error' });
    }
}
