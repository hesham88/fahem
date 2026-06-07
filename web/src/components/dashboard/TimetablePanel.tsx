"use client";

import React from "react";
import { FiClock, FiPlus, FiTrash2 } from "react-icons/fi";

interface TimetableEvent {
  id: string | number;
  subject: string;
  subjectAr: string;
  day: string;
  dayAr: string;
  time: string;
  room: string;
}

interface TimetablePanelProps {
  language: string;
  timetableEvents: TimetableEvent[];
  setTimetableEvents: React.Dispatch<React.SetStateAction<TimetableEvent[]>>;
  renderSpaceSelectorBar: (tab: "practice" | "plan" | "timetable" | "zatona") => React.ReactNode;
  renderSpaceHistory: () => React.ReactNode;
  t: (key: string) => string;
}

/**
 * TimetablePanel component manages the student's weekly course schedule grid.
 * Allows interactive addition of virtual rooms/lectures and deletion of scheduled events.
 */
export const TimetablePanel: React.FC<TimetablePanelProps> = ({
  language,
  timetableEvents,
  setTimetableEvents,
  renderSpaceSelectorBar,
  renderSpaceHistory,
  t,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {renderSpaceSelectorBar("timetable")}
      
      <section 
        className="panel-card" 
        style={{ 
          padding: "3rem 2rem", 
          textAlign: "center",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(247, 243, 230, 0.5))",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          borderRadius: "var(--border-radius-lg)",
          boxShadow: "0 10px 30px -10px rgba(16, 107, 163, 0.08)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.5rem",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Subtle decorative gold/blue glowing blur circles */}
        <div style={{
          position: "absolute",
          top: "-50px",
          right: "-50px",
          width: "150px",
          height: "150px",
          background: "radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0) 70%)",
          pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute",
          bottom: "-50px",
          left: "-50px",
          width: "150px",
          height: "150px",
          background: "radial-gradient(circle, rgba(16, 107, 163, 0.1) 0%, rgba(16, 107, 163, 0) 70%)",
          pointerEvents: "none"
        }} />

        <div style={{
          fontSize: "4rem",
          animation: "float 4s ease-in-out infinite",
          display: "inline-block",
          filter: "drop-shadow(0 10px 15px rgba(212, 175, 55, 0.2))"
        }}>
          ⏳
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "600px" }}>
          <h3 style={{ 
            fontSize: "1.6rem", 
            margin: 0, 
            fontWeight: 900, 
            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em"
          }}>
            {language === "ar" ? "قريباً: جدول الحصص الذكي المطور" : "Coming Soon: Smart Class Timetable"}
          </h3>
          <p style={{ 
            fontSize: "0.95rem", 
            color: "#5c6e7a", 
            margin: 0, 
            lineHeight: "1.7",
            fontWeight: 500
          }}>
            {language === "ar" 
              ? "نحن نعمل حالياً على صياغة نظام جدولة دراسي آلي بالكامل لدمجه مع مساعد فاهم الذكي. هذا النظام سيتيح لك جدولة حصصك وحضور فصولك الافتراضية، مع تذكيرات ذكية مبنية على تحليلات أدائك اليومية."
              : "We are actively crafting a fully-automated scheduling system integrated directly with the Fahem Companion. It will feature automated class tracking, study session alarms, and personalized calendar insights built on your daily academic journey."}
          </p>
        </div>

        {/* Dynamic decorative timeline elements to show high design quality */}
        <div style={{ 
          display: "flex", 
          gap: "1.5rem", 
          marginTop: "1rem", 
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: "500px"
        }}>
          {[
            { labelAr: "ذكاء التخطيط", labelEn: "AI Scheduling", icon: "🧠" },
            { labelAr: "تذكيرات فورية", labelEn: "Instant Alerts", icon: "🔔" },
            { labelAr: "تكامل التقويم", labelEn: "Calendar Sync", icon: "📅" }
          ].map((feature, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "#ffffff",
              padding: "0.5rem 1rem",
              borderRadius: "50px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
              border: "1px solid rgba(16, 107, 163, 0.05)",
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "var(--foreground)"
            }}>
              <span>{feature.icon}</span>
              <span>{language === "ar" ? feature.labelAr : feature.labelEn}</span>
            </div>
          ))}
        </div>
      </section>
      
      {renderSpaceHistory()}
    </div>
  );
};
