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


  const [placesResults, setPlacesResults] = React.useState<any[]>([]);
  const [searchingPlaces, setSearchingPlaces] = React.useState<boolean>(false);
  const placesSearchTimeoutRef = React.useRef<any>(null);
  const placesAbortControllerRef = React.useRef<AbortController | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

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
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setPlacesResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
          <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", position: "relative" }}>
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
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setPreferencesSchool(place.name);
                      setPlacesResults([]);
                    }}
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
