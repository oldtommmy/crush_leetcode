import { useEffect, useState } from 'react';
import type { ExtensionStorageState, ImportPreview, Locale, RuntimeRequest, RuntimeResponse, SupabaseSyncSettings } from '../../shared/types';
import { t } from '../../shared/i18n/messages';
import { displayProblemTags, displayProblemTitle } from '../../shared/leetcode/display';
import {
  downloadSupabaseSnapshot,
  generateStrongRecoveryCode,
  uploadSupabaseSnapshot
} from '../../shared/sync/supabaseSync';
import { updateState } from '../../shared/storage/chromeStorage';

interface ImportExportPanelProps {
  state: ExtensionStorageState;
  locale: Locale;
  onImport: (state: unknown) => void;
  onChanged?: (state: ExtensionStorageState) => void;
}

export function ImportExportPanel({ state, locale, onImport, onChanged }: ImportExportPanelProps) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [pendingInput, setPendingInput] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [cloudSync, setCloudSync] = useState<SupabaseSyncSettings>(() => state.settings.cloudSync);

  useEffect(() => {
    setCloudSync(state.settings.cloudSync);
  }, [state.settings.cloudSync]);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crush-leetcode-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadTextFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportNotesMarkdown = () => {
    const problems = Object.values(state.problemsById)
      .filter((problem) => !problem.archived)
      .sort((a, b) => displayProblemTitle(a, locale).localeCompare(displayProblemTitle(b, locale)));
    const date = new Date().toISOString().slice(0, 10);
    const sections = problems
      .map((problem) => {
        const note = state.notesByProblemId[problem.id]?.markdown?.trim();
        if (!note) return undefined;
        const title = displayProblemTitle(problem, locale);
        const tags = displayProblemTags(problem.tags, locale);
        return [
          `## ${title}`,
          '',
          `- Difficulty: ${problem.difficulty}`,
          `- URL: ${problem.url}`,
          tags.length > 0 ? `- Tags: ${tags.join(', ')}` : undefined,
          `- Next review: ${problem.nextReviewAt.slice(0, 10)}`,
          `- Reviews: ${problem.reviewCount}`,
          '',
          note
        ].filter(Boolean).join('\n');
      })
      .filter(Boolean);

    const content = [
      '# Crush LeetCode Notes',
      '',
      `Exported at: ${new Date().toISOString()}`,
      `Problems with notes: ${sections.length}`,
      '',
      ...sections
    ].join('\n');

    downloadTextFile(`crush-leetcode-notes-${date}.md`, content, 'text/markdown;charset=utf-8');
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

  const updateCloudSyncField = (patch: Partial<SupabaseSyncSettings>) => {
    setCloudSync((current) => ({ ...current, ...patch }));
  };

  const saveCloudSyncSettings = async (patch: Partial<SupabaseSyncSettings> = {}) => {
    const nextCloudSync = {
      ...cloudSync,
      ...patch,
      syncKey: (patch.syncKey ?? cloudSync.syncKey)?.trim() || undefined
    };
    const nextState = await updateState((latestState) => ({
      ...latestState,
      settings: {
        ...latestState.settings,
        cloudSync: nextCloudSync
      }
    }));
    setCloudSync(nextState.settings.cloudSync);
    onChanged?.(nextState);
    return nextState.settings.cloudSync;
  };

  const generateRecoveryCode = () => {
    const code = generateStrongRecoveryCode();
    updateCloudSyncField({ syncKey: code });
    setSyncMessage(locale === 'zh-CN' ? '已生成随机恢复码，请保存到密码管理器或安全笔记。' : 'Random recovery code generated. Save it in a password manager or secure note.');
  };

  const uploadCloudSnapshot = async () => {
    setSyncBusy(true);
    setError(null);
    setSyncMessage(null);
    try {
      const config = await saveCloudSyncSettings({ enabled: true, lastError: undefined });
      const result = await uploadSupabaseSnapshot(state, config);
      const savedConfig = await saveCloudSyncSettings({
        enabled: true,
        lastSyncedAt: result.updatedAt,
        lastError: undefined
      });
      setSyncMessage(locale === 'zh-CN' ? `已上传云端快照：${savedConfig.lastSyncedAt}` : `Cloud snapshot uploaded: ${savedConfig.lastSyncedAt}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      await saveCloudSyncSettings({ lastError: message }).catch(() => undefined);
    } finally {
      setSyncBusy(false);
    }
  };

  const downloadCloudSnapshot = async () => {
    setSyncBusy(true);
    setError(null);
    setSyncMessage(null);
    try {
      const config = await saveCloudSyncSettings({ enabled: true, lastError: undefined });
      const result = await downloadSupabaseSnapshot(config);
      const input = {
        ...result.state,
        settings: {
          ...result.state.settings,
          cloudSync: {
            ...config,
            enabled: true,
            lastSyncedAt: result.updatedAt,
            lastError: undefined
          }
        }
      };
      setPendingInput(input);
      const res: RuntimeResponse<ImportPreview> = await chrome.runtime.sendMessage({
        type: 'PREVIEW_IMPORT',
        payload: { input }
      } satisfies RuntimeRequest);

      if (res.ok && res.data) {
        setPreview(res.data);
        setSyncMessage(locale === 'zh-CN' ? '已拉取云端快照，请确认导入。' : 'Cloud snapshot downloaded. Confirm import to restore it.');
      } else {
        throw new Error(res.error || 'Failed to preview cloud snapshot.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      await saveCloudSyncSettings({ lastError: message }).catch(() => undefined);
    } finally {
      setSyncBusy(false);
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

        <button
          className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-3 text-sm font-bold text-neutral-700 transition-all hover:bg-neutral-50 active:scale-[0.98] dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900"
          onClick={exportNotesMarkdown}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M8 13h8" />
            <path d="M8 17h5" />
          </svg>
          {locale === 'zh-CN' ? '导出 Markdown 笔记' : 'Export Markdown notes'}
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 p-4 dark:border-sky-500/20 dark:bg-sky-500/10">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" />
              <path d="m8 11 4 4 4-4" />
              <path d="M20 21H4" />
              <path d="M5 18a7 7 0 0 1 14 0" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-sky-900 dark:text-sky-100">
              {locale === 'zh-CN' ? 'Crush LeetCode 云同步' : 'Crush LeetCode cloud sync'}
            </h3>
            <p className="mt-1 text-xs font-medium leading-relaxed text-sky-700/80 dark:text-sky-200/80">
              {locale === 'zh-CN'
                ? '使用恢复码同步云端快照。建议用常用邮箱加一段私密短语，或直接生成随机码；相同恢复码会指向同一份数据。'
                : 'Use a recovery code to sync cloud snapshots. Use your email plus a private phrase, or generate a random code; identical codes access the same data.'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              className="rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-sky-500/20 dark:bg-neutral-950 dark:text-neutral-100"
              placeholder={locale === 'zh-CN' ? '例如 tom@example.com-crush-2026' : 'e.g. tom@example.com-crush-2026'}
              value={cloudSync.syncKey ?? ''}
              onChange={(event) => updateCloudSyncField({ syncKey: event.target.value })}
            />
            <button
              type="button"
              className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-black text-sky-700 transition hover:bg-sky-50 dark:border-sky-500/20 dark:bg-neutral-950 dark:text-sky-300"
              onClick={generateRecoveryCode}
            >
              {locale === 'zh-CN' ? '生成随机码' : 'Generate'}
            </button>
          </div>
          <p className="rounded-xl border border-sky-100 bg-white px-3 py-2 text-[10px] font-bold leading-relaxed text-sky-700 dark:border-sky-500/20 dark:bg-neutral-950 dark:text-sky-200">
            {locale === 'zh-CN'
              ? '不要只用生日、手机号、常见单词或简单数字。纯邮箱好记但可能被猜到，最好加一个只有你知道的后缀。'
              : 'Avoid birthdays, phone numbers, common words, or simple digits. Email alone is memorable but guessable, so add a private suffix.'}
          </p>
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black leading-relaxed text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            {locale === 'zh-CN'
              ? '请务必记住或保存这个恢复码。我们不会保存明文，忘记后无法帮你找回；新设备恢复数据必须输入同一个恢复码。'
              : 'Save this recovery code. We do not store it in plain text and cannot recover it for you; restoring on a new device requires the same code.'}
          </p>
        </div>

        <div className="mt-3 grid gap-2">
          <label className="flex items-start gap-3 rounded-xl border border-sky-100 bg-white p-3 text-left dark:border-sky-500/20 dark:bg-neutral-950">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-sky-200 text-sky-600"
              checked={Boolean(cloudSync.enabled)}
              onChange={(event) => {
                const enabled = event.target.checked;
                updateCloudSyncField({ enabled });
                void saveCloudSyncSettings({ enabled })
                  .then(() => setSyncMessage(enabled
                    ? (locale === 'zh-CN' ? '自动同步已开启。本地数据变化后会自动上传快照。' : 'Auto sync enabled. Local changes will upload snapshots automatically.')
                    : (locale === 'zh-CN' ? '自动同步已关闭。' : 'Auto sync disabled.')))
                  .catch((err) => setError(err instanceof Error ? err.message : String(err)));
              }}
            />
            <span>
              <span className="block text-xs font-black text-sky-900 dark:text-sky-100">
                {locale === 'zh-CN' ? '启用自动同步' : 'Enable auto sync'}
              </span>
              <span className="mt-1 block text-[10px] font-medium leading-relaxed text-sky-700/80 dark:text-sky-200/80">
                {locale === 'zh-CN'
                  ? '评分、保存笔记、导入数据或修改设置后，会在本地保存成功后自动上传快照。'
                  : 'After reviews, notes, imports, or settings changes, a snapshot uploads after local save succeeds.'}
              </span>
            </span>
          </label>
          <button
            type="button"
            className="rounded-xl bg-sky-600 py-2.5 text-xs font-black text-white transition hover:bg-sky-700 disabled:opacity-60"
            onClick={() => void uploadCloudSnapshot()}
            disabled={syncBusy}
          >
            {syncBusy ? (locale === 'zh-CN' ? '同步中...' : 'Syncing...') : (locale === 'zh-CN' ? '上传当前数据到云端' : 'Upload current data')}
          </button>
          <button
            type="button"
            className="rounded-xl border border-sky-200 bg-white py-2.5 text-xs font-black text-sky-700 transition hover:bg-sky-50 disabled:opacity-60 dark:border-sky-500/20 dark:bg-neutral-950 dark:text-sky-300"
            onClick={() => void downloadCloudSnapshot()}
            disabled={syncBusy}
          >
            {locale === 'zh-CN' ? '从云端拉取并预览' : 'Download and preview cloud data'}
          </button>
        </div>

        {(syncMessage || cloudSync.lastSyncedAt || cloudSync.lastError) && (
          <p className="mt-3 text-[10px] font-bold leading-relaxed text-sky-700 dark:text-sky-200">
            {syncMessage || cloudSync.lastError || `${locale === 'zh-CN' ? '上次同步' : 'Last synced'}: ${cloudSync.lastSyncedAt}`}
          </p>
        )}
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
