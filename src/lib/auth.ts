// src/lib/auth.ts
import jwt from 'jsonwebtoken';
import { parse, serialize } from 'cookie';

// 1. 使用 import.meta.env 读取 (兼容 Astro)
const SECRET = import.meta.env.JWT_SECRET || 'dev_secret';

export const verifyToken = (request: Request): boolean => {
    // 调试日志：查看收到的 Cookie 字符串
    const cookieHeader = request.headers.get('Cookie') || '';
    // console.log('[Auth] Header:', cookieHeader); 

    const cookies = parse(cookieHeader);
    const token = cookies['auth_token'];

    if (!token) {
        console.log('[Auth] Token missing');
        return false;
    }

    try {
        jwt.verify(token, SECRET);
        return true;
    } catch (e) {
        console.log('[Auth] Token invalid:', (e as Error).message);
        return false;
    }
};

export const createSessionCookie = () => {
    const token = jwt.sign({ role: 'admin' }, SECRET, { expiresIn: '2h' });
    
    // 2. 放宽 Cookie 限制 (Lax + Secure 判断优化)
    return serialize('auth_token', token, {
        httpOnly: true,
        // 如果是开发环境 (localhost)，Secure 必须为 false，否则浏览器不存
        secure: import.meta.env.PROD, 
        sameSite: 'lax', // Strict 容易在重定向时丢失 Cookie，Lax 更稳定
        maxAge: 7200,
        path: '/'
    });
};

export const clearSessionCookie = () => {
    return serialize('auth_token', '', {
        httpOnly: true,
        maxAge: 0,
        path: '/'
    });
};