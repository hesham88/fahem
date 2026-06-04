"use client";

import React from "react";
import { FiRefreshCw } from "react-icons/fi";

/**
 * Props for the ZatonaPanel component.
 */
interface ZatonaPanelProps {
  language: "ar" | "en";
  zatonaPrompt: string;
  setZatonaPrompt: (val: string) => void;
  zatonaResult: string;
  setZatonaResult: (val: string) => void;
  zatonaLoading: boolean;
  setZatonaLoading: (val: boolean) => void;
  renderSpaceSelectorBar: (tab: "practice" | "plan" | "timetable" | "zatona") => React.ReactNode;
  renderSpaceHistory: () => React.ReactNode;
  renderPremiumContent: (text: string) => React.ReactNode;
}

/**
 * ZatonaPanel: A component representing the "Zatona AI Summary & Research Hub".
 * This is an AI summary engine that processes custom textbook excerpts or topics,
 * and extracts concise, high-yield digests with custom spatial support.
 */
export const ZatonaPanel: React.FC<ZatonaPanelProps> = ({
  language,
  zatonaPrompt,
  setZatonaPrompt,
  zatonaResult,
  setZatonaResult,
  zatonaLoading,
  setZatonaLoading,
  renderSpaceSelectorBar,
  renderSpaceHistory,
  renderPremiumContent,
}) => {
  
  /**
   * Triggers the server endpoint to digest and summarize the user-provided textbook topic.
   */
  const handleDigestEssence = async () => {
    if (!zatonaPrompt.trim() || zatonaLoading) return;

    setZatonaLoading(true);
    setZatonaResult("");

    try {
      const res = await fetch("/api/zatona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: zatonaPrompt, language }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.report) {
          setZatonaResult(data.report);
        } else {
          setZatonaResult(
            language === "ar" ? "⚠️ حدث خطأ أثناء عصر الزتونة." : "⚠️ Error digesting textbook essence."
          );
        }
      } else {
        setZatonaResult(
          language === "ar" ? "⚠️ فشل الاتصال بالخادم الذكي." : "⚠️ Server connection failed."
        );
      }
    } catch (err) {
      console.error("Zatona digest error:", err);
      setZatonaResult(
        language === "ar" ? "⚠️ خطأ غير متوقع." : "⚠️ Unexpected error occurred."
      );
    } finally {
      setZatonaLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Space Bar Swapper */}
      {renderSpaceSelectorBar("zatona")}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }} className="grid-cols-1">
        
        {/* Left Side: Summary prompt generator */}
        <div
          className="panel-card"
          style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <h3
            style={{
              fontSize: "1.1rem",
              margin: 0,
              fontWeight: 800,
              borderBottom: "1px dashed rgba(235, 220, 185, 0.4)",
              paddingBottom: "0.5rem",
            }}
          >
            {language === "ar" ? "الزتونة: مركز التلخيص واستخراج الجوهر" : "Zatona: High-Yield AI Summary Engine"}
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#4f6371", margin: 0, lineHeight: "1.6" }}>
            {language === "ar"
              ? "اكتب فكرة رئيسية أو الصق مقتطفاً من كتابك المدرسي، وسيقوم عميل فاهم الذكي بتحليله وإيجاز تفاصيله في تلخيص فائق التركيز يحتوي فقط على الفكرة والجوهر الدراسي المفيد."
              : "Type a topic or paste a textbook section. Our AI will digest, extract, and present a warm, concise report containing only the pure essence and academic value."}
          </p>
          <textarea
            value={zatonaPrompt}
            onChange={(e) => setZatonaPrompt(e.target.value)}
            placeholder={
              language === "ar"
                ? "الصق النص هنا أو اكتب الفكرة (مثال: قوانين الحركة لنيوتن)..."
                : "Paste textbook text or type study topic (e.g., Newton's laws of motion)..."
            }
            style={{
              width: "100%",
              height: "120px",
              padding: "0.75rem",
              borderRadius: "var(--border-radius-sm)",
              border: "1px solid var(--card-border)",
              outline: "none",
              fontSize: "0.85rem",
              fontFamily: "var(--font-sans)",
              resize: "none",
            }}
          />
          <button
            disabled={zatonaLoading || !zatonaPrompt.trim()}
            onClick={handleDigestEssence}
            className="btn btn-primary"
            style={{ padding: "10px", fontWeight: 700 }}
          >
            {zatonaLoading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <FiRefreshCw className="spinning-icon" />
                <span>{language === "ar" ? "جاري عصر واستخراج الزتونة..." : "Digesting textbook essence..."}</span>
              </span>
            ) : (
              <span>✨ {language === "ar" ? "عصر واستخراج الزتونة الذكية" : "Digest Textbook Essence"}</span>
            )}
          </button>
        </div>

        {/* Right Side: Report Viewer */}
        <div
          className="panel-card"
          style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800 }}>
            {language === "ar" ? "تقرير التلخيص المستخرج" : "Zatona AI Presentation"}
          </h3>
          <div
            style={{
              flex: 1,
              padding: "1rem",
              borderRadius: "6px",
              border: "1px dashed var(--primary)",
              background: "#ffffff",
              overflowY: "auto",
              minHeight: "150px",
            }}
            className="custom-scrollbar"
          >
            {zatonaResult ? (
              <div style={{ fontSize: "0.85rem", lineHeight: "1.6", fontFamily: "var(--font-sans)" }}>
                {renderPremiumContent(zatonaResult)}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  color: "#6a7c88",
                  fontSize: "0.85rem",
                  gap: "0.5rem",
                }}
              >
                <span>🍋</span>
                <span>
                  {language === "ar"
                    ? "اكتب مادة دراسية على اليسار واضغط على زر عصر الزتونة"
                    : "Enter topic details on the left to extract the pure essence"}
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Workspace Activity logs */}
      {renderSpaceHistory()}
    </div>
  );
};
