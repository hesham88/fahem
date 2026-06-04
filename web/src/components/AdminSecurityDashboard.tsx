"use client";

import React, { useState, useEffect } from "react";
import { 
  FiCheckCircle, 
  FiLock, 
  FiSettings, 
  FiSearch,
  FiActivity,
  FiRefreshCw,
  FiTrendingUp,
  FiUsers,
  FiCheck,
  FiX
} from "react-icons/fi";

export default function AdminSecurityDashboard({ language, email }: { language: string; email?: string }) {
  // Superadmin global metrics & activity trail states
  const [globalStats, setGlobalStats] = useState<{
    daily: number;
    weekly: number;
    monthly: number;
    total: number;
    userBreakdown: { email: string; tokens: number }[];
    history?: { date: string; tokens: number }[];
  } | null>(null);
  const [globalActivities, setGlobalActivities] = useState<any[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [activitySearchQuery, setActivitySearchQuery] = useState("");
  const [hoveredPoint, setHoveredPoint] = useState<{ date: string; tokens: number; x: number; y: number } | null>(null);

  // Interactive Security, Token Controls, and File Upload state configurations
  const [maxUploadSize, setMaxUploadSize] = useState<number>(2); // in MB
  const [isUploadScanningEnabled, setIsUploadScanningEnabled] = useState<boolean>(true);
  const [allowedUploadFormats, setAllowedFormats] = useState({
    pdf: true,
    docx: true,
    txt: true,
    images: false
  });
  const [dailyAllocationLimit, setDailyAllocationLimit] = useState<number>(50000);
  const [weeklyAllocationLimit, setWeeklyAllocationLimit] = useState<number>(250000);
  const [monthlyAllocationLimit, setMonthlyAllocationLimit] = useState<number>(1000000);
  const [isTokenControlActive, setIsTokenControlActive] = useState<boolean>(true);
  const [isSavingConfigs, setIsSavingConfigs] = useState<boolean>(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState<string | null>(null);

  // --- Admin Approval & Curriculum Ingestion States ---
  const [admins, setAdmins] = useState<any[]>([]);
  const [isSuperadmin, setIsSuperadmin] = useState<boolean>(false);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState<boolean>(false);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);
  const [adminActionSuccess, setAdminActionSuccess] = useState<string | null>(null);

  // --- Superadmin Audit Trail States ---
  const [pendingChanges, setPendingChanges] = useState<any[]>([]);
  const [isLoadingChanges, setIsLoadingChanges] = useState<boolean>(false);

  const fetchPendingChanges = async () => {
    if (!email) return;
    setIsLoadingChanges(true);
    try {
      const response = await fetch(`/api/admin/approve-changes?superadminEmail=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.requests)) {
          setPendingChanges(data.requests);
        }
      }
    } catch (err) {
      console.error("Failed to fetch pending change requests:", err);
    } finally {
      setIsLoadingChanges(false);
    }
  };

  const handleApproveDenyChange = async (requestId: string, action: "approve" | "deny") => {
    if (!email) return;
    setAdminActionError(null);
    setAdminActionSuccess(null);
    try {
      const res = await fetch("/api/admin/approve-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          superadminEmail: email,
          requestId,
          action
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminActionSuccess(
          language === "ar"
            ? `تم ${action === "approve" ? "قبول" : "رفض"} طلب التغيير بنجاح`
            : `Successfully ${action}d change request.`
        );
        fetchPendingChanges();
        fetchSubjects();
        fetchAdmins();
        setTimeout(() => setAdminActionSuccess(null), 4000);
      } else {
        setAdminActionError(data.error || "Failed to process change request.");
        setTimeout(() => setAdminActionError(null), 4000);
      }
    } catch (err: any) {
      setAdminActionError(err.message || "An unexpected network error occurred.");
      setTimeout(() => setAdminActionError(null), 4000);
    }
  };

  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState<boolean>(false);

  // Subject Ingestion states
  const [subjName, setSubjName] = useState("");
  const [subjNameAr, setSubjNameAr] = useState("");
  const [subjGrade, setSubjGrade] = useState("Grade 10");
  const [subjCategory, setSubjCategory] = useState("Science");
  const [subjEmoji, setSubjEmoji] = useState("📚");
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [subjectSuccess, setSubjectSuccess] = useState<string | null>(null);
  const [subjectError, setSubjectError] = useState<string | null>(null);

  // Book Ingestion states
  const [bookSubjId, setBookSubjId] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookTitleAr, setBookTitleAr] = useState("");
  const [bookGrade, setBookGrade] = useState("Grade 10");
  const [bookTerm, setBookTerm] = useState("Term 1");
  const [bookYear, setBookYear] = useState("2026");
  const [bookLang, setBookLang] = useState("ar");
  const [bookType, setBookType] = useState("core");
  const [bookSourceUrl, setBookSourceUrl] = useState("");
  const [bookStoragePath, setBookStoragePath] = useState("");
  const [pendingChapters, setPendingChapters] = useState<any[]>([]);

  // Interactive Chapter Builder states
  const [chTitle, setChTitle] = useState("");
  const [chTitleAr, setChTitleAr] = useState("");
  const [chStartPage, setChStartPage] = useState<number>(1);
  const [chEndPage, setChEndPage] = useState<number>(10);
  const [chConcepts, setChConcepts] = useState("");

  const [isIngestingBook, setIsIngestingBook] = useState(false);
  const [bookSuccess, setBookSuccess] = useState<string | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);

  const fetchAdmins = async () => {
    if (!email) return;
    setIsLoadingAdmins(true);
    try {
      const response = await fetch(`/api/admin/approve?superadminEmail=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.admins)) {
          setAdmins(data.admins);
          setIsSuperadmin(true);
        }
      } else {
        setIsSuperadmin(false);
      }
    } catch (err) {
      console.error("Failed to fetch admin list:", err);
      setIsSuperadmin(false);
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  const fetchSubjects = async () => {
    setIsLoadingSubjects(true);
    try {
      const response = await fetch("/api/subjects");
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.subjects)) {
          setSubjectsList(data.subjects);
          if (data.subjects.length > 0 && !bookSubjId) {
            setBookSubjId(data.subjects[0]._id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch subjects list:", err);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const handleToggleAdminApproval = async (adminEmail: string, currentApproved: boolean) => {
    if (!email) return;
    setAdminActionError(null);
    setAdminActionSuccess(null);

    const action = currentApproved ? "revoke" : "approve";

    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          superadminEmail: email,
          adminEmail,
          action
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAdminActionSuccess(
          language === "ar"
            ? `تمت ${action === "approve" ? "الموافقة على" : "إلغاء موافقة"} المشرف ${adminEmail} بنجاح`
            : `Successfully ${action === "approve" ? "approved" : "revoked"} admin ${adminEmail}`
        );
        fetchAdmins();
        setTimeout(() => setAdminActionSuccess(null), 4000);
      } else {
        setAdminActionError(data.error || "Failed to update administrator status.");
        setTimeout(() => setAdminActionError(null), 4000);
      }
    } catch (err: any) {
      setAdminActionError(err.message || "An unexpected network error occurred.");
      setTimeout(() => setAdminActionError(null), 4000);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !subjName || !subjNameAr) return;
    setIsCreatingSubject(true);
    setSubjectSuccess(null);
    setSubjectError(null);

    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: subjName,
          name_ar: subjNameAr,
          grade_level: subjGrade,
          category: subjCategory,
          icon_emoji: subjEmoji,
          requesterEmail: email
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubjectSuccess(language === "ar" ? "🏆 تم إضافة المادة الدراسية الجديدة بنجاح!" : "🏆 Subject added and propagated successfully!");
        setSubjName("");
        setSubjNameAr("");
        fetchSubjects();
        setTimeout(() => setSubjectSuccess(null), 4000);
      } else {
        setSubjectError(data.error || "Failed to create subject.");
      }
    } catch (err: any) {
      setSubjectError(err.message || "Network error occurred while saving subject.");
    } finally {
      setIsCreatingSubject(false);
    }
  };

  const handleAddChapter = () => {
    if (!chTitle || !chTitleAr) return;
    const newCh = {
      id: `ch_${pendingChapters.length + 1}`,
      title: chTitle,
      title_ar: chTitleAr,
      page_start: Number(chStartPage),
      page_end: Number(chEndPage),
      concepts: chConcepts ? chConcepts.split(",").map(c => c.trim()).filter(Boolean) : []
    };
    setPendingChapters([...pendingChapters, newCh]);
    setChTitle("");
    setChTitleAr("");
    setChStartPage(Number(chEndPage) + 1);
    setChEndPage(Number(chEndPage) + 10);
    setChConcepts("");
  };

  const handleRemoveChapter = (index: number) => {
    setPendingChapters(pendingChapters.filter((_, i) => i !== index));
  };

  const handleIngestBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !bookSubjId || !bookTitle || !bookTitleAr) return;
    setIsIngestingBook(true);
    setBookSuccess(null);
    setBookError(null);

    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: bookSubjId,
          title: bookTitle,
          title_ar: bookTitleAr,
          grade: bookGrade,
          term: bookTerm,
          year: bookYear,
          language: bookLang,
          book_type: bookType,
          source_url: bookSourceUrl,
          storage_path: bookStoragePath,
          chapters: pendingChapters,
          requesterEmail: email
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBookSuccess(language === "ar" ? "📚 تم استيراد كتاب المنهج بنجاح!" : "📚 Book ingested, indexed, and linked successfully!");
        setBookTitle("");
        setBookTitleAr("");
        setBookSourceUrl("");
        setBookStoragePath("");
        setPendingChapters([]);
        setTimeout(() => setBookSuccess(null), 4000);
      } else {
        setBookError(data.error || "Failed to ingest textbook.");
      }
    } catch (err: any) {
      setBookError(err.message || "Failed to contact database backend.");
    } finally {
      setIsIngestingBook(false);
    }
  };

  const handleSaveConfigs = async () => {
    setIsSavingConfigs(true);
    setConfigSaveSuccess(null);
    try {
      const response = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isTokenControlActive,
          weeklyAllocationLimit,
          monthlyAllocationLimit,
          maxUploadSize,
          requesterEmail: email
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          if (data.needsApproval) {
            setConfigSaveSuccess(language === "ar" ? "تم تقديم طلب تعديل السياسات للموافقة عليه من قبل المسؤول الأعلى!" : "Your system policy update request has been submitted for Superadmin approval!");
            fetchPendingChanges();
          } else {
            setConfigSaveSuccess(language === "ar" ? "تم حفظ التكوينات وتطبيقها بنجاح!" : "Configurations successfully saved and enforced!");
          }
          console.log(`[POLICIES] Enforced new configuration policies: active=${isTokenControlActive}, max_upload=${maxUploadSize}MB`);
        } else {
          console.error(`[POLICIES] Error saving policies: ${data.error}`);
        }
      } else {
        console.error(`[POLICIES] Failed to save policies (HTTP ${response.status})`);
      }
    } catch (err: any) {
      console.error("Failed to save config:", err);
    } finally {
      setIsSavingConfigs(false);
      setTimeout(() => setConfigSaveSuccess(null), 4000);
    }
  };

  // Generates sleek vector sparkline SVG overlays for metrics panels
  const renderSparkline = (cardId: string, tokens: number, strokeColor: string) => {
    const historyData = globalStats?.history || [];
    let sparklineValues = [10, 20, 15, 30, 25, 40, tokens];
    
    if (historyData.length > 0) {
      if (cardId === "daily") {
        sparklineValues = historyData.slice(-3).map(d => d.tokens);
      } else if (cardId === "weekly") {
        sparklineValues = historyData.slice(-7).map(d => d.tokens);
      } else if (cardId === "monthly") {
        sparklineValues = historyData.slice(-15).map(d => d.tokens);
      } else {
        sparklineValues = historyData.map(d => d.tokens);
      }
    }
    
    if (sparklineValues.length < 2) {
      sparklineValues = [tokens * 0.5, tokens, tokens * 0.8, tokens * 1.2];
    }
    
    const max = Math.max(...sparklineValues, 1);
    const min = Math.min(...sparklineValues, 0);
    const range = max - min || 1;
    const width = 120;
    const height = 45;
    
    const points = sparklineValues.map((val, i) => {
      const x = (i / (sparklineValues.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    }).join(" ");
    
    const fillPoints = `0,${height} ${points} ${width},${height}`;
    const gradId = `sparkline-grad-${cardId}`;

    return (
      <div style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        left: 0,
        height: "45px",
        opacity: 0.5,
        pointerEvents: "none",
        zIndex: 0
      }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.00" />
            </linearGradient>
          </defs>
          <polygon
            points={fillPoints}
            fill={`url(#${gradId})`}
          />
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>
    );
  };

  useEffect(() => {
    if (!email) return;

    const fetchGlobalStats = async () => {
      setIsLoadingGlobal(true);
      try {
        const response = await fetch(`/api/admin/activities?email=${encodeURIComponent(email)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.tokenStats) {
            const getNum = (v: any) => {
              if (!v) return 0;
              if (typeof v === "object") return v.total || 0;
              return Number(v) || 0;
            };
            setGlobalStats({
              daily: getNum(data.tokenStats.daily),
              weekly: getNum(data.tokenStats.weekly),
              monthly: getNum(data.tokenStats.monthly),
              total: getNum(data.tokenStats.total),
              userBreakdown: Array.isArray(data.tokenStats.userBreakdown) ? data.tokenStats.userBreakdown : [],
              history: Array.isArray(data.tokenStats.history) ? data.tokenStats.history : []
            });
          }
          if (data.activities && Array.isArray(data.activities)) {
            setGlobalActivities(data.activities);
          }
        }
      } catch (err) {
        console.error("Failed to fetch global stats:", err);
      } finally {
        setIsLoadingGlobal(false);
      }
    };

    const fetchConfigs = async () => {
      try {
        const response = await fetch("/api/admin/config");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.config) {
            setIsTokenControlActive(data.config.isTokenControlActive);
            setWeeklyAllocationLimit(data.config.weeklyAllocationLimit);
            setMonthlyAllocationLimit(data.config.monthlyAllocationLimit);
            setMaxUploadSize(data.config.maxUploadSize);
          }
        }
      } catch (err) {
        console.error("Failed to fetch admin config:", err);
      }
    };

    fetchGlobalStats();
    fetchAdmins();
    fetchSubjects();
    fetchConfigs();
    fetchPendingChanges();

    // Refresh logs & stats every 10 seconds automatically
    const interval = setInterval(() => {
      fetchGlobalStats();
      fetchAdmins();
      fetchPendingChanges();
    }, 10000);

    return () => clearInterval(interval);
  }, [email]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", width: "100%" }}>
      


      {/* A. Superadmin Admin Approval Console */}
      <section className="panel-card" style={{ width: "100%", marginTop: "1rem" }}>
        <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FiUsers style={{ color: "var(--primary)" }} />
          <span>{language === "ar" ? "إدارة واعتماد المشرفين الجدد (خاص بالمسؤول الأكبر)" : "Superadmin Administrator Approval Console"}</span>
        </h2>
        <p style={{ color: "#4f6371", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
          {language === "ar"
            ? "اعتماد حسابات المشرفين الجدد لتمكينهم من الوصول إلى لوحات التحكم وإدارة المحتوى الدراسي بأمان."
            : "Review, approve, or revoke access for admin candidates. Only active superadmins can perform modifications on standard admin privileges."}
        </p>

        {adminActionError && (
          <div style={{ padding: "0.75rem", background: "rgba(211, 47, 47, 0.1)", border: "1px solid rgba(211, 47, 47, 0.2)", borderRadius: "6px", color: "#f87171", fontSize: "0.85rem", marginBottom: "1rem" }}>
            {adminActionError}
          </div>
        )}
        {adminActionSuccess && (
          <div style={{ padding: "0.75rem", background: "rgba(39, 174, 96, 0.1)", border: "1px solid rgba(39, 174, 96, 0.2)", borderRadius: "6px", color: "var(--accent-green)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            {adminActionSuccess}
          </div>
        )}

        {!isSuperadmin ? (
          <div style={{
            background: "rgba(255, 193, 7, 0.05)",
            border: "1px solid rgba(255, 193, 7, 0.2)",
            borderRadius: "var(--border-radius-md)",
            padding: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            color: "#6b5100"
          }}>
            <FiLock style={{ fontSize: "1.25rem", color: "#b28900" }} />
            <span style={{ fontSize: "0.9rem", fontFamily: "Cairo, var(--font-sans)" }}>
              {language === "ar"
                ? "هذا القسم مخصص للمشرفين الكبار (Superadmins) فقط. حسابك الحالي لديه صلاحيات مشرف قياسي."
                : "This section is restricted to Superadmins. Your active account is authenticated with standard administrator access."}
            </span>
          </div>
        ) : isLoadingAdmins && admins.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <FiRefreshCw className="spinning-icon" style={{ fontSize: "1.5rem", color: "var(--primary)" }} />
            <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#64748b" }}>
              {language === "ar" ? "جاري تحميل قائمة المرشحين..." : "Loading administrator candidate list..."}
            </p>
          </div>
        ) : admins.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#64748b", fontSize: "0.85rem" }}>
            {language === "ar" ? "لا يوجد مرشحون حاليون للإشراف." : "No admin candidates currently found."}
          </div>
        ) : (
          <div style={{ overflowX: "auto", background: "rgba(255,255,255,0.4)", borderRadius: "10px", border: "1px solid var(--card-border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "start" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.03)", borderBottom: "1px solid var(--card-border)" }}>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>{language === "ar" ? "المشرف" : "Admin Candidate"}</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>{language === "ar" ? "الحالة" : "Status"}</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>{language === "ar" ? "المصدر" : "Data Source"}</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, textAlign: "center" }}>{language === "ar" ? "العمليات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((adm, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--card-border)", transition: "background 0.2s" }} className="user-breakdown-row">
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600, color: "#1e293b" }}>{adm.name}</span>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{adm.email}</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {adm.isApprovedAdmin ? (
                        <span style={{
                          background: "rgba(39, 174, 96, 0.12)",
                          color: "var(--accent-green)",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          <FiCheck style={{ fontSize: "0.85rem" }} />
                          {language === "ar" ? "مقبول" : "Approved"}
                        </span>
                      ) : (
                        <span style={{
                          background: "rgba(243, 156, 18, 0.12)",
                          color: "var(--accent-orange)",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          <FiX style={{ fontSize: "0.85rem" }} />
                          {language === "ar" ? "قيد الانتظار" : "Pending Approval"}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b", fontSize: "0.75rem" }}>
                      <code>{adm.source}</code>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                      <button
                        onClick={() => handleToggleAdminApproval(adm.email, adm.isApprovedAdmin)}
                        style={{
                          background: adm.isApprovedAdmin ? "rgba(211, 47, 47, 0.08)" : "rgba(16, 107, 163, 0.08)",
                          color: adm.isApprovedAdmin ? "#d32f2f" : "var(--primary)",
                          border: `1px solid ${adm.isApprovedAdmin ? "rgba(211, 47, 47, 0.15)" : "rgba(16, 107, 163, 0.15)"}`,
                          borderRadius: "6px",
                          padding: "4px 12px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = adm.isApprovedAdmin ? "rgba(211, 47, 47, 0.15)" : "rgba(16, 107, 163, 0.15)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = adm.isApprovedAdmin ? "rgba(211, 47, 47, 0.08)" : "rgba(16, 107, 163, 0.08)";
                        }}
                      >
                        {adm.isApprovedAdmin ? (
                          <>
                            <FiX />
                            {language === "ar" ? "إلغاء الاعتماد" : "Revoke"}
                          </>
                        ) : (
                          <>
                            <FiCheck />
                            {language === "ar" ? "اعتماد كمسؤول" : "Approve Admin"}
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* B. Superadmin Admin Actions Audit & Approval Trail */}
      <section className="panel-card" style={{ width: "100%", marginTop: "1rem" }}>
        <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FiCheckCircle style={{ color: "var(--accent-green)" }} />
          <span>{language === "ar" ? "سجل تدقيق وموافقة العمليات (لوحة التحكم)" : "Superadmin Actions Audit & Approval Trail"}</span>
        </h2>
        <p style={{ color: "#4f6371", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
          {language === "ar"
            ? "مراجعة واعتماد أو رفض التغييرات المقترحة من قبل المشرفين على المناهج والمستخدمين والسياسات العامة قبل تطبيقها في النظام."
            : "Review, approve, or deny modification requests submitted by standard admins. Approved requests execute automatically; rejected requests are discarded."}
        </p>

        {isLoadingChanges && pendingChanges.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <FiRefreshCw className="spinning-icon" style={{ fontSize: "1.5rem", color: "var(--primary)" }} />
            <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#64748b" }}>
              {language === "ar" ? "جاري تحميل سجل التدقيق..." : "Loading actions audit trail..."}
            </p>
          </div>
        ) : pendingChanges.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "3rem 1.5rem",
            background: "rgba(0,0,0,0.01)",
            border: "1px dashed var(--card-border)",
            borderRadius: "10px",
            color: "#64748b",
            fontSize: "0.9rem"
          }}>
            <FiCheckCircle style={{ fontSize: "2rem", color: "var(--accent-green)", marginBottom: "0.75rem", display: "block", marginLeft: "auto", marginRight: "auto" }} />
            {language === "ar" ? "كل العمليات مدققة وموافق عليها. لا يوجد طلبات معلقة!" : "All actions are verified. No pending change requests!"}
          </div>
        ) : (
          <div style={{ overflowX: "auto", background: "rgba(255,255,255,0.4)", borderRadius: "10px", border: "1px solid var(--card-border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "start" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.03)", borderBottom: "1px solid var(--card-border)" }}>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>{language === "ar" ? "المشرف" : "Requester Admin"}</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>{language === "ar" ? "نوع العملية" : "Action Type"}</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>{language === "ar" ? "تفاصيل الطلب" : "Details & Payload"}</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>{language === "ar" ? "التاريخ" : "Submitted At"}</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>{language === "ar" ? "الحالة" : "Status"}</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, textAlign: "center" }}>{language === "ar" ? "العمليات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {pendingChanges.map((req, idx) => {
                  let actionLabel = req.actionType;
                  let actionColor = "var(--primary)";
                  if (req.actionType === "create_subject") {
                    actionLabel = language === "ar" ? "إضافة مادة" : "Create Subject";
                    actionColor = "var(--accent-green)";
                  } else if (req.actionType === "update_subject") {
                    actionLabel = language === "ar" ? "تعديل مادة" : "Update Subject";
                    actionColor = "var(--primary)";
                  } else if (req.actionType === "delete_subject") {
                    actionLabel = language === "ar" ? "حذف مادة" : "Delete Subject";
                    actionColor = "#d32f2f";
                  } else if (req.actionType === "update_config") {
                    actionLabel = language === "ar" ? "تعديل السياسات" : "Update System Config";
                    actionColor = "var(--accent-orange)";
                  } else if (req.actionType === "update_user_profile") {
                    actionLabel = language === "ar" ? "تحديث مستخدم" : "Update User Profile";
                    actionColor = "#8e44ad";
                  }

                  return (
                    <tr key={req.id || idx} style={{ borderBottom: "1px solid var(--card-border)", transition: "background 0.2s" }} className="user-breakdown-row">
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#1e293b" }}>
                        {req.requesterEmail}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{
                          background: `${actionColor}15`,
                          color: actionColor,
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 700
                        }}>
                          {actionLabel}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", maxWidth: "320px" }}>
                        <div style={{
                          background: "rgba(0,0,0,0.03)",
                          padding: "0.5rem",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontFamily: "monospace",
                          color: "#334155",
                          maxHeight: "120px",
                          overflowY: "auto",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all"
                        }}>
                          {req.actionType === "update_config" ? (
                            <div>
                              <strong>isTokenControlActive:</strong> {String(req.payload?.isTokenControlActive)}<br/>
                              <strong>weeklyLimit:</strong> {req.payload?.weeklyAllocationLimit}<br/>
                              <strong>monthlyLimit:</strong> {req.payload?.monthlyAllocationLimit}<br/>
                              <strong>maxUploadSize:</strong> {req.payload?.maxUploadSize}MB
                            </div>
                          ) : req.actionType === "create_subject" || req.actionType === "update_subject" ? (
                            <div>
                              {req.payload?.id && <><strong>ID:</strong> {req.payload.id}<br/></>}
                              <strong>Name (EN):</strong> {req.payload?.name}<br/>
                              <strong>Name (AR):</strong> {req.payload?.name_ar}<br/>
                              <strong>Grade:</strong> {req.payload?.grade_level}<br/>
                              <strong>Category:</strong> {req.payload?.category}<br/>
                              <strong>Emoji:</strong> {req.payload?.icon_emoji}
                            </div>
                          ) : req.actionType === "delete_subject" ? (
                            <div>
                              <strong>ID to Delete:</strong> {req.payload?.id}
                            </div>
                          ) : req.actionType === "update_user_profile" ? (
                            <div>
                              <strong>User ID:</strong> {req.payload?.userId}<br/>
                              <strong>Role:</strong> {req.payload?.profile?.role}<br/>
                              <strong>Banned:</strong> {String(req.payload?.profile?.banned)}<br/>
                              <strong>Whitelisted:</strong> {String(req.payload?.profile?.isWhitelisted)}
                            </div>
                          ) : (
                            JSON.stringify(req.payload, null, 2)
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#64748b", fontSize: "0.75rem" }}>
                        {req.createdAt ? new Date(req.createdAt).toLocaleString(language === "ar" ? "ar-EG" : "en-US") : "N/A"}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{
                          background: "rgba(243, 156, 18, 0.12)",
                          color: "var(--accent-orange)",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          <span className="pulse-dot" style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "var(--accent-orange)",
                            display: "inline-block"
                          }} />
                          {language === "ar" ? "قيد المراجعة" : "Pending Approval"}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                          <button
                            onClick={() => handleApproveDenyChange(req.id, "approve")}
                            disabled={!isSuperadmin}
                            style={{
                              background: isSuperadmin ? "rgba(39, 174, 96, 0.1)" : "rgba(100, 116, 139, 0.05)",
                              color: isSuperadmin ? "var(--accent-green)" : "#94a3b8",
                              border: `1px solid ${isSuperadmin ? "rgba(39, 174, 96, 0.2)" : "rgba(100, 116, 139, 0.1)"}`,
                              borderRadius: "6px",
                              padding: "4px 10px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: isSuperadmin ? "pointer" : "not-allowed",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "2px",
                              transition: "all 0.2s"
                            }}
                            onMouseOver={(e) => {
                              if (isSuperadmin) e.currentTarget.style.background = "rgba(39, 174, 96, 0.2)";
                            }}
                            onMouseLeave={(e) => {
                              if (isSuperadmin) e.currentTarget.style.background = "rgba(39, 174, 96, 0.1)";
                            }}
                          >
                            <FiCheck />
                            {language === "ar" ? "موافقة" : "Approve"}
                          </button>
                          <button
                            onClick={() => handleApproveDenyChange(req.id, "deny")}
                            disabled={!isSuperadmin}
                            style={{
                              background: isSuperadmin ? "rgba(211, 47, 47, 0.08)" : "rgba(100, 116, 139, 0.05)",
                              color: isSuperadmin ? "#d32f2f" : "#94a3b8",
                              border: `1px solid ${isSuperadmin ? "rgba(211, 47, 47, 0.15)" : "rgba(100, 116, 139, 0.1)"}`,
                              borderRadius: "6px",
                              padding: "4px 10px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: isSuperadmin ? "pointer" : "not-allowed",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "2px",
                              transition: "all 0.2s"
                            }}
                            onMouseOver={(e) => {
                              if (isSuperadmin) e.currentTarget.style.background = "rgba(211, 47, 47, 0.15)";
                            }}
                            onMouseLeave={(e) => {
                              if (isSuperadmin) e.currentTarget.style.background = "rgba(211, 47, 47, 0.08)";
                            }}
                          >
                            <FiX />
                            {language === "ar" ? "رفض" : "Deny"}
                          </button>
                        </div>
                        {!isSuperadmin && (
                          <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: "2px" }}>
                            {language === "ar" ? "يتطلب صلاحيات مسؤول أكبر" : "Superadmin only"}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Curriculum & Textbook Ingestion Studio extracted to independent CurriculumIngestionStudio.tsx tab */}


      {/* 4. Executive Global Token Analytics Panel */}
      <section className="panel-card" style={{ width: "100%", marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--card-border)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
              <FiTrendingUp style={{ color: "var(--primary)" }} />
              <span>{language === "ar" ? "التحليلات التنفيذية لاستهلاك الرموز عالمياً" : "Executive Global Token Analytics"}</span>
            </h2>
            <p style={{ color: "#4f6371", fontSize: "0.9rem", margin: "0.25rem 0 0 0" }}>
              {language === "ar"
                ? "مراقبة وتحليل منحنيات استهلاك الرموز (Tokens) يومياً، أسبوعياً، وشهرياً لجميع الحسابات."
                : "Real-time monitoring and reporting of token consumption metrics across Daily, Weekly, Monthly, and Lifetime intervals."}
            </p>
          </div>
          {isLoadingGlobal && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", color: "var(--primary)" }}>
              <FiRefreshCw className="spinning-icon" />
              <span>{language === "ar" ? "جاري التحديث..." : "Syncing..."}</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Token Stats Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.25rem"
          }}>
            {[
              {
                id: "daily",
                titleAr: "الاستهلاك اليومي",
                titleEn: "Daily Consumption",
                tokens: globalStats?.daily ?? 0,
                color: "var(--primary)",
                descAr: "آخر 24 ساعة",
                descEn: "Last 24 hours"
              },
              {
                id: "weekly",
                titleAr: "الاستهلاك الأسبوعي",
                titleEn: "Weekly Consumption",
                tokens: globalStats?.weekly ?? 0,
                color: "var(--secondary-hover)",
                descAr: "آخر 7 أيام",
                descEn: "Last 7 days"
              },
              {
                id: "monthly",
                titleAr: "الاستهلاك الشهري",
                titleEn: "Monthly Consumption",
                tokens: globalStats?.monthly ?? 0,
                color: "var(--accent-orange)",
                descAr: "آخر 30 يوم",
                descEn: "Last 30 days"
              },
              {
                id: "lifetime",
                titleAr: "الاستهلاك الإجمالي",
                titleEn: "Lifetime Consumption",
                tokens: globalStats?.total ?? 0,
                color: "var(--accent-green)",
                descAr: "تراكمي مدى الحياة",
                descEn: "Cumulative overall"
              }
            ].map((card) => (
              <div key={card.id} style={{
                padding: "1.25rem",
                background: "rgba(255, 255, 255, 0.45)",
                border: "1px solid var(--card-border)",
                borderRadius: "var(--border-radius-md)",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                position: "relative",
                overflow: "hidden",
                boxShadow: "var(--shadow-sm)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: "default"
              }}
              className="metric-card-hover"
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 2 }}>
                  <span style={{ fontSize: "0.85rem", color: "#6a7c88", fontWeight: 600 }}>
                    {language === "ar" ? card.titleAr : card.titleEn}
                  </span>
                  <div style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: card.color,
                    animation: "pulse 2s infinite"
                  }} />
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem", margin: "0.25rem 0", position: "relative", zIndex: 2 }}>
                  <span style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>
                    {(card.tokens || 0).toLocaleString()}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "#6a7c88", fontWeight: 500 }}>
                    {language === "ar" ? "رمز" : "tokens"}
                  </span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#5a6e7c", position: "relative", zIndex: 2 }}>
                  {language === "ar" ? card.descAr : card.descEn}
                </div>
                {renderSparkline(card.id, card.tokens, card.color)}
              </div>
            ))}
          </div>

          {/* Interactive Token Controls & File Upload Limits Setup */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1.5rem",
            marginTop: "1.5rem",
            marginBottom: "1.5rem"
          }}>
            {/* Token Allocation Controls Card */}
            <div style={{
              background: "rgba(255, 255, 255, 0.55)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid var(--card-border)",
              borderRadius: "var(--border-radius-md)",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem"
            }}>
              <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                <FiSettings style={{ color: "var(--primary)" }} />
                <span>{language === "ar" ? "إعدادات وقواعد التحكم بالرموز (Tokens)" : "Cognitive Token Controls & Allocations"}</span>
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#6a7c88", margin: 0 }}>
                {language === "ar" ? "تحديد سقف وحصص الاستهلاك اليومية والأسبوعية للحد من التكلفة وضمان استقرار الخدمة." : "Configure cognitive token limitations across Daily, Weekly, and Monthly intervals to prevent API runaway bills."}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.8rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{language === "ar" ? "الحد اليومي المخصص للمستعلم" : "Daily Limit Per Student"}</span>
                    <span style={{ color: "var(--primary)", fontWeight: 700, fontFamily: "monospace" }}>{dailyAllocationLimit.toLocaleString()} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="100000"
                    step="5000"
                    value={dailyAllocationLimit}
                    onChange={(e) => setDailyAllocationLimit(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--primary)" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.8rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{language === "ar" ? "الحد الأسبوعي للمستعلم" : "Weekly Limit Per Student"}</span>
                    <span style={{ color: "var(--secondary)", fontWeight: 700, fontFamily: "monospace" }}>{weeklyAllocationLimit.toLocaleString()} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max="500000"
                    step="10000"
                    value={weeklyAllocationLimit}
                    onChange={(e) => setWeeklyAllocationLimit(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--secondary)" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.8rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{language === "ar" ? "الحد الشهري الأقصى" : "Monthly Allocated Limit"}</span>
                    <span style={{ color: "var(--accent-orange)", fontWeight: 700, fontFamily: "monospace" }}>{monthlyAllocationLimit.toLocaleString()} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="200000"
                    max="2000000"
                    step="50000"
                    value={monthlyAllocationLimit}
                    onChange={(e) => setMonthlyAllocationLimit(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--accent-orange)" }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "1px dashed var(--card-border)" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{language === "ar" ? "تفعيل الرقابة الصارمة" : "Strict Limit Enforcement"}</span>
                  <label className="switch-label" style={{ position: "relative", display: "inline-block", width: "42px", height: "20px" }}>
                    <input
                      type="checkbox"
                      checked={isTokenControlActive}
                      onChange={(e) => setIsTokenControlActive(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: "absolute",
                      cursor: "pointer",
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: isTokenControlActive ? "var(--primary)" : "#cbd5e1",
                      transition: "0.3s",
                      borderRadius: "20px"
                    }}>
                      <span style={{
                        position: "absolute",
                        content: '""',
                        height: "14px", width: "14px",
                        left: isTokenControlActive ? "24px" : "3px",
                        bottom: "3px",
                        backgroundColor: "white",
                        transition: "0.3s",
                        borderRadius: "50%"
                      }} />
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* File Upload Size & Format Constraints Card */}
            <div style={{
              background: "rgba(255, 255, 255, 0.55)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid var(--card-border)",
              borderRadius: "var(--border-radius-md)",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem"
            }}>
              <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                <FiLock style={{ color: "var(--accent-orange)" }} />
                <span>{language === "ar" ? "تكوينات قيود وحجم الملفات المرفوعة" : "File Upload & Size Limit Configurations"}</span>
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#6a7c88", margin: 0 }}>
                {language === "ar" ? "التحكم في الحد الأقصى للمرفقات وصيغ الملفات المسموح بها لحماية الخوادم والاشتراكات." : "Set hard-limits on custom textbook and notes uploads to safeguard cluster space and optimize parsing overhead."}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.8rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{language === "ar" ? "الحد الأقصى لحجم الملف الواحد" : "Maximum Size Allowed"}</span>
                    <span style={{ color: "var(--accent-orange)", fontWeight: 700, fontFamily: "monospace" }}>{maxUploadSize} MB</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={maxUploadSize}
                    onChange={(e) => setMaxUploadSize(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--accent-orange)" }}
                  />
                </div>

                <div>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.4rem", color: "var(--foreground)" }}>
                    {language === "ar" ? "الصيغ والامتدادات المسموح بها" : "Allowed Attachment Formats"}
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    {[
                      { key: "pdf", label: "PDF Documents" },
                      { key: "docx", label: "Word (DOCX)" },
                      { key: "txt", label: "Text Files (TXT)" },
                      { key: "images", label: "Images (PNG/JPG)" }
                    ].map((fmt) => (
                      <label key={fmt.key} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", cursor: "pointer", color: "#475569" }}>
                        <input
                          type="checkbox"
                          checked={(allowedUploadFormats as any)[fmt.key]}
                          onChange={(e) => setAllowedFormats({ ...allowedUploadFormats, [fmt.key]: e.target.checked })}
                          style={{ accentColor: "var(--accent-orange)" }}
                        />
                        <span>{fmt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "1px dashed var(--card-border)" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{language === "ar" ? "فحص الملفات سحابياً قبل الحفظ" : "Pre-upload Sandbox Malware Scan"}</span>
                  <label className="switch-label" style={{ position: "relative", display: "inline-block", width: "42px", height: "20px" }}>
                    <input
                      type="checkbox"
                      checked={isUploadScanningEnabled}
                      onChange={(e) => setIsUploadScanningEnabled(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: "absolute",
                      cursor: "pointer",
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: isUploadScanningEnabled ? "var(--accent-orange)" : "#cbd5e1",
                      transition: "0.3s",
                      borderRadius: "20px"
                    }}>
                      <span style={{
                        position: "absolute",
                        content: '""',
                        height: "14px", width: "14px",
                        left: isUploadScanningEnabled ? "24px" : "3px",
                        bottom: "3px",
                        backgroundColor: "white",
                        transition: "0.3s",
                        borderRadius: "50%"
                      }} />
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Config Action Row */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "1rem", borderTop: "1px dashed var(--card-border)", paddingTop: "1rem" }}>
            {configSaveSuccess && (
              <span style={{ fontSize: "0.85rem", color: "var(--accent-green)", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <FiCheckCircle />
                {configSaveSuccess}
              </span>
            )}
            <button
              onClick={handleSaveConfigs}
              disabled={isSavingConfigs}
              className="btn btn-primary"
              style={{ padding: "0.6rem 1.5rem", minWidth: "180px", background: "linear-gradient(135deg, var(--primary), var(--secondary))", border: "none", boxShadow: "var(--shadow-md)" }}
            >
              {isSavingConfigs ? <FiRefreshCw className="spinning-icon" /> : <FiLock />}
              <span>{isSavingConfigs ? (language === "ar" ? "جاري الحفظ والإنفاذ..." : "Deploying Policies...") : (language === "ar" ? "حفظ وتطبيق السياسات" : "Save & Apply Policies")}</span>
            </button>
          </div>


          {/* Interactive Token Telemetry Visual Chart */}
          <div style={{
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--border-radius-lg)",
            padding: "1.5rem",
            boxShadow: "var(--shadow-md)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            position: "relative"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FiActivity style={{ color: "var(--primary)", fontSize: "1.2rem" }} />
                <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800 }}>
                  {language === "ar" ? "سجل استهلاك الرموز اليومي" : "Historical Daily Token Telemetry"}
                </h3>
              </div>
              <span style={{
                fontSize: "0.7rem",
                color: "#106ba3",
                background: "rgba(16, 107, 163, 0.06)",
                padding: "3px 8px",
                borderRadius: "50px",
                fontWeight: 700
              }}>
                {language === "ar" ? "آخر 7 أيام (محدث لحظياً)" : "Last 7 Days (Realtime)"}
              </span>
            </div>

            <div style={{ width: "100%", overflowX: "auto" }}>
              <div style={{ position: "relative", minWidth: "550px", width: "100%", height: "230px" }}>
                {(() => {
                  const dummyHistory = [
                    { date: "05-23", tokens: 1200 },
                    { date: "05-24", tokens: 2800 },
                    { date: "05-25", tokens: 2100 },
                    { date: "05-26", tokens: 4100 },
                    { date: "05-27", tokens: 3600 },
                    { date: "05-28", tokens: 5800 },
                    { date: "05-29", tokens: 7200 },
                  ];

                  const historyData = (globalStats?.history && globalStats.history.length > 0)
                    ? globalStats.history.map(item => ({
                        ...item,
                        label: item.date.length >= 10 ? item.date.substring(5) : item.date
                      }))
                    : dummyHistory.map(item => ({ ...item, label: item.date }));

                  const maxVal = Math.max(...historyData.map(d => d.tokens), 500);

                  const svgWidth = 600;
                  const svgHeight = 220;
                  const paddingLeft = 60;
                  const paddingRight = 20;
                  const paddingTop = 25;
                  const paddingBottom = 35;

                  const chartWidth = svgWidth - paddingLeft - paddingRight;
                  const chartHeight = svgHeight - paddingTop - paddingBottom;

                  let linePath = "";
                  let areaPath = "";

                  if (historyData.length > 0) {
                    linePath = historyData.map((d, i) => {
                      const x = paddingLeft + (i / (historyData.length - 1)) * chartWidth;
                      const y = paddingTop + chartHeight - (d.tokens / maxVal) * chartHeight;
                      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                    }).join(" ");

                    const firstX = paddingLeft;
                    const lastX = paddingLeft + chartWidth;
                    const bottomY = paddingTop + chartHeight;
                    areaPath = `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
                  }

                  const gridLines = [0.25, 0.5, 0.75, 1.0];

                  return (
                    <>
                      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%" style={{ display: "block" }}>
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.00" />
                          </linearGradient>
                        </defs>

                        {/* Background Grid Lines */}
                        {gridLines.map((ratio, index) => {
                          const y = paddingTop + chartHeight - ratio * chartHeight;
                          const val = Math.round(ratio * maxVal);
                          return (
                            <g key={index}>
                              <line
                                x1={paddingLeft}
                                y1={y}
                                x2={svgWidth - paddingRight}
                                y2={y}
                                stroke="rgba(16, 107, 163, 0.08)"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                              />
                              <text
                                x={paddingLeft - 8}
                                y={y + 4}
                                fill="#8a9ca8"
                                fontSize="10"
                                fontWeight="700"
                                textAnchor="end"
                                style={{ fontFamily: "var(--font-mono)" }}
                              >
                                {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                              </text>
                            </g>
                          );
                        })}

                        {/* Baseline */}
                        <line
                          x1={paddingLeft}
                          y1={paddingTop + chartHeight}
                          x2={svgWidth - paddingRight}
                          y2={paddingTop + chartHeight}
                          stroke="rgba(16, 107, 163, 0.15)"
                          strokeWidth="1"
                        />

                        {/* Under Area Gradient */}
                        {areaPath && (
                          <path
                            d={areaPath}
                            fill="url(#chartGradient)"
                          />
                        )}

                        {/* Active Area Bars for extra richness */}
                        {historyData.map((d, i) => {
                          const barWidth = Math.max(12, chartWidth / historyData.length * 0.25);
                          const x = paddingLeft + (i / (historyData.length - 1)) * chartWidth - barWidth / 2;
                          const y = paddingTop + chartHeight - (d.tokens / maxVal) * chartHeight;
                          const height = (d.tokens / maxVal) * chartHeight;
                          return (
                            <rect
                              key={`bar-${i}`}
                              x={x}
                              y={y}
                              width={barWidth}
                              height={height}
                              rx="3"
                              fill="rgba(16, 107, 163, 0.06)"
                              style={{ transition: "all 0.3s ease" }}
                            />
                          );
                        })}

                        {/* Core Line Path */}
                        {linePath && (
                          <path
                            d={linePath}
                            fill="none"
                            stroke="var(--primary)"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Glow Dots and Interactive hover overlays */}
                        {historyData.map((d, i) => {
                          const x = paddingLeft + (i / (historyData.length - 1)) * chartWidth;
                          const y = paddingTop + chartHeight - (d.tokens / maxVal) * chartHeight;
                          const isHovered = hoveredPoint && hoveredPoint.date === d.date;

                          return (
                            <g key={i}>
                              <circle
                                cx={x}
                                cy={y}
                                r={isHovered ? "7" : "4"}
                                fill="#ffffff"
                                stroke="var(--primary)"
                                strokeWidth={isHovered ? "4" : "2.5"}
                                style={{
                                  transition: "all 0.15s ease",
                                  cursor: "pointer",
                                  filter: "drop-shadow(0 2px 4px rgba(16, 107, 163, 0.2))"
                                }}
                              />
                              {/* X Axis Labels */}
                              <text
                                x={x}
                                y={paddingTop + chartHeight + 18}
                                fill="#6a7c88"
                                fontSize="10"
                                fontWeight="700"
                                textAnchor="middle"
                                style={{ fontFamily: " Cairo, var(--font-sans)" }}
                              >
                                {d.label}
                              </text>

                              {/* Invisible Trigger rect for easy hovering */}
                              <rect
                                x={x - (chartWidth / historyData.length) / 2}
                                y={paddingTop}
                                width={chartWidth / historyData.length}
                                height={chartHeight + 15}
                                fill="transparent"
                                style={{ cursor: "pointer" }}
                                onMouseEnter={(e) => {
                                  // Get bounding rect to calculate responsive HTML coordinates
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const container = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                                  if (container) {
                                    setHoveredPoint({
                                      date: d.date,
                                      tokens: d.tokens,
                                      x: rect.left - container.left + rect.width / 2,
                                      y: rect.top - container.top + (y - paddingTop)
                                    });
                                  }
                                }}
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                            </g>
                          );
                        })}
                      </svg>

                      {/* Tooltip Overlay */}
                      {hoveredPoint && (
                        <div style={{
                          position: "absolute",
                          left: `${hoveredPoint.x}px`,
                          top: `${hoveredPoint.y - 30}px`,
                          transform: "translate(-50%, -100%)",
                          background: "rgba(15, 23, 42, 0.95)",
                          color: "#ffffff",
                          padding: "8px 14px",
                          borderRadius: "10px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          pointerEvents: "none",
                          boxShadow: "0 10px 25px rgba(0,0,0,0.22)",
                          zIndex: 100,
                          whiteSpace: "nowrap",
                          transition: "all 0.1s ease",
                          fontFamily: "Cairo, var(--font-sans)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                          border: "1px solid rgba(255,255,255,0.15)"
                        }}>
                          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.65rem", display: "block" }}>
                            {language === "ar" ? `التاريخ: ${hoveredPoint.date}` : `Date: ${hoveredPoint.date}`}
                          </span>
                          <span style={{ color: "#4394d2", display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4394d2" }} />
                            {(hoveredPoint.tokens || 0).toLocaleString()} {language === "ar" ? "رمز مستهلك" : "tokens used"}
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Top Consuming Users Table */}
          <div style={{
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--border-radius-md)",
            padding: "1.25rem",
          }}>
            <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: "0 0 1rem 0" }}>
              <FiUsers style={{ color: "var(--secondary)" }} />
              <span>{language === "ar" ? "أكثر المستخدمين استهلاكاً للرموز" : "Top Consuming Users Breakdown"}</span>
            </h3>

            {!globalStats?.userBreakdown || globalStats.userBreakdown.length === 0 ? (
              <div style={{ color: "#506578", textAlign: "center", padding: "1.5rem", fontSize: "0.85rem" }}>
                {language === "ar" ? "لا توجد بيانات استهلاك متاحة حالياً." : "No usage data available."}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "250px", overflowY: "auto" }}>
                {globalStats.userBreakdown.map((user, idx) => {
                  const maxTokens = globalStats.userBreakdown[0]?.tokens || 1;
                  const percentage = Math.min(100, Math.round(((user.tokens || 0) / maxTokens) * 100));
                  const rankColors = [
                    { border: "rgba(16, 107, 163, 0.22)", bg: "linear-gradient(135deg, rgba(16, 107, 163, 0.08), rgba(27, 163, 156, 0.03))", badge: "var(--primary)" },
                    { border: "rgba(27, 163, 156, 0.22)", bg: "linear-gradient(135deg, rgba(27, 163, 156, 0.08), rgba(243, 156, 18, 0.03))", badge: "var(--secondary)" },
                    { border: "rgba(243, 156, 18, 0.22)", bg: "linear-gradient(135deg, rgba(243, 156, 18, 0.08), rgba(162, 217, 206, 0.03))", badge: "var(--accent-orange)" }
                  ];
                  const rankStyle = rankColors[idx] || { border: "rgba(16, 107, 163, 0.1)", bg: "rgba(255,255,255,0.75)", badge: "#7a8b9e" };
                  const initials = user.email ? user.email.substring(0, 2).toUpperCase() : "U";

                  return (
                    <div key={idx} style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.45rem",
                      padding: "0.85rem",
                      background: rankStyle.bg,
                      borderRadius: "8px",
                      border: `1px solid ${rankStyle.border}`,
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                    }}
                    className="user-breakdown-row"
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            background: rankStyle.badge,
                            color: "#fff",
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "var(--font-mono)"
                          }}>
                            #{idx + 1}
                          </span>
                          <span style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: "rgba(255,255,255,0.85)",
                            border: "1px solid rgba(16, 107, 163, 0.15)",
                            color: "var(--primary)",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "var(--font-mono)"
                          }}>
                            {initials}
                          </span>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>
                            {user.email}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)" }}>
                          {(user.tokens || 0).toLocaleString()} {language === "ar" ? "رمز" : "tokens"}
                        </span>
                      </div>
                      <div style={{
                        width: "100%",
                        height: "6px",
                        background: "rgba(16, 107, 163, 0.08)",
                        borderRadius: "50px",
                        overflow: "hidden"
                      }}>
                        <div style={{
                          width: `${percentage}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, var(--primary), var(--secondary))",
                          borderRadius: "50px"
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>





      {/* 5. Global Operational Activity Trail */}
      <section className="panel-card" style={{ width: "100%", marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
              <FiActivity style={{ color: "var(--secondary)" }} />
              <span>{language === "ar" ? "سجل الأنشطة والعمليات العام لفاهم" : "Global Operational Activity Trail"}</span>
            </h2>
            <p style={{ color: "#4f6371", fontSize: "0.9rem", margin: "0.25rem 0 0 0" }}>
              {language === "ar"
                ? "تتبع مباشر وتدقيق شامل لجميع استعلامات المستخدمين، عمليات البحث الموثق، والحظر الأمني."
                : "Real-time ledger auditing all standard queries, grounded searches, blocks, and system events."}
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.7)", border: "1px solid var(--card-border)", borderRadius: "6px", padding: "0.4rem 0.75rem", flex: 1 }}>
            <FiSearch style={{ color: "#7a8b9e" }} />
            <input
              type="text"
              placeholder={language === "ar" ? "البحث بالبريد الإلكتروني، العملية، أو الحالة..." : "Filter by email, action, or status..."}
              value={activitySearchQuery}
              onChange={(e) => setActivitySearchQuery(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: "0.85rem", width: "100%", color: "var(--foreground)" }}
            />
          </div>
        </div>

        {/* Table representation */}
        <div style={{ maxHeight: "250px", overflowY: "auto", overflowX: "auto", background: "rgba(255,255,255,0.4)", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "start" }}>
            <thead>
              <tr style={{ background: "rgba(16, 107, 163, 0.04)", borderBottom: "1px solid var(--card-border)" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--primary)" }}>{language === "ar" ? "المستخدم" : "User"}</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--primary)" }}>{language === "ar" ? "العملية" : "Action"}</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--primary)" }}>{language === "ar" ? "الحالة" : "Status"}</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--primary)" }}>{language === "ar" ? "التوقيت" : "Timestamp"}</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--primary)" }}>{language === "ar" ? "التفاصيل" : "Details"}</th>
              </tr>
            </thead>
            <tbody>
              {globalActivities.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#6a7c88" }}>
                    {language === "ar" ? "لا توجد أنشطة مسجلة حالياً." : "No activities recorded."}
                  </td>
                </tr>
              ) : (
                globalActivities
                  .filter((act) => {
                    if (!activitySearchQuery) return true;
                    const q = activitySearchQuery.toLowerCase();
                    return (
                      (act.userEmail || "").toLowerCase().includes(q) ||
                      (act.action || "").toLowerCase().includes(q) ||
                      (act.status || "").toLowerCase().includes(q) ||
                      (act.details || "").toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 100) // Show up to 100 entries
                  .map((act, idx) => {
                    const status = (act.status || "SUCCESS").toUpperCase();
                    const isSuccess = status === "SUCCESS" || status === "COMPLETED" || status === "PASSED";
                    const isBlocked = status === "BLOCKED" || status === "DENIED" || status === "CRITICAL";
                    
                    let badgeBg = "rgba(16, 107, 163, 0.08)";
                    let badgeColor = "var(--primary)";
                    if (isSuccess) {
                      badgeBg = "rgba(40, 167, 69, 0.08)";
                      badgeColor = "var(--accent-green)";
                    } else if (isBlocked) {
                      badgeBg = "rgba(220, 53, 69, 0.08)";
                      badgeColor = "#dc3545";
                    }

                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--card-border)", transition: "all 0.2s ease" }}>
                        <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-mono)", fontWeight: 500, color: "var(--foreground)" }}>
                          {act.userEmail}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                          {act.action}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                            background: badgeBg,
                            color: badgeColor,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem"
                          }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: badgeColor, display: "inline-block" }} />
                            {status}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#6a7c88", fontSize: "0.8rem" }}>
                          {act.timestamp ? new Date(act.timestamp).toLocaleString(language === "ar" ? "ar-EG" : "en-US") : "N/A"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#4f6371", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={act.details}>
                          {act.details}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </section>



      <style jsx>{`
        .dag-node-btn:hover {
          transform: translateY(-4px);
          border-color: var(--secondary) !important;
          box-shadow: 0 12px 30px rgba(16, 107, 163, 0.12) !important;
        }
        .metric-card-hover:hover {
          transform: translateY(-4px);
          border-color: var(--primary) !important;
          box-shadow: 0 10px 25px rgba(16, 107, 163, 0.08) !important;
          background: rgba(255, 255, 255, 0.65) !important;
        }
        .user-breakdown-row:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(16, 107, 163, 0.06);
          border-color: var(--primary) !important;
        }
      `}</style>
    </div>
  );
}


