import { renderMarkdown } from "./markdown-renderer"

export function Markdown({ content }: { readonly content: string }) {
  const html = renderMarkdown(content)
  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
