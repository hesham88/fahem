"use client";

import React from "react";
import { FiUsers, FiRefreshCw, FiX, FiActivity } from "react-icons/fi";

interface User {
  userId: string;
  name: string;
  username: string;
  email: string;
  role?: string;
  userType?: string;
  school?: string;
  isWhitelisted?: boolean;
  banned?: boolean;
  avatar?: string;
  country?: string;
  grade?: string;
}

interface UserAccountsPanelProps {
  language: string;
  allUsers: User[];
  adminUserSearch: string;
  setAdminUserSearch: (val: string) => void;
  fetchAllUsersList: () => void;
  handleAdminUpdateUser: (userId: string, updates: any) => void;
  inspectedUser: User | null;
  setInspectedUser: (user: User | null) => void;
  renderAvatar: (avatar: string | undefined, size: string) => React.ReactNode;
  t: (key: string) => string;
}

/**
 * UserAccountsPanel component manages the user accounts and roles for Superadmins.
 * It provides features to search users, update their roles, whitelist judges, ban accounts,
 * and view activity trails.
 */
export const UserAccountsPanel: React.FC<UserAccountsPanelProps> = ({
  language,
  allUsers,
  adminUserSearch,
  setAdminUserSearch,
  fetchAllUsersList,
  handleAdminUpdateUser,
  inspectedUser,
  setInspectedUser,
  renderAvatar,
  t,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <section className="panel-card" style={{ padding: "2rem" }}>
        {/* Panel Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px dashed rgba(235, 220, 185, 0.4)",
            paddingBottom: "1rem",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.4rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              margin: 0,
              fontWeight: 800,
            }}
          >
            <FiUsers style={{ color: "var(--primary)" }} />
            <span>
              {language === "ar"
                ? "قائمة الأعضاء وإدارة الصلاحيات"
                : "User Accounts & Role Manager"}
            </span>
          </h2>
          
          {/* Search and Refresh Section */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder={
                language === "ar"
                  ? "ابحث بالاسم أو البريد..."
                  : "Search name or email..."
              }
              value={adminUserSearch}
              onChange={(e) => setAdminUserSearch(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--border-radius-sm)",
                border: "1px solid var(--card-border)",
                fontSize: "0.85rem",
                outline: "none",
                fontFamily: "var(--font-sans)",
              }}
            />
            <button
              onClick={fetchAllUsersList}
              className="btn btn-secondary"
              style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
              title={language === "ar" ? "تحديث القائمة" : "Refresh list"}
            >
              <FiRefreshCw className="pulse-icon" />
            </button>
          </div>
        </div>

        {/* Users Accounts Table */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: language === "ar" ? "right" : "left",
              fontFamily: "var(--font-sans)",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid var(--card-border)",
                  color: "var(--primary)",
                  fontWeight: 700,
                }}
              >
                <th style={{ padding: "0.75rem 0.5rem" }}>
                  {language === "ar" ? "العضو" : "User"}
                </th>
                <th style={{ padding: "0.75rem 0.5rem" }}>
                  {language === "ar" ? "البريد الإلكتروني" : "Email"}
                </th>
                <th style={{ padding: "0.75rem 0.5rem" }}>
                  {language === "ar" ? "الدور الدراسي" : "User Role"}
                </th>
                <th style={{ padding: "0.75rem 0.5rem" }}>
                  {language === "ar" ? "المدرسة/الجامعة" : "School"}
                </th>
                <th style={{ padding: "0.75rem 0.5rem" }}>
                  {language === "ar" ? "قائمة القبول" : "Whitelist/Judge"}
                </th>
                <th style={{ padding: "0.75rem 0.5rem" }}>
                  {language === "ar" ? "الحالة" : "Status"}
                </th>
                <th style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                  {language === "ar" ? "الإجراءات" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {allUsers
                .filter((u) => {
                  const s = adminUserSearch.toLowerCase();
                  return (
                    (u.name || "").toLowerCase().includes(s) ||
                    (u.username || "").toLowerCase().includes(s) ||
                    (u.email || "").toLowerCase().includes(s)
                  );
                })
                .map((u, i) => (
                  <tr
                    key={u.userId ? `${u.userId}-${i}` : i}
                    style={{
                      borderBottom: "1px solid rgba(0,0,0,0.05)",
                      transition: "all 0.15s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(16, 107, 163, 0.02)")
                    }
                    onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      {renderAvatar(u.avatar, "1.2rem")}
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 700 }}>{u.name || "N/A"}</span>
                        <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>
                          @{u.username || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", color: "#4f6371" }}>
                      {u.email || "N/A"}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <select
                        value={u.role || u.userType || "student"}
                        onChange={(e) =>
                          handleAdminUpdateUser(u.userId, {
                            role: e.target.value,
                            userType: e.target.value,
                          })
                        }
                        style={{
                          padding: "3px 6px",
                          borderRadius: "4px",
                          border: "1px solid var(--card-border)",
                          fontSize: "0.8rem",
                          background: "#ffffff",
                        }}
                      >
                        <option value="student">
                          {language === "ar" ? "طالب" : "Student"}
                        </option>
                        <option value="teacher">
                          {language === "ar" ? "معلم" : "Teacher"}
                        </option>
                        <option value="parent">
                          {language === "ar" ? "ولي أمر" : "Parent"}
                        </option>
                        <option value="admin">
                          {language === "ar" ? "مشرف" : "Admin"}
                        </option>
                      </select>
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        fontSize: "0.8rem",
                        color: "#4f6371",
                        maxWidth: "150px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={u.school}
                    >
                      {u.school || "N/A"}
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <button
                        onClick={() =>
                          handleAdminUpdateUser(u.userId, {
                            isWhitelisted: !u.isWhitelisted,
                          })
                        }
                        style={{
                          padding: "4px 8px",
                          borderRadius: "10px",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: u.isWhitelisted
                            ? "rgba(212, 175, 55, 0.15)"
                            : "rgba(16, 107, 163, 0.08)",
                          color: u.isWhitelisted ? "var(--secondary)" : "#4f6371",
                          border: u.isWhitelisted
                            ? "1px solid rgba(212, 175, 55, 0.3)"
                            : "1px solid transparent",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          transition: "all 0.2s",
                        }}
                      >
                        {u.isWhitelisted ? (
                          <>
                            ⭐{" "}
                            {language === "ar" ? "معتمد (حكم)" : "Whitelisted Judge"}
                          </>
                        ) : (
                          <>
                            ⚪ {language === "ar" ? "عادي" : "Standard User"}
                          </>
                        )}
                      </button>
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      {u.banned ? (
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "10px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            background: "rgba(211, 47, 47, 0.12)",
                            color: "#d32f2f",
                          }}
                        >
                          {language === "ar" ? "محظور 🛑" : "Banned 🛑"}
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "10px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            background: "rgba(46, 125, 50, 0.12)",
                            color: "#2e7d32",
                          }}
                        >
                          {language === "ar" ? "نشط ✅" : "Active ✅"}
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "0.75rem 0.5rem",
                        display: "flex",
                        gap: "0.35rem",
                        justifyContent: "center",
                      }}
                    >
                      <button
                        onClick={() =>
                          handleAdminUpdateUser(u.userId, { banned: !u.banned })
                        }
                        style={{
                          padding: "4px 8px",
                          borderRadius: "var(--border-radius-sm)",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          transition: "all 0.2s",
                          background: u.banned
                            ? "rgba(46, 125, 50, 0.1)"
                            : "rgba(211, 47, 47, 0.1)",
                          color: u.banned ? "#2e7d32" : "#d32f2f",
                        }}
                      >
                        {u.banned
                          ? language === "ar"
                            ? "تنشيط الحساب"
                            : "Activate"
                          : language === "ar"
                          ? "حظر العضو"
                          : "Ban Account"}
                      </button>
                      <button
                        onClick={() => setInspectedUser(u)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "var(--border-radius-sm)",
                          border: "1px solid rgba(16,107,163,0.2)",
                          background: "none",
                          color: "var(--primary)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {language === "ar" ? "تتبع الأنشطة" : "Trail"}
                      </button>
                    </td>
                  </tr>
                ))}
              {allUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: "center", padding: "2rem", color: "#6a7c88" }}
                  >
                    {language === "ar"
                      ? "لا يوجد أعضاء مسجلين حالياً."
                      : "No registered members found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Inspection Overlay Modal for Activity Trail */}
      {inspectedUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "1.5rem",
          }}
        >
          <div
            className="panel-card"
            style={{
              width: "100%",
              maxWidth: "600px",
              padding: "1.5rem",
              position: "relative",
              background: "#fbf8f0",
              border: "1px solid var(--primary)",
            }}
          >
            <button
              onClick={() => setInspectedUser(null)}
              style={{
                position: "absolute",
                top: "1rem",
                left: language === "ar" ? "1rem" : "auto",
                right: language === "ar" ? "auto" : "1rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1.2rem",
                color: "var(--primary)",
              }}
            >
              <FiX />
            </button>
            <h3
              style={{
                fontSize: "1.2rem",
                borderBottom: "1px dashed rgba(235, 220, 185, 0.4)",
                paddingBottom: "0.5rem",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <FiActivity style={{ color: "var(--primary)" }} />
              <span>
                {language === "ar"
                  ? `سجل أنشطة العضو: ${inspectedUser.name}`
                  : `Activity Trail: ${inspectedUser.name}`}
              </span>
            </h3>
            <div
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
              className="custom-scrollbar"
            >
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "6px",
                  background: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(0,0,0,0.03)",
                }}
              >
                <span
                  style={{ fontWeight: 700, fontSize: "0.85rem", display: "block" }}
                >
                  {language === "ar" ? "تسجيل الدخول الأول" : "Account Onboarding Success"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>
                  📍 {language === "ar" ? "الدولة:" : "Country:"}{" "}
                  {inspectedUser.country || "Egypt"} |{" "}
                  {language === "ar" ? "الدور:" : "Role:"}{" "}
                  {inspectedUser.role || "student"}
                </span>
              </div>
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "6px",
                  background: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(0,0,0,0.03)",
                }}
              >
                <span
                  style={{ fontWeight: 700, fontSize: "0.85rem", display: "block" }}
                >
                  {language === "ar" ? "التحاق تعليمي" : "Academic Enrolment"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>
                  📍 {language === "ar" ? "المدرسة/الجامعة:" : "Institution:"}{" "}
                  {inspectedUser.school || "N/A"} |{" "}
                  {language === "ar" ? "الصف:" : "Grade:"}{" "}
                  {inspectedUser.grade || "N/A"}
                </span>
              </div>
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "6px",
                  background: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(0,0,0,0.03)",
                }}
              >
                <span
                  style={{ fontWeight: 700, fontSize: "0.85rem", display: "block" }}
                >
                  {language === "ar" ? "إعداد الملف الرمزي" : "Avatar Update"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>
                  📍 {language === "ar" ? "الرمز المختار:" : "Chosen Icon:"}{" "}
                  {inspectedUser.avatar || "👤"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
