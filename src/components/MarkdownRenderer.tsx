'use client'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

// The models write LaTeX using \(...\) and \[...\] delimiters, but remark-math
// only recognizes $...$ (inline) and $$...$$ (block). Normalize before rendering.
function normalizeLatexDelimiters(text: string): string {
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, expr) => `$$${expr}$$`) // Replace \[...\] with $$...$$
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, expr) => `$${expr}$`)    // Replace \(...\) with $...$
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
      {normalizeLatexDelimiters(content)}
    </ReactMarkdown>
  )
}
