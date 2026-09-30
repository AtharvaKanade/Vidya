import React from 'react';

/**
 * FormattedExplanation: Renders markdown paragraphs, bold tokens, and numbered/bullet steps
 * on separate lines with clean spacing and comfortable typography.
 */
export default function FormattedExplanation({ content }) {
  if (!content) return null;

  // Split into logical blocks by double newline
  const blocks = content.split(/\n\s*\n/).filter(b => b.trim().length > 0);

  // Helper to parse **bold text** within a string
  const renderInline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="space-y-3.5 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
      {blocks.map((block, bIdx) => {
        const lines = block.split('\n').filter(l => l.trim().length > 0);

        // Check if block contains list items (e.g. "1. ", "2. ", "- ", "* ")
        const isList = lines.every(l => /^\s*(\d+\.|\*|-)\s+/.test(l));

        if (isList) {
          return (
            <ul key={bIdx} className="space-y-2 my-2 pl-1">
              {lines.map((line, lIdx) => {
                const match = line.match(/^\s*(\d+\.|\*|-)\s+(.*)/);
                const marker = match ? match[1] : '•';
                const body = match ? match[2] : line;
                return (
                  <li key={lIdx} className="flex items-start gap-2.5">
                    <span 
                      className="font-mono text-xs px-1.5 py-0.5 rounded font-semibold shrink-0 mt-0.5"
                      style={{
                        background: 'var(--green-dim)',
                        color: 'var(--green)',
                        border: '1px solid var(--green-border)',
                      }}
                    >
                      {marker}
                    </span>
                    <span className="flex-1">{renderInline(body)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // If block has lines separated by single newline (like a header + step list)
        if (lines.length > 1) {
          return (
            <div key={bIdx} className="space-y-1.5">
              {lines.map((line, lIdx) => {
                const isItem = /^\s*(\d+\.|\*|-)\s+/.test(line);
                if (isItem) {
                  const match = line.match(/^\s*(\d+\.|\*|-)\s+(.*)/);
                  const marker = match ? match[1] : '•';
                  const body = match ? match[2] : line;
                  return (
                    <div key={lIdx} className="flex items-start gap-2.5 pl-1 my-1">
                      <span 
                        className="font-mono text-xs px-1.5 py-0.5 rounded font-semibold shrink-0 mt-0.5"
                        style={{
                          background: 'var(--green-dim)',
                          color: 'var(--green)',
                          border: '1px solid var(--green-border)',
                        }}
                      >
                        {marker}
                      </span>
                      <span className="flex-1">{renderInline(body)}</span>
                    </div>
                  );
                }
                return (
                  <p key={lIdx} className="leading-relaxed">
                    {renderInline(line)}
                  </p>
                );
              })}
            </div>
          );
        }

        // Standard single paragraph
        return (
          <p key={bIdx} className="leading-relaxed">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}
