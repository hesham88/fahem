"use client";

import React from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase";
import { authedFetch } from "../../lib/authedFetch";
import {
  FiSettings,
  FiCheckCircle,
  FiActivity,
  FiAlertTriangle,
  FiTrash2,
} from "react-icons/fi";

/**
 * Props definition for SettingsPanel component.
 */
interface SettingsPanelProps {
  language: "ar" | "en";
  user: any;
  userProfile: any;
  setUserProfile: React.Dispatch<React.SetStateAction<any>>;
  
  // Avatar states
  settingsAvatarTab: "vectors" | "animals" | "tech" | "golden";
  setSettingsAvatarTab: React.Dispatch<React.SetStateAction<"vectors" | "animals" | "tech" | "golden">>;
  settingsAvatar: string;
  setSettingsAvatar: React.Dispatch<React.SetStateAction<string>>;
  avatarCategories: Record<string, Array<{ e: string; lAr: string; lEn: string }>>;
  
  // Loading states
  settingsLoading: boolean;
  setSettingsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  settingsStatusText: string;
  setSettingsStatusText: React.Dispatch<React.SetStateAction<string>>;
  
  // Preferences inputs
  preferencesSchool: string;
  setPreferencesSchool: React.Dispatch<React.SetStateAction<string>>;
  privacyVisibility: string;
  setPrivacyVisibility: React.Dispatch<React.SetStateAction<string>>;
  
  // Privacy switches
  privacyAllowMessages: boolean;
  setPrivacyAllowMessages: React.Dispatch<React.SetStateAction<boolean>>;
  privacyShowActivity: boolean;
  setPrivacyShowActivity: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Action Handlers
  handleUpdatePrivacySettings: () => void;
  handleDeleteUserAccount: () => void;
  
  // Gamification telemetry metrics
  getLevelBadgeText: () => string;
  activeLevel: number;
  activeStreak: number;
  xpProgressPercent: number;
  activeXp: number;
  nextLevelXp: number;
  consumedClt: number;
  totalAllocatedClt: number;
  tokenProgressPercent: number;
  remainingClt: number;
  
  // Helpers
  renderAvatar: (avatar: any, size: string) => React.ReactNode;
}

