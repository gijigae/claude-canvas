// Simple TypeScript syntax highlighter for terminal display

import React from "react";
import { Text } from "ink";

interface TokenStyle {
  color?: string;
  bold?: boolean;
  dimColor?: boolean;
}

interface Token {
  text: string;
  style: TokenStyle;
}

const COLORS = {
  keyword: "magenta",
  type: "cyan",
  string: "green",
  number: "yellow",
  comment: "gray",
  function: "blue",
  property: "white",
  operator: "white",
  punctuation: "gray",
  default: "white",
} as const;

// TypeScript keywords
const KEYWORDS = new Set([
  "import", "export", "from", "const", "let", "var", "function", "class",
  "interface", "type", "enum", "extends", "implements", "new", "return",
  "if", "else", "for", "while", "do", "switch", "case", "break", "continue",
  "try", "catch", "finally", "throw", "async", "await", "yield", "of", "in",
  "instanceof", "typeof", "void", "delete", "default", "as", "is", "keyof",
  "readonly", "public", "private", "protected", "static", "abstract", "override",
  "declare", "namespace", "module", "require", "true", "false", "null", "undefined",
  "this", "super", "get", "set", "constructor", "describe", "it", "test", "expect",
]);

// Built-in types
const TYPES = new Set([
  "string", "number", "boolean", "object", "any", "unknown", "never", "void",
  "Array", "Object", "String", "Number", "Boolean", "Function", "Promise",
  "Map", "Set", "Date", "Error", "RegExp", "Symbol", "BigInt",
]);

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    const char = line[i]!;
    const nextTwo = line.slice(i, i + 2);

    // Single-line comment
    if (nextTwo === "//") {
      tokens.push({ text: line.slice(i), style: { color: COLORS.comment, dimColor: true } });
      break;
    }

    // Multi-line comment start (just highlight to end of line for simplicity)
    if (nextTwo === "/*") {
      const endIdx = line.indexOf("*/", i + 2);
      if (endIdx !== -1) {
        tokens.push({ text: line.slice(i, endIdx + 2), style: { color: COLORS.comment, dimColor: true } });
        i = endIdx + 2;
        continue;
      } else {
        tokens.push({ text: line.slice(i), style: { color: COLORS.comment, dimColor: true } });
        break;
      }
    }

    // String (double quote)
    if (char === '"') {
      let j = i + 1;
      while (j < line.length && line[j] !== '"') {
        if (line[j] === "\\") j++;
        j++;
      }
      tokens.push({ text: line.slice(i, j + 1), style: { color: COLORS.string } });
      i = j + 1;
      continue;
    }

    // String (single quote)
    if (char === "'") {
      let j = i + 1;
      while (j < line.length && line[j] !== "'") {
        if (line[j] === "\\") j++;
        j++;
      }
      tokens.push({ text: line.slice(i, j + 1), style: { color: COLORS.string } });
      i = j + 1;
      continue;
    }

    // Template string
    if (char === "`") {
      let j = i + 1;
      while (j < line.length && line[j] !== "`") {
        if (line[j] === "\\") j++;
        j++;
      }
      tokens.push({ text: line.slice(i, j + 1), style: { color: COLORS.string } });
      i = j + 1;
      continue;
    }

    // Number
    if (/[0-9]/.test(char)) {
      let j = i;
      while (j < line.length && /[0-9.xXa-fA-F_n]/.test(line[j]!)) j++;
      tokens.push({ text: line.slice(i, j), style: { color: COLORS.number } });
      i = j;
      continue;
    }

    // Identifier or keyword
    if (/[a-zA-Z_$]/.test(char)) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j]!)) j++;
      const word = line.slice(i, j);

      let style: TokenStyle;
      if (KEYWORDS.has(word)) {
        style = { color: COLORS.keyword, bold: true };
      } else if (TYPES.has(word)) {
        style = { color: COLORS.type };
      } else if (j < line.length && line[j] === "(") {
        style = { color: COLORS.function };
      } else if (word[0] && word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
        // PascalCase - likely a type/class
        style = { color: COLORS.type };
      } else {
        style = { color: COLORS.default };
      }

      tokens.push({ text: word, style });
      i = j;
      continue;
    }

    // Operators and punctuation
    if (/[+\-*/%=<>!&|^~?:]/.test(char)) {
      let j = i;
      while (j < line.length && /[+\-*/%=<>!&|^~?:]/.test(line[j]!)) j++;
      tokens.push({ text: line.slice(i, j), style: { color: COLORS.operator } });
      i = j;
      continue;
    }

    // Punctuation
    if (/[{}()\[\];,.]/.test(char)) {
      tokens.push({ text: char, style: { color: COLORS.punctuation } });
      i++;
      continue;
    }

    // Whitespace and other
    tokens.push({ text: char, style: {} });
    i++;
  }

  return tokens;
}

interface Props {
  content: string;
  scrollOffset: number;
  visibleLines: number;
}

export function TypeScriptHighlighter({ content, scrollOffset, visibleLines }: Props) {
  const lines = content.split("\n");
  const visible = lines.slice(scrollOffset, scrollOffset + visibleLines);

  return (
    <>
      {visible.map((line, idx) => {
        const tokens = tokenizeLine(line);
        return (
          <Text key={`ts-line-${scrollOffset + idx}`} wrap="truncate">
            {tokens.length === 0 ? " " : tokens.map((token, tidx) => (
              <Text
                key={`token-${tidx}`}
                color={token.style.color}
                bold={token.style.bold}
                dimColor={token.style.dimColor}
              >
                {token.text}
              </Text>
            ))}
          </Text>
        );
      })}
    </>
  );
}
