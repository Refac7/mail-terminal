import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const MODULES = {
  toolbar:[
    [{ 'header': [1, 2, false] }],['bold', 'italic', 'underline', 'code-block'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
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
    const modes = ['light', 'dark', 'system'];
    const next = modes[(modes.indexOf(mode) + 1) % modes.length];
    setMode(next);
    if (window.__setTheme) window.__setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={cycleMode}
      className="flex items-center justify-center px-3 py-1.5 border border-border bg-background hover:bg-muted transition-colors text-xs font-medium text-foreground capitalize"
    >
      Theme: {mode}
    </button>
  );
};

export default function MailComposer() {
  const [loading, setLoading] = useState(false);
  const[status, setStatus] = useState('Ready'); 
  
  // 表单状态
  const[currentDraftId, setCurrentDraftId] = useState(null);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);

  // 草稿列表状态
  const[drafts, setDrafts] = useState([]);

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
          updatedDrafts = [newDraft, ...drafts];
          setCurrentDraftId(newDraft.id);
      }

      setDrafts(updatedDrafts);
      localStorage.setItem('tactical_mail_drafts', JSON.stringify(updatedDrafts));
      setStatus('Draft saved');
      setTimeout(() => setStatus('Ready'), 2000);
  };

  const loadDraft = (draft) => {
      setCurrentDraftId(draft.id);
      setTo(draft.to);
      setSubject(draft.subject);
      setContent(draft.content);
      setStatus('Draft loaded');
      setTimeout(() => setStatus('Ready'), 2000);
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
      setStatus('New message');
      setTimeout(() => setStatus('Ready'), 2000);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if(!to || !subject) return alert('Please fill in the recipient and subject fields.');
    setLoading(true);
    setStatus('Sending...');
    
    const formData = new FormData();
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('html', content);
    Array.from(files).forEach(f => formData.append('attachments', f));

    try {
        const res = await fetch('/api/mail/send', { method: 'POST', body: formData });
        if (res.ok) {
            setStatus('Sent successfully');
            alert('Message sent successfully.');
            
            if (currentDraftId) {
                const updatedDrafts = drafts.filter(d => d.id !== currentDraftId);
                setDrafts(updatedDrafts);
                localStorage.setItem('tactical_mail_drafts', JSON.stringify(updatedDrafts));
            }
            resetForm();
        } else {
            const err = await res.json();
            setStatus('Failed to send');
            alert(`Error: ${err.error}`);
        }
    } catch (e) {
        setStatus('Network error');
        alert('Network error occurred.');
    }
    setLoading(false);
    setTimeout(() => setStatus('Ready'), 3000);
  };

  const handleSendAll = async () => {
      if (drafts.length === 0) return;
      
      const confirmBatch = window.confirm(`Are you sure you want to send all ${drafts.length} drafts?`);
      if (!confirmBatch) return;

      setLoading(true);
      let successCount = 0;
      let failedDrafts =[];

      for (let i = 0; i < drafts.length; i++) {
          const draft = drafts[i];
          setStatus(`Sending ${i + 1} of ${drafts.length}...`);

          if (!draft.to || !draft.subject) {
              failedDrafts.push(draft);
              continue;
          }

          const formData = new FormData();
          formData.append('to', draft.to);
          formData.append('subject', draft.subject);
          formData.append('html', draft.content);

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

      setDrafts(failedDrafts);
      localStorage.setItem('tactical_mail_drafts', JSON.stringify(failedDrafts));
      
      if (currentDraftId && !failedDrafts.find(d => d.id === currentDraftId)) {
          resetForm();
      }

      setStatus('Batch complete');
      alert(`Sent ${successCount} messages. ${failedDrafts.length} failed.`);
      setLoading(false);
      setTimeout(() => setStatus('Ready'), 3000);
  };

  const INPUT_CLASS = "w-full border border-border bg-background p-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors";
  const LABEL_CLASS = "text-sm font-medium text-foreground mb-1 block";

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[75vh] bg-background border border-border shadow-sm">
        
        {/* 左侧：草稿与设置侧边栏 */}
        <div className="w-full lg:w-72 flex flex-col bg-muted/5 border-b lg:border-b-0 lg:border-r border-border h-full lg:h-auto">
            
            <div className="p-5 border-b border-border flex justify-between items-center">
                <h3 className="font-semibold text-foreground">Drafts</h3>
                <span className="text-xs font-mono text-muted-foreground bg-border px-2 py-0.5">{drafts.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 [&::-webkit-scrollbar]:w-1.5[&::-webkit-scrollbar-thumb]:bg-border">
                {drafts.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-8">No saved drafts.</div>
                )}
                
                {drafts.map(draft => (
                    <div 
                        key={draft.id} 
                        onClick={() => loadDraft(draft)}
                        className={`group relative p-3 border cursor-pointer transition-colors ${currentDraftId === draft.id ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/50'}`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-medium text-foreground truncate pr-4">
                                {draft.subject || 'No Subject'}
                            </span>
                            <button 
                                onClick={(e) => deleteDraft(e, draft.id)} 
                                className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                            {draft.to || 'No Recipient'}
                        </div>
                    </div>
                ))}

                {drafts.length > 0 && (
                    <button 
                        type="button" 
                        onClick={handleSendAll}
                        disabled={loading}
                        className="w-full py-2.5 mt-4 border border-border bg-background text-sm font-medium hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
                    >
                        Send All Drafts
                    </button>
                )}
            </div>

            <div className="p-4 border-t border-border bg-background space-y-4 mt-auto">
                <div className="flex justify-between items-center">
                     <span className="text-sm font-medium text-muted-foreground">Appearance</span>
                     <ThemeToggle />
                </div>
                <button 
                    type="button"
                    onClick={() => { window.location.href='/api/auth/logout' }} 
                    className="w-full py-2 border border-border text-foreground hover:bg-red-500 hover:text-white hover:border-red-500 text-sm font-medium transition-colors focus:outline-none"
                >
                    Sign Out
                </button>
            </div>
        </div>

        {/* 右侧：编辑器主体 */}
        <div className="flex-1 flex flex-col bg-background relative min-w-0">
            
            {/* 状态指示条 */}
            <div className="px-6 py-3 border-b border-border flex items-center justify-between bg-background text-sm">
                <div className="flex items-center gap-2">
                    <div className="relative flex h-2 w-2">
                        {loading && <span className="absolute inline-flex h-full w-full bg-primary opacity-50 animate-ping"></span>}
                        <span className={`relative inline-flex h-2 w-2 ${loading ? 'bg-primary' : 'bg-muted-foreground'}`}></span>
                    </div>
                    <span className="text-muted-foreground">{status}</span>
                </div>
                {currentDraftId && <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5">Editing Draft</span>}
            </div>

            {/* 表单区域 */}
            <form onSubmit={handleSend} className="flex-1 flex flex-col min-h-[500px]">
                
                <div className="p-6 border-b border-border space-y-4 bg-background">
                    <div>
                        <label className={LABEL_CLASS}>To</label>
                        <input type="email" required value={to} onChange={e => setTo(e.target.value)} className={INPUT_CLASS} placeholder="recipient@example.com" />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>Subject</label>
                        <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} className={INPUT_CLASS} placeholder="Enter message subject" />
                    </div>

                    <div>
                        <label className="flex flex-col gap-1 cursor-pointer group">
                             <span className={LABEL_CLASS}>Attachments</span>
                             <div className="border border-dashed border-border p-4 flex flex-col items-center justify-center bg-muted/20 group-hover:bg-muted/50 group-hover:border-foreground/30 transition-colors text-center">
                                {files.length === 0 ? (
                                    <span className="text-sm text-muted-foreground">Click to attach files or drag & drop</span>
                                ) : (
                                    <span className="text-sm font-medium text-primary">{files.length} file(s) attached</span>
                                )}
                             </div>
                             <input type="file" multiple className="hidden" onChange={e => setFiles(e.target.files)} />
                        </label>
                    </div>
                </div>

                {/* ReactQuill 编辑器，强制覆盖直角及边框样式 */}
                <div className="flex-1 flex flex-col bg-background 
                    [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b[&_.ql-toolbar]:border-border [&_.ql-toolbar]:bg-muted/10 [&_.ql-toolbar]:!rounded-none
                    [&_.ql-container]:border-0 [&_.ql-container]:!rounded-none
                    [&_.ql-editor]:text-base [&_.ql-editor]:text-foreground[&_.ql-editor]:p-6">
                    
                    <ReactQuill 
                        theme="snow" 
                        value={content} 
                        onChange={setContent} 
                        modules={MODULES} 
                        placeholder="Write your message here..."
                        className="flex-1 flex flex-col h-full [&_.ql-container]:flex-1 [&_.ql-container]:overflow-y-auto"
                    />
                </div>

                {/* 底部操作区 */}
                <div className="p-4 sm:p-6 border-t border-border bg-background flex flex-col sm:flex-row items-center justify-between gap-4">
                    
                    <button 
                        type="button" 
                        onClick={resetForm}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors w-full sm:w-auto text-left"
                    >
                        Discard
                    </button>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <button 
                            type="button" 
                            onClick={saveDraft}
                            disabled={loading}
                            className="px-6 py-2.5 border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 w-full sm:w-auto"
                        >
                            Save Draft
                        </button>

                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="px-6 py-2.5 bg-foreground text-background text-sm font-medium hover:bg-primary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
                        >
                            {loading ? 'Sending...' : 'Send Message'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
  );
}