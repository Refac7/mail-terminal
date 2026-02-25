// src/pages/api/auth/login.ts
import type { APIRoute } from 'astro';
import { createSessionCookie } from '../../../lib/auth';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '../../../lib/rateLimit';

export const POST: APIRoute = async ({ request, clientAddress }) => {
    // 1. 获取客户端 IP (兼容本地和代理环境)
    const ip = request.headers.get('x-forwarded-for') || clientAddress || 'unknown';
    
    // 2. 检查频率限制
    const { allowed, remaining } = checkRateLimit(ip);
    
    if (!allowed) {
        return new Response(JSON.stringify({ 
            error: 'LOCKOUT_PROTOCOL_INITIATED', 
            message: 'Too many failed attempts. Try again in 15 minutes.' 
        }), { status: 429 });
    }

    try {
        const data = await request.json();
        const systemPassword = import.meta.env.SYSTEM_PASSWORD;

        if (data.password === systemPassword) {
            // 登录成功，清除记录
            clearRateLimit(ip);
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Set-Cookie': createSessionCookie() }
            });
        }
        
        // 登录失败，记录尝试
        recordFailedAttempt(ip);
        console.log(`[Auth] Failed login from ${ip}. Remaining attempts: ${remaining - 1}`);
        
        return new Response(JSON.stringify({ 
            error: 'ACCESS_DENIED', 
            remaining: remaining - 1 
        }), { status: 401 });

    } catch (e) {
        return new Response(JSON.stringify({ error: 'SYSTEM_ERROR' }), { status: 500 });
    }
};