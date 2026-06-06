"use client";

import React, { useState, useEffect, useRef } from "react";
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
  language?: string;
  coverUrl?: string;
  coverThumbUrl?: string;
  mindMap?: any;
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
  const clean = line.trim();
  if (clean.includes("=") && (clean.includes("+") || clean.includes("-") || clean.includes("*") || clean.includes("/") || clean.includes("^") || /\d/.test(clean))) {
    return true;
  }
  return /^[a-zA-Z\d\s\+\-\*\/\=\(\)\{\}\^_\,\.\θ\π\σ\Σ\∫\Δ]+$/.test(clean) && clean.length > 5 && (clean.includes("=") || clean.includes("+") || clean.includes("-") || clean.includes("*") || clean.includes("/"));
};

const parseInlineStyles = (textStr: string): React.ReactNode => {
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
              borderBottom: "2.5px solid var(--primary)"
            }}>{tok.content}</span>
          );
        }
        if (tok.type === "italic") {
          return (
            <em key={idx} style={{
              fontStyle: "italic",
              opacity: 0.9
            }}>{tok.content}</em>
          );
        }
        return tok.content;
      })}
    </>
  );
};

const renderLegacyPageContent = (text: string, isAr: boolean): React.ReactNode => {
  if (!text) return null;
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    // A. Detect Visual Description / Figure Description
    if (line.startsWith("Visual Description:") || line.startsWith("وصف مرئي:") || line.startsWith("Figure:") || line.startsWith("شكل:")) {
      const content = line.replace(/^(Visual Description|وصف مرئي|Figure|شكل)\s*[:：]\s*/i, "");
      elements.push(
        <div key={`visual-${i}`} style={{
          margin: "1.75rem 0",
          padding: "1.5rem",
          borderRadius: "18px",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(16, 185, 129, 0.06) 100%)",
          borderLeft: isAr ? "none" : "5px solid #059669",
          borderRight: isAr ? "5px solid #059669" : "none",
          borderTop: "1px solid rgba(16, 185, 129, 0.12)",
          borderBottom: "1px solid rgba(16, 185, 129, 0.12)",
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
          }}>{parseInlineStyles(content)}</div>
        </div>
      );
      i++;
      continue;
    }

    // B. Detect Code Blocks (```)
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

    // C. Detect Tables (| col1 | col2 |)
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
                      {parseInlineStyles(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: "1px solid rgba(16, 107, 163, 0.08)", background: rIdx % 2 === 0 ? "#ffffff" : "rgba(16, 107, 163, 0.01)" }}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} style={{ padding: "0.9rem 1.25rem", fontSize: "0.92rem", color: "var(--foreground)", fontWeight: 550 }}>
                        {parseInlineStyles(cell)}
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

    // D. Detect Markdown headings
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
          {parseInlineStyles(cleanText)}
        </h4>
      );
      i++;
      continue;
    }

    // E. Detect Info / Note / Warning / Attention
    const infoMatch = line.match(/^(Info|Note|Note Label|Warning|Attention|ملحوظة|ملاحظة|تنبيه|تحذير)\s*[:：]\s*(.*)$/i);
    if (infoMatch) {
      const label = infoMatch[1];
      const content = infoMatch[2];
      elements.push(
        <div key={`info-${i}`} style={{
          margin: "1.75rem 0",
          padding: "1.5rem",
          borderRadius: "18px",
          background: "linear-gradient(135deg, rgba(16, 107, 163, 0.03) 0%, rgba(16, 107, 163, 0.06) 100%)",
          borderLeft: isAr ? "none" : "5px solid #106ba3",
          borderRight: isAr ? "5px solid #106ba3" : "none",
          borderTop: "1px solid rgba(16, 107, 163, 0.12)",
          borderBottom: "1px solid rgba(16, 107, 163, 0.12)",
          boxShadow: "0 10px 30px rgba(16, 107, 163, 0.03)",
          fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-sans)",
          textAlign: isAr ? "right" : "left",
          direction: isAr ? "rtl" : "ltr"
        }}>
          <div style={{
            fontSize: "0.85rem",
            fontWeight: 850,
            color: "#106ba3",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "0.6rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem"
          }}>
            <span>ℹ️ {label}</span>
          </div>
          <div style={{
            fontSize: "1.02rem",
            lineHeight: "1.75",
            color: "var(--foreground)",
            fontWeight: 600
          }}>{parseInlineStyles(content)}</div>
        </div>
      );
      i++;
      continue;
    }

    // F. Detect Tip / Study Tip / Hint
    const tipMatch = line.match(/^(Tip|Study Tip|Hint|نصيحة|إرشاد)\s*[:：]\s*(.*)$/i);
    if (tipMatch) {
      const label = tipMatch[1];
      const content = tipMatch[2];
      elements.push(
        <div key={`tip-${i}`} style={{
          margin: "1.75rem 0",
          padding: "1.5rem",
          borderRadius: "18px",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(16, 185, 129, 0.06) 100%)",
          borderLeft: isAr ? "none" : "5px solid #10b981",
          borderRight: isAr ? "5px solid #10b981" : "none",
          borderTop: "1px solid rgba(16, 185, 129, 0.12)",
          borderBottom: "1px solid rgba(16, 185, 129, 0.12)",
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
            letterSpacing: "0.05em",
            marginBottom: "0.6rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem"
          }}>
            <span>💡 {label}</span>
          </div>
          <div style={{
            fontSize: "1.02rem",
            lineHeight: "1.75",
            color: "var(--foreground)",
            fontWeight: 600
          }}>{parseInlineStyles(content)}</div>
        </div>
      );
      i++;
      continue;
    }

    // G. Detect Law / Theorem / Rule / Definition
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
          }}>{parseInlineStyles(content)}</div>
        </div>
      );
      i++;
      continue;
    }

    // H. Detect Equation / Formula
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
          }}>{parseInlineStyles(content)}</div>
        </div>
      );
      i++;
      continue;
    }

    // I. Detect Question / Request
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
          }}>{parseInlineStyles(content)}</div>
        </div>
      );
      i++;
      continue;
    }

    // J. Detect standalone Formulas / Equations
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
          }}>{parseInlineStyles(line)}</div>
        </div>
      );
      i++;
      continue;
    }

    // K. Detect List items (bullet or numbered)
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
                <span style={{ flex: 1 }}>{parseInlineStyles(cleanItem)}</span>
              </li>
            );
          })}
        </ul>
      );
      continue;
    }

    // L. Detect subtitle or small headings that are short and end with ":" or are bold
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
          {parseInlineStyles(cleanText)}
        </h5>
      );
      i++;
      continue;
    }

    // M. Regular paragraph
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
        {parseInlineStyles(line)}
      </p>
    );
    i++;
  }

  return elements;
};

