import ReactMarkdown from 'react-markdown';
import { sanitizeMarkdown } from '../../shared/markdown/sanitize';

interface MarkdownPreviewProps {
  markdown: string;
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  return (
    <div className="max-h-60 overflow-y-auto overflow-x-hidden rounded-xl bg-neutral-50/50 p-4 dark:bg-neutral-900/50">
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none prose-pre:bg-neutral-900 prose-pre:p-4 prose-pre:rounded-xl">
        <ReactMarkdown
          components={{
            code: ({ node, ...props }) => (
              <code className="rounded bg-neutral-200 px-1.5 py-0.5 font-mono text-[11px] dark:bg-neutral-800" {...props} />
            ),
          }}
        >
          {sanitizeMarkdown(markdown)}
        </ReactMarkdown>
      </div>
    </div>
  );
}
