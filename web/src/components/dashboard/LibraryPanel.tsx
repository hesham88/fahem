"use client";

import React, { useState, useEffect } from "react";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../../lib/firebase";

interface Book {
  _id?: string;
  id?: string;
  title: string;
  title_ar?: string;
  titleEn?: string;
  titleAr?: string;
  subject?: string;
  subject_id?: string;
  size?: string;
  format?: string;
  downloads?: string;
  isMoeIngested?: boolean;
  isUserUpload?: boolean;
  chapters?: any[];
}

const isTextArabic = (text: string): boolean => {
  if (!text) return false;
  const arCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const enCount = (text.match(/[a-zA-Z]/g) || []).length;
  return arCount > enCount;
};

const getSubjectTheme = (subject: string) => {
  const s = (subject || "").toLowerCase();
  
  if (s.includes("math") || s.includes("algebra") || s.includes("calculus") || s.includes("رياضيات") || s === "subj_algebra_stats") {
    return {
      primary: "#2563eb",
      secondary: "#3b82f6",
      glowColor: "rgba(37, 99, 235, 0.15)",
      badgeBg: "rgba(37, 99, 235, 0.08)",
      badgeText: "#1d4ed8",
      emoji: "📐",
      gradient: "linear-gradient(135deg, #1d4ed8, #3b82f6)"
    };
  }
  if (s.includes("computer") || s.includes("programming") || s.includes("coding") || s.includes("حاسب") || s === "sub_computer_science_1780535716963") {
    return {
      primary: "#7c3aed",
      secondary: "#a78bfa",
      glowColor: "rgba(124, 58, 237, 0.15)",
      badgeBg: "rgba(124, 58, 237, 0.08)",
      badgeText: "#6d28d9",
      emoji: "💻",
      gradient: "linear-gradient(135deg, #6d28d9, #a78bfa)"
    };
  }
  if (s.includes("science") || s.includes("physics") || s.includes("chemistry") || s.includes("biology") || s.includes("علوم") || s.includes("فيزياء") || s.includes("كيمياء") || s.includes("أحياء") || s === "subj_biology") {
    return {
      primary: "#059669",
      secondary: "#34d399",
      glowColor: "rgba(5, 150, 105, 0.15)",
      badgeBg: "rgba(5, 150, 105, 0.08)",
      badgeText: "#047857",
      emoji: "🧪",
      gradient: "linear-gradient(135deg, #059669, #34d399)"
    };
  }
  if (s.includes("arabic") || s.includes("عربي") || s.includes("نحو") || s === "subj_arabic_grammar") {
    return {
      primary: "#d97706",
      secondary: "#fbbf24",
      glowColor: "rgba(217, 119, 6, 0.15)",
      badgeBg: "rgba(217, 119, 6, 0.08)",
      badgeText: "#b45309",
      emoji: "✍️",
      gradient: "linear-gradient(135deg, #d97706, #fbbf24)"
    };
  }
  if (s.includes("business") || s.includes("economy") || s.includes("economics") || s.includes("أعمال") || s.includes("اقتصاد") || s === "subj_business") {
    return {
      primary: "#0d9488",
      secondary: "#2dd4bf",
      glowColor: "rgba(13, 148, 136, 0.15)",
      badgeBg: "rgba(13, 148, 136, 0.08)",
      badgeText: "#0f766e",
      emoji: "💼",
      gradient: "linear-gradient(135deg, #0d9488, #2dd4bf)"
    };
  }
  if (s.includes("social") || s.includes("history") || s.includes("humanities") || s.includes("اجتماع") || s.includes("تاريخ") || s === "subj_social_sciences") {
    return {
      primary: "#db2777",
      secondary: "#f472b6",
      glowColor: "rgba(219, 39, 119, 0.15)",
      badgeBg: "rgba(219, 39, 119, 0.08)",
      badgeText: "#be185d",
      emoji: "🌍",
      gradient: "linear-gradient(135deg, #db2777, #f472b6)"
    };
  }
  if (s === "all") {
    return {
      primary: "var(--primary)",
      secondary: "var(--secondary)",
      glowColor: "rgba(16, 107, 163, 0.15)",
      badgeBg: "rgba(16, 107, 163, 0.08)",
      badgeText: "var(--primary)",
      emoji: "📚",
      gradient: "linear-gradient(135deg, var(--primary), var(--secondary))"
    };
  }
  // Default/fallback
  return {
    primary: "#e11d48",
    secondary: "#fb7185",
    glowColor: "rgba(225, 29, 72, 0.15)",
    badgeBg: "rgba(225, 29, 72, 0.08)",
    badgeText: "#be123c",
    emoji: "📚",
    gradient: "linear-gradient(135deg, #e11d48, #fb7185)"
  };
};

const getSubjectNameLabel = (subject: string, language: string) => {
  const s = (subject || "").toLowerCase();
  const isAr = language === "ar";
  
  if (s === "all") {
    return isAr ? "كل المواد" : "All Subjects";
  }
  if (s.includes("math") || s.includes("algebra") || s.includes("calculus") || s.includes("رياضيات") || s === "subj_algebra_stats") {
    return isAr ? "الرياضيات البحتة" : "Pure Mathematics";
  }
  if (s.includes("computer") || s.includes("programming") || s.includes("coding") || s.includes("حاسب") || s === "sub_computer_science_1780535716963") {
    return isAr ? "علوم الحاسب" : "Computer Science";
  }
  if (s.includes("science") || s.includes("physics") || s.includes("chemistry") || s.includes("biology") || s.includes("علوم") || s.includes("فيزياء") || s.includes("كيمياء") || s.includes("أحياء") || s === "subj_biology") {
    return isAr ? "الفيزياء والكيمياء" : "Physics & Chemistry";
  }
  if (s.includes("arabic") || s.includes("عربي") || s.includes("نحو") || s === "subj_arabic_grammar") {
    return isAr ? "اللغة العربية وآدابها" : "Arabic Grammar & Literature";
  }
  if (s.includes("business") || s.includes("economy") || s.includes("economics") || s.includes("أعمال") || s.includes("اقتصاد") || s === "subj_business") {
    return isAr ? "الأعمال والاقتصاد" : "Business & Economics";
  }
  if (s.includes("social") || s.includes("history") || s.includes("humanities") || s.includes("اجتماع") || s.includes("تاريخ") || s === "subj_social_sciences") {
    return isAr ? "العلوم الاجتماعية والإنسانيات" : "Social Sciences & Humanities";
  }
  return isAr ? "مادة عامة" : "General Subject";
};

const isLineMathFormula = (line: string): boolean => {
  const mathIndicators = ["=", "≠", "≈", "≤", "≥", "±", "×", "÷", "√", "∫", "∑", "matrix", "det", "sin", "cos", "tan", "θ", "π", "λ", "α", "β", "γ"];
  if (line.length > 120) return false;
  
  const indicatorCount = mathIndicators.filter(ind => line.includes(ind)).length;
  if (indicatorCount >= 2) return true;
  return false;
};

const preprocessRawText = (text: string, isAr: boolean): string => {
  if (!text) return "";
  
  const hasMarkup = text.includes("[HEADER:") || text.includes("```") || text.includes("# ") || text.includes("[VISUAL:") || text.includes("[FOOTER:");
  if (hasMarkup) return text; // Already formatted, no need to touch it!
  
  const lines = text.split("\n");
  const processedLines: string[] = [];
  
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  
  // Helper to check if line looks like code
  const isCodeLine = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    
    // Python repl prompts
    if (trimmed.startsWith(">>>") || trimmed.startsWith("...")) return true;
    
    // Keywords at start
    if (/^(def|class|import|from|print|assert|return|pass|break|continue|if|elif|else|while|for|try|except|finally|with|as|lambda|global|nonlocal|yield)\b/.test(trimmed)) {
      return true;
    }
    
    // Indented line (starts with 4+ spaces) and is preceded/succeeded by code
    if (line.startsWith("    ") || line.startsWith("\t")) {
      // Avoid falsely tagging list items or ordinary text paragraphs
      if (trimmed.length > 0 && !trimmed.startsWith("-") && !trimmed.startsWith("*") && !trimmed.startsWith("•") && !/^\d+[\.\-\)]/.test(trimmed)) {
        return true;
      }
    }
    
    // Variable assignments or function calls with python patterns
    if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[^=]/.test(trimmed) && (trimmed.includes("(") || trimmed.includes("[") || trimmed.includes("{") || trimmed.includes("\"") || trimmed.includes("'") || /^[0-9\s]+$/.test(trimmed.split("=")[1].trim()))) {
      return true;
    }
    
    // Common Python method calls or object creations
    if (/^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*\(/.test(trimmed)) {
      return true;
    }
    
    return false;
  };

  const isMathFormula = (line: string): boolean => {
    const mathIndicators = ["=", "≠", "≈", "≤", "≥", "±", "×", "÷", "√", "∫", "∑", "matrix", "det", "sin", "cos", "tan", "θ", "π", "λ", "α", "β", "γ"];
    if (line.length > 120) return false;
    const indicatorCount = mathIndicators.filter(ind => line.includes(ind)).length;
    // Don't classify code lines or list items or urls as math formulas
    if (isCodeLine(line) || line.trim().startsWith("-") || line.trim().startsWith("*") || line.trim().includes("http") || line.trim().startsWith("•")) {
      return false;
    }
    return indicatorCount >= 2;
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();
    
    if (isCodeLine(line)) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLines = [];
      }
      // Remove >>> prompt for cleaner execution look
      let codeVal = line;
      if (trimmed.startsWith(">>> ")) {
        codeVal = line.replace(">>> ", "");
      } else if (trimmed.startsWith(">>>")) {
        codeVal = line.replace(">>>", "");
      }
      codeBlockLines.push(codeVal);
    } else {
      if (inCodeBlock) {
        inCodeBlock = false;
        processedLines.push("```python");
        processedLines.push(...codeBlockLines);
        processedLines.push("```");
        codeBlockLines = [];
      }
      
      if (!trimmed) {
        processedLines.push("");
        continue;
      }
      
      // 1. Detect section headers, e.g. "9.1 Modifying lists" or "Chapter 9 Lists"
      const chHeaderMatchEn = trimmed.match(/^Chapter\s+(\d+)\s*[:-]?\s*(.+)$/i) || trimmed.match(/^(\d+)\s*•\s*([A-Za-z ]{3,})/);
      const secHeaderMatchEn = trimmed.match(/^(\d+)\.(\d+)\s+([A-Za-z ]{3,})/);
      const chHeaderMatchAr = trimmed.match(/^(الفصل|القسم)\s+(\d+)\s*[:-]?\s*(.+)$/i);
      
      if (chHeaderMatchEn) {
        const num = chHeaderMatchEn[1];
        const title = chHeaderMatchEn[2];
        processedLines.push(`# Chapter ${num}: ${title}`);
      } else if (secHeaderMatchEn) {
        processedLines.push(`## ${trimmed}`);
      } else if (chHeaderMatchAr) {
        const type = chHeaderMatchAr[1];
        const num = chHeaderMatchAr[2];
        const title = chHeaderMatchAr[3];
        processedLines.push(`# ${type} ${num}: ${title}`);
      }
      // 2. Detect definitions
      // For example, if a line starts with "An append() operation is used to..." or "A list is a sequence..."
      // Or in Arabic: "يستخدم التابع ... لـ" or "القائمة هي عبارة عن..."
      else if (/^(A|An|The)\s+([a-zA-Z0-9_\(\)]+)\s+is\s+(defined as|used to|a method|an operation|an object|a data structure|a sequence)\b/i.test(trimmed)) {
        processedLines.push(`Definition: ${trimmed}`);
      }
      else if (/^(عبارة عن|تُعرف|يُعرف|يستخدم|التابع)\s+([\u0600-\u06FF]+)/i.test(trimmed)) {
        processedLines.push(`Definition: ${trimmed}`);
      }
      // 3. Detect mathematical equations
      else if (isMathFormula(line)) {
        processedLines.push(`Equation: ${trimmed}`);
      }
      // Otherwise, keep as ordinary line
      else {
        processedLines.push(line);
      }
    }
  }
  
  if (inCodeBlock) {
    processedLines.push("```python");
    processedLines.push(...codeBlockLines);
    processedLines.push("```");
  }
  
  return processedLines.join("\n");
};

