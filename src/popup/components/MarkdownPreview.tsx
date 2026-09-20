import ReactMarkdown from 'react-markdown';
import { sanitizeMarkdown } from '../../shared/markdown/sanitize';

interface MarkdownPreviewProps {
  markdown: string;
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  return (
    <div className="max-h-60 overflow-y-auto overflow-x-hidden rounded-sm bg-surface-2 p-4">
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none prose-pre:bg-surface-2 prose-pre:p-4 prose-pre:rounded-sm">
        <ReactMarkdown
          components={{
            code: ({ node, ...props }) => (
              <code className="rounded-xs bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]" {...props} />
            ),
          }}
        >
          {sanitizeMarkdown(markdown)}
        </ReactMarkdown>
      </div>
    </div>
  );
}
