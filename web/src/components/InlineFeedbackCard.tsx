"use client";

import React, { useState, useEffect } from "react";
import { logInfo, logError } from "@/lib/logger";

interface InlineFeedbackCardProps {
  language: string;
  dir: string;
}

const InlineFeedbackCard: React.FC<InlineFeedbackCardProps> = ({ language, dir }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState("Complaint");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

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
      other: "Other"
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
      other: "أخرى"
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
      other: "Otro"
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
      other: "Autre"
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
      other: "Andere"
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
      other: "其他"
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
      other: "Altro"
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

    setLoading(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, feedback, category })
      });
      if (response.ok) {
        setSubmitted(true);
        logInfo("Feedback card submitted successfully", {
          category,
          feedbackLength: feedback.length,
          hasEmail: !!email,
          hasName: !!name
        });
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

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", minWidth: "280px" }}>
      <div style={{ fontWeight: 600, color: "var(--primary)", fontSize: "0.95rem", marginBottom: "0.25rem", borderBottom: "1px dashed rgba(16, 107, 163, 0.15)", paddingBottom: "0.25rem" }}>
        📝 {currentLabels.title}
      </div>
      
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
