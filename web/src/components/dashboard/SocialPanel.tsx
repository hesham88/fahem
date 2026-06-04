"use client";

import React from "react";
import {
  FiShield,
  FiRefreshCw,
  FiUserCheck,
  FiClock,
  FiUserPlus,
  FiMessageSquare,
  FiX,
  FiSend,
  FiUsers,
  FiUserMinus,
  FiUser,
} from "react-icons/fi";

/**
 * Props definition for SocialPanel.
 */
interface SocialPanelProps {
  language: "ar" | "en";
  user: any;
  userProfile: any;
  
  // Parental Panel states and handlers
  parentChildrenLoading: boolean;
  parentChildren: any[];
  approveChildProfile: (userId: string) => void;
  
  // Chat Messenger states and handlers
  chatRecipient: any | null;
  setChatRecipient: (recipient: any | null) => void;
  chatLoading: boolean;
  chatMessages: any[];
  typingUsers: any[];
  chatInput: string;
  setChatInput: (val: string) => void;
  sendChatMessage: () => void;
  fetchChatMessages: (userId: string) => void;
  
  // Connections and Directory list states and handlers
  allUsers: any[];
  loadingAllUsers: boolean;
  directorySearch: string;
  setDirectorySearch: (val: string) => void;
  handleToggleFriend: (friend: any) => void;
  
  // Dynamic helpers passed from parent
  renderAvatar: (avatar: any, size: string) => React.ReactNode;
}

/**
 * SocialPanel: A modular component representing the "Social Network & Interactive Chat".
 * Contains child profile approvals for parents (COPPA compliance), live Direct Messaging DM channels
 * with typing indicators, and a searchable members directory.
 */
