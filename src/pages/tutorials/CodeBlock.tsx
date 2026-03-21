import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useTheme } from '../../contexts/ThemeContext';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'python' }: CodeBlockProps) {
  const { darkMode } = useTheme();
  return (
    <SyntaxHighlighter
      language={language}
      style={darkMode ? atomOneDark : atomOneLight}
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
