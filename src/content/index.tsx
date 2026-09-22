import { Component, useEffect, useState, type ReactNode } from 'react';
import { ensureInjectedRoot } from './injectRoot';
import { observeAcceptedSubmission } from './acceptedObserver';
import { installLeetCodeSubmissionBridge, listenForAcceptedBridge } from './pageBridge';
import { detectCurrentProblem } from './leetcodeDetector';
import { onLocationChange } from './navigationEvents';
import { EvaluationModal } from './components/EvaluationModal';
import { ProblemNoteButton } from './components/ProblemNoteButton';
import { problemIdFor } from '../shared/review/scheduler';
import { isSameLocalDate } from '../shared/date';
import { STORAGE_KEY } from '../shared/constants';
import { readContentSettingsData } from '../background/runtimeData';
import type { ContentSettingsData, ProblemReviewContextData } from '../background/runtimeData';
import type { Locale, ProblemIdentity, RuntimeRequest, RuntimeResponse } from '../shared/types';
import '../styles/tailwind.css';

interface AcceptedContext {
  pathname?: string;
}

class ContentErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

function titleSlugFromPathname(pathname: string | undefined): string | undefined {
  return pathname?.match(/\/problems\/([^/]+)/)?.[1];
}

function isCurrentProblemContext(context?: AcceptedContext): boolean {
  const submittedSlug = titleSlugFromPathname(context?.pathname);
  if (!submittedSlug) {
    return true;
  }
  return submittedSlug === titleSlugFromPathname(window.location.pathname);
}

function ContentApp() {
  const [identity, setIdentity] = useState<ProblemIdentity | undefined>(() => detectCurrentProblem());
  const [locale, setLocale] = useState<Locale>('en');
  const [autoShow, setAutoShow] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let receivedLiveSettingsUpdate = false;
    const applyContentSettings = (settings: ContentSettingsData) => {
      setLocale(settings.locale);
      setAutoShow(settings.autoShowAcceptedModal);
    };
    const onStorageChanged = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== 'local' || !changes[STORAGE_KEY]) return;
      const settings = readContentSettingsData(changes[STORAGE_KEY].newValue);
      if (settings) {
        receivedLiveSettingsUpdate = true;
        applyContentSettings(settings);
      }
    };

    chrome.storage.onChanged.addListener(onStorageChanged);
    chrome.runtime
      .sendMessage({ type: 'GET_CONTENT_SETTINGS' } satisfies RuntimeRequest)
      .then((response: RuntimeResponse<ContentSettingsData>) => {
        if (!receivedLiveSettingsUpdate && response.ok && response.data) applyContentSettings(response.data);
      })
      .catch(console.error);

    return () => chrome.storage.onChanged.removeListener(onStorageChanged);
  }, []);

  useEffect(() => {
    // C1: event-driven identity refresh. LeetCode is an SPA, so we react to
    // history navigation (patched pushState/replaceState + popstate) instead of
    // polling detectCurrentProblem() on a 1.5s timer that scanned the whole DOM.
    const refreshIdentity = () => setIdentity(detectCurrentProblem());
    return onLocationChange(refreshIdentity);
  }, []);

  useEffect(() => {
    installLeetCodeSubmissionBridge();
  }, []);

  useEffect(() => {
    const openAcceptedModal = async (context?: AcceptedContext) => {
      if (!isCurrentProblemContext(context)) {
        console.log('Crush LeetCode: Accepted event belongs to a previous problem, skipping auto-popup.');
        return;
      }

      const current = detectCurrentProblem();
      if (!current) return;
      
      setIdentity(current);
      if (!autoShow) return;

      // Smart check: Only auto-pop if not reviewed today
      try {
        const problemId = problemIdFor(current);
        const response = (await chrome.runtime.sendMessage({
          type: 'GET_PROBLEM_REVIEW_CONTEXT',
          payload: { problemId }
        } satisfies RuntimeRequest)) as RuntimeResponse<ProblemReviewContextData>;
        if (response.ok && response.data) {
          const existing = response.data.problem;

          const alreadyReviewedToday = existing?.lastReviewedAt && isSameLocalDate(existing.lastReviewedAt, new Date());
          
          if (!alreadyReviewedToday) {
            setModalOpen(true);
          } else {
            console.log('Crush LeetCode: Problem already reviewed today, skipping auto-popup.');
          }
        } else {
          setModalOpen(true); // Fallback
        }
      } catch (e) {
        setModalOpen(true); // Fallback
      }
    };

    const stopBridge = listenForAcceptedBridge(openAcceptedModal);
    const stopDomObserver = observeAcceptedSubmission(openAcceptedModal);

    return () => {
      stopBridge();
      stopDomObserver();
    };
  }, [autoShow]);

  if (!identity) {
    return null;
  }

  return (
    <>
      <ProblemNoteButton identity={identity} locale={locale} onRate={() => setModalOpen(true)} />
      {modalOpen ? (
        <EvaluationModal
          identity={identity}
          locale={locale}
          source="accepted_modal"
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </>
  );
}

ensureInjectedRoot().root.render(
  <ContentErrorBoundary>
    <ContentApp />
  </ContentErrorBoundary>
);