export const SocialPanel: React.FC<SocialPanelProps> = ({
  language,
  user,
  userProfile,
  parentChildrenLoading,
  parentChildren,
  approveChildProfile,
  chatRecipient,
  setChatRecipient,
  chatLoading,
  chatMessages,
  typingUsers,
  chatInput,
  setChatInput,
  sendChatMessage,
  fetchChatMessages,
  allUsers,
  loadingAllUsers,
  directorySearch,
  setDirectorySearch,
  handleToggleFriend,
  renderAvatar,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Parent Control & Approvals Panel */}
      {userProfile?.userType === "parent" && (
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
            <FiShield style={{ color: "var(--primary)" }} />
            <span>
              {language === "ar" ? "إدارة حسابات الأبناء والموافقات الأبوية" : "Children Panel & Parental Consents"}
            </span>
          </h2>
          <p style={{ color: "#4f6371", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: "1.6" }}>
            {language === "ar"
              ? "بصفتك ولي أمر، يمكنك مراقبة حسابات أبنائك الذين تقل أعمارهم عن 13 عاماً والموافقة على تفعيلها للسماح لهم بالاستفادة من خدمات المنصة والذكاء الاصطناعي تماشياً مع معايير COPPA وحماية الأطفال."
              : "As a parent, you have direct oversight over your children's profiles. Approve pending children below to authorize their access to Fahem AI tools under COPPA and standard protection protocols."}
          </p>

          {parentChildrenLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#6a7c88" }}>
              <FiRefreshCw className="spinning-icon" />
              <span>{language === "ar" ? "جاري تحميل حسابات الأبناء..." : "Fetching children records..."}</span>
            </div>
          ) : parentChildren.length === 0 ? (
            <div
              style={{
                padding: "1.5rem",
                background: "rgba(255, 255, 255, 0.4)",
                borderRadius: "var(--border-radius-md)",
                border: "1px dashed var(--card-border)",
                textAlign: "center",
                color: "#6a7c88",
              }}
            >
              {language === "ar"
                ? "لم يتم العثور على أي حسابات أبناء مسجلة بريدك الإلكتروني كولي أمر حالياً."
                : "No child profiles are registered under your parent email address yet."}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
              {parentChildren.map((child: any) => (
                <div
                  key={child.userId}
                  style={{
                    padding: "1.25rem",
                    borderRadius: "var(--border-radius-md)",
                    background: "rgba(255, 255, 255, 0.65)",
                    border: "1px solid var(--card-border)",
                    boxShadow: "var(--shadow-sm)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.85rem",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span
                      style={{
                        fontSize: "2.5rem",
                        background: "rgba(16, 107, 163, 0.06)",
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {renderAvatar(child.avatar, "2.5rem")}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                      <strong style={{ fontSize: "1.1rem", color: "var(--foreground)" }}>{child.name}</strong>
                      <span style={{ fontSize: "0.8rem", color: "#6a7c88" }}>{child.email}</span>
                      <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600 }}>
                        {language === "ar" ? `العمر: ${child.age} سنة` : `Age: ${child.age} years old`}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.5rem 0",
                      borderTop: "1px solid rgba(235, 220, 185, 0.2)",
                    }}
                  >
                    <span style={{ fontSize: "0.8rem", color: "#6a7c88" }}>
                      {language === "ar" ? `المسار: ${child.grade}` : `Track: ${child.grade}`}
                    </span>
                    {child.isApproved ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          padding: "4px 10px",
                          borderRadius: "10px",
                          background: "rgba(46, 125, 50, 0.1)",
                          color: "var(--accent-green)",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        <FiUserCheck />
                        {language === "ar" ? "مصرح ونشط" : "Approved"}
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          padding: "4px 10px",
                          borderRadius: "10px",
                          background: "rgba(211, 47, 47, 0.1)",
                          color: "#d32f2f",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        <FiClock />
                        {language === "ar" ? "قيد المراجعة" : "Pending Consent"}
                      </span>
                    )}
                  </div>

                  {!child.isApproved && (
                    <button
                      type="button"
                      onClick={() => approveChildProfile(child.userId)}
                      className="btn btn-primary"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.4rem",
                        padding: "0.6rem",
                        fontSize: "0.85rem",
                      }}
                    >
                      <FiUserPlus />
                      <span>{language === "ar" ? "تفعيل الحساب والموافقة" : "Authorize Child Account"}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Main Messenger and Directory Split Layout */}
      <div className="grid-cols-2" style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "2rem" }}>
        
        {/* Left Side: Messenger Direct DM Panel */}
        <section
          className="panel-card"
          style={{ padding: "1.5rem", display: "flex", flexDirection: "column", minHeight: "550px" }}
        >
          {!chatRecipient ? (
            /* No chat recipient selected */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                textAlign: "center",
                gap: "1rem",
                padding: "2rem",
              }}
            >
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: "rgba(16, 107, 163, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                  animation: "pulse 2s infinite",
                }}
              >
                <FiMessageSquare style={{ fontSize: "2.5rem", color: "var(--primary)" }} />
              </div>
              <h3 style={{ fontSize: "1.25rem", margin: 0 }}>
                {language === "ar" ? "مراسلات آمنة ومباشرة" : "Secure Direct Messenger"}
              </h3>
              <p style={{ color: "#6a7c88", fontSize: "0.9rem", maxWidth: "340px", lineHeight: "1.6", margin: 0 }}>
                {language === "ar"
                  ? "اختر صديقاً من قائمتك أو ابحث عن مستخدمين في الدليل لبدء محادثة مشفرة وآمنة في الوقت الفعلي."
                  : "Select a friend from your roster or discover users in the platform directory to exchange private messages."}
              </p>
            </div>
          ) : (
            /* Chat client active */
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              {/* Chat Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px dashed rgba(235, 220, 185, 0.4)",
                  paddingBottom: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {renderAvatar(chatRecipient.avatar, "2.2rem")}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <strong style={{ fontSize: "1.1rem", color: "var(--foreground)" }}>{chatRecipient.name}</strong>
                    <span style={{ fontSize: "0.75rem", color: "#6a7c88" }}>
                      {chatRecipient.userType === "student"
                        ? language === "ar" ? "طالب" : "Student"
                        : chatRecipient.userType === "teacher"
                        ? language === "ar" ? "معلم" : "Teacher"
                        : chatRecipient.userType === "parent"
                        ? language === "ar" ? "ولي أمر" : "Parent"
                        : language === "ar" ? "مشرف" : "Admin"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setChatRecipient(null)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "1.2rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: "0.5rem",
                    borderRadius: "50%",
                    transition: "background 0.2s ease",
                  }}
                  className="btn-close-chat"
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  aria-label="Close Chat"
                >
                  <FiX />
                </button>
              </div>

              {/* Messages Body */}
              <div
                style={{
                  flex: 1,
                  maxHeight: "350px",
                  overflowY: "auto",
                  padding: "0.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                  marginBottom: "1rem",
                }}
                className="custom-scrollbar"
              >
                {chatLoading ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                      gap: "0.5rem",
                      color: "#6a7c88",
                    }}
                  >
                    <FiRefreshCw className="spinning-icon" />
                    <span>{language === "ar" ? "جاري جلب الرسائل..." : "Retrieving history..."}</span>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                      color: "#8a9ca8",
                      fontSize: "0.9rem",
                    }}
                  >
                    {language === "ar" ? "ابدأ المحادثة الآن! اكتب رسالة أدناه 👇" : "No messages yet. Send a friendly hello! 👇"}
                  </div>
                ) : (
                  chatMessages.map((msg: any, index: number) => {
                    const isMe = msg.senderId === user?.uid;
                    let timeStr = "";
                    try {
                      timeStr = new Date(msg.timestamp).toLocaleTimeString(language, {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    } catch (_) {}

                    return (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isMe ? "flex-end" : "flex-start",
                          alignSelf: isMe ? "flex-end" : "flex-start",
                          maxWidth: "85%",
                        }}
                      >
                        <div
                          style={{
                            padding: "0.75rem 1rem",
                            borderRadius: isMe
                              ? language === "ar" ? "16px 16px 4px 16px" : "16px 16px 16px 4px"
                              : language === "ar" ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                            background: isMe
                              ? "linear-gradient(135deg, var(--primary), var(--secondary))"
                              : "rgba(255,255,255,0.75)",
                            color: isMe ? "#ffffff" : "var(--foreground)",
                            border: isMe ? "none" : "1px solid var(--card-border)",
                            boxShadow: "var(--shadow-sm)",
                            fontSize: "0.95rem",
                            lineHeight: "1.5",
                            textAlign: language === "ar" ? "right" : "left",
                            wordBreak: "break-word",
                          }}
                        >
                          {msg.content}
                        </div>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            color: "#8a9ca8",
                            marginTop: "2px",
                            display: "inline-block",
                            padding: "0 4px",
                          }}
                        >
                          {timeStr}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Real-time Typing Indicators */}
              {typingUsers.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.75rem",
                    background: "rgba(16, 107, 163, 0.04)",
                    borderRadius: "12px",
                    fontSize: "0.8rem",
                    color: "var(--primary)",
                    alignSelf: "flex-start",
                    marginBottom: "0.5rem",
                    border: "1px solid rgba(16, 107, 163, 0.08)",
                    animation: "pulse-ring 2s infinite",
                  }}
                >
                  <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                    <span
                      className="typing-dot"
                      style={{
                        width: "5px",
                        height: "5px",
                        background: "var(--primary)",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "typing-bounce 1.4s infinite ease-in-out",
                      }}
                    />
                    <span
                      className="typing-dot"
                      style={{
                        width: "5px",
                        height: "5px",
                        background: "var(--primary)",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "typing-bounce 1.4s infinite ease-in-out 0.2s",
                      }}
                    />
                    <span
                      className="typing-dot"
                      style={{
                        width: "5px",
                        height: "5px",
                        background: "var(--primary)",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "typing-bounce 1.4s infinite ease-in-out 0.4s",
                      }}
                    />
                  </div>
                  <span style={{ fontWeight: 600 }}>
                    {typingUsers.map((u) => u.name).join(", ")}{" "}
                    {language === "ar" ? "يكتب الآن..." : "is typing..."}
                  </span>
                </div>
              )}

              {/* Messages Footer Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendChatMessage();
                }}
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  borderTop: "1px dashed rgba(235, 220, 185, 0.4)",
                  paddingTop: "1rem",
                }}
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={language === "ar" ? "اكتب رسالة مشفرة..." : "Type a secure message..."}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--border-radius-md)",
                    border: "1px solid var(--card-border)",
                    outline: "none",
                    fontFamily: "var(--font-sans)",
                    background: "#ffffff",
                    fontSize: "0.95rem",
                  }}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="btn btn-primary"
                  style={{ padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <FiSend />
                </button>
              </form>
            </div>
          )}
        </section>

        {/* Right Side: Connections list & Directory */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Connections (Friends list) */}
          <section className="panel-card" style={{ padding: "1.5rem" }}>
            <h2
              style={{
                fontSize: "1.2rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem",
                borderBottom: "1px dashed rgba(235, 220, 185, 0.3)",
                paddingBottom: "0.5rem",
                fontWeight: 800,
              }}
            >
              <FiUserCheck style={{ color: "var(--accent-green)" }} />
              <span>{language === "ar" ? "قائمة الأصدقاء" : "Your Friend Circle"}</span>
            </h2>

            {userProfile?.friends?.length === 0 ? (
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "var(--border-radius-md)",
                  background: "rgba(255,255,255,0.4)",
                  border: "1px dashed var(--card-border)",
                  textAlign: "center",
                  color: "#6a7c88",
                  fontSize: "0.85rem",
                }}
              >
                {language === "ar"
                  ? "لم تقم بإضافة أي أصدقاء بعد. تصفح الدليل في الأسفل وأضف زملاء دراسة!"
                  : "No friends added to your circle yet. Add classmates below!"}
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "200px", overflowY: "auto" }}
                className="custom-scrollbar"
              >
                {allUsers
                  .filter((u: any) => userProfile?.friends?.includes(u.userId))
                  .map((friend: any) => (
                    <div
                      key={friend.userId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.6rem 0.85rem",
                        borderRadius: "var(--border-radius-sm)",
                        background: "rgba(255,255,255,0.6)",
                        border: "1px solid var(--card-border)",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {renderAvatar(friend.avatar, "1.5rem")}
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <strong style={{ fontSize: "0.9rem", color: "var(--foreground)" }}>{friend.name}</strong>
                          <span style={{ fontSize: "0.7rem", color: "#6a7c88" }}>{friend.email}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setChatRecipient(friend);
                            fetchChatMessages(friend.userId);
                          }}
                          className="btn btn-secondary"
                          style={{
                            padding: "0.35rem 0.65rem",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <FiMessageSquare />
                          <span>{language === "ar" ? "دردشة" : "Chat"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleFriend(friend)}
                          style={{
                            background: "rgba(211, 47, 47, 0.08)",
                            color: "#d32f2f",
                            border: "1px solid rgba(211, 47, 47, 0.2)",
                            padding: "0.35rem 0.65rem",
                            borderRadius: "var(--border-radius-sm)",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          {language === "ar" ? "حذف" : "Remove"}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* Directory */}
          <section className="panel-card" style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column" }}>
            <h2
              style={{
                fontSize: "1.2rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem",
                borderBottom: "1px dashed rgba(235, 220, 185, 0.3)",
                paddingBottom: "0.5rem",
                fontWeight: 800,
              }}
            >
              <FiUsers style={{ color: "var(--primary)" }} />
              <span>{language === "ar" ? "دليل مستخدمي المنصة" : "Discover Members & Directory"}</span>
            </h2>

            {/* Search bar */}
            <div style={{ position: "relative", marginBottom: "1rem" }}>
              <input
                type="text"
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
                placeholder={
                  language === "ar"
                    ? "ابحث عن مستخدمين بالاسم، البريد أو الدور..."
                    : "Search by name, email, or role..."
                }
                style={{
                  width: "100%",
                  padding: "0.6rem 1rem",
                  borderRadius: "var(--border-radius-sm)",
                  border: "1px solid var(--card-border)",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                  background: "#ffffff",
                  fontSize: "0.85rem",
                }}
              />
            </div>

            {loadingAllUsers ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "2rem",
                  gap: "0.5rem",
                  color: "#6a7c88",
                }}
              >
                <FiRefreshCw className="spinning-icon" />
                <span>{language === "ar" ? "جاري تحميل الدليل..." : "Loading directory list..."}</span>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "280px", overflowY: "auto" }}
                className="custom-scrollbar"
              >
                {allUsers
                  .filter((u: any) => u.userId !== user?.uid) // Exclude current user
                  .filter((u: any) => {
                    const s = directorySearch.toLowerCase();
                    return (
                      (u.name || "").toLowerCase().includes(s) ||
                      (u.email || "").toLowerCase().includes(s) ||
                      (u.userType || u.role || "").toLowerCase().includes(s) ||
                      (u.country || "").toLowerCase().includes(s)
                    );
                  })
                  .map((dirUser: any) => {
                    const isFriend = userProfile?.friends?.includes(dirUser.userId);

                    // Custom styling for role badge
                    let badgeBg = "rgba(16, 107, 163, 0.08)";
                    let badgeColor = "var(--primary)";
                    let roleName = dirUser.userType || dirUser.role || "student";
                    if (roleName === "admin") {
                      badgeBg = "rgba(198, 40, 40, 0.08)";
                      badgeColor = "#c62828";
                    } else if (roleName === "teacher") {
                      badgeBg = "rgba(245, 194, 66, 0.1)";
                      badgeColor = "var(--secondary-hover)";
                    } else if (roleName === "parent") {
                      badgeBg = "rgba(46, 125, 50, 0.08)";
                      badgeColor = "var(--accent-green)";
                    }

                    return (
                      <div
                        key={dirUser.userId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.6rem 0.85rem",
                          borderRadius: "var(--border-radius-sm)",
                          background: "rgba(255,255,255,0.45)",
                          border: "1px solid var(--card-border)",
                          boxShadow: "var(--shadow-sm)",
                          transition: "all 0.2s ease",
                        }}
                        className="directory-item"
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          {renderAvatar(dirUser.avatar, "1.8rem")}
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <strong style={{ fontSize: "0.85rem", color: "var(--foreground)" }}>
                                {dirUser.name}
                              </strong>
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  padding: "2px 6px",
                                  borderRadius: "8px",
                                  background: badgeBg,
                                  color: badgeColor,
                                  fontWeight: 700,
                                  textTransform: "capitalize",
                                }}
                              >
                                {roleName === "student"
                                  ? language === "ar" ? "طالب" : "Student"
                                  : roleName === "teacher"
                                  ? language === "ar" ? "معلم" : "Teacher"
                                  : roleName === "parent"
                                  ? language === "ar" ? "ولي أمر" : "Parent"
                                  : language === "ar" ? "مشرف" : "Admin"}
                              </span>
                            </div>
                            <span style={{ fontSize: "0.7rem", color: "#6a7c88" }}>{dirUser.email}</span>
                            {dirUser.school && (
                              <span style={{ fontSize: "0.68rem", color: "var(--primary)" }}>
                                🏫 {dirUser.school}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          {/* Profile Link */}
                          <a
                            href={`/${language}/profile/${dirUser.username || dirUser.userId}`}
                            className="btn btn-secondary"
                            style={{
                              padding: "0.35rem 0.55rem",
                              fontSize: "0.7rem",
                              display: "flex",
                              alignItems: "center",
                              textDecoration: "none",
                            }}
                          >
                            <FiUser />
                          </a>

                          {/* Add/Remove Friend */}
                          <button
                            type="button"
                            onClick={() => handleToggleFriend(dirUser)}
                            className={isFriend ? "btn btn-secondary" : "btn btn-primary"}
                            style={{
                              padding: "0.35rem 0.65rem",
                              fontSize: "0.7rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            {isFriend ? (
                              <>
                                <FiUserMinus />
                                <span>{language === "ar" ? "حذف" : "Remove"}</span>
                              </>
                            ) : (
                              <>
                                <FiUserPlus />
                                <span>{language === "ar" ? "صديق" : "Add Friend"}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        </div>

      </div>
    </div>
  );
};