const renderPremiumContent = (text: string, isAr: boolean): React.ReactNode[] | null => {
  if (!text) return null;
  const processedText = preprocessRawText(text, isAr);
  const lines = processedText.split("\n");
  const elements: React.ReactNode[] = [];
  
  // Helper to parse inline styles: ==highlights==, **bold**, __underline__, *italic*
  const parseInlineElements = (textStr: string): React.ReactNode => {
    if (!textStr) return "";
    
    type Token = { type: "text" | "highlight" | "bold" | "underline" | "italic"; content: string };
    let tokens: Token[] = [{ type: "text", content: textStr }];
    
    // 1. Highlight ==text==
    let nextTokens: Token[] = [];
    tokens.forEach(tok => {
      if (tok.type === "text") {
        const parts = tok.content.split("==");
        parts.forEach((p, idx) => {
          if (idx % 2 === 1) {
            nextTokens.push({ type: "highlight", content: p });
          } else if (p) {
            nextTokens.push({ type: "text", content: p });
          }
        });
      } else {
        nextTokens.push(tok);
      }
    });
    tokens = nextTokens;
    
    // 2. Bold **text**
    nextTokens = [];
    tokens.forEach(tok => {
      if (tok.type === "text") {
        const parts = tok.content.split("**");
        parts.forEach((p, idx) => {
          if (idx % 2 === 1) {
            nextTokens.push({ type: "bold", content: p });
          } else if (p) {
            nextTokens.push({ type: "text", content: p });
          }
        });
      } else {
        nextTokens.push(tok);
      }
    });
    tokens = nextTokens;
    
    // 3. Underline __text__
    nextTokens = [];
    tokens.forEach(tok => {
      if (tok.type === "text") {
        const parts = tok.content.split("__");
        parts.forEach((p, idx) => {
          if (idx % 2 === 1) {
            nextTokens.push({ type: "underline", content: p });
          } else if (p) {
            nextTokens.push({ type: "text", content: p });
          }
        });
      } else {
        nextTokens.push(tok);
      }
    });
    tokens = nextTokens;
    
    // 4. Italic *text*
    nextTokens = [];
    tokens.forEach(tok => {
      if (tok.type === "text") {
        const parts = tok.content.split("*");
        parts.forEach((p, idx) => {
          if (idx % 2 === 1) {
            nextTokens.push({ type: "italic", content: p });
          } else if (p) {
            nextTokens.push({ type: "text", content: p });
          }
        });
      } else {
        nextTokens.push(tok);
      }
    });
    tokens = nextTokens;
    
    return (
      <>
        {tokens.map((tok, idx) => {
          if (tok.type === "highlight") {
            return (
              <span key={idx} style={{
                background: "linear-gradient(120deg, rgba(251, 191, 36, 0.25) 0%, rgba(251, 191, 36, 0.45) 100%)",
                borderBottom: "2px solid #d97706",
                padding: "1px 6px",
                borderRadius: "6px",
                fontWeight: 700,
                color: "var(--foreground)",
                boxShadow: "0 2px 4px rgba(217, 119, 6, 0.05)",
                display: "inline-block"
              }}>{tok.content}</span>
            );
          }
          if (tok.type === "bold") {
            return (
              <strong key={idx} style={{
                fontWeight: 800,
                color: "var(--primary)"
              }}>{tok.content}</strong>
            );
          }
          if (tok.type === "underline") {
            return (
              <span key={idx} style={{
                borderBottom: "2.5px solid var(--primary)",
                paddingBottom: "2px",
                fontWeight: 700
              }}>{tok.content}</span>
            );
          }
          if (tok.type === "italic") {
            return (
              <em key={idx} style={{
                fontStyle: "italic",
                opacity: 0.95
              }}>{tok.content}</em>
            );
          }
          return tok.content;
        })}
      </>
    );
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      elements.push(<div key={`space-${i}`} style={{ height: "0.75rem" }} />);
      i++;
      continue;
    }

    // A. Detect [HEADER: ...]
    const headerMatch = line.match(/^\[HEADER:\s*(.*)\]$/i);
    if (headerMatch) {
      const content = headerMatch[1];
      elements.push(
        <div key={`header-${i}`} style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.75rem",
          fontWeight: 800,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          borderBottom: "1.5px solid rgba(16, 107, 163, 0.12)",
          paddingBottom: "0.6rem",
          marginBottom: "1.75rem",
          direction: isAr ? "rtl" : "ltr"
        }}>
          <span>{parseInlineElements(content)}</span>
          <span>📖 {isAr ? "كتاب منهجي معتمد" : "Official Curriculum"}</span>
        </div>
      );
      i++;
      continue;
    }

    // B. Detect [FOOTER: ...]
    const footerMatch = line.match(/^\[FOOTER:\s*(.*)\]$/i);
    if (footerMatch) {
      const content = footerMatch[1];
      elements.push(
        <div key={`footer-${i}`} style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.75rem",
          fontWeight: 800,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          borderTop: "1.5px solid rgba(16, 107, 163, 0.12)",
          paddingTop: "0.6rem",
          marginTop: "1.75rem",
          direction: isAr ? "rtl" : "ltr"
        }}>
          <span style={{ color: "var(--primary)" }}>Fahem Ingestion Studio</span>
          <span>{parseInlineElements(content)}</span>
        </div>
      );
      i++;
      continue;
    }

    // C. Detect [VISUAL: ...]
    const visualMatch = line.match(/^\[VISUAL:\s*(.*)\]$/i);
    if (visualMatch) {
      const content = visualMatch[1];
      elements.push(
        <div key={`visual-${i}`} style={{
          margin: "1.75rem 0",
          padding: "1.5rem",
          borderRadius: "20px",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(16, 185, 129, 0.08) 100%)",
          border: "1.5px dashed rgba(16, 185, 129, 0.35)",
          boxShadow: "0 10px 30px rgba(16, 185, 129, 0.03)",
          fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-sans)",
          textAlign: isAr ? "right" : "left",
          direction: isAr ? "rtl" : "ltr"
        }}>
          <div style={{
            fontSize: "0.85rem",
            fontWeight: 850,
            color: "#059669",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "0.6rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <span>🖼️ {isAr ? "وصف مرئي / توضيحي" : "Visual Description / Illustration"}</span>
          </div>
          <div style={{
            fontSize: "0.95rem",
            lineHeight: "1.75",
            color: "#065f46",
            fontStyle: isAr ? "normal" : "italic",
            fontWeight: 600
          }}>{parseInlineElements(content)}</div>
        </div>
      );
      i++;
      continue;
    }

    // D. Detect Code Blocks (```)
    if (line.startsWith("```")) {
      const lang = line.replace("```", "").trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      const codeContent = codeLines.join("\n");
      elements.push(
        <div key={`code-${i}`} style={{
          background: "#0f172a",
          color: "#cbd5e1",
          borderRadius: "16px",
          padding: "1.25rem 1.5rem",
          margin: "1.5rem 0",
          fontFamily: "'Fira Code', 'Courier New', monospace",
          fontSize: "0.88rem",
          overflowX: "auto",
          boxShadow: "0 12px 35px rgba(15, 23, 42, 0.15)",
          border: "1px solid rgba(16, 107, 163, 0.18)",
          position: "relative",
          direction: "ltr",
          textAlign: "left"
        }}>
          <div style={{
            position: "absolute",
            top: "0.6rem",
            right: "1rem",
            fontSize: "0.68rem",
            color: "#64748b",
            textTransform: "uppercase",
            fontWeight: 800,
            letterSpacing: "0.08em"
          }}>{lang || "code"}</div>
          <pre style={{ margin: 0 }}><code style={{ whiteSpace: "pre-wrap", display: "block", lineHeight: "1.65" }}>{codeContent}</code></pre>
        </div>
      );
      continue;
    }

    // E. Detect Tables (| col1 | col2 |)
    if (line.startsWith("|")) {
      const tableLines: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const rawCells = lines[i].split("|").map(c => c.trim());
        if (rawCells[0] === "") rawCells.shift();
        if (rawCells[rawCells.length - 1] === "") rawCells.pop();
        tableLines.push(rawCells);
        i++;
      }

      if (tableLines.length > 0) {
        const headers = tableLines[0];
        let dataRows = tableLines.slice(1);
        if (dataRows.length > 0 && dataRows[0].every(cell => /^:?-+:?$/.test(cell))) {
          dataRows = dataRows.slice(1);
        }

        elements.push(
          <div key={`table-${i}`} style={{ overflowX: "auto", margin: "1.75rem 0", borderRadius: "16px", border: "1px solid rgba(16, 107, 163, 0.15)", boxShadow: "0 6px 20px rgba(16, 107, 163, 0.02)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "inherit", textAlign: isAr ? "right" : "left", direction: isAr ? "rtl" : "ltr" }}>
              <thead>
                <tr style={{ background: "linear-gradient(135deg, rgba(16, 107, 163, 0.06) 0%, rgba(16, 107, 163, 0.1) 100%)", borderBottom: "2px solid rgba(16, 107, 163, 0.18)" }}>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} style={{ padding: "0.95rem 1.25rem", fontSize: "0.92rem", fontWeight: 800, color: "var(--primary)" }}>
                      {parseInlineElements(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: "1px solid rgba(16, 107, 163, 0.08)", background: rIdx % 2 === 0 ? "#ffffff" : "rgba(16, 107, 163, 0.01)" }}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} style={{ padding: "0.9rem 1.25rem", fontSize: "0.92rem", color: "var(--foreground)", fontWeight: 550 }}>
                        {parseInlineElements(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 1. Detect Markdown headings
    if (line.startsWith("#")) {
      const level = line.match(/^#+/)?.[0].length || 1;
      const cleanText = line.replace(/^#+\s*/, "");
      const headingSizes = ["1.75rem", "1.5rem", "1.32rem", "1.18rem"];
      const size = headingSizes[Math.min(level - 1, headingSizes.length - 1)];
      elements.push(
        <h4 key={`h-${i}`} style={{
          fontSize: size,
          fontWeight: 900,
          color: "var(--primary)",
          marginTop: "1.85rem",
          marginBottom: "0.9rem",
          borderBottom: level <= 2 ? "2px solid rgba(16, 107, 163, 0.18)" : "none",
          paddingBottom: level <= 2 ? "0.5rem" : "0",
          borderLeft: level === 1 ? (isAr ? "none" : "5px solid #d4af37") : "none",
          borderRight: level === 1 ? (isAr ? "5px solid #d4af37" : "none") : "none",
          paddingLeft: level === 1 ? (isAr ? "0" : "0.75rem") : "0",
          paddingRight: level === 1 ? (isAr ? "0.75rem" : "0") : "0",
          fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-sans)",
          textAlign: isAr ? "right" : "left",
          lineHeight: "1.4"
        }}>
          {parseInlineElements(cleanText)}
        </h4>
      );
      i++;
      continue;
    }

    // 2. Detect Law / Theorem / Rule / Definition
    const lawMatch = line.match(/^(Law|Rule|Theorem|Definition|Principle|قانون|قاعدة|نظرية|مبدأ|تعريف|التعريف|القاعدة|القانون)\s*[:：]\s*(.*)$/i);
    if (lawMatch) {
      const label = lawMatch[1];
      const content = lawMatch[2];
      elements.push(
        <div key={`law-${i}`} style={{
          margin: "1.75rem 0",
          padding: "1.5rem",
          borderRadius: "18px",
          background: "linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(212, 175, 55, 0.1) 100%)",
          borderLeft: isAr ? "none" : "5px solid #d4af37",
          borderRight: isAr ? "5px solid #d4af37" : "none",
          borderTop: "1px solid rgba(212, 175, 55, 0.15)",
          borderBottom: "1px solid rgba(212, 175, 55, 0.15)",
          boxShadow: "0 10px 30px rgba(212, 175, 55, 0.06)",
          fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-sans)",
          textAlign: isAr ? "right" : "left",
          direction: isAr ? "rtl" : "ltr"
        }}>
          <div style={{
            fontSize: "0.85rem",
            fontWeight: 850,
            color: "#b45309",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.6rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem"
          }}>
            <span>⚖️ {label}</span>
          </div>
          <div style={{
            fontSize: "1.02rem",
            lineHeight: "1.75",
            color: "var(--foreground)",
            fontWeight: 600,
            fontStyle: isAr ? "normal" : "italic"
          }}>{parseInlineElements(content)}</div>
        </div>
      );
      i++;
      continue;
    }

    // 2.5 Detect Equation / Formula
    const equationMatch = line.match(/^(Equation|Formula|Formula Label|معادلة|صيغة رياضية|صيغة)\s*[:：]\s*(.*)$/i);
    if (equationMatch) {
      const label = equationMatch[1];
      const content = equationMatch[2];
      elements.push(
        <div key={`equation-${i}`} style={{
          margin: "1.75rem auto",
          padding: "1.5rem",
          borderRadius: "18px",
          background: "linear-gradient(135deg, rgba(16, 107, 163, 0.03) 0%, rgba(16, 107, 163, 0.06) 100%)",
          border: "1px solid rgba(16, 107, 163, 0.15)",
          boxShadow: "0 10px 30px rgba(16, 107, 163, 0.04)",
          maxWidth: "95%",
          textAlign: "center",
          fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-sans)",
          direction: isAr ? "rtl" : "ltr"
        }}>
          <div style={{
            fontSize: "0.82rem",
            fontWeight: 850,
            color: "var(--primary)",
            marginBottom: "0.6rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem"
          }}>
            <span>📐 {label}</span>
          </div>
          <div style={{
            fontSize: "1.32rem",
            fontFamily: "'Cambria Math', 'Cambria', 'Times New Roman', serif",
            color: "var(--primary)",
            fontWeight: 700,
            padding: "0.6rem 1.25rem",
            background: "#ffffff",
            border: "1px dashed rgba(16, 107, 163, 0.25)",
            borderRadius: "10px",
            display: "inline-block",
            minWidth: "60%",
            direction: "ltr"
          }}>{parseInlineElements(content)}</div>
        </div>
      );
      i++;
      continue;
    }

    // 3. Detect Question / Request
    const questionMatch = line.match(/^(Question|Q|Request|سؤال|س|مسألة|تمرين)\s*[:：.]\s*(.*)$/i);
    if (questionMatch) {
      const label = questionMatch[1];
      const content = questionMatch[2];
      elements.push(
        <div key={`q-${i}`} style={{
          margin: "1.75rem 0",
          padding: "1.5rem",
          borderRadius: "18px",
          background: "linear-gradient(135deg, rgba(16, 107, 163, 0.04) 0%, rgba(16, 107, 163, 0.08) 100%)",
          borderLeft: isAr ? "none" : "5px solid var(--primary)",
          borderRight: isAr ? "5px solid var(--primary)" : "none",
          boxShadow: "0 10px 30px rgba(16, 107, 163, 0.05)",
          fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-sans)",
          textAlign: isAr ? "right" : "left",
          direction: isAr ? "rtl" : "ltr"
        }}>
          <div style={{
            fontSize: "0.85rem",
            fontWeight: 850,
            color: "var(--primary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.6rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem"
          }}>
            <span>❓ {label}</span>
          </div>
          <div style={{
            fontSize: "1.02rem",
            lineHeight: "1.75",
            color: "var(--foreground)",
            fontWeight: 600
          }}>{parseInlineElements(content)}</div>
        </div>
      );
      i++;
      continue;
    }

    // 4. Detect standalone Formulas / Equations
    const isFormula = isLineMathFormula(line);
    if (isFormula) {
      elements.push(
        <div key={`formula-${i}`} style={{
          margin: "1.75rem auto",
          padding: "1.5rem",
          borderRadius: "14px",
          background: "#ffffff",
          border: "1px solid rgba(16, 107, 163, 0.15)",
          boxShadow: "0 8px 25px rgba(0, 0, 0, 0.03)",
          maxWidth: "92%",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "0.78rem",
            fontWeight: 850,
            color: "#64748b",
            marginBottom: "0.6rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-sans)"
          }}>{isAr ? "📐 معادلة / صيغة رياضية" : "📐 Mathematical Expression"}</div>
          <div style={{
            fontSize: "1.25rem",
            fontFamily: "'Cambria Math', 'Cambria', 'Times New Roman', serif",
            color: "var(--primary)",
            fontWeight: 700,
            padding: "0.5rem 1.25rem",
            background: "rgba(16, 107, 163, 0.03)",
            borderRadius: "10px",
            display: "inline-block",
            minWidth: "65%",
            direction: "ltr"
          }}>{parseInlineElements(line)}</div>
        </div>
      );
      i++;
      continue;
    }

    // 5. Detect List items (bullet or numbered)
    if (line.startsWith("-") || line.startsWith("*") || line.startsWith("•") || /^\d+[\.\-\)]/.test(line) || /^[a-zA-Z\u0620-\u064A]+[\.\)]/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim() && (
        lines[i].trim().startsWith("-") || 
        lines[i].trim().startsWith("*") || 
        lines[i].trim().startsWith("•") || 
        /^\d+[\.\-\)]/.test(lines[i].trim()) ||
        /^[a-zA-Z\u0620-\u064A]+[\.\)]/.test(lines[i].trim())
      )) {
        listItems.push(lines[i].trim());
        i++;
      }
      elements.push(
        <ul key={`list-${i}`} style={{ 
          margin: "1.25rem 0", 
          paddingLeft: isAr ? "0" : "1.75rem", 
          paddingRight: isAr ? "1.75rem" : "0", 
          listStyleType: "none",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
          direction: isAr ? "rtl" : "ltr"
        }}>
          {listItems.map((item, idx) => {
            const cleanItem = item.replace(/^[\-\*•\d\.\)\s]+/, "").trim();
            const prefix = item.match(/^[\-\*•\d\.\)\s]+/)?.[0].trim() || "•";
            return (
              <li key={idx} style={{ 
                display: "flex", 
                alignItems: "flex-start", 
                gap: "0.6rem",
                lineHeight: "1.75",
                fontSize: "0.98rem",
                textAlign: isAr ? "right" : "left"
              }}>
                <span style={{ color: "var(--primary)", fontWeight: 900, fontSize: "1.05rem" }}>{prefix}</span>
                <span style={{ flex: 1 }}>{parseInlineElements(cleanItem)}</span>
              </li>
            );
          })}
        </ul>
      );
      continue;
    }

    // 6. Detect subtitle or small headings that are short and end with ":" or are bold
    if (line.length < 80 && (line.endsWith(":") || line.endsWith("：") || line.startsWith("**") && line.endsWith("**"))) {
      const cleanText = line.replace(/^\*\*|\*\*$/g, "").replace(/[:：]$/, "");
      elements.push(
        <h5 key={`sh-${i}`} style={{
          fontSize: "1.1rem",
          fontWeight: 800,
          color: "var(--primary)",
          marginTop: "1.35rem",
          marginBottom: "0.7rem",
          borderLeft: isAr ? "none" : "3.5px solid var(--secondary)",
          borderRight: isAr ? "3.5px solid var(--secondary)" : "none",
          paddingLeft: isAr ? "0" : "0.6rem",
          paddingRight: isAr ? "0.6rem" : "0",
          fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-sans)",
          textAlign: isAr ? "right" : "left"
        }}>
          {parseInlineElements(cleanText)}
        </h5>
      );
      i++;
      continue;
    }

    // 7. Regular paragraph
    elements.push(
      <p key={`p-${i}`} style={{
        fontSize: "1.02rem",
        lineHeight: "1.85",
        marginBottom: "1.2rem",
        color: "var(--foreground)",
        textAlign: isAr ? "justify" : "justify",
        textJustify: "inter-word",
        direction: isAr ? "rtl" : "ltr",
        fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-sans)",
        opacity: 0.98
      }}>
        {parseInlineElements(line)}
      </p>
    );
    i++;
  }

  return elements;
};

