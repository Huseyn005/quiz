import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { token } = req.body || {};

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Get client IP (Vercel: x-forwarded-for header)
        const forwarded = req.headers['x-forwarded-for'];
        const clientIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0] || req.socket?.remoteAddress || 'unknown';

        const key = `token:${token}`;

        // Existing IP saved for this token?
        const existingIp = await redis.get(key);

        if (!existingIp) {
            // First time: bind this token to this IP
            await redis.set(key, clientIp);
            return res.status(200).json({ ok: true, firstUse: true });
        }

        if (existingIp !== clientIp) {
            // Token already locked to another IP
            return res.status(403).json({
                ok: false,
                error: 'This token is already used from another network.',
            });
        }

        // Same IP as before → allow
        return res.status(200).json({ ok: true, firstUse: false });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
}
