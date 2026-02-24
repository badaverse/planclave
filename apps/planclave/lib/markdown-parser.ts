export interface Block {
  id: string;
  type:
    | "heading"
    | "paragraph"
    | "code"
    | "list-item"
    | "blockquote"
    | "hr"
    | "table";
  content: string;
  level?: number;
  language?: string;
  checked?: boolean;
  startLine: number;
  endLine: number;
}

function getListIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  const indent = match ? match[1].length : 0;
  return Math.floor(indent / 2);
}

function isHeading(line: string): boolean {
  return /^#{1,6}\s/.test(line);
}

function getHeadingLevel(line: string): number {
  const match = line.match(/^(#{1,6})\s/);
  return match ? match[1].length : 0;
}

function isListItem(line: string): boolean {
  return /^\s*[-*]\s/.test(line) || /^\s*\d+\.\s/.test(line);
}

function getCheckboxState(line: string): boolean | undefined {
  const match = line.match(/^\s*[-*]\s+\[([ xX])\]/);
  if (!match) {
    return undefined;
  }
  return match[1].toLowerCase() === 'x';
}

function isBlockquote(line: string): boolean {
  return /^\s*>/.test(line);
}

function isHr(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^-{3,}$/.test(trimmed) ||
    /^\*{3,}$/.test(trimmed) ||
    /^_{3,}$/.test(trimmed)
  );
}

function isCodeFence(line: string): boolean {
  return /^\s*```/.test(line);
}

function getCodeLanguage(line: string): string {
  const match = line.match(/^\s*```(\S*)/);
  return match ? match[1] : "";
}

function isTableLine(line: string): boolean {
  return line.includes("|") && line.trim().startsWith("|");
}

export function parseMarkdownToBlocks(markdown: string): Block[] {
  const lines = markdown.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines between blocks
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Code fence block
    if (isCodeFence(line)) {
      const language = getCodeLanguage(line);
      const startLine = i + 1; // 1-based
      const contentLines: string[] = [line];
      i++;
      while (i < lines.length && !isCodeFence(lines[i])) {
        contentLines.push(lines[i]);
        i++;
      }
      // Include the closing fence if found
      if (i < lines.length) {
        contentLines.push(lines[i]);
        i++;
      }
      const endLine = i; // 1-based (i is now past the closing fence)
      blocks.push({
        id: `block-${startLine}`,
        type: "code",
        content: contentLines.join("\n"),
        language: language || undefined,
        startLine,
        endLine,
      });
      continue;
    }

    // Heading
    if (isHeading(line)) {
      const startLine = i + 1;
      blocks.push({
        id: `block-${startLine}`,
        type: "heading",
        content: line,
        level: getHeadingLevel(line),
        startLine,
        endLine: startLine,
      });
      i++;
      continue;
    }

    // HR
    if (isHr(line)) {
      const startLine = i + 1;
      blocks.push({
        id: `block-${startLine}`,
        type: "hr",
        content: line,
        startLine,
        endLine: startLine,
      });
      i++;
      continue;
    }

    // Table: consecutive lines containing |
    if (isTableLine(line)) {
      const startLine = i + 1;
      const contentLines: string[] = [];
      while (i < lines.length && isTableLine(lines[i])) {
        contentLines.push(lines[i]);
        i++;
      }
      const endLine = i; // 1-based
      blocks.push({
        id: `block-${startLine}`,
        type: "table",
        content: contentLines.join("\n"),
        startLine,
        endLine,
      });
      continue;
    }

    // List item
    if (isListItem(line)) {
      const startLine = i + 1;
      const level = getListIndentLevel(line);
      const checked = getCheckboxState(line);
      const block: Block = {
        id: `block-${startLine}`,
        type: "list-item",
        content: line,
        level,
        startLine,
        endLine: startLine,
      };
      if (checked !== undefined) {
        block.checked = checked;
      }
      blocks.push(block);
      i++;
      continue;
    }

    // Blockquote: consecutive lines starting with >
    if (isBlockquote(line)) {
      const startLine = i + 1;
      const contentLines: string[] = [];
      while (i < lines.length && isBlockquote(lines[i])) {
        contentLines.push(lines[i]);
        i++;
      }
      const endLine = i; // 1-based
      blocks.push({
        id: `block-${startLine}`,
        type: "blockquote",
        content: contentLines.join("\n"),
        startLine,
        endLine,
      });
      continue;
    }

    // Paragraph: consecutive non-empty, non-special lines
    {
      const startLine = i + 1;
      const contentLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !isHeading(lines[i]) &&
        !isCodeFence(lines[i]) &&
        !isHr(lines[i]) &&
        !isListItem(lines[i]) &&
        !isBlockquote(lines[i]) &&
        !isTableLine(lines[i])
      ) {
        contentLines.push(lines[i]);
        i++;
      }
      const endLine = i; // 1-based
      blocks.push({
        id: `block-${startLine}`,
        type: "paragraph",
        content: contentLines.join("\n"),
        startLine,
        endLine,
      });
    }
  }

  return blocks;
}
