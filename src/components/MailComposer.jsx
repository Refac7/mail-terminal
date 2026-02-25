import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// 工具栏配置
const MODULES = {
  toolbar: [
    [{ 'header': [1, 2, false] }],
    ['bold', 'italic', 'underline', 'code-block'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link', 'clean']
  ],
};

// 主题切换组件（亮/暗/系统）
const ThemeToggle = () => {
  const [mode, setMode] = useState('system'); // 'light' | 'dark' | 'system'

  // 初始化：从 localStorage 读取模式，默认 'system'
  useEffect(() => {
    const stored = localStorage.getItem('theme') || 'system';
    setMode(stored);
    // 调用全局方法应用主题（若存在）
    if (window.__setTheme) {
      window.__setTheme(stored);
    } else {
      // 极少数情况下的回退逻辑（一般不会触发）
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = stored === 'system' ? (systemDark ? 'dark' : 'light') : stored;
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, []);

  // 循环切换模式：light → dark → system → light
  const cycleMode = () => {
    let newMode;
    if (mode === 'light') newMode = 'dark';
    else if (mode === 'dark') newMode = 'system';
    else newMode = 'light'; // system → light

    setMode(newMode);
    if (window.__setTheme) {
      window.__setTheme(newMode); // 通过全局方法更新主题并持久化
    } else {
      // 回退（保持功能可用）
      localStorage.setItem('theme', newMode);
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = newMode === 'system' ? (systemDark ? 'dark' : 'light') : newMode;
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  };

  // 根据当前模式显示对应文本和圆点颜色
  const displayText = {
    light: 'LIGHT_MODE',
    dark: 'DARK_MODE',
    system: 'SYSTEM_MODE'
  }[mode];

  const dotColor = {
    light: 'bg-muted-foreground',
    dark: 'bg-primary',
    system: 'bg-blue-500' // 可自定义区分系统的颜色
  }[mode];

  return (
    <button
      type="button"
      onClick={cycleMode}
      className="flex items-center gap-2 px-3 py-1 border border-border bg-background hover:border-primary text-xs font-mono uppercase tracking-widest"
    >
      <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
      {displayText}
    </button>
  );
};

export default function MailComposer() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('IDLE'); 
  
  // 表单状态
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);

  // 发送邮件
  const handleSend = async (e) => {
    e.preventDefault();
    if(!to || !subject) return alert('MISSING_FIELDS');
    
    setLoading(true);
    setStatus('ENCRYPTING_&_TRANSMITTING...');
    
    const formData = new FormData();
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('html', content);
    Array.from(files).forEach(f => formData.append('attachments', f));

    try {
        const res = await fetch('/api/mail/send', { method: 'POST', body: formData });
        if (res.ok) {
            setStatus('SENT_CONFIRMED');
            setTimeout(() => {
                alert('TRANSMISSION_COMPLETE');
                setTo(''); setSubject(''); setContent(''); setFiles([]); 
                setStatus('IDLE');
            }, 500);
        } else {
            const err = await res.json();
            setStatus('ERROR');
            alert(`ERROR: ${err.error}`);
        }
    } catch (e) {
        setStatus('NET_FAIL');
        alert('NETWORK_ERROR');
    }
    setLoading(false);
  };

  const INPUT_CLASS = "w-full bg-background border border-border p-3 text-sm font-mono focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground/50";
  const BTN_CLASS = "px-8 py-3 border border-border font-mono text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-white dark:hover:text-black disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

  return (
    <div className="mx-auto h-full flex flex-col">
        {/* 顶部控制栏 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-border gap-4">
            <div>
                <h2 className="text-xl font-black tracking-tighter text-foreground">COMPOSE<span className="text-primary">.</span>EXE</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`w-1.5 h-1.5 ${loading ? 'bg-yellow-500 animate-bounce' : 'bg-primary'}`}></span>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                        SYS_STATUS: {status}
                    </p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                 <ThemeToggle />
                 <button onClick={() => { window.location.href='/api/auth/logout' }} className="text-[10px] font-mono text-red-500/70 hover:text-red-500 hover:underline">
                    [ LOGOUT_SESSION ]
                 </button>
            </div>
        </div>

        {/* 编辑表单 */}
        <form onSubmit={handleSend} className="space-y-6 flex-1 flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-mono text-primary uppercase tracking-widest ml-1">// RECIPIENT_TARGET</label>
                    <input type="email" required value={to} onChange={e => setTo(e.target.value)} className={INPUT_CLASS} placeholder="user@domain.com" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-mono text-primary uppercase tracking-widest ml-1">// SUBJECT_HEADER</label>
                    <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} className={INPUT_CLASS} placeholder="Classified Information" />
                </div>
            </div>

            <div className="space-y-1 flex-1 flex flex-col">
                <label className="text-[10px] font-mono text-primary uppercase tracking-widest ml-1">// MESSAGE_BODY</label>
                <div className="flex-1 border border-border bg-background hover:border-primary/50">
                    <ReactQuill 
                        theme="snow" 
                        value={content} 
                        onChange={setContent} 
                        modules={MODULES} 
                        className="h-full"
                    />
                </div>
            </div>

            {/* 底部操作区 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-dashed border-border">
                <div className="w-full sm:w-auto">
                    <label className="flex items-center gap-3 cursor-pointer group p-2 border border-transparent hover:border-border">
                         <div className="w-6 h-6 flex items-center justify-center bg-muted group-hover:bg-primary group-hover:text-background">
                            <span className="text-lg leading-none mb-0.5">+</span>
                         </div>
                         <div className="flex flex-col">
                             <span className="text-xs font-mono font-bold group-hover:text-primary">ATTACHMENTS</span>
                             <span className="text-[10px] font-mono text-muted-foreground">{files.length > 0 ? `${files.length} FILES SELECTED` : 'NO FILES'}</span>
                         </div>
                         <input type="file" multiple className="hidden" onChange={e => setFiles(e.target.files)} />
                    </label>
                </div>

                <button type="submit" disabled={loading} className={`${BTN_CLASS} bg-foreground text-background w-full sm:w-auto`}>
                    {loading ? '/// TRANSMITTING...' : 'INITIATE_SEND >>'}
                </button>
            </div>
        </form>
    </div>
  );
}