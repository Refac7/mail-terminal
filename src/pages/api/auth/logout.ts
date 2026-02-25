// src/pages/api/auth/logout.ts
import type { APIRoute } from 'astro';
import { clearSessionCookie } from '../../../lib/auth';

// 同时支持 POST (API调用) 和 GET (浏览器直接跳转)
export const ALL: APIRoute = async ({ redirect }) => {
    // 1. 获取清除 Cookie 的 header
    const cookieHeader = clearSessionCookie();

    // 2. 返回重定向响应
    return new Response(null, {
        status: 302,
        headers: {
            'Set-Cookie': cookieHeader,
            'Location': '/login' // 关键：让浏览器跳转回登录页
        }
    });
};