interface LibraryPanelProps {
  language: string;
  user: any;
  selectedBookReader: Book | null;
  setSelectedBookReader: (b: Book | null) => void;
  loadedBookPages: any[];
  setLoadedBookPages: (pages: any[]) => void;
  loadingBookPages: boolean;
  readerCurrentPage: number;
  setReaderCurrentPage: (p: number) => void;
  selectedText: string;
  setSelectedText: (t: string) => void;
  bubbleCoords: { x: number; y: number } | null;
  setBubbleCoords: (coords: { x: number; y: number } | null) => void;
  getAllPages: (book: Book, pages: any[]) => any[];
  moeIngestedBooks: any[];
  dynamicBooks: any[];
  librarySearch: string;
  setLibrarySearch: (val: string) => void;
  librarySubject: string;
  setLibrarySubject: (val: string) => void;
  customUploadedBooks: any[];
  setCustomUploadedBooks: React.Dispatch<React.SetStateAction<any[]>>;
  dynamicMaxUploadSize: number;
  handleStartStudy: (item: any) => void;
  t: (key: string) => string;
  isAdmin?: boolean;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({
  language,
  user,
  selectedBookReader,
  setSelectedBookReader,
  loadedBookPages,
  loadingBookPages,
  readerCurrentPage,
  setReaderCurrentPage,
  setSelectedText,
  bubbleCoords,
  setBubbleCoords,
  getAllPages,
  moeIngestedBooks,
  dynamicBooks,
  librarySearch,
  setLibrarySearch,
  librarySubject,
  setLibrarySubject,
  customUploadedBooks,
  setCustomUploadedBooks,
  dynamicMaxUploadSize,
  handleStartStudy,
  t,
  isAdmin = false
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifierLog, setVerifierLog] = useState<string[]>([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectedInfo, setRejectedInfo] = useState<any>(null);
  const [activeLibraryTab, setActiveLibraryTab] = useState<"curriculum" | "private">("curriculum");

  const [translationLanguage, setTranslationLanguage] = useState("");
  const [translatedTitle, setTranslatedTitle] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  const [showReaderSidebar, setShowReaderSidebar] = useState(true);
  const [sidebarPageSearch, setSidebarPageSearch] = useState("");

  // New states for hierarchical menu, library selection, and Swarm SVG Mind Map
  const [showMindMap, setShowMindMap] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"pages" | "hierarchy">("pages");
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [hoveredNode, setHoveredNode] = useState<any | null>(null);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>("all");

  const getBookLibraryId = (item: any): string => {
    const url = (item.source_url || item.sourceUrl || "").toLowerCase();
    const path = (item.storagePath || item.storage_path || "").toLowerCase();
    const isMoe = item.isMoeIngested || path.includes("ellibrary_moe_gov_eg") || path.includes("moe library") || url.includes("ellibrary.moe.gov.eg");
    const isOpenStax = url.includes("openstax.org") || path.includes("assets_openstax_org") || (item.titleEn || "").toLowerCase().includes("openstax") || (item.title || "").toLowerCase().includes("openstax");
    
    if (isMoe) return "moe";
    if (isOpenStax) return "openstax";
    
    const isAdmin = item.category === "admin" || path.startsWith("admin_uploads") || item.is_admin_upload || item.isAdminUpload;
    if (isAdmin) return "general";
    
    return "general";
  };

  const buildBookMindMapData = (allPages: any[]) => {
    const chaptersMap: Record<string, { titleEn: string; titleAr: string; pages: any[] }> = {};
    
    allPages.forEach((p) => {
      const chEn = p.chapterTitleEn || p.chapterTitleAr || "Chapter";
      const chAr = p.chapterTitleAr || p.chapterTitleEn || "الفصل";
      const key = chEn + "___" + chAr;
      
      if (!chaptersMap[key]) {
        chaptersMap[key] = {
          titleEn: chEn,
          titleAr: chAr,
          pages: []
        };
      }
      chaptersMap[key].pages.push(p);
    });
    
    return Object.values(chaptersMap);
  };

  const getLocalizedSubject = (subject: string | undefined, lang: string) => {
    return getSubjectNameLabel(subject || "", lang);
  };

  useEffect(() => {
    setTranslationLanguage("");
    setTranslatedTitle("");
    setTranslatedText("");
  }, [readerCurrentPage, selectedBookReader]);

  const handlePageTranslation = async (targetLang: string, activePage: any) => {
    if (!targetLang) {
      setTranslationLanguage("");
      setTranslatedTitle("");
      setTranslatedText("");
      return;
    }

    setTranslationLanguage(targetLang);
    setIsTranslating(true);

    const activeTitle = language === "ar" ? (activePage.titleAr || activePage.titleEn) : (activePage.titleEn || activePage.titleAr);
    const activeContent = language === "ar" ? activePage.contentAr : activePage.contentEn;

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activeTitle,
          text: activeContent,
          targetLanguage: targetLang
        })
      });
      const data = await response.json();
      if (data.success) {
        setTranslatedTitle(data.translatedTitle);
        setTranslatedText(data.translatedText);
      } else {
        alert(language === "ar" ? "فشلت الترجمة، يرجى المحاولة مرة أخرى." : "Translation failed, please try again.");
        setTranslationLanguage("");
      }
    } catch (err) {
      console.error("Translation error:", err);
      alert(language === "ar" ? "حدث خطأ أثناء الاتصال بخدمة الترجمة." : "An error occurred while connecting to the translation service.");
      setTranslationLanguage("");
    } finally {
      setIsTranslating(false);
    }
  };

  const runVerifierAgent = async (file: File, storagePath: string, downloadURL: string) => {
    setIsVerifying(true);
    setVerifierLog([
      language === "ar" ? "🕵️‍♂️ بدء وكيل التحقق الأكاديمي لـ فهم..." : "🕵️‍♂️ Starting Fahem Academic Verifier Agent...",
    ]);

    const addLogWithDelay = (msg: string, delay: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setVerifierLog((prev) => [...prev, msg]);
          resolve();
        }, delay);
      });
    };

    await addLogWithDelay(
      language === "ar" 
        ? `📂 تحليل خصائص الملف: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
        : `📂 Analyzing file properties: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      400
    );

    await addLogWithDelay(
      language === "ar"
        ? `🔒 استخراج التوقيع الرقمي وصيغة الملف: ${file.name.split('.').pop()?.toUpperCase()}`
        : `🔒 Extracting digital signature and format: ${file.name.split('.').pop()?.toUpperCase()}`,
      500
    );

    await addLogWithDelay(
      language === "ar"
        ? "🧠 تشغيل نموذج الذكاء الاصطناعي لفحص المحتوى والملاءمة التعليمية..."
        : "🧠 Calling AI model to evaluate content & educational relevance...",
      600
    );

    try {
      const response = await fetch("/api/books/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileFormat: file.name.split('.').pop() || "",
          downloadUrl: downloadURL,
          userId: user?.uid,
        }),
      });

      const data = await response.json();
      if (data.success && data.verdict) {
        const verdict = data.verdict;
        if (verdict.isAcademic) {
          await addLogWithDelay(
            language === "ar"
              ? `✅ تم التحقق بنجاح! التصنيف: ${verdict.category} (الثقة: ${verdict.confidence}%)`
              : `✅ Verification Successful! Category: ${verdict.category} (Confidence: ${verdict.confidence}%)`,
            400
          );

          const categoryToSubjectId: Record<string, string> = {
            "Mathematics": "subj_algebra_stats",
            "Science": "subj_biology",
            "History": "subj_social_sciences",
            "Language": "subj_arabic_grammar",
            "Computer Science": "sub_computer_science_1780535716963",
            "Engineering": "sub_computer_science_1780535716963",
            "General Education": "subj_biology"
          };
          const detectedSubjectId = categoryToSubjectId[verdict.category] || "subj_biology";

          // Trigger ingestion in /api/books
          const ingestRes = await fetch("/api/books", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: file.name.replace(/\.[^/.]+$/, ""),
              userId: user?.uid,
              storagePath: storagePath,
              downloadUrl: downloadURL,
              sizeBytes: file.size,
              format: file.name.split('.').pop()?.toUpperCase() || "PDF",
              subject_id: detectedSubjectId
            })
          });

          const ingestData = await ingestRes.json();
          const serverBook = ingestData.book;
          const serverBookId = serverBook?._id || serverBook?.book_id || serverBook?.id;

          const categoryToSubject: Record<string, string> = {
            "Mathematics": "Math",
            "Science": "Science",
            "History": "Social Sciences",
            "Language": "Arabic",
            "Computer Science": "Computer Science",
            "Engineering": "Computer Science",
            "General Education": "Science"
          };
          const detectedSubject = categoryToSubject[verdict.category] || "Science";

          const newBook = {
            _id: serverBookId,
            id: serverBookId,
            titleEn: file.name.replace(/\.[^/.]+$/, ""),
            titleAr: file.name.replace(/\.[^/.]+$/, ""),
            subject: detectedSubject,
            subject_id: detectedSubjectId,
            size: (file.size / (1024 * 1024)).toFixed(1) + " MB",
            format: file.name.split('.').pop()?.toUpperCase() || "PDF",
            downloads: "0",
            isUserUpload: true
          };

          setCustomUploadedBooks(prev => [newBook, ...prev]);
        } else {
          // Rejecting
          await addLogWithDelay(
            language === "ar" ? "❌ فشل التحقق! الملف لا يحتوي على مواد أكاديمية أو تعليمية." : "❌ Verification Failed! Non-academic content detected.",
            400
          );

          // Delete from storage
          const storageRef = ref(storage, storagePath);
          await deleteObject(storageRef);

          setRejectedInfo({
            fileName: file.name,
            confidence: verdict.confidence,
            category: verdict.category,
            rationaleEn: verdict.rationaleEn,
            rationaleAr: verdict.rationaleAr,
          });
          setShowRejectModal(true);
        }
      } else {
        throw new Error("Invalid response structure from verifier API.");
      }
    } catch (err) {
      console.error("Verification system error:", err);
      alert(language === "ar" ? "حدث خطأ أثناء فحص الملف." : "An error occurred during file verification.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {selectedBookReader ? (() => {
        const allPages = getAllPages(selectedBookReader, loadedBookPages);
        const totalPagesCount = allPages.length || 1;
        const activePage = allPages[readerCurrentPage - 1] || allPages[0] || {
          pageNum: 1,
          titleEn: "Untitled Section",
          titleAr: "قسم غير معنون",
          contentEn: "",
          contentAr: ""
        };

        return (
          /* Premium Dual-Panel Interactive Reader Layout */
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Reader Header Bar */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexWrap: "wrap", gap: "1rem",
              background: "rgba(255, 255, 255, 0.45)", backdropFilter: "blur(12px)",
              padding: "1rem 1.5rem", borderRadius: "16px", border: "1px solid rgba(16, 107, 163, 0.08)",
              borderTop: `4px solid ${getSubjectTheme(selectedBookReader.subject || "").primary}`,
              boxShadow: "0 4px 20px rgba(16, 107, 163, 0.02)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => setSelectedBookReader(null)}
                  style={{
                    padding: "8px 16px", borderRadius: "20px", border: "1px solid var(--card-border)",
                    background: "#ffffff", color: "var(--primary)", fontWeight: 700, fontSize: "0.85rem",
                    cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "0.4rem"
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = "rgba(16, 107, 163, 0.05)"; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = "#ffffff"; }}
                >
                  ⬅️ {language === "ar" ? "المكتبة" : "Library"}
                </button>
                <div>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
                    {language === "ar" ? (selectedBookReader.titleAr || selectedBookReader.title) : (selectedBookReader.titleEn || selectedBookReader.title)}
                  </h2>
                  <p style={{ fontSize: "0.75rem", color: "#6a7c88", margin: 0 }}>
                    {language === "ar" ? "جلسة دراسة تفاعلية نشطة مع رفيق فهم" : "Active chapter-linked study companion session"}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {/* Table of Contents Toggle */}
                <button
                  onClick={() => setShowReaderSidebar(!showReaderSidebar)}
                  style={{
                    padding: "6px 14px", borderRadius: "20px",
                    border: "1px solid rgba(16, 107, 163, 0.15)",
                    background: showReaderSidebar ? "linear-gradient(135deg, var(--primary), var(--secondary))" : "#ffffff",
                    color: showReaderSidebar ? "#ffffff" : "var(--primary)",
                    fontWeight: 800, fontSize: "0.8rem",
                    cursor: "pointer", transition: "all 0.2s",
                    boxShadow: showReaderSidebar ? "0 4px 12px rgba(16, 107, 163, 0.15)" : "none"
                  }}
                >
                  📖 {language === "ar" ? "فهرس الكتاب" : "Table of Contents"}
                </button>

                {/* Book Conceptual Outline Toggle */}
                <button
                  onClick={() => setShowMindMap(!showMindMap)}
                  style={{
                    padding: "6px 14px", borderRadius: "20px",
                    border: "1px solid rgba(212, 175, 55, 0.25)",
                    background: showMindMap ? "linear-gradient(135deg, #d4af37, #b45309)" : "#ffffff",
                    color: showMindMap ? "#ffffff" : "#b45309",
                    fontWeight: 800, fontSize: "0.8rem",
                    cursor: "pointer", transition: "all 0.2s",
                    boxShadow: showMindMap ? "0 4px 12px rgba(212, 175, 55, 0.15)" : "none"
                  }}
                >
                  🧠 {language === "ar" ? "خريطة المفاهيم" : "Mind Map"}
                </button>

                {/* Localized Subject Badge */}
                {(() => {
                  const rTheme = getSubjectTheme(selectedBookReader.subject || "");
                  return (
                    <div style={{
                      padding: "6px 14px", borderRadius: "20px", 
                      background: rTheme.badgeBg,
                      color: rTheme.badgeText, 
                      fontWeight: 800, fontSize: "0.8rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem"
                    }}>
                      {rTheme.emoji} {getLocalizedSubject(selectedBookReader.subject, language)}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Reader Split Panels */}
            <div style={{
              display: "grid",
              gridTemplateColumns: showReaderSidebar 
                ? (showMindMap ? "300px 380px 1fr" : "280px 1fr") 
                : (showMindMap ? "380px 1fr" : "1fr"),
              gap: "1.5rem",
              alignItems: "start"
            }} className="reader-split-panels">
              {/* Table of Contents Sidebar */}
              {showReaderSidebar && (
                <div style={{
                  background: "rgba(255, 255, 255, 0.75)",
                  backdropFilter: "blur(14px)",
                  border: "1px solid rgba(16, 107, 163, 0.1)",
                  borderRadius: "16px",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  maxHeight: "650px",
                  overflowY: "auto",
                  boxShadow: "0 10px 30px rgba(16, 107, 163, 0.02)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0, color: "var(--primary)" }}>
                      📖 {language === "ar" ? "فهرس الصفحات" : "Book Pages"}
                    </h3>
                    <span style={{ fontSize: "0.75rem", background: "rgba(16, 107, 163, 0.08)", color: "var(--primary)", padding: "3px 8px", borderRadius: "10px", fontWeight: 700 }}>
                      {allPages.length} {language === "ar" ? "صفحة" : "Pages"}
                    </span>
                  </div>

                  {/* Sidebar Search */}
                  <input
                    type="text"
                    placeholder={language === "ar" ? "ابحث عن عنوان أو محتوى..." : "Search title or text..."}
                    value={sidebarPageSearch}
                    onChange={(e) => setSidebarPageSearch(e.target.value)}
                    style={{
                      padding: "0.45rem 0.75rem",
                      borderRadius: "10px",
                      border: "1px solid rgba(16, 107, 163, 0.15)",
                      fontSize: "0.8rem",
                      outline: "none",
                      background: "#ffffff",
                      fontFamily: "var(--font-sans)",
                      width: "100%",
                      boxSizing: "border-box"
                    }}
                  />

                  {/* Pages List */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", overflowY: "auto", flex: 1, paddingRight: "4px" }}>
                    {(() => {

                      // Default simple list of pages grouped by chapter name
                      const search = sidebarPageSearch.toLowerCase();
                      const filteredPages = allPages.filter((p) => {
                        const tEn = (p.titleEn || "").toLowerCase();
                        const tAr = (p.titleAr || "").toLowerCase();
                        const cEn = (p.contentEn || "").toLowerCase();
                        const cAr = (p.contentAr || "").toLowerCase();
                        const chEn = (p.chapterTitleEn || "").toLowerCase();
                        const chAr = (p.chapterTitleAr || "").toLowerCase();
                        return tEn.includes(search) || tAr.includes(search) || cEn.includes(search) || cAr.includes(search) || chEn.includes(search) || chAr.includes(search);
                      });

                      if (filteredPages.length === 0) {
                        return (
                          <div style={{ textAlign: "center", padding: "2rem 0", color: "#6a7c88", fontSize: "0.85rem" }}>
                            🔍 {language === "ar" ? "لا توجد نتائج مطابقة" : "No matching pages found"}
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                          {filteredPages.map((p) => {
                            const isActive = p.pageNum === readerCurrentPage;
                            const pTitle = language === "ar" ? (p.titleAr || p.titleEn) : (p.titleEn || p.titleAr);
                            const pAr = isTextArabic(pTitle);
                            const pContent = language === "ar" ? (p.contentAr || p.contentEn || "") : (p.contentEn || p.contentAr || "");
                            const pSnippet = pContent.replace(/\s+/g, " ").trim().slice(0, 55) + (pContent.length > 55 ? "..." : "");

                            return (
                              <button
                                key={p.pageNum}
                                onClick={() => setReaderCurrentPage(p.pageNum)}
                                style={{
                                  textAlign: pAr ? "right" : "left",
                                  direction: pAr ? "rtl" : "ltr",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.25rem",
                                  padding: "8px 12px",
                                  borderRadius: "10px",
                                  border: isActive ? "1px solid rgba(16, 107, 163, 0.3)" : "1px solid transparent",
                                  background: isActive ? "linear-gradient(135deg, rgba(16, 107, 163, 0.08), rgba(212, 175, 55, 0.03))" : "rgba(255, 255, 255, 0.5)",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                  width: "100%",
                                  boxSizing: "border-box"
                                }}
                                onMouseOver={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(16, 107, 163, 0.04)"; }}
                                onMouseOut={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255, 255, 255, 0.5)"; }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "0.5rem" }}>
                                  <span style={{
                                    fontSize: "0.8rem",
                                    fontWeight: isActive ? 800 : 700,
                                    color: isActive ? "var(--primary)" : "var(--foreground)",
                                    textOverflow: "ellipsis",
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    flex: 1,
                                    textAlign: pAr ? "right" : "left"
                                  }}>
                                    {pTitle}
                                  </span>
                                  <span style={{
                                    fontSize: "0.7rem",
                                    fontWeight: 800,
                                    color: isActive ? "var(--primary)" : "#6a7c88",
                                    background: isActive ? "rgba(16, 107, 163, 0.12)" : "rgba(16, 107, 163, 0.05)",
                                    padding: "2px 6px",
                                    borderRadius: "6px",
                                    whiteSpace: "nowrap"
                                  }}>
                                    {language === "ar" ? `ص ${p.pageNum}` : `p. ${p.pageNum}`}
                                  </span>
                                </div>
                                {pSnippet && (
                                  <p style={{
                                    margin: 0,
                                    fontSize: "0.7rem",
                                    color: "#6a7c88",
                                    lineHeight: "1.3",
                                    textAlign: pAr ? "right" : "left",
                                    textOverflow: "ellipsis",
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    width: "100%"
                                  }}>
                                    {pSnippet}
                                  </p>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Expandable Conceptual Outline List Panel */}
              {showMindMap && (
                <div style={{
                  background: "rgba(255, 255, 255, 0.8)",
                  backdropFilter: "blur(14px)",
                  border: "1px solid rgba(16, 107, 163, 0.12)",
                  borderRadius: "20px",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                  maxHeight: "650px",
                  boxShadow: "0 12px 40px rgba(16, 107, 163, 0.04)",
                  overflowY: "auto",
                  position: "relative"
                }}>
                  {(() => {
                    const chapters = buildBookMindMapData(allPages);

                    // Helper to resolve concepts for a page
                    const getPageConcepts = (p: any): string[] => {
                      if (p.concepts && Array.isArray(p.concepts) && p.concepts.length > 0) {
                        return p.concepts;
                      }
                      if (p.originalPage?.concepts && Array.isArray(p.originalPage.concepts) && p.originalPage.concepts.length > 0) {
                        return p.originalPage.concepts;
                      }
                      
                      if (selectedBookReader && Array.isArray(selectedBookReader.chapters)) {
                        const ch = selectedBookReader.chapters.find((c: any) => {
                          const cTitleEn = (c.title || "").toLowerCase();
                          const cTitleAr = (c.title_ar || c.titleAr || "").toLowerCase();
                          const pChEn = (p.chapterTitleEn || "").toLowerCase();
                          const pChAr = (p.chapterTitleAr || "").toLowerCase();
                          
                          return (
                            (cTitleEn && pChEn && cTitleEn === pChEn) ||
                            (cTitleAr && pChAr && cTitleAr === pChAr) ||
                            (cTitleEn && pChAr && cTitleEn === pChAr) ||
                            (cTitleAr && pChEn && cTitleAr === pChEn) ||
                            (p.pageNum >= c.page_start && p.pageNum <= c.page_end)
                          );
                        });
                        if (ch && ch.concepts) {
                          if (Array.isArray(ch.concepts)) return ch.concepts;
                          if (typeof ch.concepts === "string") {
                            return (ch.concepts as string).split(",").map(s => s.trim()).filter(Boolean);
                          }
                        }
                      }

                      const fallbackConcepts: string[] = [];
                      if (p.formulas && p.formulas.length > 0) {
                        p.formulas.forEach((f: string) => {
                          const parts = f.split(":");
                          const label = parts[0]?.trim();
                          if (label && label.length < 25) {
                            fallbackConcepts.push(label);
                          }
                        });
                      }

                      if (fallbackConcepts.length === 0) {
                        const title = language === "ar" ? (p.titleAr || p.titleEn) : (p.titleEn || p.titleAr);
                        if (title && !title.startsWith("Page") && !title.startsWith("الصفحة")) {
                          fallbackConcepts.push(title);
                        } else {
                          fallbackConcepts.push(language === "ar" ? "شرح وتطبيق" : "Detailed Concept");
                          fallbackConcepts.push(language === "ar" ? "مراجعة وأسئلة" : "Interactive Review");
                        }
                      }

                      return fallbackConcepts;
                    };

                    return (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed rgba(16, 107, 163, 0.1)", paddingBottom: "0.75rem", marginBottom: "0.25rem" }}>
                          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            🧠 {language === "ar" ? "خريطة المفاهيم" : "Mind Map"}
                          </h3>
                          <span style={{ fontSize: "0.75rem", background: "rgba(16, 107, 163, 0.08)", color: "var(--primary)", padding: "3px 8px", borderRadius: "10px", fontWeight: 700 }}>
                            {language === "ar" ? `${chapters.length} فصول` : `${chapters.length} Chapters`}
                          </span>
                        </div>

                        <p style={{ margin: 0, fontSize: "0.78rem", color: "#6a7c88", fontStyle: "italic", lineHeight: "1.4" }}>
                          {language === "ar" 
                            ? "اضغط على فصول الكتاب لتوسيعها، واكتشف المفاهيم والموضوعات الرئيسية المربوطة بكل صفحة. اضغط على أي صفحة للانتقال السريع لها." 
                            : "Click chapters to expand and view pages. Explore high-density concept tags assigned to each page, and click any card to navigate instantly."}
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          {chapters.map((ch, idx) => {
                            const chTitle = language === "ar" ? (ch.titleAr || ch.titleEn) : (ch.titleEn || ch.titleAr);
                            const isExpanded = expandedChapters[ch.titleEn] !== false; // expanded by default
                            const isAr = isTextArabic(chTitle);
                            
                            return (
                              <div key={idx} style={{
                                background: "rgba(255, 255, 255, 0.45)",
                                border: "1px solid rgba(16, 107, 163, 0.08)",
                                borderRadius: "14px",
                                padding: "0.4rem",
                                transition: "all 0.3s ease",
                                boxShadow: "0 4px 12px rgba(16, 107, 163, 0.01)"
                              }}>
                                {/* Chapter Row Header */}
                                <button
                                  onClick={() => setExpandedChapters(prev => ({ ...prev, [ch.titleEn]: !isExpanded }))}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    width: "100%",
                                    padding: "10px 14px",
                                    borderRadius: "10px",
                                    border: "none",
                                    background: "rgba(16, 107, 163, 0.03)",
                                    cursor: "pointer",
                                    textAlign: isAr ? "right" : "left",
                                    direction: isAr ? "rtl" : "ltr",
                                    transition: "all 0.2s"
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.background = "rgba(16, 107, 163, 0.06)";
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.background = "rgba(16, 107, 163, 0.03)";
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span style={{ fontSize: "1.05rem" }}>📁</span>
                                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)" }}>
                                      {chTitle}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span style={{
                                      fontSize: "0.68rem",
                                      background: "rgba(16, 107, 163, 0.06)",
                                      color: "var(--primary)",
                                      padding: "1px 6px",
                                      borderRadius: "8px",
                                      fontWeight: 700
                                    }}>
                                      {ch.pages.length} {language === "ar" ? "صفحات" : "Pages"}
                                    </span>
                                    <span style={{ fontSize: "0.7rem", color: "var(--primary)", opacity: 0.7 }}>
                                      {isExpanded ? "▼" : "◀"}
                                    </span>
                                  </div>
                                </button>

                                {/* Multi-level outline: Chapters -> Titles Inside Chapter -> Concepts under Title -> Pages */}
                                {isExpanded && (
                                  <div style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.8rem",
                                    marginTop: "0.6rem",
                                    padding: "0.4rem 0.6rem",
                                    borderLeft: isAr ? "none" : "2px dashed rgba(16, 107, 163, 0.08)",
                                    borderRight: isAr ? "2px dashed rgba(16, 107, 163, 0.08)" : "none"
                                  }}>
                                    {(() => {
                                      const subTopicsMap: Record<string, { title: string; pages: any[]; concepts: string[] }> = {};
                                      ch.pages.forEach((p: any) => {
                                        let cleanTitle = "";
                                        const pTitle = language === "ar" ? (p.titleAr || p.titleEn) : (p.titleEn || p.titleAr);
                                        
                                        // Detect if a title is generic (e.g., purely Page X or purely numbers)
                                        const isGeneric = !pTitle || 
                                           !!pTitle.match(/^(Page|الصفحة|Section|قسم|Chapter|الفصل)\s*\d+$/i) ||
                                          !!pTitle.match(/^[\d\.\-\s]+$/) ||
                                          pTitle.length < 3;

                                        // 1. If page has a real descriptive title (not Page X, Section X etc.) and is not generic
                                        if (pTitle && !isGeneric) {
                                          cleanTitle = pTitle.replace(/^(Page|الصفحة|Section|قسم|Chapter|الفصل)\s+[\d\.]+\s*[:\-]?\s*/i, "").trim();
                                        }
                                        
                                        // 2. Fallback: use first concept tag as the topic title
                                        if (!cleanTitle) {
                                          const pConcepts = getPageConcepts(p);
                                          if (pConcepts && pConcepts.length > 0) {
                                            cleanTitle = pConcepts[0];
                                          }
                                        }
                                        
                                        // 3. Fallback: use first formula label as the topic title
                                        if (!cleanTitle && p.formulas && p.formulas.length > 0) {
                                          const firstForm = p.formulas[0];
                                          const parts = firstForm.split(":");
                                          if (parts[0] && parts[0].length < 30) {
                                            cleanTitle = parts[0].trim();
                                          }
                                        }
                                        
                                        // 4. Ultimate fallback
                                        if (!cleanTitle) {
                                          cleanTitle = language === "ar" ? `موضوع الصفحة ${p.pageNum}` : `Topic of Page ${p.pageNum}`;
                                        }

                                        if (!subTopicsMap[cleanTitle]) {
                                          subTopicsMap[cleanTitle] = {
                                            title: cleanTitle,
                                            pages: [],
                                            concepts: []
                                          };
                                        }
                                        subTopicsMap[cleanTitle].pages.push(p);
                                        
                                        const pConcepts = getPageConcepts(p);
                                        pConcepts.forEach((c: string) => {
                                          if (!subTopicsMap[cleanTitle].concepts.includes(c)) {
                                            subTopicsMap[cleanTitle].concepts.push(c);
                                          }
                                        });
                                      });
                                      
                                      const subTopics = Object.values(subTopicsMap);
                                      
                                      return subTopics.map((sub, sIdx) => {
                                        return (
                                          <div key={sIdx} style={{
                                            padding: "10px",
                                            marginLeft: isAr ? "0" : "0.5rem",
                                            marginRight: isAr ? "0.5rem" : "0",
                                            borderLeft: isAr ? "none" : "2px solid rgba(16, 107, 163, 0.12)",
                                            borderRight: isAr ? "2px solid rgba(16, 107, 163, 0.12)" : "none",
                                            background: "rgba(255, 255, 255, 0.45)",
                                            borderRadius: "12px",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "0.5rem",
                                            boxShadow: "0 1px 3px rgba(0,0,0,0.01)"
                                          }}>
                                            {/* Sub-Topic Title */}
                                            <div style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "0.4rem",
                                              fontSize: "0.82rem",
                                              fontWeight: 800,
                                              color: "var(--primary)"
                                            }}>
                                              <span>📌</span>
                                              <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                                {sub.title}
                                              </span>
                                            </div>

                                            {/* Concepts inside Sub-Topic */}
                                            {sub.concepts.length > 0 && (
                                              <div style={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                gap: "4px",
                                                paddingLeft: isAr ? "0" : "1.2rem",
                                                paddingRight: isAr ? "1.2rem" : "0"
                                              }}>
                                                {sub.concepts.map((concept, cIdx) => {
                                                  const hash = concept.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                                  const hue = hash % 360;
                                                  return (
                                                    <span
                                                      key={cIdx}
                                                      style={{
                                                        fontSize: "0.65rem",
                                                        fontWeight: 700,
                                                        background: `hsla(${hue}, 80%, 96%, 1)`,
                                                        border: `1px solid hsla(${hue}, 60%, 86%, 1)`,
                                                        color: `hsla(${hue}, 80%, 20%, 1)`,
                                                        padding: "2px 6px",
                                                        borderRadius: "6px",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "2px"
                                                      }}
                                                    >
                                                      🏷️ {concept}
                                                    </span>
                                                  );
                                                })}
                                              </div>
                                            )}

                                            {/* Pages inside Sub-Topic */}
                                            <div style={{
                                              display: "flex",
                                              flexWrap: "wrap",
                                              gap: "6px",
                                              paddingLeft: isAr ? "0" : "1.2rem",
                                              paddingRight: isAr ? "1.2rem" : "0"
                                            }}>
                                              {sub.pages.map((p) => {
                                                const isActive = p.pageNum === readerCurrentPage;
                                                return (
                                                  <button
                                                    key={p.pageNum}
                                                    onClick={() => setReaderCurrentPage(p.pageNum)}
                                                    style={{
                                                      fontSize: "0.7rem",
                                                      fontWeight: 800,
                                                      cursor: "pointer",
                                                      padding: "4px 10px",
                                                      borderRadius: "20px",
                                                      transition: "all 0.2s ease",
                                                      border: isActive ? "2px solid #d4af37" : "1px solid rgba(16, 107, 163, 0.15)",
                                                      background: isActive 
                                                        ? "linear-gradient(135deg, #d4af37, #b45309)" 
                                                        : "rgba(255, 255, 255, 0.9)",
                                                      color: isActive ? "#ffffff" : "var(--foreground)",
                                                      boxShadow: isActive ? "0 3px 8px rgba(212, 175, 55, 0.2)" : "0 1px 2px rgba(0,0,0,0.02)"
                                                    }}
                                                    onMouseOver={(e) => {
                                                      if (!isActive) {
                                                        e.currentTarget.style.borderColor = "var(--primary)";
                                                        e.currentTarget.style.background = "rgba(16, 107, 163, 0.05)";
                                                      }
                                                    }}
                                                    onMouseOut={(e) => {
                                                      if (!isActive) {
                                                        e.currentTarget.style.borderColor = "rgba(16, 107, 163, 0.15)";
                                                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                                                      }
                                                    }}
                                                  >
                                                    📄 {language === "ar" ? `ص ${p.pageNum}` : `p. ${p.pageNum}`}
                                                    {isActive && (
                                                      <span style={{ fontSize: "0.6rem", marginLeft: "4px", marginRight: "4px" }}>
                                                        📍
                                                      </span>
                                                    )}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Textbook Viewer Panel */}
              <div 
                className="panel-card" 
                onMouseUp={() => {
                  const selection = window.getSelection();
                  if (!selection) return;
                  const text = selection.toString().trim();
                  if (text.length > 5) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    setBubbleCoords({
                      x: rect.left + rect.width / 2 + window.scrollX,
                      y: rect.top - 48 + window.scrollY
                    });
                    setSelectedText(text);
                  } else {
                    setBubbleCoords(null);
                    setSelectedText("");
                  }
                }}
                style={{
                  padding: "1.75rem", display: "flex", flexDirection: "column",
                  justifyContent: "space-between", minHeight: "550px", position: "relative",
                  background: "rgba(255, 255, 255, 0.75)", backdropFilter: "blur(14px)",
                  border: "1px solid rgba(16, 107, 163, 0.1)",
                  borderRadius: "16px",
                  userSelect: "text",
                  boxShadow: "0 10px 30px rgba(16, 107, 163, 0.01)"
                }}
              >
                <div>
                  {/* Page Navigation & Chapters with integrated translation widget */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    flexWrap: "wrap", gap: "1rem",
                    marginBottom: "1.5rem", borderBottom: "1px solid rgba(16, 107, 163, 0.08)",
                    paddingBottom: "0.75rem"
                  }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)" }}>
                      📖 {language === "ar" ? "الصفحة الحالية" : "Active Section"}: {readerCurrentPage} / {totalPagesCount}
                    </span>

                    {/* Premium real-time page translator widget */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <label htmlFor="page-translator-select" style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6a7c88" }}>
                        🌐 {language === "ar" ? "ترجمة الصفحة:" : "Translate Page:"}
                      </label>
                      <select
                        id="page-translator-select"
                        value={translationLanguage}
                        onChange={(e) => handlePageTranslation(e.target.value, activePage)}
                        disabled={isTranslating}
                        style={{
                          padding: "4px 10px", borderRadius: "12px", border: "1px solid var(--card-border)",
                          background: "#ffffff", color: "var(--foreground)", fontSize: "0.75rem", fontWeight: 700,
                          outline: "none", cursor: "pointer", transition: "all 0.2s"
                        }}
                      >
                        <option value="">{language === "ar" ? "الأصلية" : "Original"}</option>
                        <option value="en">🇺🇸 English</option>
                        <option value="ar">🇸🇦 العربية</option>
                        <option value="es">🇪🇸 Español</option>
                        <option value="fr">🇫🇷 Français</option>
                        <option value="de">🇩🇪 Deutsch</option>
                        <option value="zh">🇨🇳 中文</option>
                        <option value="it">🇮🇹 Italiano</option>
                      </select>
                    </div>

                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        disabled={readerCurrentPage <= 1}
                        onClick={() => setReaderCurrentPage(Math.max(1, readerCurrentPage - 1))}
                        className="btn btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                      >
                        {language === "ar" ? "السابق" : "Prev"}
                      </button>
                      <button
                        disabled={readerCurrentPage >= totalPagesCount}
                        onClick={() => setReaderCurrentPage(Math.min(totalPagesCount, readerCurrentPage + 1))}
                        className="btn btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                      >
                        {language === "ar" ? "التالي" : "Next"}
                      </button>
                    </div>
                  </div>

                  {loadingBookPages ? (
                    <div style={{ padding: "4rem", textAlign: "center" }}>
                      <div className="pulse-icon" style={{ fontSize: "2rem", marginBottom: "1rem" }}>📖</div>
                      <p style={{ color: "#6a7c88", fontSize: "0.9rem" }}>
                        {language === "ar" ? "جاري استرجاع وفهرسة صفحات الكتاب دراسياً..." : "Retrieving and indexing book pages..."}
                      </p>
                    </div>
                  ) : (
                    (() => {
                      const isBookArabic = selectedBookReader 
                        ? isTextArabic(selectedBookReader.titleAr || selectedBookReader.title || selectedBookReader.titleEn || "")
                        : false;

                      const activeContent = translationLanguage && translatedText 
                        ? translatedText 
                        : (isBookArabic 
                            ? (activePage.contentAr || activePage.contentEn || activePage.content || "") 
                            : (activePage.contentEn || activePage.contentAr || activePage.content || ""));
                      
                      const isAr = translationLanguage 
                        ? translationLanguage === "ar" 
                        : isBookArabic;

                      return (
                        <article 
                          dir={isAr ? "rtl" : "ltr"}
                          style={{ 
                            lineHeight: "1.8", 
                            color: "var(--foreground)", 
                            fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-sans)",
                            textAlign: isAr ? "right" : "left",
                          }}
                        >
                          <style>{`
                            @keyframes skeleton-loading {
                              0% { background-position: 200% 0; }
                              100% { background-position: -200% 0; }
                            }
                          `}</style>

                          <h3 style={{ 
                            fontSize: "1.4rem", 
                            fontWeight: 800, 
                            color: "var(--primary)", 
                            borderBottom: "2px solid rgba(16, 107, 163, 0.12)", 
                            paddingBottom: "0.75rem", 
                            marginBottom: "1.5rem",
                            fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-display)",
                            textAlign: isAr ? "right" : "left",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem"
                          }}>
                            {isTranslating ? (
                              <span style={{
                                display: "inline-block", width: "180px", height: "1.4rem", borderRadius: "4px",
                                background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
                                backgroundSize: "200% 100%", animation: "skeleton-loading 1.5s infinite"
                              }} />
                            ) : (
                              <>
                                <span style={{ fontSize: "1.3rem" }}>📖</span>
                                <span style={{ flex: 1 }}>
                                  {translationLanguage && translatedTitle ? translatedTitle : (isBookArabic ? (activePage.titleAr || activePage.titleEn) : (activePage.titleEn || activePage.titleAr))}
                                </span>
                              </>
                            )}
                          </h3>

                          {isTranslating ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", margin: "1.5rem 0" }}>
                              <div style={{ height: "1.1rem", width: "100%", borderRadius: "4px", background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)", backgroundSize: "200% 100%", animation: "skeleton-loading 1.5s infinite" }} />
                              <div style={{ height: "1.1rem", width: "95%", borderRadius: "4px", background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)", backgroundSize: "200% 100%", animation: "skeleton-loading 1.5s infinite" }} />
                              <div style={{ height: "1.1rem", width: "90%", borderRadius: "4px", background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)", backgroundSize: "200% 100%", animation: "skeleton-loading 1.5s infinite" }} />
                              <div style={{ height: "1.1rem", width: "97%", borderRadius: "4px", background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)", backgroundSize: "200% 100%", animation: "skeleton-loading 1.5s infinite" }} />
                              <div style={{ height: "1.1rem", width: "85%", borderRadius: "4px", background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)", backgroundSize: "200% 100%", animation: "skeleton-loading 1.5s infinite" }} />
                            </div>
                          ) : (
                            <div style={{ fontSize: "1.05rem", marginBottom: "2rem" }}>
                              {renderPremiumContent(
                                translationLanguage && translatedText ? translatedText : (language === "ar" ? (activePage.contentAr || activePage.contentEn || activePage.content) : (activePage.contentEn || activePage.contentAr || activePage.content)),
                                isAr
                              )}
                            </div>
                          )}

                          {/* Equations / Formulas Area if any */}
                          {activePage.formulas && activePage.formulas.length > 0 && (
                            <div style={{
                              margin: "2rem 0", padding: "1.5rem", borderRadius: "16px",
                              background: "linear-gradient(135deg, rgba(16, 107, 163, 0.02) 0%, rgba(16, 107, 163, 0.06) 100%)",
                              border: "1px solid rgba(16, 107, 163, 0.1)",
                              boxShadow: "0 8px 30px rgba(16, 107, 163, 0.03)"
                            }}>
                              <div style={{
                                display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem",
                                borderBottom: "1px solid rgba(16, 107, 163, 0.08)", paddingBottom: "0.5rem"
                              }}>
                                <span style={{ fontSize: "1.2rem" }}>📐</span>
                                <span style={{
                                  fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)",
                                  letterSpacing: "0.05em", textTransform: "uppercase",
                                  fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-sans)"
                                }}>
                                  {language === "ar" ? "الصيغ والمعادلات الرياضية المعززة" : "Key Formulas & Equations"}
                                </span>
                              </div>
                              
                              <div style={{
                                display: "flex", flexDirection: "column", gap: "0.75rem"
                              }}>
                                {activePage.formulas.map((form: string, fIdx: number) => (
                                  <div
                                    key={fIdx}
                                    style={{
                                      background: "#ffffff",
                                      border: "1px solid rgba(16, 107, 163, 0.08)",
                                      borderRadius: "12px",
                                      padding: "1rem",
                                      textAlign: "center",
                                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.01)",
                                      transition: "all 0.2s ease-in-out",
                                    }}
                                  >
                                    <div style={{
                                      fontSize: "1.2rem",
                                      fontFamily: "'Cambria Math', 'Cambria', 'Times New Roman', serif",
                                      fontWeight: 700,
                                      color: "var(--primary)",
                                      wordBreak: "break-word"
                                    }}>
                                      {form}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Interactive tips */}
                          {activePage.tipEn && (
                            <div style={{
                              marginTop: "2rem", padding: "1rem 1.25rem", borderRadius: "12px",
                              background: "linear-gradient(135deg, rgba(16, 107, 163, 0.04) 0%, rgba(16, 107, 163, 0.08) 100%)",
                              border: "1px solid rgba(16, 107, 163, 0.12)",
                              fontSize: "0.9rem", color: "var(--primary)", display: "flex", alignItems: "flex-start", gap: "0.75rem",
                              boxShadow: "0 4px 12px rgba(16, 107, 163, 0.02)"
                            }}>
                              <span style={{ fontSize: "1.1rem", lineHeight: "1" }}>💡</span>
                              <div style={{ flex: 1, fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-sans)", lineHeight: "1.6" }}>
                                <strong style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  {language === "ar" ? "نصيحة المذاكرة التفاعلية" : "Interactive Study Tip"}
                                </strong>
                                <span>{language === "ar" ? activePage.tipAr : activePage.tipEn}</span>
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })()
                  )}
                </div>

                {/* Bubble popup actions */}
                {bubbleCoords && (
                  <div style={{
                    position: "absolute", top: `${bubbleCoords.y}px`, left: `${bubbleCoords.x}px`,
                    transform: "translateX(-50%)", background: "var(--foreground)", color: "var(--background)",
                    padding: "4px 8px", borderRadius: "20px", display: "flex", gap: "0.5rem",
                    zIndex: 9999, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", whiteSpace: "nowrap"
                  }}>
                    <button
                      onClick={() => {
                        const customEvent = new CustomEvent("fahemAskCompanion", { detail: { text: `Explain this section: "${window.getSelection()?.toString()}"` } });
                        window.dispatchEvent(customEvent);
                        setBubbleCoords(null);
                      }}
                      style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}
                    >
                      🧠 Explain
                    </button>
                    <button
                      onClick={() => {
                        const customEvent = new CustomEvent("fahemAskCompanion", { detail: { text: `Translate or summarize this: "${window.getSelection()?.toString()}"` } });
                        window.dispatchEvent(customEvent);
                        setBubbleCoords(null);
                      }}
                      style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}
                    >
                      📝 Summarize
                    </button>
                  </div>
                )}

                {/* Pagination Footer */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  borderTop: "1px solid rgba(0,0,0,0.04)", paddingTop: "1rem", marginTop: "1rem"
                }}>
                  <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>
                    {language === "ar" ? "اضغط واسحب لتحديد أي نص لمناقشته فوراً مع رفيق فهم" : "Highlight any text on the page to ask your companion"}
                  </span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)" }}>
                    {readerCurrentPage} / {totalPagesCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })() : (() => {
        /* Compiler helper pulled into scope of the non-reader view */
        const getSourceOrigin = (url?: string): string => {
          if (!url) return "Library Source 🌐";
          try {
            const parsed = new URL(url);
            const domain = parsed.hostname.replace("www.", "");
            return `${domain} 🌐`;
          } catch (e) {
            if (url && (url.startsWith("/") || url.startsWith("http"))) {
              return "Direct Asset 🌐";
            }
            return "Library Source 🌐";
          }
        };

        const mapSubjectToCategory = (subjectId?: string, subjectName?: string): string => {
          const sId = (subjectId || "").toLowerCase();
          const sName = (subjectName || "").toLowerCase();
          
          if (sId === "subj_algebra_stats" || sName.includes("math") || sName.includes("algebra") || sName.includes("calculus") || sName.includes("رياضيات") || sName.includes("جبر") || sName.includes("تفاضل")) {
            return "Math";
          }
          if (sId === "sub_computer_science_1780535716963" || sName.includes("computer") || sName.includes("programming") || sName.includes("coding") || sName.includes("حاسب")) {
            return "Computer Science";
          }
          if (sId === "subj_biology" || sName.includes("science") || sName.includes("physics") || sName.includes("chemistry") || sName.includes("biology") || sName.includes("علوم") || sName.includes("كيمياء") || sName.includes("فيزياء") || sName.includes("أحياء")) {
            return "Science";
          }
          if (sId === "subj_arabic_grammar" || sName.includes("arabic") || sName.includes("عربي") || sName.includes("نحو") || sName.includes("لغة عربية") || sName.includes("بلاغة")) {
            return "Arabic";
          }
          if (sId === "subj_business" || sName.includes("business") || sName.includes("economy") || sName.includes("economics") || sName.includes("أعمال") || sName.includes("اقتصاد")) {
            return "Business";
          }
          if (sId === "subj_social_sciences" || sName.includes("social") || sName.includes("history") || sName.includes("humanities") || sName.includes("اجتماع") || sName.includes("تاريخ") || sName.includes("جغرافيا") || sName.includes("دراسات")) {
            return "Social Sciences";
          }
          return "Science"; 
        };

        const list: any[] = [];

        // 1. moeIngestedBooks
        if (moeIngestedBooks && moeIngestedBooks.length > 0) {
          moeIngestedBooks.forEach((b: any) => {
            const path = b.storage_path || b.storagePath || b.storageRef || "";
            let category = "curriculum";
            if (path.startsWith("user_uploads") || b.isUserUpload) {
              category = "private";
            } else if (path.startsWith("admin_uploads") || b.is_admin_upload || b.isAdminUpload) {
              category = "curriculum";
            } else if (path.startsWith("ellibrary_moe_gov_eg") || b.isMoeIngested) {
              category = "curriculum";
            }

            list.push({
              _id: b._id || b.id || `moe_${b.titleEn || b.titleAr || b.title}`,
              titleEn: b.titleEn || b.title || "",
              titleAr: b.titleAr || b.title_ar || b.title || "",
              subject: mapSubjectToCategory(b.subject_id, b.subject || "Science"),
              source_url: b.source_url || b.downloadUrl || b.downloadURL || "",
              storagePath: path,
              category,
              isMoeIngested: b.isMoeIngested,
              chapters: b.chapters || []
            });
          });
        }

        // 2. dynamicBooks (from database)
        if (dynamicBooks && dynamicBooks.length > 0) {
          dynamicBooks.forEach((b: any) => {
            const path = b.storage_path || b.storagePath || b.storageRef || b.storage_ref || "";
            let category = "curriculum";
            if (path.startsWith("user_uploads") || b.isUserUpload || b.userId) {
              category = "private";
            } else if (path.startsWith("admin_uploads") || b.is_admin_upload || b.isAdminUpload) {
              category = "curriculum";
            }

            list.push({
              _id: b._id || b.id || `dyn_${b.title || b.titleEn}`,
              titleEn: b.titleEn || b.title || "",
              titleAr: b.titleAr || b.title_ar || b.title || "",
              subject: mapSubjectToCategory(b.subject_id, b.subject),
              source_url: b.source_url || b.downloadUrl || b.downloadURL || b.url || "",
              storagePath: path,
              category,
              isMoeIngested: b.isMoeIngested || path.startsWith("ellibrary_moe_gov_eg") || path.startsWith("MOE Library"),
              chapters: b.chapters || []
            });
          });
        }

        // 3. customUploadedBooks (user vault)
        if (customUploadedBooks && customUploadedBooks.length > 0) {
          customUploadedBooks.forEach((b: any) => {
            const path = b.storage_path || b.storagePath || b.storageRef || b.storage_ref || "";
            let category = "private";
            if (path.startsWith("admin_uploads") || b.is_admin_upload || b.isAdminUpload) {
              category = "curriculum";
            } else if (path.startsWith("ellibrary_moe_gov_eg") || b.isMoeIngested) {
              category = "curriculum";
            }

            list.push({
              _id: b._id || b.id || `custom_${b.titleEn || b.titleAr || b.title}`,
              titleEn: b.titleEn || b.title || "",
              titleAr: b.titleAr || b.title_ar || b.title || "",
              subject: mapSubjectToCategory(b.subject_id, b.subject || "Science"),
              source_url: b.source_url || b.downloadUrl || b.downloadURL || "",
              storagePath: path,
              category,
              isMoeIngested: b.isMoeIngested,
              chapters: b.chapters || []
            });
          });
        }

        const seen = new Set();
        const deduplicated: any[] = [];
        list.forEach(b => {
          if (b._id && !seen.has(b._id)) {
            seen.add(b._id);
            deduplicated.push(b);
          }
        });

        // Compute library-specific counts
        const moeCount = deduplicated.filter(item => getBookLibraryId(item) === "moe" && item.category === "curriculum").length;
        const openStaxCount = deduplicated.filter(item => getBookLibraryId(item) === "openstax" && item.category === "curriculum").length;
        const generalCount = deduplicated.filter(item => getBookLibraryId(item) === "general" && item.category === "curriculum").length;
        const allCount = moeCount + openStaxCount + generalCount;

        // Apply filters
        const filtered = deduplicated.filter(item => {
          if (item.category !== activeLibraryTab) return false;

          // selectedLibraryId filter
          if (activeLibraryTab === "curriculum" && selectedLibraryId !== "all") {
            if (getBookLibraryId(item) !== selectedLibraryId) return false;
          }

          if (librarySubject !== "all" && item.subject !== librarySubject) return false;

          const s = librarySearch.toLowerCase();
          const titleMatch = (item.titleEn || "").toLowerCase().includes(s) || 
                             (item.titleAr || "").toLowerCase().includes(s) ||
                             (item.title || "").toLowerCase().includes(s);
          return titleMatch;
        });

        return (
          /* Regular Library List & Personal Vault Layout */
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            {/* Top-level Category Tabs */}
            <div style={{
              display: "flex", gap: "0.75rem", padding: "6px", borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.45)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(16, 107, 163, 0.08)", width: "fit-content",
              boxShadow: "0 8px 32px rgba(16, 107, 163, 0.02)"
            }}>
              {[
                { id: "curriculum", labelAr: "🏫 المكتبات المنهجية", labelEn: "🏫 Curriculum Libraries" },
                { id: "private", labelAr: "📁 خزنة الدراسة الخاصة", labelEn: "📁 Private Study Vault" }
              ].map((tab) => {
                const isActive = activeLibraryTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveLibraryTab(tab.id as any)}
                    style={{
                      padding: "10px 20px", borderRadius: "12px", fontSize: "0.85rem", fontWeight: 700,
                      cursor: "pointer", border: "none",
                      background: isActive ? "linear-gradient(135deg, var(--primary), var(--secondary))" : "transparent",
                      color: isActive ? "#ffffff" : "#475569",
                      transition: "all 0.25s ease",
                      boxShadow: isActive ? "0 4px 12px rgba(16, 107, 163, 0.2)" : "none",
                      fontFamily: "var(--font-sans)"
                    }}
                  >
                    {language === "ar" ? tab.labelAr : tab.labelEn}
                  </button>
                );
              })}
            </div>

            {/* Glassmorphic Library Selector Sub-Bar inside Curriculum tab */}
            {activeLibraryTab === "curriculum" && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1rem",
                background: "rgba(255, 255, 255, 0.35)",
                backdropFilter: "blur(16px)",
                padding: "1.25rem",
                borderRadius: "24px",
                border: "1px solid rgba(16, 107, 163, 0.12)",
                boxShadow: "0 10px 40px rgba(16, 107, 163, 0.03)"
              }}>
                {[
                  {
                    id: "all",
                    icon: "All",
                    nameEn: "All Libraries",
                    nameAr: "جميع المكتبات",
                    descEn: "Consolidated digital library portal",
                    descAr: "البوابة الرقمية الموحدة للمناهج والمرفوعات",
                    url: null,
                    count: allCount
                  },
                  {
                    id: "moe",
                    icon: "🏫",
                    nameEn: "Ministry of Education",
                    nameAr: "وزارة التربية والتعليم",
                    descEn: "Official Egyptian education library",
                    descAr: "المناهج المصرية الرسمية المعتمدة",
                    url: "https://ellibrary.moe.gov.eg/",
                    count: moeCount
                  },
                  {
                    id: "openstax",
                    icon: "📖",
                    nameEn: "OpenStax Library",
                    nameAr: "مكتبة أوبن ستاكس",
                    descEn: "Peer-reviewed open textbooks",
                    descAr: "كتب جامعية وأكاديمية مفتوحة المصدر",
                    url: "https://openstax.org/",
                    count: openStaxCount
                  },
                  {
                    id: "general",
                    icon: "🛡️",
                    nameEn: "General Library",
                    nameAr: "المكتبة العامة",
                    descEn: "General research, administrative and reference uploads",
                    descAr: "المصادر العامة والمرفوعات الإدارية",
                    url: "https://fahem.app/general",
                    count: generalCount
                  }
                ].map((lib) => {
                  const isSelected = selectedLibraryId === lib.id;
                  return (
                    <div
                      key={lib.id}
                      onClick={() => setSelectedLibraryId(lib.id)}
                      style={{
                        padding: "1rem",
                        borderRadius: "18px",
                        background: isSelected 
                          ? "linear-gradient(135deg, rgba(16, 107, 163, 0.08), rgba(212, 175, 55, 0.04))" 
                          : "rgba(255, 255, 255, 0.5)",
                        border: isSelected 
                          ? "2px solid var(--primary)" 
                          : "1px solid rgba(16, 107, 163, 0.06)",
                        boxShadow: isSelected 
                          ? "0 8px 24px rgba(16, 107, 163, 0.08), inset 0 0 12px rgba(16, 107, 163, 0.02)" 
                          : "none",
                        cursor: "pointer",
                        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        position: "relative",
                        overflow: "hidden"
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
                          e.currentTarget.style.borderColor = "rgba(16, 107, 163, 0.2)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.5)";
                          e.currentTarget.style.borderColor = "rgba(16, 107, 163, 0.06)";
                          e.currentTarget.style.transform = "none";
                        }
                      }}
                    >
                      {isSelected && (
                        <div style={{
                          position: "absolute",
                          top: "-20px", right: "-20px",
                          width: "50px", height: "50px",
                          background: "rgba(16, 107, 163, 0.15)",
                          filter: "blur(20px)",
                          borderRadius: "50%"
                        }} />
                      )}

                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                        <span style={{
                          fontSize: "1.2rem",
                          padding: "0.4rem",
                          borderRadius: "12px",
                          background: isSelected ? "rgba(16, 107, 163, 0.1)" : "rgba(16, 107, 163, 0.04)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                          color: "var(--primary)"
                        }}>{lib.icon}</span>
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            margin: 0,
                            fontSize: "0.85rem",
                            fontWeight: 800,
                            color: isSelected ? "var(--primary)" : "var(--foreground)",
                            fontFamily: "Cairo, var(--font-sans), sans-serif",
                            textAlign: language === "ar" ? "right" : "left"
                          }}>
                            {language === "ar" ? lib.nameAr : lib.nameEn}
                          </h4>
                          <p style={{
                            margin: "0.15rem 0 0 0",
                            fontSize: "0.7rem",
                            color: "#6a7c88",
                            lineHeight: "1.4",
                            fontFamily: "Cairo, var(--font-sans), sans-serif",
                            textAlign: language === "ar" ? "right" : "left"
                          }}>
                            {language === "ar" ? lib.descAr : lib.descEn}
                          </p>
                        </div>
                      </div>

                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1px solid rgba(16, 107, 163, 0.05)",
                        paddingTop: "0.5rem",
                        marginTop: "0.25rem"
                      }}>
                        {lib.url ? (
                          <a
                            href={lib.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              color: "var(--primary)",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.2rem",
                              transition: "opacity 0.2s"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.opacity = "0.8"}
                            onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
                          >
                            🔗 Portal
                          </a>
                        ) : <span />}
                        <span style={{
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          color: "var(--primary)",
                          background: "rgba(16, 107, 163, 0.08)",
                          padding: "2px 8px",
                          borderRadius: "10px"
                        }}>
                          {lib.count} {language === "ar" ? "كتب" : "Books"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}


            {/* Header search controls */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexWrap: "wrap", gap: "1rem", background: "rgba(255, 255, 255, 0.4)",
              backdropFilter: "blur(10px)", padding: "1rem", borderRadius: "16px",
              border: "1px solid rgba(16, 107, 163, 0.08)"
            }}>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {["all", "Math", "Science", "Arabic", "Computer Science", "Business", "Social Sciences"].map((subject) => {
                  const theme = getSubjectTheme(subject);
                  return (
                    <button
                      key={subject}
                      onClick={() => setLibrarySubject(subject)}
                      style={{
                        padding: "6px 14px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: 700,
                        cursor: "pointer", border: librarySubject === subject ? "none" : "1px solid var(--card-border)",
                        background: librarySubject === subject ? theme.gradient : "#ffffff",
                        color: librarySubject === subject ? "#ffffff" : "#475569",
                        boxShadow: librarySubject === subject ? `0 4px 12px ${theme.glowColor}` : "none",
                        transition: "all 0.2s"
                      }}
                    >
                      {theme.emoji} {getSubjectNameLabel(subject, language)}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                placeholder={language === "ar" ? "ابحث عن كتاب دراسي..." : "Search course textbooks..."}
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                style={{
                  padding: "0.5rem 1rem", borderRadius: "10px", border: "1px solid var(--card-border)",
                  fontSize: "0.85rem", width: "100%", maxWidth: "250px", outline: "none", fontFamily: "var(--font-sans)"
                }}
              />
            </div>

            {/* Secure Private Vault Ingestion Widget (Only visible in private tab) */}
            {activeLibraryTab === "private" && (
              <div style={{
                padding: "1.75rem", borderRadius: "20px",
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.65), rgba(212, 175, 55, 0.05))",
                border: "1px solid rgba(212, 175, 55, 0.15)", backdropFilter: "blur(12px)",
                boxShadow: "0 8px 32px rgba(212, 175, 55, 0.03)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "var(--foreground)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      🔒 {language === "ar" ? "خزنة دراستي الخاصة (تحميل آمن)" : "My Study Vault (Secure Ingestion)"}
                    </h3>
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#6a7c88" }}>
                      {language === "ar" 
                        ? `قم بتحميل وثائقك وأبحاثك الشخصية لدراستها ومذاكرتها بشكل تفاعلي مع رفيق فهم (بحد أقصى ${dynamicMaxUploadSize} ميجابايت).`
                        : `Upload personal notes or guides to study interactively with your companion (strict ${dynamicMaxUploadSize}MB limit).`}
                    </p>
                  </div>

                  <label style={{
                    padding: "0.75rem 1.25rem", fontSize: "0.85rem", fontWeight: 700, borderRadius: "12px",
                    background: "linear-gradient(135deg, var(--primary), var(--secondary))", color: "#ffffff",
                    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem", transition: "all 0.2s"
                  }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "none"; }}>
                    <span>📁 {language === "ar" ? "تحميل مستند دراسي" : "Upload Document"}</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > dynamicMaxUploadSize * 1024 * 1024) {
                            alert(language === "ar" 
                              ? `خطأ: حجم الملف يتجاوز الحد الأقصى (${dynamicMaxUploadSize} ميجابايت) للمستندات الخاصة.` 
                              : `Error: Study document exceeds the strict ${dynamicMaxUploadSize}MB upload limit.`);
                            e.target.value = "";
                            return;
                          }
                          const storagePath = "user_uploads/" + user?.uid + "/" + Date.now() + "_" + file.name;
                          const storageRef = ref(storage, storagePath);
                          
                          setIsVerifying(true);
                          setVerifierLog([
                            language === "ar" ? "⏳ جاري رفع الملف إلى الخزنة السحابية الآمنة..." : "⏳ Uploading file to the secure cloud vault..."
                          ]);

                          uploadBytes(storageRef, file).then((snapshot) => {
                            getDownloadURL(snapshot.ref).then((downloadURL) => {
                              runVerifierAgent(file, storagePath, downloadURL);
                            });
                          }).catch((err) => {
                            console.error("Upload error:", err);
                            alert(language === "ar" ? "حدث خطأ أثناء تحميل الملف." : "An error occurred while uploading your document.");
                            setIsVerifying(false);
                          });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Book Catalog Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
              {filtered.length === 0 ? (
                <div style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "5rem 2rem",
                  background: "rgba(255, 255, 255, 0.35)",
                  backdropFilter: "blur(12px)",
                  borderRadius: "24px",
                  border: "1px dashed rgba(16, 107, 163, 0.15)",
                  textAlign: "center",
                  gap: "1rem"
                }}>
                  <div style={{ fontSize: "3rem", filter: "drop-shadow(0 4px 12px rgba(16, 107, 163, 0.1))" }}>📚</div>
                  <div>
                    <h4 style={{ margin: 0, fontWeight: 800, color: "var(--foreground)", fontSize: "1.2rem" }}>
                      {language === "ar" ? "لا توجد كتب دراسية متوفرة حالياً" : "No textbooks found"}
                    </h4>
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.85rem", color: "#6a7c88", maxWidth: "420px", lineHeight: "1.5" }}>
                      {language === "ar" 
                        ? "لم نجد أي كتب مطابقة لبحثك في هذا التبويب. يمكنك تعديل خيارات التصفية أو رفع مستند جديد بخزنتك الخاصة!"
                        : "We couldn't find any textbooks matching your current filters. Try relaxing your filters or uploading a personal guide!"}
                    </p>
                  </div>
                </div>
              ) : (
                filtered.map((item) => {
                  const title = language === "ar" 
                    ? (item.titleAr || item.title || item.titleEn) 
                    : (item.titleEn || item.title || item.titleAr);
                  const isTitleAr = isTextArabic(title);
                  const theme = getSubjectTheme(item.subject || "");
                  return (
                    <div 
                      key={item._id} 
                      className="panel-card" 
                      style={{
                        padding: "1.5rem", 
                        display: "flex", 
                        flexDirection: "column",
                        justifyContent: "space-between", 
                        minHeight: "220px",
                        height: "auto", 
                        position: "relative", 
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        background: "rgba(255, 255, 255, 0.45)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(16, 107, 163, 0.08)",
                        borderTop: "4px solid " + theme.primary,
                        boxShadow: "0 8px 32px rgba(16, 107, 163, 0.02)",
                        borderRadius: "20px"
                      }} 
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = "translateY(-6px) scale(1.01)";
                        e.currentTarget.style.borderColor = theme.primary;
                        e.currentTarget.style.boxShadow = "0 12px 36px " + theme.glowColor;
                      }} 
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0) scale(1)";
                        e.currentTarget.style.borderColor = "rgba(16, 107, 163, 0.08)";
                        e.currentTarget.style.boxShadow = "0 8px 32px rgba(16, 107, 163, 0.02)";
                      }}
                    >
                      <div>
                        {/* Badge line */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.3rem" }}>
                          <span style={{ 
                            fontSize: "0.7rem", 
                            fontWeight: 800, 
                            textTransform: "uppercase", 
                            background: theme.badgeBg, 
                            color: theme.badgeText, 
                            padding: "4px 10px", 
                            borderRadius: "12px", 
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem" 
                          }}>
                            {theme.emoji} {getSubjectNameLabel(item.subject || "", language)}
                          </span>
                          {item.category === "curriculum" && (
                            (() => {
                              const libId = getBookLibraryId(item);
                              return (
                                <span style={{ fontSize: "0.65rem", fontWeight: 800, background: "rgba(46, 125, 50, 0.12)", color: "var(--accent-green)", padding: "2px 6px", borderRadius: "8px", display: "inline-block" }}>
                                  🏛️ {libId === "moe" ? (language === "ar" ? "وزارة التعليم" : "MOE Official") :
                                      libId === "openstax" ? (language === "ar" ? "أوبن ستاكس" : "OpenStax") :
                                      (language === "ar" ? "المكتبة العامة" : "General Library")}
                                </span>
                              );
                            })()
                          )}
                          {item.category === "private" && (
                            <span style={{ fontSize: "0.65rem", fontWeight: 800, background: "rgba(212, 175, 55, 0.15)", color: "#b45309", padding: "2px 6px", borderRadius: "8px", display: "inline-block" }}>
                              🔒 {language === "ar" ? "ملف خاص" : "Private Vault"}
                            </span>
                          )}
                        </div>

                        <h3 style={{
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          margin: "0 0 0.5rem 0",
                          color: "var(--foreground)",
                          fontFamily: "var(--font-sans)",
                          lineHeight: "1.4",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          wordBreak: "break-word",
                          textAlign: isTitleAr ? "right" : "left",
                          direction: isTitleAr ? "rtl" : "ltr"
                        }}>
                          {title}
                        </h3>
                      </div>

                      {/* Direct hyperlink & primary action layout */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", borderTop: "1px solid rgba(16,107,163,0.06)", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          {item.source_url ? (
                            <a 
                              href={item.source_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--primary)",
                                fontWeight: 700,
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                transition: "color 0.2s"
                              }}
                              onMouseOver={(e) => e.currentTarget.style.color = "var(--secondary)"}
                              onMouseOut={(e) => e.currentTarget.style.color = "var(--primary)"}
                              onClick={(e) => e.stopPropagation()}
                            >
                              🔗 {getSourceOrigin(item.source_url)}
                            </a>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#6a7c88", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                              🌐 {language === "ar" ? "مخزن محلي آمن" : "Local Verified Asset"}
                            </span>
                          )}

                          <button
                            onClick={() => handleStartStudy(item)}
                            style={{
                              padding: "6px 14px", 
                              borderRadius: "20px", 
                              border: "none", 
                              cursor: "pointer",
                              background: theme.gradient, 
                              color: "#ffffff",
                              fontSize: "0.75rem", 
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              transition: "all 0.2s",
                              boxShadow: "0 4px 12px " + theme.primary + "26"
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.transform = "scale(1.04)";
                              e.currentTarget.style.boxShadow = "0 6px 16px " + theme.primary + "40";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = "none";
                              e.currentTarget.style.boxShadow = "0 4px 12px " + theme.primary + "26";
                            }}
                          >
                            📖 {language === "ar" ? "دراسة وتفاعل" : "Study"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

      {/* Verification Loading Overlay */}
      {isVerifying && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          backgroundColor: "rgba(10, 25, 41, 0.75)", backdropFilter: "blur(12px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
        }}>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div style={{
            background: "rgba(255, 255, 255, 0.95)", border: "1px solid rgba(16, 107, 163, 0.2)",
            borderRadius: "24px", padding: "2.5rem", width: "90%", maxWidth: "500px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)", textAlign: "center",
            display: "flex", flexDirection: "column", gap: "1.5rem"
          }}>
            <div className="spinner" style={{
              width: "60px", height: "60px", border: "5px solid rgba(16, 107, 163, 0.1)",
              borderTop: "5px solid var(--primary)", borderRadius: "50%", margin: "0 auto",
              animation: "spin 1s linear infinite"
            }} />
            <div>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--foreground)", fontWeight: 800, fontSize: "1.3rem" }}>
                {language === "ar" ? "فحص المواد الدراسية" : "Auditing Academic Asset"}
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#6a7c88" }}>
                {language === "ar" ? "يقوم وكيل فهم الذكي بفحص الملف لضمان توافقه التعليمي..." : "Fahem Academic Verifier Agent is analyzing the file structure & context..."}
              </p>
            </div>
            <div style={{
              textAlign: "left", background: "#0f172a", color: "#38bdf8", fontFamily: "monospace",
              padding: "1rem", borderRadius: "12px", fontSize: "0.75rem", maxHeight: "160px",
              overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem",
              direction: "ltr", border: "1px solid rgba(56, 189, 248, 0.2)"
            }}>
              {verifierLog.map((log, idx) => (
                <div key={idx} style={{ animation: "fadeIn 0.2s ease-out" }}>{log}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Academic Rejection Modal */}
      {showRejectModal && rejectedInfo && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          backgroundColor: "rgba(10, 25, 41, 0.75)", backdropFilter: "blur(12px)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
        }}>
          <div style={{
            background: "#ffffff", border: "2px solid #ef4444",
            borderRadius: "24px", padding: "2.5rem", width: "90%", maxWidth: "550px",
            boxShadow: "0 0 24px rgba(239, 68, 68, 0.25)",
            display: "flex", flexDirection: "column", gap: "1.5rem", position: "relative"
          }}>
            <div style={{
              background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", width: "50px", height: "50px",
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.5rem", margin: "0 auto"
            }}>
              ⚠️
            </div>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "#ef4444", fontWeight: 800, fontSize: "1.4rem" }}>
                {language === "ar" ? "عذرًا، تم رفض المستند الأكاديمي" : "Academic Document Ingestion Rejected"}
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#ef4444", fontWeight: 600 }}>
                {language === "ar" 
                  ? `اسم الملف: ${rejectedInfo.fileName}` 
                  : `File Name: ${rejectedInfo.fileName}`}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{
                background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "12px",
                padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem"
              }}>
                <h4 style={{ margin: 0, fontSize: "0.9rem", color: "#991b1b", fontWeight: 700 }}>
                  English Audit Rationale (Confidence: {rejectedInfo.confidence}%):
                </h4>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#7f1d1d", lineHeight: 1.4 }}>
                  {rejectedInfo.rationaleEn}
                </p>
              </div>

              <div style={{
                background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "12px",
                padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem", textAlign: "right"
              }}>
                <h4 style={{ margin: 0, fontSize: "0.9rem", color: "#991b1b", fontWeight: 700 }}>
                  تقرير وكيل التدقيق الأكاديمي (مستوى الثقة: {rejectedInfo.confidence}%):
                </h4>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#7f1d1d", lineHeight: 1.4 }}>
                  {rejectedInfo.rationaleAr}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowRejectModal(false);
                setRejectedInfo(null);
              }}
              style={{
                background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#ffffff",
                border: "none", borderRadius: "12px", padding: "0.75rem", fontSize: "0.9rem",
                fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = "none"; }}
            >
              {language === "ar" ? "مفهوم، سأقوم بتحميل ملف دراسي" : "Understood, let me upload academic material"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
