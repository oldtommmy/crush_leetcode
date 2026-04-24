import type { Locale, ProblemIdentity } from '../../shared/types';
import { FloatingNotePanel } from './FloatingNotePanel';

interface ProblemNoteButtonProps {
  identity: ProblemIdentity;
  locale: Locale;
  onRate: () => void;
}

export function ProblemNoteButton({ identity, locale, onRate }: ProblemNoteButtonProps) {
  return <FloatingNotePanel identity={identity} locale={locale} onRate={onRate} />;
}
