"use client";

import React, { useState, useEffect } from "react";
import { 
  FiUsers, 
  FiRefreshCw, 
  FiX, 
  FiActivity, 
  FiSliders, 
  FiShield, 
  FiCpu, 
  FiClock, 
  FiPlay, 
  FiPause, 
  FiSlash, 
  FiTerminal, 
  FiEdit3, 
  FiCheckCircle, 
  FiToggleLeft, 
  FiToggleRight 
} from "react-icons/fi";
import { authedFetch } from "../../lib/authedFetch";

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
  // Navigation State
  const [activeSubSection, setActiveSubSection] = useState<"accounts" | "limits" | "demo">("accounts");

  // Custom Token Limits & Override Policy State
  const [selectedUserForPolicy, setSelectedUserForPolicy] = useState<User | null>(null);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState<boolean>(false);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [policySuccess, setPolicySuccess] = useState<string | null>(null);
  const [overrideEnabled, setOverrideEnabled] = useState<boolean>(false);
  const [overrideDailyLimit, setOverrideDailyLimit] = useState<number>(35714);
  const [overrideWeeklyLimit, setOverrideWeeklyLimit] = useState<number>(250000);
  const [overrideMonthlyLimit, setOverrideMonthlyLimit] = useState<number>(1000000);
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [usedLimits, setUsedLimits] = useState({ daily: 0, weekly: 0, monthly: 0, total: 0 });
  const [isSavingPolicy, setIsSavingPolicy] = useState<boolean>(false);

  // Global Config & System Switch State
  const [globalConfig, setGlobalConfig] = useState<any>(null);
  // FC7.21c: editable demo per-tier token caps + daily allocation (enforced by token_budget_blocked).
  const [capTier0, setCapTier0] = useState<number>(35000);
  const [capTier1, setCapTier1] = useState<number>(60000);
  const [capDaily, setCapDaily] = useState<number>(50000);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  // Demo Oversight Console (ES.7) State
  const [demoSessions, setDemoSessions] = useState<any[]>([]);
  const [isLoadingDemoSessions, setIsLoadingDemoSessions] = useState<boolean>(false);
  const [demoSessionsError, setDemoSessionsError] = useState<string | null>(null);
  const [selectedDemoSession, setSelectedDemoSession] = useState<any | null>(null);
  const [showQuotaEditId, setShowQuotaEditId] = useState<string | null>(null);
  const [quotaEditValue, setQuotaEditValue] = useState<number>(250000);

  // Time-ticker state to drive live duration updates
  const [tickerTime, setTickerTime] = useState<number>(Math.floor(Date.now() / 1000));

  // --- Policy and Override Handlers ---
  const fetchUserPolicy = async (userId: string) => {
    setIsLoadingPolicy(true);
    setPolicyError(null);
    setPolicySuccess(null);
    try {
      const response = await authedFetch(`/api/admin/user-token-policy?userId=${encodeURIComponent(userId)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsedLimits(data.used || { daily: 0, weekly: 0, monthly: 0, total: 0 });
          if (data.tokenPolicy) {
            setOverrideEnabled(!!data.tokenPolicy.enabled);
            setOverrideDailyLimit(data.tokenPolicy.dailyLimit || 35714);
            setOverrideWeeklyLimit(data.tokenPolicy.weeklyLimit || 250000);
            setOverrideMonthlyLimit(data.tokenPolicy.monthlyLimit || 1000000);
            setOverrideReason(data.tokenPolicy.reason || "");
          } else {
            setOverrideEnabled(false);
            setOverrideDailyLimit(35714);
            setOverrideWeeklyLimit(250000);
            setOverrideMonthlyLimit(1000000);
            setOverrideReason("");
          }
        } else {
          setPolicyError(data.error || "Failed to load token policy.");
        }
      } else {
        setPolicyError(`Failed to fetch policy (HTTP ${response.status})`);
      }
    } catch (err: any) {
      setPolicyError(err.message || "Failed to load policy.");
    } finally {
      setIsLoadingPolicy(false);
    }
  };

  const handleSaveUserPolicy = async (clearPolicy: boolean = false) => {
    if (!selectedUserForPolicy) return;
    setIsSavingPolicy(true);
    setPolicyError(null);
    setPolicySuccess(null);
    try {
      const payload = clearPolicy 
        ? { userId: selectedUserForPolicy.userId, clearPolicy: true }
        : {
            userId: selectedUserForPolicy.userId,
            enabled: overrideEnabled,
            dailyLimit: overrideDailyLimit,
            weeklyLimit: overrideWeeklyLimit,
            monthlyLimit: overrideMonthlyLimit,
            reason: overrideReason || "Admin custom override"
          };

      const response = await authedFetch("/api/admin/user-token-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setPolicySuccess(
          language === "ar"
            ? (clearPolicy ? "تم إلغاء سياسة التجاوز المخصصة بنجاح!" : "تم حفظ وتطبيق حدود التجاوز المخصصة بنجاح!")
            : (clearPolicy ? "Custom token policy cleared successfully!" : "Custom token policy saved and applied successfully!")
        );
        fetchUserPolicy(selectedUserForPolicy.userId);
        fetchAllUsersList();
      } else {
        setPolicyError(data.error || "Failed to update user limits.");
      }
    } catch (err: any) {
      setPolicyError(err.message || "Failed to save user limits.");
    } finally {
      setIsSavingPolicy(false);
    }
  };

  // --- Global System Config Handlers ---
  const fetchGlobalConfig = async () => {
    try {
      const response = await authedFetch("/api/admin/config");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setGlobalConfig(data.config);
          // FC7.21c: seed the cap editors from live config (defaults match token_budget_blocked).
          setCapTier0(Number(data.config.demoTier0Cap) || 35000);
          setCapTier1(Number(data.config.demoTier1Cap) || 60000);
          setCapDaily(Number(data.config.dailyAllocationLimit) || 50000);
        }
      }
    } catch (err) {
      console.error("[UserAccountsPanel] Failed to load global config:", err);
    }
  };

  const handleSaveGlobalConfig = async (updates: any) => {
    setIsSavingConfig(true);
    setConfigMessage(null);
    try {
      const mergedConfig = { ...globalConfig, ...updates };
      const response = await authedFetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedConfig)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setGlobalConfig(data.config || mergedConfig);
        setConfigMessage(
          language === "ar"
            ? "تم حفظ تعديلات البيئة التجريبية فوراً وتعميمها!"
            : "Demo Sandbox settings updated and applied globally!"
        );
      } else {
        setConfigMessage(data.error || "Failed to update global configuration.");
      }
    } catch (err: any) {
      setConfigMessage(err.message || "Failed to save global configuration.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  // --- Demo Oversight Live Monitors Handlers ---
  const fetchDemoSessions = async () => {
    setIsLoadingDemoSessions(true);
    setDemoSessionsError(null);
    try {
      const response = await authedFetch("/api/admin/demo-sessions");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDemoSessions(data.sessions || []);
        } else {
          setDemoSessionsError(data.error || "Failed to load active demo sessions.");
        }
      } else {
        setDemoSessionsError(`HTTP Error ${response.status}`);
      }
    } catch (err: any) {
      setDemoSessionsError(err.message || "Failed to load demo sessions.");
    } finally {
      setIsLoadingDemoSessions(false);
    }
  };

  const handleDemoAction = async (sandbox_session_id: string, action: "kill" | "quota", quota_value?: number) => {
    try {
      const response = await authedFetch("/api/admin/demo-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandbox_session_id, action, quota_value })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        fetchDemoSessions();
        if (action === "kill") {
          setShowQuotaEditId(null);
        }
      } else {
        alert(data.error || `Failed to execute ${action}`);
      }
    } catch (err: any) {
      alert(err.message || "Error executing demo control action.");
    }
  };

  // Live Durations & Ticker updates
  useEffect(() => {
    let interval: any = null;
    if (activeSubSection === "demo") {
      interval = setInterval(() => {
        setTickerTime(Math.floor(Date.now() / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSubSection]);

  // Periodic Polling for Demo oversight
  useEffect(() => {
    if (activeSubSection === "demo") {
      fetchDemoSessions();
      fetchGlobalConfig();
      const polling = setInterval(fetchDemoSessions, 12000); // Poll sessions every 12 seconds
      return () => clearInterval(polling);
    }
  }, [activeSubSection]);

  // Handle auto-fetching policy when selected user changes
  useEffect(() => {
    if (selectedUserForPolicy) {
      fetchUserPolicy(selectedUserForPolicy.userId);
    }
  }, [selectedUserForPolicy]);

  const formatDuration = (startedAt: number) => {
    const totalSecs = Math.max(0, tickerTime - startedAt);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Consolidated Premium Tab Navigation */}
      <div 
        style={{ 
          display: "flex", 
          gap: "0.75rem", 
          borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", 
          paddingBottom: "0.75rem",
          flexWrap: "wrap"
        }}
      >
        <button
          onClick={() => setActiveSubSection("accounts")}
          style={{
            padding: "0.6rem 1.25rem",
            borderRadius: "50px",
            border: activeSubSection === "accounts" ? "1px solid var(--primary)" : "1px solid transparent",
            background: activeSubSection === "accounts" ? "rgba(16, 107, 163, 0.12)" : "transparent",
            color: activeSubSection === "accounts" ? "var(--primary)" : "var(--foreground)",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.2s"
          }}
        >
          <FiUsers />
          <span>{language === "ar" ? "إدارة الصلاحيات" : "Accounts & Roles"}</span>
        </button>

        <button
          onClick={() => {
            setActiveSubSection("limits");
            if (!selectedUserForPolicy && allUsers.length > 0) {
              setSelectedUserForPolicy(allUsers[0]);
            }
          }}
          style={{
            padding: "0.6rem 1.25rem",
            borderRadius: "50px",
            border: activeSubSection === "limits" ? "1px solid var(--primary)" : "1px solid transparent",
            background: activeSubSection === "limits" ? "rgba(16, 107, 163, 0.12)" : "transparent",
            color: activeSubSection === "limits" ? "var(--primary)" : "var(--foreground)",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.2s"
          }}
        >
          <FiSliders />
          <span>{language === "ar" ? "حدود استهلاك الرموز" : "Token Limit Overrides"}</span>
        </button>

        <button
          onClick={() => setActiveSubSection("demo")}
          style={{
            padding: "0.6rem 1.25rem",
            borderRadius: "50px",
            border: activeSubSection === "demo" ? "1px solid var(--primary)" : "1px solid transparent",
            background: activeSubSection === "demo" ? "rgba(16, 107, 163, 0.12)" : "transparent",
            color: activeSubSection === "demo" ? "var(--primary)" : "var(--foreground)",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.2s"
          }}
        >
          <FiCpu />
          <span>{language === "ar" ? "غرفة التحكم بالبث التجريبي" : "Demo Oversight Console"}</span>
        </button>
      </div>

      {/* --- SECTION 1: Users Accounts and Roles --- */}
      {activeSubSection === "accounts" && (
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
                          onClick={() => {
                            setSelectedUserForPolicy(u);
                            setActiveSubSection("limits");
                          }}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "var(--border-radius-sm)",
                            border: "1px solid rgba(212, 175, 55, 0.3)",
                            background: "rgba(212, 175, 55, 0.05)",
                            color: "var(--secondary)",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                          title={language === "ar" ? "تعديل حدود الاستهلاك" : "Set limits overrides"}
                        >
                          {language === "ar" ? "تجاوز الحدود" : "Limits"}
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
      )}

      {/* --- SECTION 2: Token Limits Overrides Panel --- */}
      {activeSubSection === "limits" && (
        <section className="panel-card" style={{ padding: "2rem" }}>
          <h2
            style={{
              fontSize: "1.4rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              borderBottom: "1px dashed rgba(235, 220, 185, 0.4)",
              paddingBottom: "1rem",
              marginBottom: "1.5rem",
              fontWeight: 800,
            }}
          >
            <FiSliders style={{ color: "var(--primary)" }} />
            <span>{language === "ar" ? "حدود استهلاك الرموز المخصصة (Overrides)" : "Custom User Limits & Token Overrides"}</span>
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "2rem", flexWrap: "wrap" }}>
            {/* User Selector Column */}
            <div style={{ borderRight: language === "ar" ? "none" : "1px solid var(--card-border)", borderLeft: language === "ar" ? "1px solid var(--card-border)" : "none", paddingRight: language === "ar" ? 0 : "1.5rem", paddingLeft: language === "ar" ? "1.5rem" : 0 }}>
              <label style={{ fontWeight: 700, fontSize: "0.85rem", display: "block", marginBottom: "0.5rem" }}>
                {language === "ar" ? "اختر العضو المستهدف:" : "Select Account to Inspect:"}
              </label>
              <select
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  borderRadius: "6px",
                  border: "1px solid var(--card-border)",
                  background: "#ffffff",
                  fontSize: "0.9rem",
                  marginBottom: "1.5rem"
                }}
                value={selectedUserForPolicy?.userId || ""}
                onChange={(e) => {
                  const found = allUsers.find(u => u.userId === e.target.value);
                  if (found) setSelectedUserForPolicy(found);
                }}
              >
                {allUsers.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.name} ({u.email || "No Email"})
                  </option>
                ))}
              </select>

              {selectedUserForPolicy ? (
                <div style={{ background: "rgba(16,107,163,0.03)", border: "1px solid rgba(16,107,163,0.08)", borderRadius: "8px", padding: "1rem" }}>
                  <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--primary)", fontWeight: 800 }}>{selectedUserForPolicy.name}</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.8rem" }}>
                    <span>📧 <strong>Email:</strong> {selectedUserForPolicy.email || "N/A"}</span>
                    <span>👑 <strong>Role:</strong> {selectedUserForPolicy.role || "student"}</span>
                    <span>⭐ <strong>Whitelisted Judge:</strong> {selectedUserForPolicy.isWhitelisted ? "Yes" : "No"}</span>
                  </div>

                  {/* Realtime Live Usage Meters */}
                  <div style={{ marginTop: "1rem", borderTop: "1px dashed var(--card-border)", paddingTop: "1rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--primary)", display: "block", marginBottom: "0.75rem" }}>
                      {language === "ar" ? "معدلات الاستهلاك الفعلي:" : "Telemetry Consumption Meters:"}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.2rem" }}>
                          <span>Daily Used:</span>
                          <strong style={{ fontFamily: "monospace" }}>{usedLimits.daily.toLocaleString()} tokens</strong>
                        </div>
                        <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "10px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, (usedLimits.daily / 100000) * 100)}%`, height: "100%", background: "var(--primary)" }}></div>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.2rem" }}>
                          <span>Weekly Used:</span>
                          <strong style={{ fontFamily: "monospace" }}>{usedLimits.weekly.toLocaleString()} tokens</strong>
                        </div>
                        <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "10px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, (usedLimits.weekly / 250000) * 100)}%`, height: "100%", background: "var(--secondary)" }}></div>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.2rem" }}>
                          <span>Monthly Used:</span>
                          <strong style={{ fontFamily: "monospace" }}>{usedLimits.monthly.toLocaleString()} tokens</strong>
                        </div>
                        <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.05)", borderRadius: "10px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, (usedLimits.monthly / 1000000) * 100)}%`, height: "100%", background: "var(--accent-orange)" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: "0.85rem", color: "#6a7c88" }}>
                  {language === "ar" ? "يرجى اختيار عضو لعرض وتحميل معدلاته الفردية." : "Select an account to load individual telemetry parameters."}
                </p>
              )}
            </div>

            {/* Overrides form Column */}
            <div>
              {isLoadingPolicy ? (
                <div style={{ textAlign: "center", padding: "2rem" }}>
                  <FiRefreshCw className="spin-icon" style={{ fontSize: "2rem", color: "var(--primary)" }} />
                  <p style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>Loading User Custom Policy...</p>
                </div>
              ) : selectedUserForPolicy ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {policySuccess && (
                    <div style={{ padding: "0.75rem", borderRadius: "6px", background: "rgba(46,125,50,0.1)", color: "#2e7d32", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <FiCheckCircle />
                      <span>{policySuccess}</span>
                    </div>
                  )}
                  {policyError && (
                    <div style={{ padding: "0.75rem", borderRadius: "6px", background: "rgba(211,47,47,0.1)", color: "#d32f2f", fontSize: "0.85rem" }}>
                      ⚠️ {policyError}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="checkbox"
                      id="overrideEnabledInput"
                      checked={overrideEnabled}
                      onChange={(e) => setOverrideEnabled(e.target.checked)}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <label htmlFor="overrideEnabledInput" style={{ fontSize: "0.9rem", fontWeight: 700, cursor: "pointer" }}>
                      {language === "ar" ? "تفعيل حدود التجاوز المخصصة لهذا العضو" : "Enable Custom Override Policy for this user"}
                    </label>
                  </div>

                  <div style={{ opacity: overrideEnabled ? 1 : 0.5, transition: "opacity 0.2s ease", pointerEvents: overrideEnabled ? "auto" : "none" }}>
                    {/* Daily Slider */}
                    <div style={{ marginBottom: "1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.8rem" }}>
                        <span style={{ fontWeight: 600 }}>{language === "ar" ? "الحد اليومي المخصص" : "Override Daily Token Limit"}</span>
                        <strong style={{ color: "var(--primary)", fontFamily: "monospace" }}>{overrideDailyLimit.toLocaleString()} tokens</strong>
                      </div>
                      <input
                        type="range"
                        min="5000"
                        max="500000"
                        step="5000"
                        value={overrideDailyLimit}
                        onChange={(e) => setOverrideDailyLimit(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--primary)", cursor: "pointer" }}
                      />
                    </div>

                    {/* Weekly Slider */}
                    <div style={{ marginBottom: "1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.8rem" }}>
                        <span style={{ fontWeight: 600 }}>{language === "ar" ? "الحد الأسبوعي المخصص" : "Override Weekly Token Limit"}</span>
                        <strong style={{ color: "var(--secondary)", fontFamily: "monospace" }}>{overrideWeeklyLimit.toLocaleString()} tokens</strong>
                      </div>
                      <input
                        type="range"
                        min="50000"
                        max="2000000"
                        step="50000"
                        value={overrideWeeklyLimit}
                        onChange={(e) => setOverrideWeeklyLimit(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--secondary)", cursor: "pointer" }}
                      />
                    </div>

                    {/* Monthly Slider */}
                    <div style={{ marginBottom: "1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.8rem" }}>
                        <span style={{ fontWeight: 600 }}>{language === "ar" ? "الحد الشهري المخصص" : "Override Monthly Token Limit"}</span>
                        <strong style={{ color: "var(--accent-orange)", fontFamily: "monospace" }}>{overrideMonthlyLimit.toLocaleString()} tokens</strong>
                      </div>
                      <input
                        type="range"
                        min="200000"
                        max="10000000"
                        step="100000"
                        value={overrideMonthlyLimit}
                        onChange={(e) => setOverrideMonthlyLimit(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent-orange)", cursor: "pointer" }}
                      />
                    </div>

                    {/* Reason input */}
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                        {language === "ar" ? "سبب منح التجاوز (مثال: حكم مسابقة، مراجع جوجل):" : "Reason for Override (e.g. Google Judge, Devpost evaluator):"}
                      </label>
                      <textarea
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Write audit reason..."
                        style={{
                          width: "100%",
                          height: "80px",
                          padding: "0.5rem",
                          borderRadius: "6px",
                          border: "1px solid var(--card-border)",
                          fontSize: "0.85rem",
                          outline: "none",
                          fontFamily: "var(--font-sans)"
                        }}
                      />
                    </div>
                  </div>

                  {/* Submit buttons */}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                    <button
                      onClick={() => handleSaveUserPolicy(false)}
                      disabled={isSavingPolicy}
                      className="btn btn-primary"
                      style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem", flex: 1 }}
                    >
                      {isSavingPolicy ? "Saving Policy..." : (language === "ar" ? "تطبيق وحفظ التجاوز" : "Apply & Save Policy")}
                    </button>
                    <button
                      onClick={() => handleSaveUserPolicy(true)}
                      disabled={isSavingPolicy}
                      className="btn btn-secondary"
                      style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem", color: "#d32f2f", border: "1px solid rgba(211,47,47,0.2)" }}
                    >
                      {language === "ar" ? "إلغاء التجاوز الافتراضي" : "Clear Policy / Restore Default"}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "2rem", color: "#6a7c88" }}>
                  Select an account on the left pane to modify their cognitive token credit limitations.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* --- SECTION 3: Demo Oversight & Controls (ES.7) --- */}
      {activeSubSection === "demo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Global Kill switch and Admin Sandbox Controls */}
          <section className="panel-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", margin: "0 0 0.25rem 0", fontWeight: 800 }}>
                  {language === "ar" ? "مفتاح الطوارئ والبيئة التجريبية" : "Global Sandbox & Emergency Controls"}
                </h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#6a7c88" }}>
                  {language === "ar" ? "مفتاح مركزي لتمكين أو إيقاف البيئة التجريبية فوراً لجميع الحكام." : "Enable or shut down the entire evaluation sandbox environment with one-click."}
                </p>
              </div>

              {globalConfig && (
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  {configMessage && (
                    <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 700 }}>
                      {configMessage}
                    </span>
                  )}
                  
                  <button
                    onClick={() => handleSaveGlobalConfig({ evalSandboxEnabled: !globalConfig.evalSandboxEnabled })}
                    disabled={isSavingConfig}
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontSize: "2.2rem",
                      display: "flex",
                      alignItems: "center",
                      color: globalConfig.evalSandboxEnabled ? "#2e7d32" : "#d32f2f",
                      transition: "all 0.2s"
                    }}
                    title={globalConfig.evalSandboxEnabled ? "Toggle Off" : "Toggle On"}
                  >
                    {globalConfig.evalSandboxEnabled ? <FiToggleRight /> : <FiToggleLeft />}
                  </button>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>
                    {globalConfig.evalSandboxEnabled
                      ? (language === "ar" ? "نشط ومتاح ✅" : "Active & Accessible ✅")
                      : (language === "ar" ? "معطل تماماً 🛑" : "Disabled / Locked 🛑")
                    }
                  </span>
                </div>
              )}
              {/* FC7.21c: super-admin-editable demo token caps + daily allocation (enforced fail-closed for
                  demo by token_budget_blocked). */}
              {globalConfig && (
                <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px dashed rgba(235,220,185,0.4)" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 800, marginBottom: "0.6rem", color: "var(--foreground)" }}>
                    {language === "ar" ? "حدود رموز البيئة التجريبية (لكل جلسة)" : "Demo token caps (per session)"}
                  </div>
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
                    {[
                      { label: language === "ar" ? "الفئة 0" : "Tier 0", val: capTier0, set: setCapTier0 },
                      { label: language === "ar" ? "الفئة 1" : "Tier 1", val: capTier1, set: setCapTier1 },
                      { label: language === "ar" ? "الحد اليومي (الإنتاج)" : "Daily (prod)", val: capDaily, set: setCapDaily },
                    ].map((f, i) => (
                      <label key={i} style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {f.label}
                        <input
                          type="number"
                          value={f.val}
                          min={0}
                          onChange={(e) => f.set(Number(e.target.value))}
                          style={{ width: "120px", padding: "6px 8px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--foreground)", fontFamily: "monospace", fontWeight: 700 }}
                        />
                      </label>
                    ))}
                    <button
                      onClick={() => handleSaveGlobalConfig({ demoTier0Cap: capTier0, demoTier1Cap: capTier1, dailyAllocationLimit: capDaily })}
                      disabled={isSavingConfig}
                      style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, var(--primary), var(--secondary))", color: "#fff", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer" }}
                    >
                      {language === "ar" ? "حفظ الحدود" : "Save caps"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Active Demo Sessions Live Monitors */}
          <section className="panel-card" style={{ padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed rgba(235, 220, 185, 0.4)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.2rem", margin: 0, fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FiClock style={{ color: "var(--primary)" }} />
                <span>{language === "ar" ? "شاشات المراقبة اللحظية للبث التجريبي" : "Live Demo Sessions Monitor"}</span>
              </h3>

              <button
                onClick={fetchDemoSessions}
                className="btn btn-secondary"
                style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
              >
                <FiRefreshCw className={isLoadingDemoSessions ? "spin-icon" : ""} />
                <span style={{ marginLeft: "0.3rem" }}>{language === "ar" ? "تحديث البث" : "Live Poll"}</span>
              </button>
            </div>

            {demoSessionsError && (
              <div style={{ padding: "1rem", borderRadius: "6px", background: "rgba(211,47,47,0.08)", color: "#d32f2f", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                ⚠️ {demoSessionsError}
              </div>
            )}

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--card-border)", color: "var(--primary)", fontWeight: 700, textAlign: language === "ar" ? "right" : "left" }}>
                    <th style={{ padding: "0.5rem" }}>{language === "ar" ? "البريد التجريبي" : "Demo Session / Email"}</th>
                    <th style={{ padding: "0.5rem" }}>{language === "ar" ? "الشخصية" : "Persona / Tier"}</th>
                    <th style={{ padding: "0.5rem" }}>{language === "ar" ? "رقم الجلسة" : "Session #"}</th>
                    <th style={{ padding: "0.5rem" }}>{language === "ar" ? "المدة المستغرقة" : "Duration"}</th>
                    <th style={{ padding: "0.5rem" }}>{language === "ar" ? "الميزانية الممنوحة" : "Budget Cap"}</th>
                    <th style={{ padding: "0.5rem", textAlign: "center" }}>{language === "ar" ? "الحالة" : "Status"}</th>
                    <th style={{ padding: "0.5rem", textAlign: "center" }}>{language === "ar" ? "إجراءات التحكم" : "Interventions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {demoSessions.map((sess) => (
                    <tr key={sess._id} style={{ borderBottom: "1px solid rgba(0,0,0,0.03)", transition: "all 0.15s" }}>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 700 }}>{sess.email || "Anonymous Demo User"}</span>
                          <span style={{ fontSize: "0.7rem", color: "#6a7c88", fontFamily: "monospace" }}>ID: {sess.sandbox_session_id}</span>
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                          <span style={{ padding: "2px 6px", borderRadius: "10px", background: "rgba(16,107,163,0.1)", color: "var(--primary)", fontSize: "0.65rem", fontWeight: 700 }}>
                            {sess.persona}
                          </span>
                          <span style={{ padding: "2px 6px", borderRadius: "10px", background: sess.tier === 1 ? "rgba(212,175,55,0.15)" : "rgba(0,0,0,0.05)", color: sess.tier === 1 ? "var(--secondary)" : "#4f6371", fontSize: "0.65rem", fontWeight: 700 }}>
                            Tier-{sess.tier} {sess.verified ? "✓ Verified" : ""}
                          </span>
                        </div>
                      </td>
                      {/* FC9.10: privacy — show a non-identifying session number, never the IP. */}
                      <td style={{ padding: "0.75rem 0.5rem", color: "#4f6371", fontSize: "0.75rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={sess.ua}>
                        <strong>#{sess.session_number ?? "—"}</strong><br/>
                        <span style={{ fontSize: "0.65rem", color: "#8a9ca8" }}>{sess.ua}</span>
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", fontFamily: "monospace", fontWeight: 700 }}>
                        {sess.status === "active" ? formatDuration(sess.started_at) : (sess.duration_seconds ? `${Math.floor(sess.duration_seconds / 60)}m ${sess.duration_seconds % 60}s` : "Ended")}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        {showQuotaEditId === sess.sandbox_session_id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <input
                              type="number"
                              value={quotaEditValue}
                              onChange={(e) => setQuotaEditValue(Number(e.target.value))}
                              style={{ width: "80px", padding: "2px 4px", fontSize: "0.75rem" }}
                            />
                            <button
                              onClick={() => {
                                handleDemoAction(sess.sandbox_session_id, "quota", quotaEditValue);
                                setShowQuotaEditId(null);
                              }}
                              style={{ border: "none", background: "none", color: "#2e7d32", cursor: "pointer" }}
                            >
                              <FiCheckCircle />
                            </button>
                            <button
                              onClick={() => setShowQuotaEditId(null)}
                              style={{ border: "none", background: "none", color: "#d32f2f", cursor: "pointer" }}
                            >
                              <FiX />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            {/* FC7.21: show live USED tokens vs the per-session limit (was budget-only). */}
                            <span style={{ fontFamily: "monospace", fontWeight: 700 }} title="Used / Limit">
                              {(sess.tokensUsed || 0).toLocaleString()}
                              {" / "}
                              {(sess.token_budget || sess.tokenLimit)
                                ? (sess.token_budget || sess.tokenLimit).toLocaleString()
                                : "250k"}
                            </span>
                            {sess.status === "active" && (
                              <button
                                onClick={() => {
                                  setShowQuotaEditId(sess.sandbox_session_id);
                                  setQuotaEditValue(sess.token_budget || 250000);
                                }}
                                style={{ border: "none", background: "none", color: "#6a7c88", cursor: "pointer" }}
                                title="Edit Quota"
                              >
                                <FiEdit3 />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                        <span style={{
                          padding: "2px 6px",
                          borderRadius: "10px",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          background: sess.status === "active" ? "rgba(46,125,50,0.12)" : sess.status === "killed" ? "rgba(211,47,47,0.12)" : "rgba(0,0,0,0.06)",
                          color: sess.status === "active" ? "#2e7d32" : sess.status === "killed" ? "#d32f2f" : "#6a7c88"
                        }}>
                          {sess.status?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                        {sess.status === "active" ? (
                          <button
                            onClick={() => {
                              if (confirm("Are you sure you want to revoke and kill this active demo session? The user will be instantly logged out and forced back to landing.")) {
                                handleDemoAction(sess.sandbox_session_id, "kill");
                              }
                            }}
                            className="btn"
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              border: "none",
                              background: "rgba(211,47,47,0.1)",
                              color: "#d32f2f",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem"
                            }}
                          >
                            <FiSlash />
                            <span>{language === "ar" ? "إنهاء الخدمة" : "Instant Kill"}</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "#a0aab5" }}>
                            {sess.kill_reason || "Session expired"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {demoSessions.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "#6a7c88" }}>
                        {language === "ar" ? "لا توجد حركات أو بث نشط حالياً في البيئة التجريبية." : "No active judge or evaluator sessions running on the sandbox."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Existing Activity Trail Modal for standard users */}
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
