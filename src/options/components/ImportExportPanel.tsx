import { useState } from 'react';
import type { ExtensionStorageState, ImportPreview, Locale, RuntimeRequest, RuntimeResponse } from '../../shared/types';
import { t } from '../../shared/i18n/messages';

interface ImportExportPanelProps {
  state: ExtensionStorageState;
  locale: Locale;
  onImport: (state: unknown) => void;
}

export function ImportExportPanel({ state, locale, onImport }: ImportExportPanelProps) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [pendingInput, setPendingInput] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crush-leetcode-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const input = JSON.parse(text);
      setPendingInput(input);
      
      const res: RuntimeResponse<ImportPreview> = await chrome.runtime.sendMessage({
        type: 'PREVIEW_IMPORT',
        payload: { input }
      } satisfies RuntimeRequest);

      if (res.ok && res.data) {
        setPreview(res.data);
        setError(null);
      } else {
        throw new Error(res.error || 'Failed to preview import');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPreview(null);
    }
  };

  const confirmImport = () => {
    if (pendingInput) {
      onImport(pendingInput);
      setPreview(null);
      setPendingInput(null);
    }
  };

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-[#262626]">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">{t(locale, 'dataBackup')}</h2>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-3">
        <button 
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-white transition-all hover:bg-amber-600 hover:shadow-lg active:scale-[0.98] dark:text-neutral-900" 
          onClick={exportData}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {t(locale, 'exportData')}
        </button>
        
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 py-3 text-sm font-bold text-neutral-700 transition-all hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {t(locale, 'importData')}
          <input className="hidden" type="file" accept="application/json" onChange={(event) => void importData(event.target.files?.[0])} />
        </label>
      </div>
      
      <p className="mt-4 text-center text-[10px] text-neutral-500">
        {t(locale, 'exportImportDesc')}
      </p>

      {/* Import Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-[#262626] animate-in zoom-in-95 duration-200">
            <div className="bg-neutral-900 p-6 text-white dark:bg-black">
              <h3 className="text-lg font-bold">{t(locale, 'importPreview')}</h3>
              {preview.version && (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest opacity-60">
                  {t(locale, 'previewVersion')}: v{preview.version}
                </p>
              )}
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-900/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t(locale, 'previewProblems')}</span>
                  <div className="text-lg font-black">{preview.problemCount}</div>
                  <div className="mt-1 flex gap-2 text-[10px] font-bold">
                    <span className="text-emerald-500">+{preview.newProblemCount} {t(locale, 'previewNew')}</span>
                    <span className="text-amber-500">↻{preview.overwrittenProblemCount} {t(locale, 'previewOverwrite')}</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-900/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t(locale, 'previewNotes')}</span>
                  <div className="text-lg font-black">{preview.noteCount}</div>
                </div>
                <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-900/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t(locale, 'previewLogs')}</span>
                  <div className="text-lg font-black">{preview.reviewLogCount}</div>
                </div>
                <div className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-900/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t(locale, 'previewConflicts')}</span>
                  <div className={`text-lg font-black ${preview.errorMessages.length > 0 ? 'text-rose-500' : ''}`}>
                    {preview.errorMessages.length + preview.warningMessages.length}
                  </div>
                </div>
              </div>

              {(preview.warningMessages.length > 0 || preview.errorMessages.length > 0) && (
                <div className="mt-4 max-h-32 overflow-y-auto space-y-2 rounded-xl bg-rose-50 p-3 text-[10px] dark:bg-rose-900/20">
                  {preview.errorMessages.map((msg, i) => (
                    <p key={i} className="font-bold text-rose-600 dark:text-rose-400">Error: {msg}</p>
                  ))}
                  {preview.warningMessages.map((msg, i) => (
                    <p key={i} className="font-medium text-amber-700 dark:text-amber-500">Warning: {msg}</p>
                  ))}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setPreview(null)}
                  className="flex-1 rounded-xl bg-neutral-100 py-3 text-sm font-bold text-neutral-600 transition-all hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
                >
                  {t(locale, 'cancel')}
                </button>
                <button
                  onClick={confirmImport}
                  disabled={!preview.valid}
                  className="flex-1 rounded-xl bg-neutral-900 py-3 text-sm font-bold text-white transition-all hover:bg-black disabled:opacity-50 dark:bg-white dark:text-neutral-900"
                >
                  {t(locale, 'confirmImport')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
