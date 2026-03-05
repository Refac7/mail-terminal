import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const MODULES = {
  toolbar: [
    [{ 'header': [1, 2, false] }],
    ['bold', 'italic', 'underline', 'code-block'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link', 'clean']
  ],
};

const ThemeToggle = () => {
  const [mode, setMode] = useState('system');

  useEffect(() => {
    const stored = localStorage.getItem('theme') || 'system';
    setMode(stored);
    if (window.__setTheme) window.__setTheme(stored);
  }, []);

  const cycleMode = () => {
    const modes = ['light', 'dark', 'system'];
    const next = modes[(modes.indexOf(mode) + 1) % modes.length];
    setMode(next);
    if (window.__setTheme) window.__setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={cycleMode}
      className="h-8 px-3 border border-border bg-background hover:bg-muted text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 transition-colors"
    >
      <div className="flex gap-0.5">
          <div className={`w-1 h-3 ${mode === 'light' ? 'bg-foreground' : 'bg-muted-foreground/30'}`}></div>
          <div className={`w-1 h-3 ${mode === 'dark' ? 'bg-foreground' : 'bg-muted-foreground/30'}`}></div>
          <div className={`w-1 h-3 ${mode === 'system' ? 'bg-foreground' : 'bg-muted-foreground/30'}`}></div>
      </div>
      <span>{mode}</span>
    </button>
  );
};

export default function MailComposer() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('READY'); 
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);

  const handleSend = async (e) => {
    e.preventDefault();
    if(!to || !subject) return alert('MISSING_FIELDS');
    setLoading(true);
    setStatus('TRANSMITTING...');
    
    const formData = new FormData();
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('html', content);
    Array.from(files).forEach(f => formData.append('attachments', f));

    try {
        const res = await fetch('/api/mail/send', { method: 'POST', body: formData });
        if (res.ok) {
            setStatus('ACKNOWLEDGED');
            setTimeout(() => {
                alert('TRANSMISSION COMPLETE');
                setTo(''); setSubject(''); setContent(''); setFiles([]); 
                setStatus('READY');
            }, 500);
        } else {
            const err = await res.json();
            setStatus('FAILURE');
            alert(`ERROR: ${err.error}`);
        }
    } catch (e) {
        setStatus('NET_ERR');
        alert('NETWORK_ERROR');
    }
    setLoading(false);
  };

  // 工业风输入框样式：无背景，仅下边框，焦点时下边框变色
  const INPUT_WRAPPER = "group relative mb-6";
  const LABEL_CLASS = "block text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest mb-1 group-focus-within:text-primary transition-colors";
  const INPUT_CLASS = "w-full bg-transparent border-b-2 border-border p-2 font-mono text-sm focus:border-primary focus:outline-none transition-colors placeholder:text-muted-foreground/30";

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[600px]">
        {/* 左侧控制面板 */}
        <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border bg-muted/10 p-6 lg:p-8 flex flex-col gap-8">
            <div>
                <h3 className="text-lg font-black uppercase mb-1">Manifest</h3>
                <p className="text-[10px] font-mono text-muted-foreground leading-tight">Fill parameters to initiate transmission.</p>
            </div>

            <div className="space-y-4 flex-1">
                <div className={INPUT_WRAPPER}>
                    <label className={LABEL_CLASS}>// Recipient</label>
                    <input type="email" required value={to} onChange={e => setTo(e.target.value)} className={INPUT_CLASS} placeholder="TARGET_ADDRESS" />
                </div>
                <div className={INPUT_WRAPPER}>
                    <label className={LABEL_CLASS}>// Subject</label>
                    <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} className={INPUT_CLASS} placeholder="HEADER_INFO" />
                </div>
                
                <div className="pt-4 border-t border-border border-dashed">
                    <label className="flex flex-col gap-2 cursor-pointer group">
                         <span className={LABEL_CLASS}>// Attachments</span>
                         <div className="border-2 border-border border-dashed p-4 text-center group-hover:border-primary group-hover:bg-primary/5 transition-colors">
                            <span className="text-xs font-mono font-bold block">{files.length > 0 ? `${files.length} FILES` : 'DROP OR CLICK'}</span>
                            <span className="text-[9px] text-muted-foreground uppercase">Max 25MB</span>
                         </div>
                         <input type="file" multiple className="hidden" onChange={e => setFiles(e.target.files)} />
                    </label>
                </div>
            </div>

            <div className="mt-auto space-y-4">
                <div className="flex justify-between items-center border border-border p-2 bg-background">
                     <span className="text-[10px] font-mono uppercase text-muted-foreground">SYS_MODE</span>
                     <ThemeToggle />
                </div>
                <button onClick={() => { window.location.href='/api/auth/logout' }} className="w-full py-2 border border-red-500/30 text-red-600 hover:bg-red-500 hover:text-white text-[10px] font-mono font-bold uppercase transition-colors">
                    Terminate Session
                </button>
            </div>
        </div>

        {/* 右侧编辑器 */}
        <div className="flex-1 flex flex-col bg-card relative">
             {/* 状态条 */}
            <div className="h-8 border-b border-border flex items-center justify-between px-4 bg-muted/20">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 ${loading ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`}></div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{status}</span>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground opacity-50">EDITOR_V.2.1</div>
            </div>

            <form onSubmit={handleSend} className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col">
                    <ReactQuill 
                        theme="snow" 
                        value={content} 
                        onChange={setContent} 
                        modules={MODULES} 
                        className="flex-1 flex flex-col"
                    />
                </div>

                <div className="p-6 border-t border-border bg-background flex items-center justify-end gap-4">
                    <span className="text-[10px] font-mono text-muted-foreground hidden sm:block">
                        READY TO TRANSMIT // WAITING INPUT
                    </span>
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="px-10 py-4 bg-foreground text-background font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-y-0.5"
                    >
                        {loading ? 'PROCESSING...' : 'EXECUTE >>'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
}