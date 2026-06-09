"use client";

import React, { useState } from "react";
import { useTranslation } from "../../../context/LanguageContext";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiMail, FiMessageSquare, FiUser, FiInfo, FiSend, FiCheckCircle } from "react-icons/fi";
import DonationCard from "../../../components/DonationCard";

export default function ContactPage() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const isAr = language === "ar";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSubmitted(true);
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
  };

  return (
    <div className="glass-container" dir={isAr ? "rtl" : "ltr"}>
      {/* Background ambient light */}
      <div className="ambient-background">
        <div className="sphere sphere-1"></div>
        <div className="sphere sphere-2"></div>
        <div className="sphere sphere-3"></div>
      </div>

      {/* Glassmorphic Navbar */}
      <nav className="glass-nav">
        <div className="glass-nav-logo" onClick={() => router.push(`/${language}`)}>
          <span>🧠</span> {t("dashboard_title")}
        </div>
        <button className="btn btn-secondary" onClick={() => router.push(`/${language}`)}>
          <FiArrowLeft style={{ fontSize: "1.2rem", transform: isAr ? "rotate(180deg)" : "none" }} />
          <span>{isAr ? "العودة" : "Back"}</span>
        </button>
      </nav>

      {/* Main Container */}
      <main className="glass-hero-section" style={{ padding: "4rem 1.5rem" }}>
        <div className="glass-card" style={{ maxWidth: "800px", width: "100%", margin: "0 auto", textAlign: "start" }}>
          
          <div className="glass-card-icon" style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))" }}>
            <FiMail style={{ fontSize: "2rem", color: "#ffffff" }} />
          </div>

          <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem", fontFamily: "var(--font-display)" }}>
            {isAr ? "اتصل بنا" : "Contact Us"}
          </h1>
          <p style={{ color: "#6a7c88", fontSize: "1.1rem", marginBottom: "2rem" }}>
            {isAr 
              ? "لديك استفسار، اقتراح أو رغبة في التعاون؟ نحن هنا للاستماع إليك ومساعدتك في أي وقت." 
              : "Have a question, feedback, or custom feature suggestion? Drop us a line below."}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {submitted ? (
              <div 
                style={{ 
                  background: "rgba(16, 185, 129, 0.1)", 
                  border: "1px solid rgba(16, 185, 129, 0.3)", 
                  borderRadius: "16px", 
                  padding: "2rem", 
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "1rem",
                  margin: "1rem 0"
                }}
              >
                <FiCheckCircle style={{ width: "3rem", height: "3rem", color: "#10b981" }} />
                <h3 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                  {isAr ? "تم إرسال رسالتك بنجاح!" : "Message Sent Successfully!"}
                </h3>
                <p style={{ fontSize: "0.95rem", color: "var(--foreground-muted, #94a3b8)", margin: 0 }}>
                  {isAr 
                    ? "شكرًا لتواصلك معنا. سنقوم بمراجعة رسالتك والرد عليك في أقرب وقت ممكن." 
                    : "Thank you for reaching out. We will review your inquiry and get back to you shortly."}
                </p>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSubmitted(false)}
                  style={{ marginTop: "1rem" }}
                >
                  {isAr ? "إرسال رسالة أخرى" : "Send Another Message"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                
                {/* Name */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label htmlFor="contact-name" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)" }}>
                    {isAr ? "الاسم الكامل" : "Your Name"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <FiUser style={{ position: "absolute", top: "50%", left: isAr ? "auto" : "12px", right: isAr ? "12px" : "auto", transform: "translateY(-50%)", color: "#64748b" }} />
                    <input
                      id="contact-name"
                      type="text"
                      required
                      placeholder={isAr ? "أدخل اسمك الكريم" : "John Doe"}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: isAr ? "0.75rem 2.5rem 0.75rem 1rem" : "0.75rem 1rem 0.75rem 2.5rem",
                        borderRadius: "12px",
                        border: "1px solid var(--card-border, rgba(255,255,255,0.1))",
                        background: "var(--card-bg, rgba(30,41,59,0.3))",
                        color: "var(--foreground)",
                        outline: "none",
                        fontSize: "0.95rem"
                      }}
                    />
                  </div>
                </div>

                {/* Email */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label htmlFor="contact-email" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)" }}>
                    {isAr ? "البريد الإلكتروني" : "Email Address"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <FiMail style={{ position: "absolute", top: "50%", left: isAr ? "auto" : "12px", right: isAr ? "12px" : "auto", transform: "translateY(-50%)", color: "#64748b" }} />
                    <input
                      id="contact-email"
                      type="email"
                      required
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: "100%",
                        padding: isAr ? "0.75rem 2.5rem 0.75rem 1rem" : "0.75rem 1rem 0.75rem 2.5rem",
                        borderRadius: "12px",
                        border: "1px solid var(--card-border, rgba(255,255,255,0.1))",
                        background: "var(--card-bg, rgba(30,41,59,0.3))",
                        color: "var(--foreground)",
                        outline: "none",
                        fontSize: "0.95rem"
                      }}
                    />
                  </div>
                </div>

                {/* Subject */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label htmlFor="contact-subject" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)" }}>
                    {isAr ? "الموضوع" : "Subject"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <FiInfo style={{ position: "absolute", top: "50%", left: isAr ? "auto" : "12px", right: isAr ? "12px" : "auto", transform: "translateY(-50%)", color: "#64748b" }} />
                    <input
                      id="contact-subject"
                      type="text"
                      placeholder={isAr ? "ما هو موضوع رسالتك؟" : "Partnership opportunity, issue report..."}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      style={{
                        width: "100%",
                        padding: isAr ? "0.75rem 2.5rem 0.75rem 1rem" : "0.75rem 1rem 0.75rem 2.5rem",
                        borderRadius: "12px",
                        border: "1px solid var(--card-border, rgba(255,255,255,0.1))",
                        background: "var(--card-bg, rgba(30,41,59,0.3))",
                        color: "var(--foreground)",
                        outline: "none",
                        fontSize: "0.95rem"
                      }}
                    />
                  </div>
                </div>

                {/* Message */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label htmlFor="contact-message" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--foreground)" }}>
                    {isAr ? "الرسالة" : "Your Message"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <FiMessageSquare style={{ position: "absolute", top: "15px", left: isAr ? "auto" : "12px", right: isAr ? "12px" : "auto", color: "#64748b" }} />
                    <textarea
                      id="contact-message"
                      required
                      rows={5}
                      placeholder={isAr ? "اكتب استفسارك بالتفصيل هنا..." : "Type your message details here..."}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      style={{
                        width: "100%",
                        padding: isAr ? "0.75rem 2.5rem 0.75rem 1rem" : "0.75rem 1rem 0.75rem 2.5rem",
                        borderRadius: "12px",
                        border: "1px solid var(--card-border, rgba(255,255,255,0.1))",
                        background: "var(--card-bg, rgba(30,41,59,0.3))",
                        color: "var(--foreground)",
                        outline: "none",
                        fontSize: "0.95rem",
                        resize: "vertical"
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "12px",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    marginTop: "0.5rem"
                  }}
                >
                  <span>{isAr ? "إرسال الرسالة" : "Send Message"}</span>
                  <FiSend style={{ transform: isAr ? "scaleX(-1)" : "none" }} />
                </button>
              </form>
            )}

            {/* Compact Donation Card inside the Contact page card */}
            <DonationCard variant="compact" />
          </div>
        </div>
      </main>

      <footer className="metadata-footer" style={{ zIndex: 2, paddingBottom: "2rem" }}>
        <p>{t("footer_landing")}</p>
      </footer>
    </div>
  );
}