/**
 * SettingsPanel: A modular component representing the "Preferences & Privacy Control" section.
 * Contains user avatar upload and configuration controls, school preferences, privacy settings,
 * Gamification stats with real-time Swarm Telemetry traces, and GDPR delete account controls.
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  language,
  user,
  userProfile,
  setUserProfile,
  settingsAvatarTab,
  setSettingsAvatarTab,
  settingsAvatar,
  setSettingsAvatar,
  avatarCategories,
  settingsLoading,
  setSettingsLoading,
  settingsStatusText,
  setSettingsStatusText,
  preferencesSchool,
  setPreferencesSchool,
  privacyVisibility,
  setPrivacyVisibility,
  privacyAllowMessages,
  setPrivacyAllowMessages,
  privacyShowActivity,
  setPrivacyShowActivity,
  handleUpdatePrivacySettings,
  handleDeleteUserAccount,
  getLevelBadgeText,
  activeLevel,
  activeStreak,
  xpProgressPercent,
  activeXp,
  nextLevelXp,
  consumedClt,
  totalAllocatedClt,
  tokenProgressPercent,
  remainingClt,
  renderAvatar,
}) => {

  const [tokenStats, setTokenStats] = React.useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = React.useState<boolean>(true);

  const [placesResults, setPlacesResults] = React.useState<any[]>([]);
  const [searchingPlaces, setSearchingPlaces] = React.useState<boolean>(false);
  const placesSearchTimeoutRef = React.useRef<any>(null);
  const placesAbortControllerRef = React.useRef<AbortController | null>(null);

  const fetchPlaces = (query: string) => {
    if (placesSearchTimeoutRef.current) {
      clearTimeout(placesSearchTimeoutRef.current);
    }

    if (query.trim().length < 2) {
      setPlacesResults([]);
      setSearchingPlaces(false);
      if (placesAbortControllerRef.current) {
        placesAbortControllerRef.current.abort();
        placesAbortControllerRef.current = null;
      }
      return;
    }

    setSearchingPlaces(true);

    placesSearchTimeoutRef.current = setTimeout(async () => {
      if (placesAbortControllerRef.current) {
        placesAbortControllerRef.current.abort();
      }

      const controller = new AbortController();
      placesAbortControllerRef.current = controller;

      try {
        const countryParam = userProfile?.country || "Egypt";
        const res = await authedFetch(`/api/places/search?query=${encodeURIComponent(query)}&country=${encodeURIComponent(countryParam)}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          setPlacesResults(data.results || []);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Error searching places in SettingsPanel:", err);
        }
      } finally {
        if (placesAbortControllerRef.current === controller) {
          setSearchingPlaces(false);
          placesAbortControllerRef.current = null;
        }
      }
    }, 250);
  };

  React.useEffect(() => {
    async function fetchStats() {
      try {
        const res = await authedFetch("/api/user/token-stats");
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            setTokenStats(data);
          }
        }
      } catch (err) {
        console.error("Error fetching token stats in SettingsPanel:", err);
      } finally {
        setIsLoadingStats(false);
      }
    }
    fetchStats();
  }, []);

  /**
   * Handles dynamic profile picture upload to Firebase Storage and immediately syncs the download URL to MongoDB.
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(
        language === "ar"
          ? "خطأ: حجم الصورة يتجاوز الحد الأقصى (2 ميجابايت)."
          : "Error: Avatar image size exceeds the strict 2MB validation limit."
      );
      e.target.value = "";
      return;
    }

    if (!user) {
      alert(language === "ar" ? "يجب تسجيل الدخول أولاً." : "Please sign in first.");
      return;
    }

    setSettingsLoading(true);
    setSettingsStatusText(language === "ar" ? "جاري الرفع..." : "Uploading...");

    try {
      const fileExtension = file.name.split(".").pop() || "jpg";
      const storageRef = ref(storage, `Profile Pictures/${user.uid}_${Date.now()}.${fileExtension}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setSettingsAvatar(downloadURL);

      // Immediate MongoDB Profile Sync
      const res = await authedFetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            ...(userProfile || {}),
            avatar: downloadURL,
          },
        }),
      });

      if (res.ok) {
        setUserProfile((prev: any) => ({
          ...(prev || {}),
          avatar: downloadURL,
        }));
      }
    } catch (err) {
      console.error("Settings avatar upload/sync error:", err);
      alert(
        language === "ar"
          ? "حدث خطأ أثناء رفع الصورة أو مزامنتها."
          : "An error occurred while uploading or syncing the picture."
      );
    } finally {
      setSettingsLoading(false);
      setSettingsStatusText("");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Account Profile and Avatar selector */}
      <section className="panel-card" style={{ padding: "2rem" }}>
        <h2
          style={{
            fontSize: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            borderBottom: "1px dashed rgba(235, 220, 185, 0.4)",
            paddingBottom: "1rem",
            marginBottom: "1.5rem",
            fontWeight: 800,
          }}
        >
          <FiSettings style={{ color: "var(--primary)" }} />
          <span>{language === "ar" ? "مركز الحساب والخصوصية" : "Account & Privacy Center"}</span>
        </h2>

        {/* Profile Avatar Selection Section */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            padding: "1.5rem",
            background: "rgba(255, 255, 255, 0.5)",
            border: "1px solid rgba(16, 107, 163, 0.08)",
            borderRadius: "20px",
            marginBottom: "2rem",
            boxShadow: "0 4px 15px rgba(16, 107, 163, 0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "1rem" }}>
              {language === "ar" ? "🎨 الصورة الشخصية والرمز المختار:" : "🎨 Custom Avatar & Profile Photo:"}
            </span>
            <div style={{ display: "flex", gap: "0.25rem", background: "rgba(16, 107, 163, 0.06)", padding: "4px", borderRadius: "12px" }}>
              {(["vectors", "animals", "tech", "golden"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSettingsAvatarTab(tab)}
                  type="button"
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: settingsAvatarTab === tab ? "#ffffff" : "transparent",
                    color: settingsAvatarTab === tab ? "var(--primary)" : "#6a7c88",
                    boxShadow: settingsAvatarTab === tab ? "0 2px 8px rgba(0, 0, 0, 0.05)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  {tab === "vectors" && (language === "ar" ? "متجهة" : "Vectors")}
                  {tab === "animals" && (language === "ar" ? "حيوانات" : "Animals")}
                  {tab === "tech" && (language === "ar" ? "تقنية" : "Tech")}
                  {tab === "golden" && (language === "ar" ? "ذهبية" : "Premium")}
                </button>
              ))}
            </div>
          </div>

          {/* Avatar Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))",
              gap: "0.85rem",
              maxHeight: "130px",
              overflowY: "auto",
              padding: "0.5rem",
              background: "rgba(255, 255, 255, 0.8)",
              borderRadius: "16px",
              border: "1px solid rgba(16, 107, 163, 0.05)",
            }}
            className="custom-scroll-container"
          >
            {avatarCategories[settingsAvatarTab]?.map((item, idx) => {
              const isSelected = settingsAvatar === item.e;
              return (
                <button
                  key={idx}
                  onClick={() => setSettingsAvatar(item.e)}
                  type="button"
                  style={{
                    aspectRatio: "1/1",
                    borderRadius: "14px",
                    border: isSelected ? "2px solid var(--secondary)" : "1px solid rgba(16, 107, 163, 0.08)",
                    background: isSelected ? "rgba(212, 175, 55, 0.08)" : "#ffffff",
                    fontSize: "1.75rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: isSelected ? "0 4px 12px rgba(212, 175, 55, 0.15)" : "none",
                    transform: isSelected ? "scale(1.05)" : "none",
                    transition: "all 0.15s ease",
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = "var(--primary)";
                  }}
                  onMouseOut={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = "rgba(16, 107, 163, 0.08)";
                  }}
                  title={language === "ar" ? item.lAr : item.lEn}
                >
                  {item.e.startsWith("/") ? (
                    <img src={item.e} alt={item.lEn} style={{ width: "42px", height: "42px", objectFit: "contain" }} />
                  ) : (
                    item.e
                  )}
                </button>
              );
            })}
          </div>

          {/* Avatar Action Section */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "54px",
                  height: "54px",
                  borderRadius: "50%",
                  background: "rgba(16, 107, 163, 0.08)",
                  border: "2px solid var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.8rem",
                  overflow: "hidden",
                }}
              >
                {renderAvatar(settingsAvatar || "🚀", "1.8rem")}
              </div>
              <div>
                <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--primary)", display: "block" }}>
                  {language === "ar" ? "الرمز المختار" : "Chosen Avatar"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>
                  {settingsAvatar
                    ? language === "ar"
                      ? avatarCategories[settingsAvatarTab]?.find((a) => a.e === settingsAvatar)?.lAr || "مخصص"
                      : avatarCategories[settingsAvatarTab]?.find((a) => a.e === settingsAvatar)?.lEn || "Custom"
                    : language === "ar" ? "يرجى اختيار رمز أو تحميل صورة" : "Please select an icon or upload a photo"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {settingsLoading && (
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--primary)",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  ⏳ {settingsStatusText}
                </span>
              )}
              <label
                style={{
                  padding: "0.75rem 1.15rem",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  borderRadius: "12px",
                  border: "1px solid rgba(212, 175, 55, 0.2)",
                  background:
                    "linear-gradient(135deg, rgba(16, 107, 163, 0.05), rgba(212, 175, 55, 0.05))",
                  color: "var(--primary)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "none";
                }}
              >
                <span>📁 {language === "ar" ? "تحميل صورة شخصية جديدة" : "Upload New Photo"}</span>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }} className="grid-cols-2">
          {/* School Preferences */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", position: "relative" }}>
            <label style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--foreground)" }}>
              {language === "ar" ? "المدرسة أو المؤسسة التعليمية" : "School or Educational Institution"}
            </label>
            <input
              type="text"
              value={preferencesSchool}
              onChange={(e) => {
                setPreferencesSchool(e.target.value);
                fetchPlaces(e.target.value);
              }}
              placeholder={language === "ar" ? "أدخل اسم مدرستك" : "Enter your school name"}
              style={{
                padding: "0.85rem 1.1rem",
                borderRadius: "var(--border-radius-md)",
                border: "1px solid var(--card-border)",
                outline: "none",
                fontFamily: "var(--font-sans)",
                background: "#ffffff",
                fontSize: "0.95rem",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                transition: "border-color 0.2s ease",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--primary)";
                fetchPlaces(preferencesSchool);
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--card-border)";
                setTimeout(() => {
                  setPlacesResults([]);
                }, 200);
              }}
            />
            {searchingPlaces && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", position: "absolute", right: language === "ar" ? undefined : "1rem", left: language === "ar" ? "1rem" : undefined, bottom: "0.85rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#6a7c88", fontWeight: 600 }}>
                  {language === "ar" ? "جاري البحث..." : "Searching..."}
                </span>
              </div>
            )}
            {placesResults.length > 0 && (
              <div style={{
                position: "absolute",
                top: "105%",
                left: 0,
                right: 0,
                zIndex: 1000,
                background: "rgba(255, 255, 255, 0.98)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(16, 107, 163, 0.15)",
                borderRadius: "16px",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12)",
                maxHeight: "220px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                padding: "0.5rem"
              }} className="custom-scroll-container">
                {placesResults.map((place, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPreferencesSchool(place.name);
                      setPlacesResults([]);
                    }}
                    type="button"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.75rem 1rem",
                      borderRadius: "10px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: language === "ar" ? "right" : "left",
                      width: "100%",
                      transition: "all 0.15s ease",
                      direction: language === "ar" ? "rtl" : "ltr"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "rgba(16, 107, 163, 0.05)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span style={{ fontSize: "1.2rem" }}>
                      {place.type === "university" ? "🎓" : "🏫"}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-start", textAlign: language === "ar" ? "right" : "left", flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--foreground)" }}>{place.name}</span>
                      <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>{place.address}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile Visibility */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--foreground)" }}>
              {language === "ar" ? "ظهور الملف الشخصي" : "Profile Visibility"}
            </label>
            <select
              value={privacyVisibility}
              onChange={(e: any) => setPrivacyVisibility(e.target.value)}
              style={{
                padding: "0.85rem 1.1rem",
                borderRadius: "var(--border-radius-md)",
                border: "1px solid var(--card-border)",
                outline: "none",
                fontFamily: "var(--font-sans)",
                background: "#ffffff",
                fontSize: "0.95rem",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                transition: "border-color 0.2s ease",
              }}
            >
              <option value="public">{language === "ar" ? "عام (الجميع يمكنه رؤية ملفك)" : "Public (Visible to everyone)"}</option>
              <option value="friends">{language === "ar" ? "الأصدقاء فقط" : "Friends Only"}</option>
              <option value="private">{language === "ar" ? "خاص (مخفي من الدليل)" : "Private (Hidden from directory)"}</option>
            </select>
          </div>
        </div>

        {/* Toggles & Privacy Settings */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            background: "rgba(255, 255, 255, 0.4)",
            border: "1px solid rgba(235, 220, 185, 0.25)",
            borderRadius: "var(--border-radius-md)",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 700 }}>
            {language === "ar" ? "خيارات الخصوصية والتحكم" : "Privacy & Connection Preferences"}
          </h3>

          {/* Messages Switch */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{language === "ar" ? "مراسلات مباشرة" : "Allow Direct Messages"}</span>
              <span style={{ fontSize: "0.8rem", color: "#6a7c88" }}>
                {language === "ar" ? "السماح للمستخدمين الآخرين بإرسال رسائل مباشرة إليك" : "Let other active members message you directly"}
              </span>
            </div>
            <input
              type="checkbox"
              checked={privacyAllowMessages}
              onChange={(e) => setPrivacyAllowMessages(e.target.checked)}
              style={{ width: "20px", height: "20px", cursor: "pointer", accentColor: "var(--primary)" }}
            />
          </div>

          <div style={{ width: "100%", height: "1px", background: "rgba(235, 220, 185, 0.3)" }}></div>

          {/* Show Activity Switch */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{language === "ar" ? "عرض سجل الأنشطة" : "Show Activity Timeline"}</span>
              <span style={{ fontSize: "0.8rem", color: "#6a7c88" }}>
                {language === "ar"
                  ? "إظهار سجل أنشطتك واستعلامات الذكاء الاصطناعي في صفحتك العامة"
                  : "Display your study session history and AI interactions on your profile"}
              </span>
            </div>
            <input
              type="checkbox"
              checked={privacyShowActivity}
              onChange={(e) => setPrivacyShowActivity(e.target.checked)}
              style={{ width: "20px", height: "20px", cursor: "pointer", accentColor: "var(--primary)" }}
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleUpdatePrivacySettings}
          className="btn btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", minWidth: "160px" }}
        >
          <FiCheckCircle />
          <span>{language === "ar" ? "حفظ التغييرات" : "Save Settings"}</span>
        </button>
      </section>

      {/* Gamification & Swarm Telemetry Section */}
      <section
        className="panel-card"
        style={{
          padding: "2rem",
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(16, 107, 163, 0.1)",
          borderRadius: "20px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.03)",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.4rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            borderBottom: "1px dashed rgba(16, 107, 163, 0.15)",
            paddingBottom: "1rem",
            marginBottom: "0.5rem",
            fontWeight: 800,
            color: "var(--primary)",
          }}
        >
          <FiActivity style={{ animation: "pulse 2s infinite" }} />
          <span>{language === "ar" ? "تحليلات السرب والألعاب الأكاديمية" : "Swarm Analytics & Academic Gamification"}</span>
        </h2>

        <p style={{ fontSize: "0.9rem", color: "#5a6a75", lineHeight: "1.5", margin: 0 }}>
          {language === "ar"
            ? "يستخدم وكيل التحليلات (Insights Agent) تجميعات قواعد بيانات MongoDB Atlas لتتبع الجوانب التعليمية الأربعة ومستويات الفهم لديك. يتم رصد نشاط السرب والتعلم الذاتي تلقائياً هنا."
            : "Our specialized Insights Agent utilizes database-side MongoDB Atlas Aggregation Pipelines to monitor your cognitive achievements, active streaks, and misconception risk matrices in real-time."}
        </p>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }} className="grid-cols-1">
          
          {/* Level & Streak Card */}
          <div
            style={{
              padding: "1.25rem",
              borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(16, 107, 163, 0.05), rgba(212, 175, 55, 0.05))",
              border: "1px solid rgba(16, 107, 163, 0.08)",
              textAlign: "start",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--primary)" }}>
                🏆 {language === "ar" ? "المستوى الدراسي الحالي" : "Active Academic Level"}
              </span>
              <span
                style={{
                  background: "rgba(212, 175, 55, 0.15)",
                  color: "var(--accent)",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  padding: "4px 8px",
                  borderRadius: "8px",
                }}
              >
                {getLevelBadgeText()}
              </span>
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--foreground)", marginBottom: "0.25rem" }}>
              {language === "ar" ? `المستوى ${activeLevel}` : `Level ${activeLevel}`}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#6a7c88", marginBottom: "0.75rem" }}>
              🔥 {language === "ar" ? `سلسلة المذاكرة: ${activeStreak} أيام متتالية` : `Current Daily Streak: ${activeStreak} Days Active`}
            </div>

            {/* Progress Bar */}
            <div style={{ width: "100%", height: "8px", background: "rgba(16, 107, 163, 0.08)", borderRadius: "10px", overflow: "hidden", marginBottom: "0.5rem" }}>
              <div style={{ width: `${xpProgressPercent}%`, height: "100%", background: "linear-gradient(90deg, var(--primary), var(--secondary))", borderRadius: "10px" }}></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#6a7c88" }}>
              <span>{activeXp.toLocaleString()} XP</span>
              <span>
                {nextLevelXp.toLocaleString()} XP ({language === "ar" ? "المستوى التالي" : "Next Level"})
              </span>
            </div>
          </div>

          {/* Cognitive Tokens Card - Dynamic Private Student Quota Meter */}
          <div
            style={{
              padding: "1.5rem",
              borderRadius: "20px",
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.03), rgba(16, 107, 163, 0.04))",
              border: "1px solid rgba(16, 107, 163, 0.12)",
              textAlign: "start",
              boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.04)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Background glowing indicator */}
            <div 
              style={{
                position: "absolute",
                top: "-10%",
                right: "-10%",
                width: "150px",
                height: "150px",
                background: "radial-gradient(circle, rgba(13, 148, 136, 0.08) 0%, rgba(13, 148, 136, 0) 70%)",
                pointerEvents: "none",
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <span style={{ fontWeight: 850, fontSize: "0.95rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                🧠 {language === "ar" ? "مؤشرات استهلاك الرموز المعرفية (CLT)" : "Cognitive Token Quotas (CLT)"}
              </span>
              
              {isLoadingStats ? (
                <span style={{ fontSize: "0.75rem", color: "#6a7c88", fontWeight: 600 }}>
                  {language === "ar" ? "جاري التحميل..." : "Loading stats..."}
                </span>
              ) : tokenStats?.enabled === false ? (
                <span
                  style={{
                    background: "rgba(212, 175, 55, 0.15)",
                    border: "1px solid rgba(212, 175, 55, 0.3)",
                    color: "#b45309",
                    fontSize: "0.7rem",
                    fontWeight: 900,
                    padding: "4px 10px",
                    borderRadius: "20px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    boxShadow: "0 2px 10px rgba(212, 175, 55, 0.1)",
                    animation: "pulse 2s infinite",
                  }}
                >
                  👑 {language === "ar" ? "غير محدود (حساب محكم/VIP)" : "Override Active (Unlimited)"}
                </span>
              ) : (
                <span
                  style={{
                    background: "rgba(13, 148, 136, 0.12)",
                    border: "1px solid rgba(13, 148, 136, 0.2)",
                    color: "var(--accent-green)",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: "20px",
                  }}
                >
                  ⚡ {language === "ar" ? "نظام الحماية المعرفية نشط" : "Cognitive Safety Shield Active"}
                </span>
              )}
            </div>

            {isLoadingStats ? (
              /* Pulse skeleton loader for limits card */
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.4rem", animation: "pulse 1.5s infinite" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ width: "80px", height: "12px", background: "rgba(0,0,0,0.06)", borderRadius: "4px" }}></div>
                      <div style={{ width: "40px", height: "12px", background: "rgba(0,0,0,0.06)", borderRadius: "4px" }}></div>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "rgba(0,0,0,0.04)", borderRadius: "10px" }}></div>
                  </div>
                ))}
              </div>
            ) : (
              /* Full Localized Premium Bar Graphs */
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                
                {/* 1. Daily usage metric */}
                {(() => {
                  const dailyUsed = tokenStats?.used?.daily ?? 0;
                  const dailyLimit = Math.round((tokenStats?.limit?.weekly ?? 250000) / 7);
                  const dailyPct = Math.min(100, Math.round((dailyUsed / Math.max(1, dailyLimit)) * 100));
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700 }}>
                        <span style={{ color: "var(--foreground)" }}>
                          🌅 {language === "ar" ? "البصمة المعرفية اليومية" : "Daily Cognitive Footprint"}
                        </span>
                        <span style={{ color: "#6a7c88" }}>
                          {dailyUsed.toLocaleString()} <span style={{ fontSize: "0.7rem", fontWeight: 500 }}>/ {dailyLimit.toLocaleString()} CLT</span>
                        </span>
                      </div>
                      
                      {/* Bar */}
                      <div style={{ width: "100%", height: "8px", background: "rgba(13, 148, 136, 0.08)", borderRadius: "10px", overflow: "hidden", position: "relative" }}>
                        <div 
                          style={{ 
                            width: `${dailyPct}%`, 
                            height: "100%", 
                            background: "linear-gradient(90deg, #10b981, #0d9488)", 
                            borderRadius: "10px",
                            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                          }} 
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#82939e", fontWeight: 600 }}>
                        <span>{language === "ar" ? `مستهلك: ${dailyPct}%` : `Daily Consumption: ${dailyPct}%`}</span>
                        <span>{language === "ar" ? "إعادة التعيين عند منتصف الليل" : "Resets at midnight"}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Weekly quota metric */}
                {(() => {
                  const weeklyUsed = tokenStats?.used?.weekly ?? 0;
                  const weeklyLimit = tokenStats?.limit?.weekly ?? 250000;
                  const weeklyPct = Math.min(100, Math.round((weeklyUsed / Math.max(1, weeklyLimit)) * 100));
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700 }}>
                        <span style={{ color: "var(--foreground)" }}>
                          📅 {language === "ar" ? "الحصة المعرفية الأسبوعية" : "Weekly Cognitive Quota"}
                        </span>
                        <span style={{ color: "#6a7c88" }}>
                          {weeklyUsed.toLocaleString()} <span style={{ fontSize: "0.7rem", fontWeight: 500 }}>/ {weeklyLimit.toLocaleString()} CLT</span>
                        </span>
                      </div>
                      
                      {/* Bar */}
                      <div style={{ width: "100%", height: "8px", background: "rgba(13, 148, 136, 0.08)", borderRadius: "10px", overflow: "hidden" }}>
                        <div 
                          style={{ 
                            width: `${weeklyPct}%`, 
                            height: "100%", 
                            background: "linear-gradient(90deg, #0d9488, #106ba3)", 
                            borderRadius: "10px",
                            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                          }} 
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#82939e", fontWeight: 600 }}>
                        <span>{language === "ar" ? `نسبة الاستهلاك: ${weeklyPct}%` : `Weekly Quota Spent: ${weeklyPct}%`}</span>
                        <span>
                          {language === "ar" ? `${(weeklyLimit - weeklyUsed).toLocaleString()} رمز متبقي` : `${(weeklyLimit - weeklyUsed).toLocaleString()} CLT remaining`}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Monthly quota metric */}
                {(() => {
                  const monthlyUsed = tokenStats?.used?.monthly ?? 0;
                  const monthlyLimit = tokenStats?.limit?.monthly ?? 1000000;
                  const monthlyPct = Math.min(100, Math.round((monthlyUsed / Math.max(1, monthlyLimit)) * 100));
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700 }}>
                        <span style={{ color: "var(--foreground)" }}>
                          🌌 {language === "ar" ? "الحجم المعرفي الشهري الكلي" : "Monthly Cognitive Volume"}
                        </span>
                        <span style={{ color: "#6a7c88" }}>
                          {monthlyUsed.toLocaleString()} <span style={{ fontSize: "0.7rem", fontWeight: 500 }}>/ {monthlyLimit.toLocaleString()} CLT</span>
                        </span>
                      </div>
                      
                      {/* Bar */}
                      <div style={{ width: "100%", height: "8px", background: "rgba(13, 148, 136, 0.08)", borderRadius: "10px", overflow: "hidden" }}>
                        <div 
                          style={{ 
                            width: `${monthlyPct}%`, 
                            height: "100%", 
                            background: "linear-gradient(90deg, #106ba3, #4f46e5)", 
                            borderRadius: "10px",
                            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                          }} 
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#82939e", fontWeight: 600 }}>
                        <span>{language === "ar" ? `مستهلك موازنة الشهر: ${monthlyPct}%` : `Monthly Volume Spent: ${monthlyPct}%`}</span>
                        <span>
                          {language === "ar" ? `${(monthlyLimit - monthlyUsed).toLocaleString()} رمز متبقي` : `${(monthlyLimit - monthlyUsed).toLocaleString()} CLT remaining`}
                        </span>
                      </div>
                    </div>
                  );
                })()}

              </div>
            )}
          </div>
        </div>

        {/* Misconception Risk Matrix */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", textAlign: "start" }}>
          <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--foreground)" }}>
            🎯 {language === "ar" ? "مصفوفة فجوات الفهم المعرفي وحالة المواضيع" : "Concept Misconception Risk Matrix (MongoDB Analytics)"}
          </span>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            
            {/* Topic 1 */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(16, 107, 163, 0.06)",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--primary)" }}>
                  📊 {language === "ar" ? "الرياضيات والنسب" : "Math: Matrices"}
                </span>
                <span style={{ fontSize: "0.7rem", fontWeight: 800, background: "rgba(34, 197, 94, 0.12)", color: "#16a34a", padding: "2px 6px", borderRadius: "6px" }}>
                  {language === "ar" ? "آمن" : "Low Risk"}
                </span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>
                {language === "ar" ? "مفاهيم محددات المصفوفة ومعكوسها ممتازة." : "Mastered Singular Matrix inverse checks perfectly."}
              </span>
              <div style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                <span>{language === "ar" ? "دقة الإجابة:" : "Avg Accuracy:"} 92%</span>
                <span>{language === "ar" ? "3 محاولات" : "3 Sessions"}</span>
              </div>
            </div>

            {/* Topic 2 */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(16, 107, 163, 0.06)",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--primary)" }}>
                  🧬 {language === "ar" ? "الأحياء والخلية" : "Science: Chemistry 2e"}
                </span>
                <span style={{ fontSize: "0.7rem", fontWeight: 800, background: "rgba(234, 179, 8, 0.12)", color: "#ca8a04", padding: "2px 6px", borderRadius: "6px" }}>
                  {language === "ar" ? "متوسط" : "Moderate Risk"}
                </span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>
                {language === "ar" ? "فجوة بسيطة في فهم ثابت الاتزان للتفاعلات." : "Confusion spotted around chemical equilibrium rules."}
              </span>
              <div style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                <span>{language === "ar" ? "دقة الإجابة:" : "Avg Accuracy:"} 74%</span>
                <span>{language === "ar" ? "5 محاولات" : "5 Sessions"}</span>
              </div>
            </div>

            {/* Topic 3 */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(16, 107, 163, 0.06)",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--primary)" }}>
                  📖 {language === "ar" ? "اللغة العربية وقواعدها" : "Arabic: Grammar"}
                </span>
                <span style={{ fontSize: "0.7rem", fontWeight: 800, background: "rgba(220, 38, 38, 0.12)", color: "#dc2626", padding: "2px 6px", borderRadius: "6px" }}>
                  {language === "ar" ? "مرتفع" : "High Risk"}
                </span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>
                {language === "ar" ? "صعوبة في تحديد مواضع إعراب جمع المذكر السالم." : "Issues parsed with complex verb modifiers rules."}
              </span>
              <div style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                <span>{language === "ar" ? "دقة الإجابة:" : "Avg Accuracy:"} 48%</span>
                <span>{language === "ar" ? "4 محاولات" : "4 Sessions"}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Swarm Real-Time Telemetry console */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", textAlign: "start" }}>
          <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "#6a7c88", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span className="pulse-icon" style={{ fontSize: "0.6rem" }}>🟢</span>
            {language === "ar" ? "سجل تحليلات ومحاكاة السرب النشط (MongoDB Aggregate Pipe):" : "Active Swarm Network Telemetry Trace (MongoDB Aggregations):"}
          </span>

          <div
            style={{
              padding: "0.85rem 1.1rem",
              borderRadius: "12px",
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(16, 107, 163, 0.2)",
              fontFamily: "monospace",
              fontSize: "0.75rem",
              color: "#38bdf8",
              maxHeight: "135px",
              overflowY: "auto",
              lineHeight: "1.4",
              boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)",
            }}
            className="custom-scrollbar"
          >
            <div>[SYSTEM] Inicitalizing MongoDB Insights aggregate client...</div>
            <div style={{ color: "#a7f3d0" }}>
              [MONGODB] pipeline: [ {`{ "$match": { "userId": "${user?.uid || "anon"}" } }`},{" "}
              {`{ "$group": { "_id": "$topic_id", "accuracy": { "$avg": "$score" } } }`} ]
            </div>
            <div style={{ color: "#fef08a" }}>
              [INSIGHTS_AGENT] Aggregating 12 historical study session attempts from MongoDB.
            </div>
            <div>[PRACTICE_AGENT] Feedback loop grading completed: Score 0.88 over 2 text practice inputs.</div>
            <div style={{ color: "#38bdf8" }}>
              [ZATONA_AGENT] Compressed Chapter 1 &apos;Matrices&apos; formula context into 4 active recall bytes.
            </div>
            <div style={{ color: "#fca5a5" }}>[COMPANION] User typed command &apos;/explain&apos;. Handoff activated in full screen context...</div>
            <div>[SYSTEM] Telemetry synchronized. Metrics and Misconception Risk Matrix updated successfully.</div>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section
        className="panel-card"
        style={{
          padding: "2rem",
          border: "1px solid rgba(211, 47, 47, 0.25)",
          background: "rgba(211, 47, 47, 0.03)",
          borderRadius: "var(--border-radius-md)",
        }}
      >
        <h2 style={{ fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "0.6rem", color: "#c62828", margin: "0 0 1rem 0", fontWeight: 800 }}>
          <FiAlertTriangle style={{ color: "#d32f2f" }} />
          <span>{language === "ar" ? "منطقة الخطر: حذف الحساب والبيانات (GDPR)" : "Danger Zone: GDPR Right to be Forgotten"}</span>
        </h2>
        <p style={{ fontSize: "0.9rem", color: "#5a6a75", lineHeight: "1.6", marginBottom: "1.5rem" }}>
          {language === "ar"
            ? "بموجب المادة 17 من اللائحة العامة لحماية البيانات (GDPR)، يحق لك طلب حذف حسابك نهائياً من النظام. الضغط على الزر أدناه سيقوم بمسح كامل لملفك الشخصي، وسجلات الدردشة والرسائل المباشرة، وسجل الأنشطة بالكامل، وإحصاءات استهلاك الرموز (Tokens) من خوادمنا بشكل نهائي وغير قابل للاسترجاع."
            : "Under Article 17 of the General Data Protection Regulation (GDPR), you hold the right to erasure. Triggering the process below immediately deletes your user profile, chat history, direct messages, study logs, and token telemetry from our MongoDB servers permanently. This action is absolutely irreversible."}
        </p>
        <button
          type="button"
          onClick={handleDeleteUserAccount}
          style={{
            background: "#d32f2f",
            color: "#ffffff",
            border: "none",
            padding: "0.85rem 1.5rem",
            borderRadius: "var(--border-radius-md)",
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "background 0.2s ease, transform 0.1s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#c62828")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#d32f2f")}
        >
          <FiTrash2 />
          <span>{language === "ar" ? "حذف حسابي وكافة بياناتي نهائياً" : "Permanently Erase My Account"}</span>
        </button>
      </section>
    </div>
  );
};
