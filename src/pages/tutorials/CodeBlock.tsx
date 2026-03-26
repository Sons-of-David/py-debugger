import { useMemo } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useTheme } from '../../contexts/ThemeContext';
import { getVizRanges } from '../../python-engine/viz-block-parser';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'python' }: CodeBlockProps) {
  const { darkMode } = useTheme();

  const vizLines = useMemo(() => {
    if (language !== 'python') return new Set<number>();
    const set = new Set<number>();
    for (const r of getVizRanges(code)) {
      for (let l = r.startLine; l <= r.endLine; l++) set.add(l);
    }
    return set;
  }, [code, language]);

  return (
    <SyntaxHighlighter
      language={language}
      style={darkMode ? atomOneDark : atomOneLight}
      wrapLines
      showLineNumbers
      lineNumberContainerStyle={{ display: 'none' }}
      lineProps={(lineNumber) =>
        vizLines.has(lineNumber)
          ? {
              style: {
                display: 'block',
                backgroundColor: 'rgba(99, 102, 241, 0.07)',
                borderLeft: '2px solid rgba(99, 102, 241, 0.3)',
                marginLeft: '-1em',
                paddingLeft: '1em',
              },
            }
          : {}
      }
      customStyle={{
        borderRadius: '0.5rem',
        fontSize: '0.875rem',
        lineHeight: '1.625',
        border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
        margin: 0,
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
}
