"use client";

import React, { useState, useEffect } from "react";
import { logInfo, logError } from "@/lib/logger";
import { authedFetch } from "@/lib/authedFetch";

interface InlineFeedbackCardProps {
  language: string;
  dir: string;
  defaultName?: string;
  defaultEmail?: string;
  userId?: string;
}

const InlineFeedbackCard: React.FC<InlineFeedbackCardProps> = ({
  language,
  dir,
  defaultName = "",
  defaultEmail = "",
  userId = ""
}) => {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState("Complaint");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Sync default values when they load
  useEffect(() => {
    if (defaultName) setName(defaultName);
    if (defaultEmail) setEmail(defaultEmail);
  }, [defaultName, defaultEmail]);

  // Check rate limiting on mount or userId change
  useEffect(() => {
    const key = `fahem_feedback_timestamps_${userId || "anonymous"}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: number[] = JSON.parse(raw);
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recent = parsed.filter((t) => t > oneDayAgo);
        localStorage.setItem(key, JSON.stringify(recent));
        if (recent.length >= 3) {
          setIsRateLimited(true);
        }
      }
    } catch (e) {
      console.warn("localStorage rate limiting check failed:", e);
    }
  }, [userId]);

  // Labels based on language
  const labels: Record<string, Record<string, string>> = {
    en: {
      title: "Submit Feedback / Report a Problem",
      name: "Your Name",
      email: "Your Email",
      feedback: "Describe the issue or feedback",
      category: "Category",
      submit: "Submit Complaint",
      thanks: "Thank you for your feedback! It has been securely logged.",
      complaint: "Complaint/Issue",
      suggestion: "Suggestion",
      question: "Question",
      other: "Other",
      limit_reached: "You have reached the daily limit of 3 reports. Please try again tomorrow."
    },
    ar: {
      title: "تقديم شكوى / الإبلاغ عن مشكلة",
      name: "اسمك الكريم",
      email: "بريدك الإلكتروني",
      feedback: "تفاصيل المشكلة أو الملاحظات",
      category: "الفئة",
      submit: "إرسال الشكوى",
      thanks: "شكراً لملاحظاتك! تم تسجيل الشكوى بأمان في خوادمنا.",
      complaint: "شكوى / مشكلة",
      suggestion: "اقتراح",
      question: "استفسار",
      other: "أخرى",
      limit_reached: "لقد وصلت إلى الحد الأقصى اليومي (3 شكاوى). يرجى المحاولة مرة أخرى غداً."
    },
    es: {
      title: "Enviar comentarios / Reportar un problema",
      name: "Su nombre",
      email: "Su correo electrónico",
      feedback: "Describa el problema o comentario",
      category: "Categoría",
      submit: "Enviar queja",
      thanks: "¡Gracias por sus comentarios! Se han registrado de forma segura.",
      complaint: "Queja / Problema",
      suggestion: "Sugerencia",
      question: "Pregunta",
      other: "Otro",
      limit_reached: "Ha alcanzado el límite diario de 3 informes. Inténtelo de nuevo mañana."
    },
    fr: {
      title: "Soumettre des commentaires / Signaler un problème",
      name: "Votre nom",
      email: "Votre adresse e-mail",
      feedback: "Décrivez le problème ou le commentaire",
      category: "Catégorie",
      submit: "Soumettre la plainte",
      thanks: "Merci pour vos commentaires ! Ils ont été enregistrés en toute sécurité.",
      complaint: "Plainte / Problème",
      suggestion: "Suggestion",
      question: "Question",
      other: "Autre",
      limit_reached: "Vous avez atteint la limite quotidienne de 3 signalements. Veuillez réessayer demain."
    },
    de: {
      title: "Feedback senden / Problem melden",
      name: "Ihr Name",
      email: "Ihre E-Mail-Adresse",
      feedback: "Beschreiben Sie das Problem oder Feedback",
      category: "Kategorie",
      submit: "Beschwerde einreichen",
      thanks: "Vielen Dank für Ihr Feedback! Es wurde sicher protokolliert.",
      complaint: "Beschwerde / Problem",
      suggestion: "Vorschlag",
      question: "Frage",
      other: "Andere",
      limit_reached: "Sie haben das tägliche Limit von 3 Meldungen erreicht. Bitte versuchen Sie es morgen erneut."
    },
    zh: {
      title: "提交反馈 / 报告问题",
      name: "您的姓名",
      email: "您的电子邮件",
      feedback: "描述问题或反馈",
      category: "类别",
      submit: "提交投诉",
      thanks: "感谢您的反馈！它已被安全记录。",
      complaint: "投诉 / 问题",
      suggestion: "建议",
      question: "问题",
      other: "其他",
      limit_reached: "您已达到每天最多3次报告的限制。请明天再试。"
    },
    it: {
      title: "Invia feedback / Segnala un problema",
      name: "Il tuo nome",
      email: "La tua email",
      feedback: "Descrivi il problema o il feedback",
      category: "Categoria",
      submit: "Invia reclamo",
      thanks: "Grazie per il tuo feedback! È stato registrato in modo sicuro.",
      complaint: "Reclamo / Problema",
      suggestion: "Suggerimento",
      question: "Domanda",
      other: "Altro",
      limit_reached: "Hai raggiunto il limite giornaliero di 3 segnalazioni. Riprova domani."
    }
  };

  const currentLabels = labels[language] || labels["en"];

  // Track component mounting
  useEffect(() => {
    logInfo("Feedback card mounted", { language, dir });
  }, [language, dir]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    // Double check rate limiting upon submit
    const key = `fahem_feedback_timestamps_${userId || "anonymous"}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: number[] = JSON.parse(raw);
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recent = parsed.filter((t) => t > oneDayAgo);
        if (recent.length >= 3) {
          setIsRateLimited(true);
          return;
        }
      }
    } catch (e) {
      console.warn(e);
    }

    setLoading(true);
    try {
      const response = await authedFetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, feedback, category, source: "chat" })
      });
      if (response.ok) {
        setSubmitted(true);
        logInfo("Feedback card submitted successfully", {
          category,
          feedbackLength: feedback.length,
          hasEmail: !!email,
          hasName: !!name
        });

        // Store timestamp for rate limiting
        try {
          const raw = localStorage.getItem(key);
          const parsed: number[] = raw ? JSON.parse(raw) : [];
          parsed.push(Date.now());
          localStorage.setItem(key, JSON.stringify(parsed));
        } catch (e) {
          console.warn("Failed to write rate limiting timestamp:", e);
        }
      } else {
        const errorText = await response.text();
        throw new Error(errorText || `Status ${response.status}`);
      }
    } catch (err) {
      console.error("Feedback submit failed:", err);
      logError("Feedback card submit error", {
        error: err instanceof Error ? err.message : String(err),
        category
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ color: "#2e7d32", fontWeight: 500, padding: "0.5rem" }}>
        🎉 {currentLabels.thanks}
      </div>
    );
  }

  if (isRateLimited) {
    return (
      <div style={{ 
        padding: "1rem", 
        backgroundColor: "rgba(239, 83, 80, 0.1)", 
        border: "1px solid rgba(239, 83, 80, 0.3)", 
        borderRadius: "12px",
        color: "#c62828",
        fontSize: "0.85rem",
        fontWeight: 500,
        lineHeight: "1.4",
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
        width: "100%",
        minWidth: "280px",
        boxSizing: "border-box"
      }}>
        <div style={{ fontWeight: 600, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          🛑 {language === "ar" ? "تنبيه الحد الأقصى" : "Rate Limit Warning"}
        </div>
        <div>
          {currentLabels.limit_reached || labels["en"].limit_reached}
        </div>
      </div>
    );
  }

  const showNameEmailInputs = !defaultName || !defaultEmail;

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", minWidth: "280px" }}>
      <div style={{ fontWeight: 600, color: "var(--primary)", fontSize: "0.95rem", marginBottom: "0.25rem", borderBottom: "1px dashed rgba(16, 107, 163, 0.15)", paddingBottom: "0.25rem" }}>
        📝 {currentLabels.title}
      </div>
      
      {showNameEmailInputs && (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            placeholder={currentLabels.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              flex: 1,
              padding: "0.4rem 0.6rem",
              border: "1px solid var(--card-border)",
              borderRadius: "8px",
              fontSize: "0.8rem",
              outline: "none"
            }}
          />
          <input
            type="email"
            placeholder={currentLabels.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              flex: 1,
              padding: "0.4rem 0.6rem",
              border: "1px solid var(--card-border)",
              borderRadius: "8px",
              fontSize: "0.8rem",
              outline: "none"
            }}
          />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <label style={{ fontSize: "0.75rem", fontWeight: 500, color: "#6a7c88" }}>{currentLabels.category}</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: "0.4rem 0.6rem",
            border: "1px solid var(--card-border)",
            borderRadius: "8px",
            fontSize: "0.8rem",
            backgroundColor: "#ffffff",
            outline: "none"
          }}
        >
          <option value="Complaint">{currentLabels.complaint}</option>
          <option value="Suggestion">{currentLabels.suggestion}</option>
          <option value="Question">{currentLabels.question}</option>
          <option value="Other">{currentLabels.other}</option>
        </select>
      </div>

      <textarea
        placeholder={currentLabels.feedback}
        required
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={3}
        style={{
          padding: "0.5rem 0.6rem",
          border: "1px solid var(--card-border)",
          borderRadius: "8px",
          fontSize: "0.8rem",
          outline: "none",
          resize: "none",
          width: "100%",
          boxSizing: "border-box"
        }}
      />

      <button
        type="submit"
        disabled={loading || !feedback.trim()}
        style={{
          padding: "0.5rem",
          backgroundColor: "var(--primary)",
          color: "#ffffff",
          border: "none",
          borderRadius: "8px",
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: 600,
          fontSize: "0.8rem",
          transition: "background-color 0.2s"
        }}
      >
        {loading ? "..." : currentLabels.submit}
      </button>
    </form>
  );
};

export default React.memo(InlineFeedbackCard);
