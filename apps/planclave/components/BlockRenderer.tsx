"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Block } from "@/lib/markdown-parser";
import hljs from "highlight.js/lib/common";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ThreadInfo {
  id: string;
  blockId: string;
  status: "open" | "resolved";
}

interface BlockRendererProps {
  blocks: Block[];
  threads?: ThreadInfo[];
  onCreateThread?: (
    blockId: string,
    startLine: number,
    endLine: number
  ) => void;
  children?: (blockId: string) => React.ReactNode;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Convert inline markdown to HTML.
 * Handles: **bold**, *italic*, `inline code`, [links](url), ~~strikethrough~~
 *
 * NOTE: This is used with dangerouslySetInnerHTML for rendering markdown
 * block content per the component specification. The input is user-authored
 * markdown, not arbitrary untrusted HTML.
 */
function inlineMarkdownToHtml(text: string): string {
  let html = text;
  // Escape HTML entities first to prevent injection
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Inline code (must come before bold/italic to avoid conflicts)
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");
  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");
  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  return html;
}

function formatGutterLabel(startLine: number, endLine: number): string {
  if (startLine === endLine) {
    return `L${startLine}`;
  }
  return `L${startLine}-${endLine}`;
}

// ---------------------------------------------------------------------------
// Highlight.js helpers
// ---------------------------------------------------------------------------

/**
 * Highlight a block of code and return an array of HTML strings, one per line.
 * Each string contains the syntax-highlighted HTML for that line.
 */
function highlightLines(code: string, language?: string): string[] {
  let highlighted: string;
  try {
    if (language && hljs.getLanguage(language)) {
      highlighted = hljs.highlight(code, { language }).value;
    } else {
      highlighted = hljs.highlightAuto(code).value;
    }
  } catch {
    // Fallback: escape HTML
    highlighted = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  return highlighted.split("\n");
}

// ---------------------------------------------------------------------------
// Block renderers
// ---------------------------------------------------------------------------

function renderHeading(block: Block): React.ReactNode {
  const level = block.level ?? 1;
  const text = block.content.replace(/^#{1,6}\s+/, "");
  const html = inlineMarkdownToHtml(text);
  const sizeClasses: Record<number, string> = {
    1: "text-3xl font-bold mt-6 mb-4 border-b border-primary/20 pb-2",
    2: "text-2xl font-semibold mt-5 mb-3 pl-4 border-l-[4px] border-primary",
    3: "text-xl font-semibold mt-4 mb-2",
    4: "text-lg font-semibold mt-3 mb-2",
    5: "text-base font-medium mt-2 mb-1",
    6: "text-sm font-medium mt-2 mb-1",
  };
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
  return React.createElement(Tag, {
    className: cn("leading-tight", sizeClasses[level]),
    dangerouslySetInnerHTML: { __html: html },
  });
}

function renderParagraph(block: Block): React.ReactNode {
  const html = block.content
    .split("\n")
    .map((l) => inlineMarkdownToHtml(l))
    .join("<br />");
  return React.createElement("p", {
    className: "my-2 leading-7 text-foreground",
    dangerouslySetInnerHTML: { __html: html },
  });
}

function renderListItem(block: Block): React.ReactNode {
  const level = block.level ?? 0;
  // Strip list marker and optional checkbox prefix from text
  let text = block.content
    .replace(/^\s*[-*]\s+/, "")
    .replace(/^\s*\d+\.\s+/, "");
  // Strip checkbox markers [ ] or [x]/[X]
  text = text.replace(/^\[([ xX])\]\s*/, "");
  const html = inlineMarkdownToHtml(text);
  const paddingLeft = level * 24 + 16;

  const isChecked = block.checked === true;
  const isUnchecked = block.checked === false;
  const isCheckbox = isChecked || isUnchecked;

  let marker: React.ReactNode;
  if (isCheckbox) {
    marker = (
      <span
        className={cn(
          "mt-1.5 inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] border-2 text-[10px] font-bold leading-none",
          isChecked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40 bg-transparent"
        )}
        aria-hidden="true"
      >
        {isChecked ? "\u2713" : null}
      </span>
    );
  } else {
    marker = (
      <span className="mt-2.5 inline-block size-1.5 shrink-0 rounded-full bg-foreground/50" />
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 py-0.5 leading-7",
        isChecked && "text-muted-foreground line-through decoration-muted-foreground/30"
      )}
      style={{ paddingLeft: `${paddingLeft}px` }}
    >
      {marker}
      <span dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function renderBlockquote(block: Block): React.ReactNode {
  const lines = block.content
    .split("\n")
    .map((l) => l.replace(/^\s*>\s?/, ""));
  const html = lines.map((l) => inlineMarkdownToHtml(l)).join("<br />");
  return React.createElement("blockquote", {
    className:
      "my-3 border-l-4 border-primary/40 bg-secondary/30 rounded-r-md py-2 pl-4 italic text-muted-foreground",
    dangerouslySetInnerHTML: { __html: html },
  });
}

function renderHr(): React.ReactNode {
  return <hr className="my-6 border-border" />;
}

// ---------------------------------------------------------------------------
// CodeBlockRenderer (React component with per-line review)
// ---------------------------------------------------------------------------

function CodeBlockRenderer({
  block,
  onCreateThread,
}: {
  block: Block;
  onCreateThread?: (
    blockId: string,
    startLine: number,
    endLine: number
  ) => void;
}) {
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  const lines = block.content.split("\n");
  // Strip opening and closing fences
  const hasClosingFence =
    lines.length > 1 && lines[lines.length - 1]?.trim().startsWith("```");
  const codeLines = lines.slice(1, hasClosingFence ? -1 : undefined);
  const codeContent = codeLines.join("\n");

  // Syntax highlight
  const highlightedLines = useMemo(
    () => highlightLines(codeContent, block.language),
    [codeContent, block.language]
  );

  // The first code line is at startLine + 1 (after the opening fence)
  const firstCodeSourceLine = block.startLine + 1;

  return (
    <div className="relative my-3 overflow-hidden rounded-lg border border-border/60 bg-secondary/80">
      {block.language && (
        <div className="absolute right-3 top-2 z-10 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-primary/70">
          {block.language}
        </div>
      )}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm leading-6">
          <code className="font-mono">
            {highlightedLines.map((lineHtml, idx) => {
              const sourceLineNum = firstCodeSourceLine + idx;
              const isHovered = hoveredLine === idx;
              return (
                <div
                  key={idx}
                  className={cn(
                    "group/codeline flex",
                    isHovered && "bg-primary/5"
                  )}
                  onMouseEnter={() => setHoveredLine(idx)}
                  onMouseLeave={() => setHoveredLine(null)}
                >
                  {/* Line number gutter with + button */}
                  <span className="relative mr-4 inline-block w-8 shrink-0 text-right font-mono text-xs leading-6 text-primary/30 select-none">
                    {isHovered && onCreateThread ? (
                      <button
                        type="button"
                        onClick={() =>
                          onCreateThread(
                            block.id,
                            sourceLineNum,
                            sourceLineNum
                          )
                        }
                        className="absolute inset-0 inline-flex items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold transition-colors hover:bg-primary/80"
                        style={{ width: "20px", height: "20px", top: "2px", left: "50%", transform: "translateX(-50%)" }}
                        title={`Start thread on line ${sourceLineNum}`}
                      >
                        +
                      </button>
                    ) : (
                      <>{idx + 1}</>
                    )}
                  </span>
                  {/* Code content */}
                  <span
                    className="hljs"
                    dangerouslySetInnerHTML={{
                      __html: lineHtml || "\u00a0",
                    }}
                  />
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MermaidBlock (rendered mermaid charts with source toggle)
// ---------------------------------------------------------------------------

function MermaidBlock({
  block,
  onCreateThread,
}: {
  block: Block;
  onCreateThread?: (
    blockId: string,
    startLine: number,
    endLine: number
  ) => void;
}) {
  const [view, setView] = useState<"rendered" | "source">("rendered");
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState(false);

  // Extract code content (strip fences)
  const lines = block.content.split("\n");
  const hasClosingFence =
    lines.length > 1 && lines[lines.length - 1]?.trim().startsWith("```");
  const codeLines = lines.slice(1, hasClosingFence ? -1 : undefined);
  const codeContent = codeLines.join("\n");

  useEffect(() => {
    if (view === "rendered" && containerRef.current && !renderError) {
      let cancelled = false;
      import("mermaid").then((mod) => {
        if (cancelled) return;
        mod.default.initialize({ startOnLoad: false, theme: "dark" });
        const id = `mermaid-${block.id.replace(/[^a-zA-Z0-9-]/g, "")}`;
        mod.default
          .render(id, codeContent)
          .then(({ svg }) => {
            if (!cancelled && containerRef.current) {
              containerRef.current.innerHTML = svg;
            }
          })
          .catch(() => {
            if (!cancelled) {
              setRenderError(true);
              setView("source");
            }
          });
      });
      return () => {
        cancelled = true;
      };
    }
  }, [view, block.id, codeContent, renderError]);

  return (
    <div className="relative my-3 overflow-hidden rounded-lg border border-border/60 bg-secondary/80">
      {/* Toggle bar */}
      <div className="flex items-center gap-1 border-b border-border/40 px-3 py-1.5">
        <span className="mr-2 text-[10px] font-medium tracking-wide text-primary/70">
          mermaid
        </span>
        <button
          type="button"
          onClick={() => setView("rendered")}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors",
            view === "rendered"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Rendered
        </button>
        <button
          type="button"
          onClick={() => {
            setRenderError(false);
            setView("source");
          }}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors",
            view === "source"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Source
        </button>
      </div>

      {view === "rendered" && !renderError ? (
        <div
          ref={containerRef}
          className="flex items-center justify-center overflow-x-auto p-4 [&_svg]:max-w-full"
        />
      ) : (
        <CodeBlockRenderer
          block={block}
          onCreateThread={onCreateThread}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TableRenderer (React component with per-row review)
// ---------------------------------------------------------------------------

function TableRenderer({
  block,
  onCreateThread,
}: {
  block: Block;
  onCreateThread?: (
    blockId: string,
    startLine: number,
    endLine: number
  ) => void;
}) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const allLines = block.content.split("\n").filter((l) => l.trim() !== "");
  if (allLines.length === 0) return null;

  const parseRow = (line: string): string[] => {
    return line
      .split("|")
      .map((cell) => cell.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length);
  };

  const headerCells = parseRow(allLines[0]);
  // Detect separator row (e.g., |---|---|)
  const hasSeparator =
    allLines.length > 1 && /^\s*\|[\s:|-]+\|\s*$/.test(allLines[1]);
  const bodyLines = hasSeparator ? allLines.slice(2) : allLines.slice(1);

  // Compute line offsets for body rows
  // The body rows start after header (1 line) + optional separator (1 line)
  const bodyStartOffset = hasSeparator ? 2 : 1;

  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-primary/5">
            {headerCells.map((cell, idx) => (
              <th
                key={idx}
                className="px-4 py-2 text-left font-semibold text-foreground"
                dangerouslySetInnerHTML={{ __html: inlineMarkdownToHtml(cell) }}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyLines.map((line, rowIdx) => {
            const cells = parseRow(line);
            const sourceLineNum = block.startLine + bodyStartOffset + rowIdx;
            const isHovered = hoveredRow === rowIdx;
            return (
              <tr
                key={rowIdx}
                className={cn(
                  "relative border-b border-border/40 last:border-b-0",
                  isHovered && "bg-primary/5"
                )}
                onMouseEnter={() => setHoveredRow(rowIdx)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {cells.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-4 py-2 text-muted-foreground"
                  >
                    {cellIdx === 0 ? (
                      <span className="flex items-center gap-2">
                        {isHovered && onCreateThread ? (
                          <button
                            type="button"
                            onClick={() =>
                              onCreateThread(
                                block.id,
                                sourceLineNum,
                                sourceLineNum
                              )
                            }
                            className="inline-flex size-5 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold transition-colors hover:bg-primary/80"
                            title={`Start thread on row ${rowIdx + 1}`}
                          >
                            +
                          </button>
                        ) : (
                          <span className="inline-block size-5 shrink-0" />
                        )}
                        <span
                          dangerouslySetInnerHTML={{
                            __html: inlineMarkdownToHtml(cell),
                          }}
                        />
                      </span>
                    ) : (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: inlineMarkdownToHtml(cell),
                        }}
                      />
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BlockRow (gutter wrapper for each block)
// ---------------------------------------------------------------------------

function BlockRow({
  block,
  hasOpenThread,
  onCreateThread,
  children,
}: {
  block: Block;
  hasOpenThread: boolean;
  onCreateThread?: (
    blockId: string,
    startLine: number,
    endLine: number
  ) => void;
  children?: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  const handleCreateThread = useCallback(() => {
    onCreateThread?.(block.id, block.startLine, block.endLine);
  }, [onCreateThread, block]);

  // Code and table blocks have their own per-line/row "+" buttons,
  // so the outer BlockRow "+" button should be hidden for those types.
  const hasInlineReview = block.type === "code" || block.type === "table";

  let rendered: React.ReactNode = null;
  switch (block.type) {
    case "heading":
      rendered = renderHeading(block);
      break;
    case "paragraph":
      rendered = renderParagraph(block);
      break;
    case "code":
      if (block.language === "mermaid") {
        rendered = (
          <MermaidBlock block={block} onCreateThread={onCreateThread} />
        );
      } else {
        rendered = (
          <CodeBlockRenderer block={block} onCreateThread={onCreateThread} />
        );
      }
      break;
    case "list-item":
      rendered = renderListItem(block);
      break;
    case "blockquote":
      rendered = renderBlockquote(block);
      break;
    case "hr":
      rendered = renderHr();
      break;
    case "table":
      rendered = (
        <TableRenderer block={block} onCreateThread={onCreateThread} />
      );
      break;
  }

  return (
    <div className="group/block">
      <div
        className="flex"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Gutter */}
        <div className="relative w-[72px] shrink-0 select-none border-r border-border/50 pr-3 pt-2 text-right font-mono text-[11px] text-muted-foreground/40">
          {hovered && onCreateThread && !hasInlineReview ? (
            <button
              type="button"
              onClick={handleCreateThread}
              className="glow-pulse inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm transition-colors hover:bg-primary/80"
              title="Start a thread"
            >
              +
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              {hasOpenThread && (
                <span className="inline-block size-1.5 rounded-full bg-primary" />
              )}
              {formatGutterLabel(block.startLine, block.endLine)}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 pl-4">{rendered}</div>
      </div>

      {/* Thread slot below the block */}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function BlockRenderer({
  blocks,
  threads = [],
  onCreateThread,
  children,
}: BlockRendererProps) {
  const openThreadBlockIds = new Set(
    threads.filter((t) => t.status === "open").map((t) => t.blockId)
  );

  return (
    <div className="mx-auto max-w-4xl">
      {blocks.map((block) => (
        <BlockRow
          key={block.id}
          block={block}
          hasOpenThread={openThreadBlockIds.has(block.id)}
          onCreateThread={onCreateThread}
        >
          {children?.(block.id)}
        </BlockRow>
      ))}
    </div>
  );
}
