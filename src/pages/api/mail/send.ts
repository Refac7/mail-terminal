import type { APIRoute } from 'astro';
import { verifyToken } from '../../../lib/auth';
import nodemailer from 'nodemailer';

export const POST: APIRoute = async ({ request }) => {
    if (!verifyToken(request)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const formData = await request.formData();
        const to = formData.get('to') as string;
        const subject = formData.get('subject') as string;
        const html = formData.get('html') as string;
        const files = formData.getAll('attachments') as File[];

        // 1. 读取配置
        const smtpHost = import.meta.env.SMTP_HOST;
        const smtpUser = import.meta.env.SMTP_USER; // 登录用的 (例如 "resend")
        const smtpPass = import.meta.env.SMTP_PASS;
        const senderName = import.meta.env.SENDER_NAME || 'Terminal Mailer';
        
        // [修复] 获取独立的发件人邮箱，如果没有则回退到 smtpUser (兼容普通邮箱)
        const senderEmail = import.meta.env.SENDER_EMAIL || smtpUser;

        if (!smtpUser || !smtpPass) {
            throw new Error('SMTP Configuration missing');
        }

        // 2. 创建传输器
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(import.meta.env.SMTP_PORT) || 465,
            secure: import.meta.env.SMTP_SECURE === 'true',
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        // 3. 附件处理
        const attachments = await Promise.all(files.map(async (file) => ({
            filename: file.name,
            content: Buffer.from(await file.arrayBuffer()),
        })));

        // 4. 构造标准 From 头
        // 格式: "Name" <email@domain.com>
        const fromAddress = `"${senderName}" <${senderEmail}>`;

        console.log(`[Mail] Sending...`);
        console.log(`   From: ${fromAddress}`);
        console.log(`   Auth: ${smtpUser}`);

        // 5. 发送
        const info = await transporter.sendMail({
            from: fromAddress, 
            to,
            subject,
            html,
            attachments: attachments.length > 0 ? attachments : undefined
        });

        console.log('[Mail] Success ID:', info.messageId);
        return new Response(JSON.stringify({ status: 'SENT', id: info.messageId }), { status: 200 });

    } catch (error: any) {
        console.error('[Mail] Failed:', error);
        return new Response(JSON.stringify({ error: error.message || 'SMTP_ERROR' }), { status: 500 });
    }
};