const compilePageTextForTts = (blocks: any[], lang: string, i18n?: any): string => {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return "";
  
  const getProp = (b: any, name: string) => {
    if (i18n && i18n[b.id] && i18n[b.id][lang] && i18n[b.id][lang][name] !== undefined) {
      return i18n[b.id][lang][name];
    }
    return b[name];
  };

  const texts: string[] = [];
  blocks.forEach(b => {
    const type = b.type;
    if (type === "heading" || type === "paragraph") {
      const txt = getProp(b, "text");
      if (txt) texts.push(txt);
    } else if (type === "definition") {
      const term = getProp(b, "term");
      const txt = getProp(b, "text");
      if (term || txt) texts.push(`${term ? term + ": " : ""}${txt || ""}`);
    } else if (type === "list") {
      const items = getProp(b, "items");
      if (Array.isArray(items)) {
        items.forEach(item => texts.push(item));
      }
    } else if (type === "table") {
      const rows = getProp(b, "rows");
      if (Array.isArray(rows)) {
        rows.forEach(row => {
          if (Array.isArray(row)) {
            texts.push(row.join(", "));
          }
        });
      }
    } else if (type === "equation") {
      const latex = getProp(b, "latex") || b.latex;
      if (latex) texts.push(latex);
    } else if (type === "code") {
      const text = getProp(b, "text");
      if (text) texts.push(text);
    } else if (type === "figure") {
      const ref = getProp(b, "ref");
      const caption = getProp(b, "caption");
      if (ref || caption) texts.push(`${ref ? ref + ": " : ""}${caption || ""}`);
    } else if (type === "question") {
      const prompt = getProp(b, "prompt");
      const options = getProp(b, "options");
      if (prompt) texts.push(prompt);
      if (Array.isArray(options)) {
        options.forEach(opt => texts.push(opt));
      }
    } else if (type === "callout" || type === "example") {
      const label = getProp(b, "label");
      const title = getProp(b, "title");
      if (label || title) texts.push(`${label ? label + " " : ""}${title || ""}`);
    } else if (type === "step") {
      const label = getProp(b, "label");
      const text = getProp(b, "text");
      if (label || text) texts.push(`${label ? label + ": " : ""}${text || ""}`);
    }
  });

  return texts.join("\n");
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

  const [translationLanguage, setTranslationLanguage] = useState(language || "en");
  const [selectedMcqAnswers, setSelectedMcqAnswers] = useState<Record<string, string>>({});

  const getPageContentToRead = (pageObj: any, lang: string): string => {
    if (!pageObj) return "";
    if (pageObj.blocks && Array.isArray(pageObj.blocks) && pageObj.blocks.length > 0) {
      return compilePageTextForTts(pageObj.blocks, lang, pageObj.i18n);
    }
    const isAr = lang === "ar";
    return isAr 
      ? (pageObj.contentAr || pageObj.contentEn || pageObj.content || "") 
      : (pageObj.contentEn || pageObj.contentAr || pageObj.content || "");
  };

  const renderBlocks = (blocks: any[], lang: string, i18n?: any) => {
    // 1. Build children mapping
    const childrenMap: Record<string, any[]> = {};
    blocks.forEach(b => {
      if (b.parent) {
        if (!childrenMap[b.parent]) {
          childrenMap[b.parent] = [];
        }
        childrenMap[b.parent].push(b);
      }
    });

    // 2. Identify root blocks
    // A block is root if its parent is empty or not in the blocks list
    const blockIds = new Set(blocks.map(b => b.id));
    const rootBlocks = blocks.filter(b => !b.parent || b.parent === "" || !blockIds.has(b.parent));

    // 3. Define block property resolver helper
    const getBlockProp = (b: any, propName: string) => {
      if (
        i18n &&
        i18n[b.id] &&
        i18n[b.id][lang] &&
        i18n[b.id][lang][propName] !== undefined
      ) {
        return i18n[b.id][lang][propName];
      }
      return b[propName];
    };

    // 4. Recursive block renderer
    const renderBlock = (b: any): React.ReactNode => {
      const type = b.type;
      const id = b.id;
      const bChildren = childrenMap[id] || [];

      // Resolve fields
      const text = getBlockProp(b, "text");
      const term = getBlockProp(b, "term");
      const caption = getBlockProp(b, "caption");
      const ref = getBlockProp(b, "ref");
      const label = getBlockProp(b, "label");
      const title = getBlockProp(b, "title");
      const prompt = getBlockProp(b, "prompt");
      const options = getBlockProp(b, "options");
      const answer = getBlockProp(b, "answer");
      const latex = getBlockProp(b, "latex") || b.latex;
      const variant = b.variant; // note, warning, tip
      const level = b.level || 1;
      const ordered = b.ordered;
      const items = getBlockProp(b, "items");
      const rows = getBlockProp(b, "rows");

      const isAr = lang === "ar";

      switch (type) {
        case "heading": {
          const headingSizes = ["1.85rem", "1.55rem", "1.35rem", "1.18rem"];
          const size = headingSizes[Math.min(level - 1, headingSizes.length - 1)];
          const Tag = `h${Math.min(Math.max(level, 1), 6)}` as any;
          return (
            <Tag key={id} style={{
              fontSize: size,
              fontWeight: 900,
              color: "var(--primary)",
              marginTop: "2rem",
              marginBottom: "1rem",
              paddingBottom: "0.5rem",
              borderBottom: level <= 2 ? "2px solid rgba(16, 107, 163, 0.12)" : "none",
              borderLeft: level === 1 ? (isAr ? "none" : "6px solid #d4af37") : "none",
              borderRight: level === 1 ? (isAr ? "6px solid #d4af37" : "none") : "none",
              paddingLeft: level === 1 ? (isAr ? "0" : "0.75rem") : "0",
              paddingRight: level === 1 ? (isAr ? "0.75rem" : "0") : "0",
              fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-sans)",
              textAlign: isAr ? "right" : "left",
              lineHeight: "1.4"
            }}>
              {parseInlineStyles(text)}
            </Tag>
          );
        }

        case "paragraph":
          return (
            <p key={id} style={{
              fontSize: "1.05rem",
              lineHeight: "1.85",
              marginBottom: "1.25rem",
              color: "var(--foreground)",
              textAlign: "justify",
              direction: isAr ? "rtl" : "ltr",
              fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-sans)",
              opacity: 0.98
            }}>
              {parseInlineStyles(text)}
            </p>
          );

        case "definition":
          return (
            <div key={id} style={{
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
                <span>⚖️ {isAr ? "تعريف" : "Definition"}</span>
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary)", marginBottom: "0.5rem" }}>
                {parseInlineStyles(term)}
              </div>
              <div style={{
                fontSize: "1.02rem",
                lineHeight: "1.75",
                color: "var(--foreground)",
                fontWeight: 600,
                fontStyle: isAr ? "normal" : "italic"
              }}>{parseInlineStyles(text)}</div>
            </div>
          );

        case "list":
          return (
            <ul key={id} style={{ 
              margin: "1.25rem 0", 
              paddingLeft: isAr ? "0" : "1.75rem", 
              paddingRight: isAr ? "1.75rem" : "0", 
              listStyleType: "none",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
              direction: isAr ? "rtl" : "ltr"
            }}>
              {Array.isArray(items) && items.map((item, idx) => (
                <li key={idx} style={{ 
                  display: "flex", 
                  alignItems: "flex-start", 
                  gap: "0.6rem",
                  lineHeight: "1.75",
                  fontSize: "1rem",
                  textAlign: isAr ? "right" : "left"
                }}>
                  <span style={{ color: "var(--primary)", fontWeight: 900, fontSize: "1.05rem" }}>
                    {ordered ? `${idx + 1}.` : "•"}
                  </span>
                  <span style={{ flex: 1 }}>{parseInlineStyles(item)}</span>
                </li>
              ))}
              {bChildren.map(child => renderBlock(child))}
            </ul>
          );

        case "table": {
          if (!Array.isArray(rows) || rows.length === 0) return null;
          const headers = rows[0];
          const dataRows = rows.slice(1);
          return (
            <div key={id} style={{ overflowX: "auto", margin: "1.75rem 0", borderRadius: "16px", border: "1px solid rgba(16, 107, 163, 0.15)", boxShadow: "0 6px 20px rgba(16, 107, 163, 0.02)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "inherit", textAlign: isAr ? "right" : "left", direction: isAr ? "rtl" : "ltr" }}>
                <thead>
                  <tr style={{ background: "linear-gradient(135deg, rgba(16, 107, 163, 0.06) 0%, rgba(16, 107, 163, 0.1) 100%)", borderBottom: "2px solid rgba(16, 107, 163, 0.18)" }}>
                    {Array.isArray(headers) && headers.map((h, hIdx) => (
                      <th key={hIdx} style={{ padding: "0.95rem 1.25rem", fontSize: "0.92rem", fontWeight: 800, color: "var(--primary)" }}>
                        {parseInlineStyles(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: "1px solid rgba(16, 107, 163, 0.08)", background: rIdx % 2 === 0 ? "#ffffff" : "rgba(16, 107, 163, 0.01)" }}>
                      {Array.isArray(row) && row.map((cell, cIdx) => (
                        <td key={cIdx} style={{ padding: "0.9rem 1.25rem", fontSize: "0.92rem", color: "var(--foreground)", fontWeight: 550 }}>
                          {parseInlineStyles(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        case "equation":
          return (
            <div key={id} style={{
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
                <span>📐 {isAr ? "معادلة / صيغة رياضية" : "Equation / Formula"}</span>
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
              }}>{latex}</div>
            </div>
          );

        case "code":
          return (
            <div key={id} style={{
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
              }}>{b.lang || "code"}</div>
              <pre style={{ margin: 0 }}><code style={{ whiteSpace: "pre-wrap", display: "block", lineHeight: "1.65" }}>{text}</code></pre>
            </div>
          );

        case "figure":
          return (
            <div key={id} style={{
              margin: "1.75rem auto",
              padding: "1.5rem",
              borderRadius: "18px",
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(16, 185, 129, 0.06) 100%)",
              borderLeft: isAr ? "none" : "5px solid #059669",
              borderRight: isAr ? "5px solid #059669" : "none",
              borderTop: "1px solid rgba(16, 185, 129, 0.12)",
              borderBottom: "1px solid rgba(16, 185, 129, 0.12)",
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
                <span>🖼️ {ref || (isAr ? "شكل توضيحي" : "Figure")}</span>
              </div>
              <div style={{
                fontSize: "0.95rem",
                lineHeight: "1.75",
                color: "#065f46",
                fontStyle: isAr ? "normal" : "italic",
                fontWeight: 600
              }}>{parseInlineStyles(caption)}</div>
            </div>
          );

        case "question": {
          const selectedAnswer = selectedMcqAnswers[id];
          const hasSelected = selectedAnswer !== undefined;
          const isCorrect = selectedAnswer === answer;
          return (
            <div key={id} style={{
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
                <span>❓ {isAr ? "سؤال تفاعلي" : "Interactive Question"}</span>
              </div>
              <div style={{
                fontSize: "1.05rem",
                lineHeight: "1.75",
                color: "var(--foreground)",
                fontWeight: 700,
                marginBottom: "1rem"
              }}>{parseInlineStyles(prompt)}</div>

              {Array.isArray(options) && options.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                  {options.map((opt, optIdx) => {
                    const optLetter = isAr
                      ? ["أ", "ب", "ج", "د"][optIdx] || String.fromCharCode(1575 + optIdx)
                      : String.fromCharCode(65 + optIdx); // A, B, C, D...
                    
                    const isCurrentSelection = selectedAnswer === optLetter;
                    const isThisCorrectOption = optLetter === answer;

                    let optBg = "#ffffff";
                    let optBorder = "1px solid rgba(16, 107, 163, 0.12)";
                    let optShadow = "0 2px 6px rgba(0,0,0,0.02)";

                    if (hasSelected) {
                      if (isCurrentSelection) {
                        if (isCorrect) {
                          optBg = "rgba(16, 185, 129, 0.1)"; // correct green
                          optBorder = "2px solid #10b981";
                          optShadow = "0 4px 12px rgba(16, 185, 129, 0.15)";
                        } else {
                          optBg = "rgba(239, 68, 68, 0.1)"; // incorrect red
                          optBorder = "2px solid #ef4444";
                          optShadow = "0 4px 12px rgba(239, 68, 68, 0.15)";
                        }
                      } else if (isThisCorrectOption) {
                        // Highlight the correct answer even if the user picked wrong
                        optBg = "rgba(16, 185, 129, 0.05)";
                        optBorder = "2px dashed #10b981";
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => {
                          if (hasSelected) return; // allow only one submission
                          setSelectedMcqAnswers(prev => ({ ...prev, [id]: optLetter }));
                        }}
                        disabled={hasSelected}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.85rem",
                          padding: "0.9rem 1.25rem",
                          borderRadius: "12px",
                          border: optBorder,
                          background: optBg,
                          boxShadow: optShadow,
                          cursor: hasSelected ? "default" : "pointer",
                          textAlign: isAr ? "right" : "left",
                          width: "100%",
                          transition: "all 0.2s ease",
                          fontSize: "0.98rem",
                          fontWeight: 600,
                          color: "var(--foreground)"
                        }}
                        onMouseOver={(e) => {
                          if (!hasSelected) {
                            e.currentTarget.style.transform = "translateY(-1.5px)";
                            e.currentTarget.style.borderColor = "var(--primary)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 107, 163, 0.08)";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!hasSelected) {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.borderColor = "rgba(16, 107, 163, 0.12)";
                            e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.02)";
                          }
                        }}
                      >
                        <span style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: isCurrentSelection
                            ? (isCorrect ? "#10b981" : "#ef4444")
                            : (hasSelected && isThisCorrectOption ? "#10b981" : "rgba(16, 107, 163, 0.08)"),
                          color: isCurrentSelection || (hasSelected && isThisCorrectOption) ? "#ffffff" : "var(--primary)",
                          fontWeight: 800,
                          fontSize: "0.88rem"
                        }}>
                          {optLetter}
                        </span>
                        <span style={{ flex: 1 }}>{parseInlineStyles(opt)}</span>
                        {hasSelected && isCurrentSelection && (
                          <span style={{ fontSize: "1.2rem" }}>
                            {isCorrect ? "✅" : "❌"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        case "callout": {
          let calloutBg = "linear-gradient(135deg, rgba(16, 107, 163, 0.03) 0%, rgba(16, 107, 163, 0.06) 100%)";
          let calloutBorder = "5px solid #106ba3";
          let calloutTitleColor = "#106ba3";
          let icon = "ℹ️";

          if (variant === "warning") {
            calloutBg = "linear-gradient(135deg, rgba(239, 68, 68, 0.03) 0%, rgba(239, 68, 68, 0.06) 100%)";
            calloutBorder = "5px solid #ef4444";
            calloutTitleColor = "#ef4444";
            icon = "⚠️";
          } else if (variant === "tip") {
            calloutBg = "linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(16, 185, 129, 0.06) 100%)";
            calloutBorder = "5px solid #10b981";
            calloutTitleColor = "#10b981";
            icon = "💡";
          }

          return (
            <div key={id} style={{
              margin: "1.75rem 0",
              padding: "1.5rem",
              borderRadius: "18px",
              background: calloutBg,
              borderLeft: isAr ? "none" : calloutBorder,
              borderRight: isAr ? calloutBorder : "none",
              borderTop: "1px solid rgba(16, 107, 163, 0.12)",
              borderBottom: "1px solid rgba(16, 107, 163, 0.12)",
              boxShadow: "0 10px 30px rgba(16, 107, 163, 0.03)",
              fontFamily: isAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-sans)",
              textAlign: isAr ? "right" : "left",
              direction: isAr ? "rtl" : "ltr"
            }}>
              <div style={{
                fontSize: "0.85rem",
                fontWeight: 850,
                color: calloutTitleColor,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.6rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}>
                <span>{icon} {label || (variant === "warning" ? (isAr ? "تحذير" : "Warning") : variant === "tip" ? (isAr ? "نصيحة" : "Tip") : (isAr ? "تنبيه" : "Note"))}</span>
              </div>
              {title && (
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: calloutTitleColor, marginBottom: "0.5rem" }}>
                  {parseInlineStyles(title)}
                </div>
              )}
              {text && (
                <div style={{
                  fontSize: "1.02rem",
                  lineHeight: "1.75",
                  color: "var(--foreground)",
                  fontWeight: 600
                }}>{parseInlineStyles(text)}</div>
              )}
              {bChildren.length > 0 && (
                <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {bChildren.map(child => renderBlock(child))}
                </div>
              )}
            </div>
          );
        }

        case "example":
          return (
            <div key={id} style={{
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
                <span>⭐ {label || (isAr ? "مثال" : "Example")}</span>
              </div>
              {title && (
                <div style={{ fontSize: "1.12rem", fontWeight: 800, color: "var(--primary)", marginBottom: "0.75rem" }}>
                  {parseInlineStyles(title)}
                </div>
              )}
              {text && (
                <div style={{
                  fontSize: "1.02rem",
                  lineHeight: "1.75",
                  color: "var(--foreground)",
                  fontWeight: 600,
                  marginBottom: bChildren.length > 0 ? "1rem" : 0
                }}>{parseInlineStyles(text)}</div>
              )}
              {bChildren.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                  {bChildren.map(child => renderBlock(child))}
                </div>
              )}
            </div>
          );

        case "step":
          return (
            <div key={id} style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              padding: "0.75rem 1rem",
              background: "rgba(16, 107, 163, 0.02)",
              border: "1px solid rgba(16, 107, 163, 0.06)",
              borderRadius: "12px",
              margin: "0.5rem 0",
              textAlign: isAr ? "right" : "left",
              direction: isAr ? "rtl" : "ltr"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--primary)",
                  color: "#ffffff",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%"
                }}>{label || "•"}</span>
                <span style={{ fontSize: "0.98rem", fontWeight: 700, color: "var(--foreground)" }}>
                  {parseInlineStyles(text)}
                </span>
              </div>
              {bChildren.length > 0 && (
                <div style={{ paddingLeft: isAr ? 0 : "1.5rem", paddingRight: isAr ? "1.5rem" : 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {bChildren.map(child => renderBlock(child))}
                </div>
              )}
            </div>
          );

        default:
          return text ? <div key={id}>{parseInlineStyles(text)}</div> : null;
      }
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {rootBlocks.map(b => renderBlock(b))}
      </div>
    );
  };

  // Premium On-the-fly Translation Agent States
  const [translatedPages, setTranslatedPages] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPageTranslated, setIsPageTranslated] = useState<Record<string, boolean>>({});

  const handleTranslatePage = async (text: string, pageKey: string, targetLang: "ar" | "en") => {
    if (translatedPages[pageKey]) {
      setIsPageTranslated(prev => ({ ...prev, [pageKey]: !prev[pageKey] }));
      return;
    }

    try {
      setIsTranslating(true);
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLanguage: targetLang })
      });

      if (!res.ok) {
        throw new Error("Translation failed");
      }

      const data = await res.json();
      if (data.success && data.translatedText) {
        setTranslatedPages(prev => ({ ...prev, [pageKey]: data.translatedText }));
        setIsPageTranslated(prev => ({ ...prev, [pageKey]: true }));
      } else {
        alert(language === "ar" ? "فشلت الترجمة، يرجى المحاولة مرة أخرى." : "Translation failed, please try again.");
      }
    } catch (error) {
      console.error("Translation agent error:", error);
      alert(language === "ar" ? "حدث خطأ أثناء الاتصال بوكيل الترجمة." : "An error occurred while contacting the translation agent.");
    } finally {
      setIsTranslating(false);
    }
  };

  const [showReaderSidebar, setShowReaderSidebar] = useState(true);
  const [sidebarPageSearch, setSidebarPageSearch] = useState("");

  const [isReadingPage, setIsReadingPage] = useState(false);
  const [isContinuousListening, setIsContinuousListening] = useState(false);
  const [isNextPageGlow, setIsNextPageGlow] = useState(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const [selectedVoice, setSelectedVoice] = useState<string>("Aoede");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const v = localStorage.getItem("fahem_tts_voice");
      if (v) setSelectedVoice(v);
    }
  }, []);

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    if (typeof window !== "undefined") {
      localStorage.setItem("fahem_tts_voice", voice);
    }
  };

  // New states for hierarchical menu, library selection, and Swarm SVG Mind Map
  const [activeSidebarTab, setActiveSidebarTab] = useState<"pages" | "mindmap">("pages");
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [hoveredNode, setHoveredNode] = useState<any | null>(null);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>("all");

  const getStoredTtsVoice = (): string => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fahem_tts_voice") || "Aoede";
    }
    return "Aoede";
  };

  const cleanTextForTts = (text: string): string => {
    if (!text) return "";
    return text
      .replace(/\[HEADER:[^\]]*\]/gi, "")
      .replace(/\[FOOTER:[^\]]*\]/gi, "")
      .replace(/\[VISUAL:[^\]]*\]/gi, "")
      .replace(/```[a-z]*\n[\s\S]*?\n```/g, "")
      .replace(/\|[\s\S]*?\|/g, "")
      .replace(/==|#|\*\*|__|\*/g, "")
      .replace(/Law|Rule|Theorem|Definition|Principle|قانون|قاعدة|نظرية|مبدأ|تعريف|التعريف|القاعدة|القانون|Equation|Formula|معادلة|صيغة/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const handleStopReading = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setIsReadingPage(false);
  };

  const handleReadPage = async (textToRead: string, totalPages: number) => {
    if (isReadingPage) {
      handleStopReading();
      return;
    }

    const cleanedText = cleanTextForTts(textToRead);
    if (!cleanedText) return;

    try {
      setIsReadingPage(true);
      const hasArabicChars = /[\u0600-\u06FF]/.test(cleanedText);
      const reqLang = hasArabicChars ? "ar" : (translationLanguage || "en");

      const res = await fetch("/api/audio/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanedText,
          language: reqLang,
          voice: selectedVoice,
          userId: user?.uid || "anonymous",
          userEmail: user?.email || "anonymous@fahem.ai"
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.audioContent) {
          const audioUrl = `data:${data.mimeType || "audio/wav"};base64,${data.audioContent}`;
          const audio = new Audio(audioUrl);
          activeAudioRef.current = audio;

          audio.onended = () => {
            activeAudioRef.current = null;
            if (isContinuousListening && readerCurrentPage < totalPages) {
              setReaderCurrentPage(readerCurrentPage + 1);
            } else {
              setIsReadingPage(false);
              setIsNextPageGlow(true);
              setTimeout(() => setIsNextPageGlow(false), 3000);
            }
          };

          audio.onerror = (err) => {
            console.error("Audio playback error:", err);
            setIsReadingPage(false);
          };

          await audio.play();
        } else {
          setIsReadingPage(false);
        }
      } else {
        setIsReadingPage(false);
      }
    } catch (err) {
      console.error("TTS processing error:", err);
      setIsReadingPage(false);
    }
  };

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


  const getLocalizedSubject = (subject: string | undefined, lang: string) => {
    return getSubjectNameLabel(subject || "", lang);
  };

  const isEnglishBookBySubjectOrTitle = (book: any): boolean => {
    if (!book) return false;
    const title = (book.titleEn || book.title || "").toLowerCase();
    const subjectId = book.subject_id || book.subjectId || "";
    
    if (subjectId === "subj_arabic_grammar") return false;
    
    if (
      subjectId === "subj_algebra_stats" || 
      subjectId === "subj_biology" || 
      subjectId === "sub_computer_science_1780535716963" || 
      subjectId === "subj_business"
    ) {
      return true;
    }
    
    if (
      title.includes("physics") || 
      title.includes("chemistry") || 
      title.includes("mathematics") || 
      title.includes("algebra") || 
      title.includes("calculus") || 
      title.includes("computer science") || 
      title.includes("ict") || 
      title.includes("economics") || 
      title.includes("business")
    ) {
      return true;
    }
    
    return false;
  };

  useEffect(() => {
    if (selectedBookReader) {
      if (isEnglishBookBySubjectOrTitle(selectedBookReader)) {
        setTranslationLanguage("en");
      } else {
        setTranslationLanguage(selectedBookReader.language || language || "en");
      }
    } else {
      setTranslationLanguage(language || "en");
    }
  }, [selectedBookReader, language]);

  useEffect(() => {
    if (selectedBookReader && isReadingPage && isContinuousListening) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      
      const allPages = getAllPages(selectedBookReader, loadedBookPages);
      const hasCover = !!selectedBookReader.coverUrl;
      
      let contentToRead = "";
      let pageTotal = hasCover ? allPages.length + 1 : allPages.length;
      
      if (hasCover) {
        if (readerCurrentPage > 1) {
          const pageObj = allPages[readerCurrentPage - 2] || allPages[0];
          if (pageObj) {
            contentToRead = getPageContentToRead(pageObj, translationLanguage);
          }
        }
      } else {
        const pageObj = allPages[readerCurrentPage - 1] || allPages[0];
        if (pageObj) {
          contentToRead = getPageContentToRead(pageObj, translationLanguage);
        }
      }
      
      if (contentToRead) {
        const timer = setTimeout(() => {
          setIsReadingPage(false);
          handleReadPage(contentToRead, pageTotal);
        }, 600);
        return () => clearTimeout(timer);
      } else {
        setIsReadingPage(false);
      }
    }
  }, [readerCurrentPage]);

  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, []);

  // Keyboard arrow page navigation with LTR/RTL intelligence
  useEffect(() => {
    if (!selectedBookReader) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if the user is typing in an input, textarea, or contenteditable
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.getAttribute("contenteditable") === "true")) {
        return;
      }

      const allPages = getAllPages(selectedBookReader, loadedBookPages);
      const hasCover = !!selectedBookReader.coverUrl;
      const totalPages = hasCover ? allPages.length + 1 : allPages.length;
      const isAr = translationLanguage === "ar";

      if (e.key === "ArrowRight") {
        if (isAr) {
          // RTL: ArrowRight goes to Previous Page
          if (readerCurrentPage > 1) {
            setReaderCurrentPage(readerCurrentPage - 1);
          }
        } else {
          // LTR: ArrowRight goes to Next Page
          if (readerCurrentPage < totalPages) {
            setReaderCurrentPage(readerCurrentPage + 1);
          }
        }
      } else if (e.key === "ArrowLeft") {
        if (isAr) {
          // RTL: ArrowLeft goes to Next Page
          if (readerCurrentPage < totalPages) {
            setReaderCurrentPage(readerCurrentPage + 1);
          }
        } else {
          // LTR: ArrowLeft goes to Previous Page
          if (readerCurrentPage > 1) {
            setReaderCurrentPage(readerCurrentPage - 1);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedBookReader, readerCurrentPage, translationLanguage, loadedBookPages]);

  // Touch swipe page navigation refs and hooks
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent, totalPages: number) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX.current - touchEndX;
    const isAr = translationLanguage === "ar";

    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // Swipe Left (forward in LTR, backward in RTL)
        if (isAr) {
          if (readerCurrentPage > 1) setReaderCurrentPage(readerCurrentPage - 1);
        } else {
          if (readerCurrentPage < totalPages) setReaderCurrentPage(readerCurrentPage + 1);
        }
      } else {
        // Swipe Right (backward in LTR, forward in RTL)
        if (isAr) {
          if (readerCurrentPage < totalPages) setReaderCurrentPage(readerCurrentPage + 1);
        } else {
          if (readerCurrentPage > 1) setReaderCurrentPage(readerCurrentPage - 1);
        }
      }
    }
    touchStartX.current = null;
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
      <style>{`
        @keyframes activePulse {
          0% {
            r: 5px;
            stroke-width: 1px;
            stroke-opacity: 1;
          }
          50% {
            r: 10px;
            stroke-width: 4px;
            stroke-opacity: 0.5;
          }
          100% {
            r: 5px;
            stroke-width: 1px;
            stroke-opacity: 0;
          }
        }
        @keyframes pulseGlowNext {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 107, 163, 0.45);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(16, 107, 163, 0);
            transform: scale(1.05);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 107, 163, 0);
            transform: scale(1);
          }
        }
        @keyframes waveMotion {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        .pulse-glow-next {
          animation: pulseGlowNext 1.5s infinite !important;
          border: 1px solid var(--primary) !important;
          background: rgba(16, 107, 163, 0.08) !important;
        }
        .active-node-pulse {
          transform-origin: center;
        }
        .hover-lift-cover {
          transform: translateY(0);
        }
        .hover-lift-cover:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.3) !important;
        }
        .btn-start-reading:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(16, 107, 163, 0.5) !important;
        }
      `}</style>
      {selectedBookReader ? (() => {
        const allPages = getAllPages(selectedBookReader, loadedBookPages);
        const hasCover = !!selectedBookReader.coverUrl;
        const totalPagesCount = hasCover ? allPages.length + 1 : (allPages.length || 1);
        const isCoverPage = hasCover && readerCurrentPage === 1;

        const activePage = isCoverPage 
          ? null 
          : (hasCover 
              ? (allPages[readerCurrentPage - 2] || allPages[0])
              : (allPages[readerCurrentPage - 1] || allPages[0])
            ) || {
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
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {(selectedBookReader.coverThumbUrl || selectedBookReader.coverUrl) && (
                    <img
                      src={selectedBookReader.coverThumbUrl || selectedBookReader.coverUrl}
                      alt="Textbook Cover"
                      style={{
                        width: "36px",
                        height: "54px",
                        borderRadius: "6px",
                        objectFit: "cover",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
                        border: "1px solid rgba(16, 107, 163, 0.12)",
                        flexShrink: 0
                      }}
                    />
                  )}
                  <div>
                    <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
                      {language === "ar" ? (selectedBookReader.titleAr || selectedBookReader.title) : (selectedBookReader.titleEn || selectedBookReader.title)}
                    </h2>
                    <p style={{ fontSize: "0.75rem", color: "#6a7c88", margin: 0 }}>
                      {language === "ar" ? "جلسة دراسة تفاعلية نشطة مع رفيق فهم" : "Active chapter-linked study companion session"}
                    </p>
                  </div>
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
              gridTemplateColumns: showReaderSidebar ? "280px 1fr" : "1fr",
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
                  {/* Tab Switcher */}
                  <div style={{
                    display: "flex",
                    background: "rgba(16, 107, 163, 0.04)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(16, 107, 163, 0.12)",
                    borderRadius: "12px",
                    padding: "3px",
                    gap: "4px"
                  }}>
                    <button
                      onClick={() => setActiveSidebarTab("pages")}
                      style={{
                        flex: 1,
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: "none",
                        background: activeSidebarTab === "pages" ? "linear-gradient(135deg, var(--primary), var(--secondary))" : "transparent",
                        color: activeSidebarTab === "pages" ? "#ffffff" : "var(--foreground)",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px"
                      }}
                    >
                      📄 {language === "ar" ? "الصفحات" : "Pages"}
                    </button>
                    <button
                      onClick={() => setActiveSidebarTab("mindmap")}
                      style={{
                        flex: 1,
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: "none",
                        background: activeSidebarTab === "mindmap" ? "linear-gradient(135deg, var(--primary), var(--secondary))" : "transparent",
                        color: activeSidebarTab === "mindmap" ? "#ffffff" : "var(--foreground)",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px"
                      }}
                    >
                      🧠 {language === "ar" ? "الخريطة الذهنية" : "Mind Map"}
                    </button>
                  </div>

                  {activeSidebarTab === "pages" ? (
                    <>
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
                                const pTitle = translationLanguage === "ar" ? (p.titleAr || p.titleEn) : (p.titleEn || p.titleAr);
                                const pAr = translationLanguage === "ar";
                                const pContent = translationLanguage === "ar" ? (p.contentAr || p.contentEn || "") : (p.contentEn || p.contentAr || "");
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
                    </>
                  ) : (
                    /* Premium Interactive SVG Mind Map Tab */
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, position: "relative" }}>
                      {(() => {
                        const chaptersMap: Record<string, { title: string; titleAr: string; pages: any[] }> = {};
                        allPages.forEach(p => {
                          const chTitleEn = p.chapterTitleEn || "General";
                          const chTitleAr = p.chapterTitleAr || "عام";
                          const key = chTitleEn;
                          if (!chaptersMap[key]) {
                            chaptersMap[key] = { title: chTitleEn, titleAr: chTitleAr, pages: [] };
                          }
                          chaptersMap[key].pages.push(p);
                        });

                        const nodes: any[] = [];
                        const links: any[] = [];

                        let currentY = 75;
                        const rootNode = { id: "root", type: "root", label: language === "ar" ? "الفهرس" : "Contents", x: 130, y: 30 };
                        nodes.push(rootNode);

                        const chaptersList = Object.values(chaptersMap);
                        chaptersList.forEach((ch, chIdx) => {
                          const chId = `ch-${chIdx}`;
                          const chIsExpanded = expandedChapters[chId] !== false; // default to expanded
                          
                          const chNode = {
                            id: chId,
                            type: "chapter",
                            label: translationLanguage === "ar" ? ch.titleAr : ch.title,
                            fullLabelEn: ch.title,
                            fullLabelAr: ch.titleAr,
                            x: 60,
                            y: currentY,
                            pagesCount: ch.pages.length,
                            isExpanded: chIsExpanded
                          };
                          nodes.push(chNode);
                          
                          links.push({
                            from: rootNode,
                            to: chNode,
                            type: "root-to-chapter"
                          });
                          
                          if (chIsExpanded) {
                            ch.pages.forEach((p) => {
                              const pNodeId = `p-${p.pageNum}`;
                              const pActive = p.pageNum === readerCurrentPage;
                              const pTitle = translationLanguage === "ar" ? (p.titleAr || p.titleEn) : (p.titleEn || p.titleAr);
                              
                              const pNode = {
                                id: pNodeId,
                                type: "page",
                                pageNum: p.pageNum,
                                label: `${p.pageNum}`,
                                fullLabel: pTitle,
                                snippet: (translationLanguage === "ar" ? (p.contentAr || p.contentEn) : (p.contentEn || p.contentAr))?.slice(0, 80) + "...",
                                active: pActive,
                                x: 190,
                                y: currentY
                              };
                              nodes.push(pNode);
                              
                              links.push({
                                from: chNode,
                                to: pNode,
                                type: "chapter-to-page",
                                active: pActive
                              });
                              
                              currentY += 44; // Spacing between page nodes
                            });
                          } else {
                            currentY += 54; // Spacing if chapter collapsed
                          }
                        });

                        const svgHeight = Math.max(300, currentY + 30);

                        return (
                          <div style={{ position: "relative", width: "100%", maxHeight: "480px", overflowY: "auto", overflowX: "hidden", borderRadius: "12px", border: "1px solid rgba(16, 107, 163, 0.08)", background: "rgba(16, 107, 163, 0.01)" }}>
                            <svg width="240" height={svgHeight} style={{ overflow: "visible" }}>
                              <defs>
                                <linearGradient id="grad-active-link" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                                  <stop offset="100%" stopColor="var(--secondary)" stopOpacity="1" />
                                </linearGradient>
                                <linearGradient id="grad-inactive-link" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="rgba(16, 107, 163, 0.15)" />
                                  <stop offset="100%" stopColor="rgba(16, 107, 163, 0.05)" />
                                </linearGradient>
                                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                  <feGaussianBlur stdDeviation="3" result="blur" />
                                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                              </defs>

                              {/* Render Bezier Curves */}
                              {links.map((link, idx) => {
                                const dx = link.to.x - link.from.x;
                                const cx1 = link.from.x + dx * 0.5;
                                const cy1 = link.from.y;
                                const cx2 = link.from.x + dx * 0.5;
                                const cy2 = link.to.y;
                                const d = `M ${link.from.x} ${link.from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${link.to.x} ${link.to.y}`;

                                return (
                                  <path
                                    key={idx}
                                    d={d}
                                    fill="none"
                                    stroke={link.active ? "url(#grad-active-link)" : "url(#grad-inactive-link)"}
                                    strokeWidth={link.active ? 3 : 1.5}
                                    strokeDasharray={link.type === "chapter-to-page" ? (link.active ? "none" : "3,3") : "none"}
                                    style={{ transition: "all 0.3s ease" }}
                                    filter={link.active ? "url(#glow)" : undefined}
                                  />
                                );
                              })}

                              {/* Render Nodes */}
                              {nodes.map((node) => {
                                const isRoot = node.type === "root";
                                const isChapter = node.type === "chapter";
                                const isPage = node.type === "page";

                                return (
                                  <g
                                    key={node.id}
                                    style={{ cursor: "pointer" }}
                                    onClick={() => {
                                      if (isPage) {
                                        setReaderCurrentPage(node.pageNum);
                                      } else if (isChapter) {
                                        setExpandedChapters(prev => ({
                                          ...prev,
                                          [node.id]: !node.isExpanded
                                        }));
                                      }
                                    }}
                                    onMouseOver={() => setHoveredNode(node)}
                                    onMouseOut={() => setHoveredNode(null)}
                                  >
                                    {isRoot && (
                                      <>
                                        <circle cx={node.x} cy={node.y} r="14" fill="var(--primary)" stroke="#ffffff" strokeWidth="2" filter="url(#glow)" />
                                        <text x={node.x} y={node.y + 4} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900">🧠</text>
                                      </>
                                    )}

                                    {isChapter && (
                                      <>
                                        <circle cx={node.x} cy={node.y} r="10" fill={node.isExpanded ? "var(--primary)" : "#6a7c88"} stroke="#ffffff" strokeWidth="1.5" />
                                        <text x={node.x} y={node.y + 3} textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="800">
                                          {node.isExpanded ? "−" : "+"}
                                        </text>
                                        <text x={node.x - 14} y={node.y + 3} textAnchor="end" fill="var(--foreground)" fontSize="9" fontWeight="700" style={{ maxWidth: "60px" }}>
                                          {node.label.length > 8 ? node.label.slice(0, 7) + "..." : node.label}
                                        </text>
                                      </>
                                    )}

                                    {isPage && (
                                      <>
                                        {/* Active Pulse Glow circle */}
                                        {node.active && (
                                          <circle cx={node.x} cy={node.y} r="10" fill="none" stroke="var(--primary)" strokeWidth="1" className="active-node-pulse" style={{ animation: "activePulse 1.5s infinite" }} />
                                        )}
                                        <circle cx={node.x} cy={node.y} r="8" fill={node.active ? "var(--primary)" : "#ffffff"} stroke={node.active ? "var(--secondary)" : "rgba(16, 107, 163, 0.3)"} strokeWidth={node.active ? 2 : 1} />
                                        <text x={node.x} y={node.y + 3} textAnchor="middle" fill={node.active ? "#ffffff" : "var(--primary)"} fontSize="8" fontWeight="900">
                                          {node.label}
                                        </text>
                                      </>
                                    )}
                                  </g>
                                );
                              })}
                            </svg>

                            {/* Floating glassmorphic tooltip card inside Mind Map panel */}
                            {hoveredNode && (
                              <div style={{
                                position: "absolute",
                                bottom: "8px",
                                left: "8px",
                                right: "8px",
                                background: "rgba(255, 255, 255, 0.95)",
                                backdropFilter: "blur(12px)",
                                border: "1px solid rgba(16, 107, 163, 0.15)",
                                borderRadius: "10px",
                                padding: "8px 12px",
                                pointerEvents: "none",
                                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                                transition: "all 0.2s ease-in-out",
                                zIndex: 10
                              }}>
                                {hoveredNode.type === "root" && (
                                  <div>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--primary)" }}>📖 {selectedBookReader.title}</div>
                                    <div style={{ fontSize: "0.65rem", color: "#6a7c88", marginTop: "2px" }}>
                                      {language === "ar" ? "الهيكل التنظيمي الكامل للفصول والمحتوى" : "Full structured course syllabus tree"}
                                    </div>
                                  </div>
                                )}
                                {hoveredNode.type === "chapter" && (
                                  <div>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--primary)" }}>📂 {hoveredNode.fullLabelEn || hoveredNode.fullLabelAr}</div>
                                    <div style={{ fontSize: "0.65rem", color: "#6a7c88", marginTop: "2px" }}>
                                      {language === "ar" ? `يحتوي على ${hoveredNode.pagesCount} صفحات تفاعلية` : `Contains ${hoveredNode.pagesCount} interactive pages`}
                                    </div>
                                  </div>
                                )}
                                {hoveredNode.type === "page" && (
                                  <div>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--primary)" }}>📄 {language === "ar" ? `صفحة ${hoveredNode.pageNum}` : `Page ${hoveredNode.pageNum}`}</div>
                                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--foreground)", marginTop: "1px" }}>{hoveredNode.fullLabel}</div>
                                    {hoveredNode.snippet && (
                                      <div style={{ fontSize: "0.6rem", color: "#6a7c88", marginTop: "3px", fontStyle: "italic", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                                        "{hoveredNode.snippet}"
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}



              {/* Textbook Viewer Panel */}
              <div 
                className="panel-card" 
                onTouchStart={handleTouchStart}
                onTouchEnd={(e) => handleTouchEnd(e, totalPagesCount)}
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
                      {isCoverPage 
                        ? (translationLanguage === "ar" ? "📖 غلاف الكتاب" : "📖 Book Cover")
                        : (translationLanguage === "ar" 
                            ? `📖 ${activePage?.chapterTitleAr || "الفصل"} — صفحة ${readerCurrentPage}` 
                            : `📖 ${activePage?.chapterTitleEn || "Chapter"} — Page ${readerCurrentPage}`)}
                    </span>

                    {/* Premium AI Translation Agent Widget */}
                    {(() => {
                      const pageKey = `${selectedBookReader._id || selectedBookReader.id || "default"}_${readerCurrentPage}`;
                      const isArPageContent = isTextArabic(activePage?.content || activePage?.contentEn || activePage?.contentAr || "");
                      const targetLang = isArPageContent ? "en" : "ar";
                      const isTranslated = !!isPageTranslated[pageKey];
                      const hasTranslation = !!translatedPages[pageKey];

                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6a7c88" }}>
                            🌐 {language === "ar" ? "وكيل الترجمة:" : "Translation Agent:"}
                          </span>
                          <button
                            type="button"
                            disabled={isTranslating}
                            onClick={() => {
                              if (isTranslated) {
                                setIsPageTranslated(prev => ({ ...prev, [pageKey]: false }));
                              } else if (hasTranslation) {
                                setIsPageTranslated(prev => ({ ...prev, [pageKey]: true }));
                              } else {
                                const originalText = activePage?.content || activePage?.contentEn || activePage?.contentAr || "";
                                handleTranslatePage(originalText, pageKey, targetLang);
                              }
                            }}
                            style={{
                              padding: "4px 14px",
                              borderRadius: "18px",
                              border: "none",
                              background: isTranslated 
                                ? "linear-gradient(135deg, #1b5e20, #2e7d32)" // Rich Forest Green
                                : "linear-gradient(135deg, var(--primary), var(--secondary))",
                              color: "#ffffff",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              cursor: "pointer",
                              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              boxShadow: isTranslated 
                                ? "0 2px 8px rgba(27, 94, 32, 0.3)" 
                                : "0 2px 8px rgba(16, 107, 163, 0.25)"
                            }}
                            onMouseOver={(e) => {
                              if (!isTranslating) {
                                e.currentTarget.style.transform = "translateY(-1px)";
                                e.currentTarget.style.boxShadow = isTranslated 
                                  ? "0 4px 12px rgba(27, 94, 32, 0.4)" 
                                  : "0 4px 12px rgba(16, 107, 163, 0.35)";
                              }
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow = isTranslated 
                                ? "0 2px 8px rgba(27, 94, 32, 0.3)" 
                                : "0 2px 8px rgba(16, 107, 163, 0.25)";
                            }}
                          >
                            {isTranslating ? (
                              <>
                                <span style={{
                                  display: "inline-block",
                                  width: "10px",
                                  height: "10px",
                                  border: "2px solid rgba(255,255,255,0.3)",
                                  borderTopColor: "#fff",
                                  borderRadius: "50%",
                                  animation: "spin 0.8s linear infinite"
                                }}></span>
                                <span>{language === "ar" ? "جاري الترجمة..." : "Translating..."}</span>
                              </>
                            ) : isTranslated ? (
                              <>
                                <span>↩️</span>
                                <span>{language === "ar" ? "عرض النص الأصلي" : "Show Original"}</span>
                              </>
                            ) : (
                              <>
                                <span>✨</span>
                                <span>
                                  {language === "ar" 
                                    ? `ترجمة إلى ${targetLang === "ar" ? "العربية" : "الإنجليزية"}`
                                    : `Translate to ${targetLang === "ar" ? "Arabic" : "English"}`}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })()}

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
                        className={`btn btn-secondary ${isNextPageGlow ? "pulse-glow-next" : ""}`}
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
                  ) : isCoverPage ? (
                    /* Beautiful full-size cover poster with stage and grade metadata, and CTA */
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: "2.5rem",
                      padding: "1.5rem",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1))",
                      borderRadius: "24px",
                      border: "1px solid rgba(16, 107, 163, 0.08)",
                      boxShadow: "0 20px 50px rgba(0,0,0,0.03)"
                    }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        position: "relative"
                      }}>
                        <img 
                          src={selectedBookReader.coverUrl}
                          alt={selectedBookReader.title}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "420px",
                            borderRadius: "16px",
                            boxShadow: "0 15px 35px rgba(0, 0, 0, 0.15), 0 5px 15px rgba(16, 107, 163, 0.1)",
                            border: "1px solid rgba(16, 107, 163, 0.15)",
                            objectFit: "contain",
                            transition: "transform 0.3s ease"
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.02)"; }}
                          onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                        />
                      </div>

                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.25rem",
                        textAlign: language === "ar" ? "right" : "left",
                        alignItems: language === "ar" ? "flex-start" : "flex-start"
                      }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                          {(() => {
                            const rTheme = getSubjectTheme(selectedBookReader.subject || "");
                            return (
                              <span style={{
                                padding: "6px 14px", borderRadius: "20px", 
                                background: rTheme.badgeBg,
                                color: rTheme.badgeText, 
                                fontWeight: 800, fontSize: "0.8rem",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem"
                              }}>
                                {rTheme.emoji} {getLocalizedSubject(selectedBookReader.subject, language)}
                              </span>
                            );
                          })()}

                          <span style={{
                            padding: "6px 14px", borderRadius: "20px",
                            background: "rgba(16, 107, 163, 0.05)",
                            color: "var(--primary)",
                            fontWeight: 800, fontSize: "0.8rem",
                            border: "1px solid rgba(16, 107, 163, 0.1)"
                          }}>
                            🏫 {selectedBookReader.isMoeIngested 
                              ? (language === "ar" ? "وزارة التربية والتعليم" : "MOE curriculum")
                              : (language === "ar" ? "المكتبة الأكاديمية" : "Academic Library")}
                          </span>
                        </div>

                        <h1 style={{
                          fontSize: "1.8rem",
                          fontWeight: 900,
                          margin: 0,
                          color: "var(--foreground)",
                          lineHeight: "1.3",
                          fontFamily: language === "ar" ? "Cairo, sans-serif" : "var(--font-display)"
                        }}>
                          {language === "ar" ? (selectedBookReader.titleAr || selectedBookReader.title) : (selectedBookReader.titleEn || selectedBookReader.title)}
                        </h1>

                        <div style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "1rem",
                          fontSize: "0.9rem",
                          color: "#6a7c88",
                          borderTop: "1px solid rgba(16, 107, 163, 0.08)",
                          borderBottom: "1px solid rgba(16, 107, 163, 0.08)",
                          padding: "0.75rem 0",
                          width: "100%"
                        }}>
                          <div>
                            <strong>{language === "ar" ? "المرحلة الدراسية:" : "Education Stage:"}</strong>{" "}
                            <span>{(selectedBookReader as any).stage || (selectedBookReader.isMoeIngested ? (language === "ar" ? "المرحلة الثانوية" : "Secondary Stage") : (language === "ar" ? "المرحلة الأكاديمية" : "Academic Stage"))}</span>
                          </div>
                          <div style={{ height: "1.2rem", width: "1px", background: "rgba(16, 107, 163, 0.15)" }}></div>
                          <div>
                            <strong>{language === "ar" ? "الصف الدراسي:" : "Grade Level:"}</strong>{" "}
                            <span>{(selectedBookReader as any).grade || (language === "ar" ? "الصف العاشر" : "Grade 10")}</span>
                          </div>
                          <div style={{ height: "1.2rem", width: "1px", background: "rgba(16, 107, 163, 0.15)" }}></div>
                          <div>
                            <strong>{language === "ar" ? "الصفحات:" : "Total Pages:"}</strong>{" "}
                            <span>{totalPagesCount}</span>
                          </div>
                        </div>

                        <p style={{
                          fontSize: "0.95rem",
                          color: "#4a5d68",
                          lineHeight: "1.6",
                          margin: 0,
                          fontFamily: language === "ar" ? "Cairo, sans-serif" : "var(--font-sans)"
                        }}>
                          {language === "ar" 
                            ? "مرحباً بك في جلسة القراءة التفاعلية المخصصة لهذا الكتاب الدراسي. تم تجهيز هذا الإصدار بمخططات خرائط ذهنية تفاعلية ذكية، بالإضافة إلى ميزة القارئ الصوتي المستمر الذكي لدعم التحصيل الدراسي الأقصى ونمو الذاكرة البصرية والسمعية."
                            : "Welcome to the interactive digital study session for this textbook. This premium edition is equipped with dendritic AI mind maps and continuous text-to-speech companion rendering for optimal retention and multisensory learning."}
                        </p>

                        <button
                          onClick={() => setReaderCurrentPage(2)}
                          style={{
                            padding: "12px 28px",
                            borderRadius: "30px",
                            border: "none",
                            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                            color: "#ffffff",
                            fontWeight: 800,
                            fontSize: "1rem",
                            cursor: "pointer",
                            boxShadow: "0 8px 24px rgba(16, 107, 163, 0.25)",
                            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginTop: "1rem"
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 12px 30px rgba(16, 107, 163, 0.35)";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 8px 24px rgba(16, 107, 163, 0.25)";
                          }}
                        >
                          <span>📖 {language === "ar" ? "ابدأ القراءة الآن" : "Start Reading Now"}</span>
                          <span style={{ fontSize: "1.1rem" }}>{language === "ar" ? "⬅️" : "➡️"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const isAr = translationLanguage === "ar";
                      const pageKey = `${selectedBookReader._id || selectedBookReader.id || "default"}_${readerCurrentPage}`;
                      const isPageTranslatedActive = !!isPageTranslated[pageKey];
                      const translatedTextVal = translatedPages[pageKey];

                      const activeContent = isPageTranslatedActive && translatedTextVal
                        ? translatedTextVal
                        : (isAr 
                            ? (activePage.contentAr || activePage.contentEn || activePage.content || "") 
                            : (activePage.contentEn || activePage.contentAr || activePage.content || ""));

                      const actualIsAr = isTextArabic(activeContent);

                      const isGeneric = (str: string) => {
                        const s = (str || "").trim().toLowerCase();
                        return !s || s === "page content" || s === "محتوى الصفحة" || s === "untitled section" || s === "قسم غير معنون";
                      };

                      let activeTitle = "";
                      if (actualIsAr) {
                        const rawTitle = activePage.titleAr || activePage.titleEn || "";
                        if (isGeneric(rawTitle)) {
                          const chTitle = activePage.chapterTitleAr || activePage.chapterTitleEn || "";
                          activeTitle = chTitle ? `${chTitle} — صفحة ${activePage.pageNum}` : `صفحة ${activePage.pageNum}`;
                        } else {
                          activeTitle = rawTitle;
                        }
                      } else {
                        const rawTitle = activePage.titleEn || activePage.titleAr || "";
                        if (isGeneric(rawTitle)) {
                          const chTitle = activePage.chapterTitleEn || activePage.chapterTitleAr || "";
                          activeTitle = chTitle ? `${chTitle} — Page ${activePage.pageNum}` : `Page ${activePage.pageNum}`;
                        } else {
                          activeTitle = rawTitle;
                        }
                      }

                      return (
                        <>
                          {/* Premium TTS Control Panel */}
                          <div style={{
                            background: "rgba(16, 107, 163, 0.04)",
                            backdropFilter: "blur(12px)",
                            borderRadius: "16px",
                            padding: "0.75rem 1.25rem",
                            border: "1px solid rgba(16, 107, 163, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "1rem",
                            marginBottom: "1.5rem",
                            boxShadow: "0 8px 32px rgba(16, 107, 163, 0.02)"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              <button
                                onClick={() => handleReadPage(getPageContentToRead(activePage, translationLanguage), totalPagesCount)}
                                style={{
                                  background: isReadingPage 
                                    ? "linear-gradient(135deg, #ef4444, #dc2626)" 
                                    : "linear-gradient(135deg, var(--primary), var(--secondary))",
                                  color: "#ffffff",
                                  border: "none",
                                  padding: "8px 18px",
                                  borderRadius: "20px",
                                  fontWeight: 800,
                                  fontSize: "0.85rem",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  boxShadow: isReadingPage 
                                    ? "0 4px 15px rgba(239, 68, 68, 0.3)" 
                                    : "0 4px 15px rgba(16, 107, 163, 0.2)",
                                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.transform = "translateY(-1px)";
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.transform = "translateY(0)";
                                }}
                              >
                                {isReadingPage ? (
                                  <>
                                    <span style={{ display: "inline-block", animation: "waveMotion 1s infinite" }}>🛑</span>
                                    <span>{language === "ar" ? "إيقاف القراءة" : "Stop Reading"}</span>
                                  </>
                                ) : (
                                  <>
                                    <span>🔊</span>
                                    <span>{language === "ar" ? "قراءة الصفحة" : "Read Page"}</span>
                                  </>
                                )}
                              </button>

                              {isReadingPage && (
                                <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                                  <div style={{ width: "3px", height: "12px", background: "var(--primary)", borderRadius: "10px", animation: "waveMotion 0.8s infinite 0.1s" }}></div>
                                  <div style={{ width: "3px", height: "18px", background: "var(--primary)", borderRadius: "10px", animation: "waveMotion 0.8s infinite 0.2s" }}></div>
                                  <div style={{ width: "3px", height: "14px", background: "var(--primary)", borderRadius: "10px", animation: "waveMotion 0.8s infinite 0.3s" }}></div>
                                  <div style={{ width: "3px", height: "8px", background: "var(--primary)", borderRadius: "10px", animation: "waveMotion 0.8s infinite 0.4s" }}></div>
                                </div>
                              )}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6a7c88" }}>
                                  🎙️ {language === "ar" ? "المتحدث:" : "Speaker:"}
                                </span>
                                <select
                                  value={selectedVoice}
                                  onChange={(e) => handleVoiceChange(e.target.value)}
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: "10px",
                                    border: "1px solid rgba(16, 107, 163, 0.15)",
                                    background: "#ffffff",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    color: "var(--foreground)",
                                    cursor: "pointer",
                                    outline: "none",
                                    boxShadow: "0 2px 6px rgba(0,0,0,0.02)"
                                  }}
                                >
                                  {["Aoede", "Puck", "Charon", "Kore", "Fenrir"].map((voiceName) => (
                                    <option key={voiceName} value={voiceName}>
                                      {voiceName} ({voiceName === "Aoede" ? "Premium Female" : voiceName === "Fenrir" ? "Deep Bass" : "Advanced"})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <label style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: "#4a5d68",
                                cursor: "pointer",
                                userSelect: "none"
                              }}>
                                <input
                                  type="checkbox"
                                  checked={isContinuousListening}
                                  onChange={(e) => setIsContinuousListening(e.target.checked)}
                                  style={{
                                    width: "14px",
                                    height: "14px",
                                    accentColor: "var(--primary)",
                                    cursor: "pointer"
                                  }}
                                />
                                <span>🔁 {language === "ar" ? "قراءة تلقائية مستمرة" : "Auto Continuous Play"}</span>
                              </label>
                            </div>
                          </div>

                          <article 
                            dir={actualIsAr ? "rtl" : "ltr"}
                            style={{ 
                              lineHeight: "1.8", 
                              color: "var(--foreground)", 
                              fontFamily: actualIsAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-sans)",
                              textAlign: actualIsAr ? "right" : "left",
                            }}
                          >
                            <h3 style={{ 
                              fontSize: "1.4rem", 
                              fontWeight: 800, 
                              color: "var(--primary)", 
                              borderBottom: "2px solid rgba(16, 107, 163, 0.12)", 
                              paddingBottom: "0.75rem", 
                              marginBottom: "1.5rem",
                              fontFamily: actualIsAr ? "Cairo, var(--font-sans), sans-serif" : "var(--font-display)",
                              textAlign: actualIsAr ? "right" : "left",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.6rem"
                            }}>
                            <span style={{ fontSize: "1.3rem" }}>📖</span>
                            <span style={{ flex: 1 }}>
                              {activeTitle || (translationLanguage === "ar" ? `صفحة ${readerCurrentPage}` : `Page ${readerCurrentPage}`)}
                            </span>
                          </h3>

                          <div style={{ fontSize: "1.05rem", marginBottom: "2rem" }}>
                            {activePage.blocks && Array.isArray(activePage.blocks) && activePage.blocks.length > 0 ? (
                              renderBlocks(activePage.blocks, translationLanguage, activePage.i18n)
                            ) : (
                              renderLegacyPageContent(activeContent, isAr)
                            )}
                          </div>

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
                      </>
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
              chapters: b.chapters || [],
              language: b.language || "en",
              coverUrl: b.coverUrl,
              coverThumbUrl: b.coverThumbUrl || b.cover_thumb_url,
              mindMap: b.mindMap || b.mind_map
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
              chapters: b.chapters || [],
              language: b.language || "en",
              coverUrl: b.coverUrl,
              coverThumbUrl: b.coverThumbUrl || b.cover_thumb_url,
              mindMap: b.mindMap || b.mind_map
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
              chapters: b.chapters || [],
              language: b.language || "en",
              coverUrl: b.coverUrl,
              coverThumbUrl: b.coverThumbUrl || b.cover_thumb_url,
              mindMap: b.mindMap || b.mind_map
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

                        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                          {(item.coverThumbUrl || item.coverUrl) && (
                            <img 
                              src={item.coverThumbUrl || item.coverUrl} 
                              alt="book thumbnail" 
                              style={{ 
                                width: "64px", 
                                height: "96px", 
                                borderRadius: "10px", 
                                objectFit: "cover", 
                                boxShadow: "0 4px 15px rgba(0,0,0,0.12)",
                                border: "1px solid rgba(16, 107, 163, 0.08)",
                                flexShrink: 0
                              }} 
                            />
                          )}
                          <div style={{ flex: 1 }}>
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
                        </div>
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
