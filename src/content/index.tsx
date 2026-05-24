import { Component, useEffect, useState, type ReactNode } from 'react';
import { ensureInjectedRoot } from './injectRoot';
import { observeAcceptedSubmission } from './acceptedObserver';
import { installLeetCodeSubmissionBridge, listenForAcceptedBridge } from './pageBridge';
import { detectCurrentProblem } from './leetcodeDetector';
import { EvaluationModal } from './components/EvaluationModal';
import { ProblemNoteButton } from './components/ProblemNoteButton';
import { problemIdFor } from '../shared/review/scheduler';
import { isSameLocalDate } from '../shared/date';
import type { ExtensionStorageState, Locale, ProblemIdentity, RuntimeRequest, RuntimeResponse } from '../shared/types';
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
    chrome.runtime
      .sendMessage({ type: 'GET_DAILY_PLAN' } satisfies RuntimeRequest)
      .then((response: RuntimeResponse<{ state: ExtensionStorageState }>) => {
        if (response.ok && response.data) {
          setLocale(response.data.state.settings.locale);
          setAutoShow(response.data.state.settings.autoShowAcceptedModal);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const refreshIdentity = () => setIdentity(detectCurrentProblem());
    window.addEventListener('popstate', refreshIdentity);
    const interval = window.setInterval(refreshIdentity, 1500);
    return () => {
      window.removeEventListener('popstate', refreshIdentity);
      window.clearInterval(interval);
    };
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
        const response = (await chrome.runtime.sendMessage({ type: 'GET_DAILY_PLAN' } satisfies RuntimeRequest)) as RuntimeResponse<{ state: ExtensionStorageState }>;
        if (response.ok && response.data) {
          const problemId = problemIdFor(current);
          const existing = response.data.state.problemsById[problemId];
          
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
