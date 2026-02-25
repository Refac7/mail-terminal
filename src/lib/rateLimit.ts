// src/lib/rateLimit.ts
const WINDOW_MS = 15 * 60 * 1000; // 15分钟窗口
const MAX_ATTEMPTS = 5; // 最大尝试次数

interface Attempt {
  count: number;
  firstAttempt: number;
}

// 内存存储 (注意：重启服务器会重置)
const ipStore = new Map<string, Attempt>();

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = ipStore.get(ip);

  if (!record) {
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  // 如果窗口已过期，重置
  if (now - record.firstAttempt > WINDOW_MS) {
    ipStore.delete(ip);
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  // 检查是否超过限制
  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - record.count };
}

export function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const record = ipStore.get(ip);

  if (!record) {
    ipStore.set(ip, { count: 1, firstAttempt: now });
  } else {
    // 只有在窗口期内才增加计数
    if (now - record.firstAttempt <= WINDOW_MS) {
      record.count += 1;
    } else {
      // 窗口过期，重置为1
      ipStore.set(ip, { count: 1, firstAttempt: now });
    }
  }
}

export function clearRateLimit(ip: string) {
  ipStore.delete(ip);
}