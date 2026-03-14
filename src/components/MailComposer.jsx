import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const MODULES = {
  toolbar: [
    [{ 'header':[1, 2, false] }],
    ['bold', 'italic', 'underline', 'code-block'],[{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link', 'clean']
  ],
};

const ThemeToggle = () => {
  const[mode, setMode] = useState('system');

  useEffect(() => {
    const stored = localStorage.getItem('theme') || 'system';
    setMode(stored);
    if (window.__setTheme) window.__setTheme(stored);
  },[]);

  const cycleMode = () => {
    const modes =['light', 'dark', 'system'];
    const next = modes[(modes.indexOf(mode) + 1) % modes.length];
    setMode(next);
    if (window.__setTheme) window.__setTheme(next);
  };

  const modeLabel = mode === 'system' ? 'SYS' : mode === 'dark' ? 'DRK' : 'LGT';

  return (
    <button
      type="button"
      onClick={cycleMode}
      className="group flex items-center justify-between w-20 h-8 px-2 border border-border bg-background hover:border-primary transition-colors focus:outline-none"
    >
      <span className="text-[10px] font-mono uppercase text-muted-foreground group-hover:text-primary">MODE</span>
      <span className="text-xs font-mono font-bold text-foreground">[{modeLabel}]</span>
    </button>
  );
};

export default function MailComposer() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('AWAITING_INPUT'); 
  
  // 表单状态
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const[to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const[content, setContent] = useState('');
  const [files, setFiles] = useState([]);

  // 草稿列表状态
  const [drafts, setDrafts] = useState([]);

  // 初始化加载草稿
  useEffect(() => {
      const storedDrafts = localStorage.getItem('tactical_mail_drafts');
      if (storedDrafts) {
          try {
              setDrafts(JSON.parse(storedDrafts));
          } catch (e) {
              console.error('Failed to parse drafts');
          }
      }
  },[]);

  // --- 暂存区逻辑 ---
  const saveDraft = () => {
      if (!to && !subject && !content) return; 
      
      const newDraft = {
          id: currentDraftId || Date.now().toString(),
          to, subject, content,
          updatedAt: new Date().toISOString()
      };

      let updatedDrafts;
      if (currentDraftId) {
          updatedDrafts = drafts.map(d => d.id === currentDraftId ? newDraft : d);
      } else {
          updatedDrafts =[newDraft, ...drafts];
          setCurrentDraftId(newDraft.id);
      }

      setDrafts(updatedDrafts);
      localStorage.setItem('tactical_mail_drafts', JSON.stringify(updatedDrafts));
      setStatus('DRAFT_SAVED_LOCALLY');
      setTimeout(() => setStatus('AWAITING_INPUT'), 2000);
  };

  const loadDraft = (draft) => {
      setCurrentDraftId(draft.id);
      setTo(draft.to);
      setSubject(draft.subject);
      setContent(draft.content);
      setStatus('DRAFT_LOADED');
      setTimeout(() => setStatus('AWAITING_INPUT'), 2000);
  };

  const deleteDraft = (e, id) => {
      e.stopPropagation();
      const updatedDrafts = drafts.filter(d => d.id !== id);
      setDrafts(updatedDrafts);
      localStorage.setItem('tactical_mail_drafts', JSON.stringify(updatedDrafts));
      if (currentDraftId === id) resetForm();
  };

  const resetForm = () => {
      setCurrentDraftId(null);
      setTo(''); setSubject(''); setContent(''); setFiles([]);
      setStatus('READY_FOR_NEW_ENTRY');
      setTimeout(() => setStatus('AWAITING_INPUT'), 2000);
  };

  // --- 发送逻辑 (单封) ---
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
            alert('TRANSMISSION COMPLETE');
            
            // 发送成功后清除对应的草稿
            if (currentDraftId) {
                const updatedDrafts = drafts.filter(d => d.id !== currentDraftId);
                setDrafts(updatedDrafts);
                localStorage.setItem('tactical_mail_drafts', JSON.stringify(updatedDrafts));
            }
            
            resetForm();
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

  // --- 发送逻辑 (批量发送暂存区) ---
  const handleSendAll = async () => {
      if (drafts.length === 0) return;
      
      const confirmBatch = window.confirm(`WARNING: INITIALIZE BATCH TRANSMISSION FOR ${drafts.length} STAGED ITEMS?`);
      if (!confirmBatch) return;

      setLoading(true);
      let successCount = 0;
      let failedDrafts =[];

      for (let i = 0; i < drafts.length; i++) {
          const draft = drafts[i];
          setStatus(`BATCH_TX: ${i + 1}/${drafts.length}`);

          // 拦截无效数据 (缺少收件人或主题)
          if (!draft.to || !draft.subject) {
              failedDrafts.push(draft);
              continue;
          }

          const formData = new FormData();
          formData.append('to', draft.to);
          formData.append('subject', draft.subject);
          formData.append('html', draft.content);
          // 批量发送不包含当前选中的附件，仅发送草稿文本

          try {
              const res = await fetch('/api/mail/send', { method: 'POST', body: formData });
              if (res.ok) {
                  successCount++;
              } else {
                  failedDrafts.push(draft);
              }
          } catch (e) {
              failedDrafts.push(draft);
          }
      }

      // 批量发送结束后，更新暂存区（保留失败的，清除成功的）
      setDrafts(failedDrafts);
      localStorage.setItem('tactical_mail_drafts', JSON.stringify(failedDrafts));
      
      // 如果当前正在编辑的草稿被成功发出了，清空表单
      if (currentDraftId && !failedDrafts.find(d => d.id === currentDraftId)) {
          resetForm();
      }

      setStatus(`BATCH_COMPLETE`);
      alert(`BATCH TRANSMISSION FINISHED.\nSUCCESS: ${successCount}\nFAILED: ${failedDrafts.length}`);
      setLoading(false);
      setTimeout(() => setStatus('AWAITING_INPUT'), 3000);
  };

  const INPUT_WRAPPER = "group relative flex flex-col gap-1.5";
  const LABEL_CLASS = "text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest group-focus-within:text-primary transition-colors flex justify-between";
  const INPUT_CONTAINER = "relative flex border border-border bg-muted/5 group-focus-within:border-primary group-focus-within:bg-primary/5 transition-colors";
  const INPUT_INDICATOR = "w-1 bg-border group-focus-within:bg-primary transition-colors";
  const INPUT_CLASS = "w-full bg-transparent p-2.5 font-mono text-sm focus:outline-none placeholder:text-muted-foreground/30 text-foreground";

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[70vh] border border-border shadow-2xl">
        
        <div className="w-full lg:w-80 flex flex-col bg-background border-b lg:border-b-0 lg:border-r border-border h-full lg:h-[800px]">
            
            {/* 面板头部 */}
            <div className="p-6 border-b border-border bg-muted/10">
                <h3 className="text-xl font-black uppercase tracking-tighter text-foreground mb-1">Manifest<span className="text-primary">.</span></h3>
                <p className="text-[10px] font-mono text-muted-foreground leading-tight uppercase tracking-widest">
                    Routing & Staging
                </p>
            </div>

            {/* 参数输入与暂存区 (可滚动) */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:hover:bg-primary">
                
                {/* 输入区 */}
                <div className={INPUT_WRAPPER}>
                    <label className={LABEL_CLASS}>
                        <span>// Recipient</span>
                        <span className="opacity-0 group-focus-within:opacity-100 transition-opacity">REQ</span>
                    </label>
                    <div className={INPUT_CONTAINER}>
                        <div className={INPUT_INDICATOR}></div>
                        <input type="email" required value={to} onChange={e => setTo(e.target.value)} className={INPUT_CLASS} placeholder="TARGET_ADDRESS" />
                    </div>
                </div>

                <div className={INPUT_WRAPPER}>
                    <label className={LABEL_CLASS}>
                        <span>// Subject</span>
                        <span className="opacity-0 group-focus-within:opacity-100 transition-opacity">REQ</span>
                    </label>
                    <div className={INPUT_CONTAINER}>
                        <div className={INPUT_INDICATOR}></div>
                        <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} className={INPUT_CLASS} placeholder="HEADER_INFO" />
                    </div>
                </div>
                
                {/* 附件上传 */}
                <div>
                    <label className="flex flex-col gap-2 cursor-pointer group">
                         <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest group-hover:text-primary transition-colors">
                            // Attachments
                         </span>
                         <div className="border border-dashed border-border p-4 flex flex-col items-center justify-center min-h-[80px] bg-muted/5 group-hover:border-primary group-hover:bg-primary/5 transition-colors text-center">
                            {files.length === 0 ? (
                                <>
                                    <span className="text-[10px] font-mono font-bold block text-foreground tracking-widest">MOUNT DATA</span>
                                    <span className="text-[9px] text-muted-foreground uppercase font-mono mt-1">Max 25MB</span>
                                </>
                            ) : (
                                <span className="text-[10px] font-mono text-primary font-bold">VOLUMES LOADED: {files.length}</span>
                            )}
                         </div>
                         <input type="file" multiple className="hidden" onChange={e => setFiles(e.target.files)} />
                    </label>
                </div>

                {/* 本地暂存区列表 */}
                <div className="pt-6 border-t border-border border-dashed flex flex-col h-auto">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase tracking-widest">// Local Staging</span>
                        <span className="text-[10px] font-mono text-primary">{drafts.length} ITEMS</span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                        {drafts.length === 0 && (
                            <div className="text-[10px] font-mono text-muted-foreground/50 text-center py-4 border border-border/40">NO_DATA</div>
                        )}
                        {drafts.map(draft => (
                            <div 
                                key={draft.id} 
                                onClick={() => loadDraft(draft)}
                                className={`group relative p-3 border cursor-pointer transition-colors ${currentDraftId === draft.id ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/50 bg-background'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[9px] font-mono text-muted-foreground">ID: {draft.id.slice(-6)}</span>
                                    <button onClick={(e) => deleteDraft(e, draft.id)} className="text-[10px] text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none">✕</button>
                                </div>
                                <div className="text-xs font-bold truncate text-foreground group-hover:text-primary transition-colors">
                                    {draft.subject || 'UNTITLED_DIRECTIVE'}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 批量发送按钮 */}
                    {drafts.length > 0 && (
                        <button 
                            type="button" 
                            onClick={handleSendAll}
                            disabled={loading}
                            className="w-full py-2 border border-primary/40 text-primary hover:bg-primary hover:text-background text-[10px] font-mono font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
                        >
                            {loading ? 'PROCESSING...' : 'Execute_All_Staged >>'}
                        </button>
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/5 space-y-3 mt-auto">
                <div className="flex justify-between items-center">
                     <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold tracking-widest">// SYS_PREF</span>
                     <ThemeToggle />
                </div>
                <button 
                    type="button"
                    onClick={() => { window.location.href='/api/auth/logout' }} 
                    className="w-full py-2.5 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-mono font-bold uppercase tracking-widest transition-all focus:outline-none"
                >
                    Terminate Session
                </button>
            </div>
        </div>

        <div className="flex-1 flex flex-col bg-background relative min-w-0">
            
            <div className="h-10 border-b border-border flex items-center justify-between px-6 bg-muted/10 select-none">
                <div className="flex items-center gap-3">
                    <div className="relative flex h-2 w-2">
                        {loading && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${loading ? 'bg-primary' : 'bg-muted-foreground'}`}></span>
                    </div>
                    <span className={`text-[10px] font-mono uppercase tracking-widest ${loading ? 'text-primary' : 'text-muted-foreground'}`}>
                        {status}
                    </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground opacity-60 uppercase tracking-widest">
                    {currentDraftId && <span className="text-yellow-500 font-bold animate-pulse hidden sm:inline-block">DRAFT_MODE</span>}
                    <span>UPLINK_V2.1</span>
                </div>
            </div>

            {/* 编辑器主体 */}
            <form onSubmit={handleSend} className="flex-1 flex flex-col min-h-[400px]">
                <div className="flex-1 flex flex-col relative group [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-border [&_.ql-toolbar]:bg-muted/10 [&_.ql-container]:border-0 [&_.ql-editor]:font-mono [&_.ql-editor]:text-sm">
                    {/* 焦点装饰角 */}
                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary opacity-0 group-focus-within:opacity-100 transition-opacity m-2 z-10 pointer-events-none"></div>
                    
                    <ReactQuill 
                        theme="snow" 
                        value={content} 
                        onChange={setContent} 
                        modules={MODULES} 
                        className="flex-1 flex flex-col h-full [&_.ql-container]:flex-1 [&_.ql-container]:overflow-y-auto"
                    />
                </div>

                <div className="p-4 sm:p-6 border-t border-border bg-muted/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    
                    <button 
                        type="button" 
                        onClick={resetForm}
                        className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors text-left"
                    >[ + NEW_ENTRY ]
                    </button>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button 
                            type="button" 
                            onClick={saveDraft}
                            disabled={loading}
                            className="px-6 py-3 border border-border text-xs font-mono font-bold uppercase tracking-widest hover:bg-muted/50 disabled:opacity-50 transition-colors"
                        >
                            Save_Local
                        </button>

                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="px-8 py-3 bg-foreground text-background font-mono font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-y-0.5"
                        >
                            {loading ? 'PROCESSING...' : 'EXECUTE_CMD >>'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
  );
}