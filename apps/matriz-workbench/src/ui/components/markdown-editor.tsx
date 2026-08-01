"use client"

import { useState } from "react"

function safeInline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)]+\))/g)
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/)
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>
    return part
  })
}

export function MarkdownPreview({ source }: { source: string }) {
  const lines = source.split("\n")
  return (
    <div className="markdown-preview">
      {lines.map((line, index) => {
        if (line.startsWith("### ")) return <h3 key={index}>{safeInline(line.slice(4))}</h3>
        if (line.startsWith("## ")) return <h2 key={index}>{safeInline(line.slice(3))}</h2>
        if (line.startsWith("# ")) return <h1 key={index}>{safeInline(line.slice(2))}</h1>
        if (line.startsWith("- [x] ")) return <p key={index}>☑ {safeInline(line.slice(6))}</p>
        if (line.startsWith("- [ ] ")) return <p key={index}>☐ {safeInline(line.slice(6))}</p>
        if (line.startsWith("- ")) return <p key={index}>• {safeInline(line.slice(2))}</p>
        if (line.startsWith("> ")) return <blockquote key={index}>{safeInline(line.slice(2))}</blockquote>
        if (!line.trim()) return <br key={index} />
        return <p key={index}>{safeInline(line)}</p>
      })}
    </div>
  )
}

export function MarkdownEditor({
  name,
  initialValue = "",
}: {
  name: string
  initialValue?: string
}) {
  const [value, setValue] = useState(initialValue)
  const [preview, setPreview] = useState(false)
  return (
    <div className="markdown-editor">
      <div className="editor-tabs">
        <button type="button" className={!preview ? "active" : ""} onClick={() => setPreview(false)}>
          Escrever
        </button>
        <button type="button" className={preview ? "active" : ""} onClick={() => setPreview(true)}>
          Preview
        </button>
        <span>Markdown seguro · HTML bruto desativado</span>
      </div>
      {preview ? (
        <MarkdownPreview source={value} />
      ) : (
        <textarea
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          rows={18}
          maxLength={100000}
        />
      )}
      {preview ? <input type="hidden" name={name} value={value} /> : null}
    </div>
  )
}
