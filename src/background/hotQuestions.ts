import { CODETOP_BASE_URL, HOT_QUESTIONS_CACHE_KEY } from '../shared/constants';
import { buildHotQuestionRecommendations } from '../shared/hotQuestions/recommendations';
import { getCachedJsonResult } from './remoteJsonCache';
import type {
  ExtensionStorageState,
  HotQuestion,
  HotQuestionCacheState,
  HotQuestionCompany,
  HotQuestionsRuntimeData
} from '../shared/types';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface ApiListResponse<T> {
  ok?: boolean;
  items?: T[];
  stale?: boolean;
  syncedAt?: string;
  error?: string;
}

function emptyCache(): HotQuestionCacheState {
  return {
    schemaVersion: 1,
    companies: [],
    questionsByCompanyId: {},
    fetchedAtByCompanyId: {}
  };
}

function normalizeCache(input: unknown): HotQuestionCacheState {
  if (!input || typeof input !== 'object') return emptyCache();
  const cache = input as Partial<HotQuestionCacheState>;
  return {
    schemaVersion: 1,
    selectedCompanyId: typeof cache.selectedCompanyId === 'number' ? cache.selectedCompanyId : undefined,
    companies: Array.isArray(cache.companies) ? cache.companies : [],
    questionsByCompanyId: cache.questionsByCompanyId && typeof cache.questionsByCompanyId === 'object'
      ? cache.questionsByCompanyId
      : {},
    fetchedAtByCompanyId: cache.fetchedAtByCompanyId && typeof cache.fetchedAtByCompanyId === 'object'
      ? cache.fetchedAtByCompanyId
      : {},
    syncedAt: cache.syncedAt,
    stale: cache.stale,
    lastError: cache.lastError
  };
}

async function getCache(): Promise<HotQuestionCacheState> {
  const result = await chrome.storage.local.get(HOT_QUESTIONS_CACHE_KEY);
  return normalizeCache(result[HOT_QUESTIONS_CACHE_KEY]);
}

async function setCache(cache: HotQuestionCacheState): Promise<void> {
  await chrome.storage.local.set({ [HOT_QUESTIONS_CACHE_KEY]: cache });
}

export function formatCodeTopFetchError(status: number, body: string): string {
  const normalizedBody = body.replace(/\s+/g, ' ').trim();
  if (status === 530 || /Argo Tunnel|Cloudflare Tunnel|origin has been unregistered/i.test(normalizedBody)) {
    return 'CodeTop API temporarily unavailable: Cloudflare Tunnel origin is not registered. Showing cached data if available.';
  }
  return `CodeTop API failed: ${status}${normalizedBody ? ` ${normalizedBody.slice(0, 180)}` : ''}`;
}

async function fetchJson<T>(path: string, force: boolean): Promise<{ payload: ApiListResponse<T>; stale: boolean }> {
  const result = await getCachedJsonResult<ApiListResponse<T>>({
    cacheKey: `quizRecallCodeTopRemote:${path}`,
    url: `${CODETOP_BASE_URL}${path}`,
    ttlMs: CACHE_TTL_MS,
    force,
    normalize: (input) => input && typeof input === 'object' && !Array.isArray(input)
      ? input as ApiListResponse<T>
      : undefined
  });
  return { payload: result.value, stale: result.stale };
}

function isFresh(timestamp: string | undefined): boolean {
  if (!timestamp) return false;
  const parsed = new Date(timestamp).getTime();
  return Number.isFinite(parsed) && Date.now() - parsed < CACHE_TTL_MS;
}

function selectedCompanyId(cache: HotQuestionCacheState): number | undefined {
  if (cache.selectedCompanyId && cache.companies.some((company) => company.id === cache.selectedCompanyId)) {
    return cache.selectedCompanyId;
  }
  return cache.companies[0]?.id;
}

async function loadCompanies(cache: HotQuestionCacheState, force: boolean): Promise<HotQuestionCacheState> {
  const { payload, stale } = await fetchJson<HotQuestionCompany>('/api/companies', force);
  const companies = Array.isArray(payload.items) ? payload.items : cache.companies;
  return {
    ...cache,
    companies,
    selectedCompanyId: cache.selectedCompanyId ?? companies[0]?.id,
    stale: stale || payload.stale,
    syncedAt: payload.syncedAt ?? cache.syncedAt,
    lastError: stale ? cache.lastError ?? 'Showing cached company data.' : payload.error
  };
}

async function loadQuestions(cache: HotQuestionCacheState, companyId: number, force: boolean): Promise<HotQuestionCacheState> {
  const key = String(companyId);
  if (!force && isFresh(cache.fetchedAtByCompanyId[key]) && cache.questionsByCompanyId[key]?.length) {
    return cache;
  }

  const { payload, stale } = await fetchJson<HotQuestion>(
    `/api/hot-questions?companyId=${encodeURIComponent(companyId)}&limit=100`,
    force
  );
  const questions = Array.isArray(payload.items) ? payload.items : cache.questionsByCompanyId[key] ?? [];
  const fetchedAt = new Date().toISOString();
  return {
    ...cache,
    questionsByCompanyId: {
      ...cache.questionsByCompanyId,
      [key]: questions
    },
    fetchedAtByCompanyId: {
      ...cache.fetchedAtByCompanyId,
      [key]: fetchedAt
    },
    stale: stale || payload.stale,
    syncedAt: payload.syncedAt ?? cache.syncedAt,
    lastError: stale ? cache.lastError ?? 'Showing cached question data.' : payload.error
  };
}

function toRuntimeData(cache: HotQuestionCacheState, state: ExtensionStorageState): HotQuestionsRuntimeData {
  const companyId = selectedCompanyId(cache);
  const key = companyId ? String(companyId) : '';
  const questions = key ? cache.questionsByCompanyId[key] ?? [] : [];
  return {
    companies: cache.companies,
    selectedCompanyId: companyId,
    questions,
    recommendations: buildHotQuestionRecommendations(questions, state),
    stale: cache.stale,
    syncedAt: cache.syncedAt,
    fetchedAt: key ? cache.fetchedAtByCompanyId[key] : undefined,
    lastError: cache.lastError
  };
}

export async function getHotQuestionsRuntimeData(
  state: ExtensionStorageState,
  options: { force?: boolean } = {}
): Promise<HotQuestionsRuntimeData> {
  let cache = await getCache();
  const shouldRefresh = Boolean(options.force);
  try {
    cache = await loadCompanies(cache, shouldRefresh);
    const companyId = selectedCompanyId(cache);
    if (companyId) {
      cache = await loadQuestions(cache, companyId, shouldRefresh);
    }
    await setCache(cache);
  } catch (error) {
    cache = {
      ...cache,
      stale: true,
      lastError: error instanceof Error ? error.message : String(error)
    };
    await setCache(cache);
  }

  return toRuntimeData(cache, state);
}

export async function updateHotQuestionCompany(state: ExtensionStorageState, companyId: number): Promise<HotQuestionsRuntimeData> {
  let cache = await getCache();
  cache = {
    ...cache,
    selectedCompanyId: companyId
  };
  await setCache(cache);
  return getHotQuestionsRuntimeData(state);
}
