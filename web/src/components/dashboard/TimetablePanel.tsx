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
      
      <section className="panel-card" style={{ padding: "2rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px dashed rgba(235, 220, 185, 0.4)",
            paddingBottom: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <h3 style={{ fontSize: "1.2rem", margin: 0, fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FiClock style={{ color: "var(--primary)" }} />
            <span>{language === "ar" ? "جدول الحصص الأسبوعي الحاضر" : "Weekly Class Schedule Planner"}</span>
          </h3>
          <button
            onClick={() => {
              const newSub = window.prompt(language === "ar" ? "اسم الحصة والمادة:" : "Class subject:");
              const newDay = window.prompt(language === "ar" ? "اليوم (مثال: Monday):" : "Day of week (e.g., Monday):");
              const newTime = window.prompt(language === "ar" ? "الوقت (مثال: 09:00 - 10:30):" : "Time range (e.g., 09:00 - 10:30):");
              if (newSub && newDay && newTime) {
                setTimetableEvents((prev) => [
                  ...prev,
                  { id: Date.now(), subject: newSub, subjectAr: newSub, day: newDay, dayAr: newDay, time: newTime, room: "Virtual Room" },
                ]);
              }
            }}
            className="btn btn-primary"
            style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
          >
            <FiPlus />
            <span>{language === "ar" ? "إضافة حصة" : "Add Class"}</span>
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {timetableEvents.map((evt) => (
            <div
              key={evt.id}
              style={{
                padding: "1rem",
                border: "1px solid var(--card-border)",
                borderRadius: "var(--border-radius-md)",
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--primary)", background: "rgba(16, 107, 163, 0.06)", padding: "2px 8px", borderRadius: "10px" }}>
                  {language === "ar" ? evt.dayAr : evt.day}
                </span>
                <button
                  onClick={() => {
                    setTimetableEvents((prev) => prev.filter((e) => e.id !== evt.id));
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#d32f2f", fontSize: "0.8rem" }}
                  title={language === "ar" ? "حذف الحصة" : "Delete class"}
                >
                  <FiTrash2 />
                </button>
              </div>
              <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                📚 {language === "ar" ? evt.subjectAr : evt.subject}
              </h4>
              <p style={{ fontSize: "0.8rem", color: "#6a7c88", margin: 0 }}>⏱️ {evt.time} | 🏫 {evt.room}</p>
            </div>
          ))}
        </div>
      </section>
      
      {renderSpaceHistory()}
    </div>
  );
};
