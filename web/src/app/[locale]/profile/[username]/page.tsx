"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "../../../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useTranslation } from "../../../../context/LanguageContext";
import { 
  FiArrowLeft, 
  FiArrowRight, 
  FiUserPlus, 
  FiUserMinus, 
  FiMail, 
  FiGlobe, 
  FiAward, 
  FiBookOpen, 
  FiCalendar,
  FiHome,
  FiUser,
  FiCpu
} from "react-icons/fi";

const profileTranslations = {
  en: {
    back: "Back to Home",
    notFound: "User profile not found",
    loading: "Loading user profile...",
    friends: "Friends",
    noFriends: "No friends added yet",
    school: "School",
    notSpecified: "Not specified",
    age: "Age",
    country: "Country",
    grade: "Grade",
    userType: "User Classification",
    role: "Authorization Role",
    addFriend: "Add Friend",
    removeFriend: "Unfriend",
    joined: "Joined platform",
    activeStatus: "Status",
    active: "Active",
    offline: "Offline",
    underageWarning: "Profile pending parental approval",
    lifeLongLearner: "Lifelong Learner",
    viewProfile: "View Profile"
  },
  ar: {
    back: "العودة للرئيسية",
    notFound: "الملف الشخصي للمستخدم غير موجود",
    loading: "جاري تحميل الملف الشخصي...",
    friends: "الأصدقاء",
    noFriends: "لا يوجد أصدقاء مضافون بعد",
    school: "المدرسة",
    notSpecified: "غير محدد",
    age: "العمر",
    country: "البلد",
    grade: "الصف الدراسي",
    userType: "تصنيف المستخدم",
    role: "صلاحية الوصول",
    addFriend: "إضافة كصديق",
    removeFriend: "إلغاء الصداقة",
    joined: "انضم إلى المنصة",
    activeStatus: "الحالة",
    active: "نشط الآن",
    offline: "غير متصل",
    underageWarning: "الملف الشخصي معلق بانتظار موافقة ولي الأمر",
    lifeLongLearner: "متعلم مدى الحياة",
    viewProfile: "عرض الملف الشخصي"
  },
  es: {
    back: "Volver al Inicio",
    notFound: "Perfil de usuario no encontrado",
    loading: "Cargando perfil de usuario...",
    friends: "Amigos",
    noFriends: "Aún no hay amigos agregados",
    school: "Escuela",
    notSpecified: "No especificado",
    age: "Edad",
    country: "País",
    grade: "Grado",
    userType: "Tipo de Usuario",
    role: "Rol de Autorización",
    addFriend: "Agregar Amigo",
    removeFriend: "Eliminar Amigo",
    joined: "Registrado el",
    activeStatus: "Estado",
    active: "Activo",
    offline: "Desconectado",
    underageWarning: "Perfil pendiente de aprobación parental",
    lifeLongLearner: "Estudiante de por vida",
    viewProfile: "Ver Perfil"
  },
  fr: {
    back: "Retour à l'accueil",
    notFound: "Profil introuvable",
    loading: "Chargement du profil...",
    friends: "Amis",
    noFriends: "Aucun ami ajouté",
    school: "École",
    notSpecified: "Non spécifié",
    age: "Âge",
    country: "Pays",
    grade: "Niveau",
    userType: "Type d'utilisateur",
    role: "Rôle d'autorisation",
    addFriend: "Ajouter un ami",
    removeFriend: "Retirer des amis",
    joined: "Inscrit le",
    activeStatus: "Statut",
    active: "En ligne",
    offline: "Hors ligne",
    underageWarning: "Profil en attente d'approbation parentale",
    lifeLongLearner: "Apprenant à vie",
    viewProfile: "Voir le profil"
  },
  de: {
    back: "Zurück zur Startseite",
    notFound: "Benutzerprofil nicht gefunden",
    loading: "Profil wird geladen...",
    friends: "Freunde",
    noFriends: "Noch keine Freunde hinzugefügt",
    school: "Schule",
    notSpecified: "Nicht angegeben",
    age: "Alter",
    country: "Land",
    grade: "Klasse",
    userType: "Benutzertyp",
    role: "Berechtigungsrolle",
    addFriend: "Freund hinzufügen",
    removeFriend: "Entfreunden",
    joined: "Beigetreten am",
    activeStatus: "Status",
    active: "Aktiv",
    offline: "Offline",
    underageWarning: "Profil wartet auf elterliche Genehmigung",
    lifeLongLearner: "Lebenslanger Lerner",
    viewProfile: "Profil anzeigen"
  },
  zh: {
    back: "返回主页",
    notFound: "未找到用户个人资料",
    loading: "正在加载个人资料...",
    friends: "好友",
    noFriends: "暂无好友",
    school: "学校",
    notSpecified: "未指定",
    age: "年龄",
    country: "国家",
    grade: "年级",
    userType: "用户类别",
    role: "授权角色",
    addFriend: "添加好友",
    removeFriend: "删除好友",
    joined: "加入时间",
    activeStatus: "在线状态",
    active: "在线",
    offline: "离线",
    underageWarning: "个人资料正等待家长批准",
    lifeLongLearner: "终身学习者",
    viewProfile: "查看个人资料"
  },
  it: {
    back: "Torna alla Home",
    notFound: "Profilo utente non trovato",
    loading: "Caricamento profilo...",
    friends: "Amici",
    noFriends: "Nessun amico aggiunto",
    school: "Scuola",
    notSpecified: "Non specificato",
    age: "Età",
    country: "Paese",
    grade: "Grado",
    userType: "Tipo Utente",
    role: "Ruolo Autorizzativo",
    addFriend: "Aggiungi Amico",
    removeFriend: "Rimuovi Amico",
    joined: "Iscritto il",
    activeStatus: "Stato",
    active: "Attivo",
    offline: "Disconnesso",
    underageWarning: "Profilo in attesa di approvazione dei genitori",
    lifeLongLearner: "Studente permanente",
    viewProfile: "Visualizza Profilo"
  }
};

export default function UserProfilePage() {
  const { username } = useParams() as { username: string };
  const { language, dir } = useTranslation();
  const router = useRouter();
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  const isFriend = (currentUser && targetProfile?.friends)
    ? targetProfile.friends.includes(currentUser.uid)
    : false;

  const friendsList = (Array.isArray(allUsersList) && targetProfile && Array.isArray(targetProfile.friends))
    ? allUsersList.filter((u: any) => targetProfile.friends.includes(u.userId))
    : [];

  const getT = (key: keyof typeof profileTranslations.en) => {
    const lang = (language as keyof typeof profileTranslations) || "en";
    const dictionary = profileTranslations[lang] || profileTranslations.en;
    return dictionary[key] || profileTranslations.en[key];
  };

  const styles = {
    root: {
      minHeight: "100vh",
      backgroundColor: "#faf8f5",
      color: "#0f172a",
      fontFamily: "'Plus Jakarta Sans', Cairo, -apple-system, sans-serif",
      padding: "2.5rem 1.5rem",
      position: "relative" as const,
      overflowX: "hidden" as const,
      direction: dir as "ltr" | "rtl",
    },
    ambientBg: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: "hidden" as const,
      zIndex: 1,
      pointerEvents: "none" as const,
    },
    sphere1: {
      position: "absolute" as const,
      borderRadius: "50%",
      filter: "blur(120px)",
      opacity: 0.45,
      top: "-10%",
      left: "10%",
      width: "450px",
      height: "450px",
      background: "rgba(16, 107, 163, 0.15)",
    },
    sphere2: {
      position: "absolute" as const,
      borderRadius: "50%",
      filter: "blur(120px)",
      opacity: 0.45,
      top: "35%",
      right: "-5%",
      width: "400px",
      height: "400px",
      background: "rgba(212, 175, 55, 0.12)",
    },
    sphere3: {
      position: "absolute" as const,
      borderRadius: "50%",
      filter: "blur(120px)",
      opacity: 0.45,
      bottom: "-5%",
      left: "20%",
      width: "350px",
      height: "350px",
      background: "rgba(13, 148, 136, 0.12)",
    },
    container: {
      maxWidth: "960px",
      margin: "0 auto",
      display: "flex",
      flexDirection: "column" as const,
      gap: "2rem",
      position: "relative" as const,
      zIndex: 2,
    },
    glassCard: {
      background: "rgba(255, 255, 255, 0.78)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      border: "1px solid rgba(212, 175, 55, 0.22)",
      borderRadius: "24px",
      padding: "2rem",
      boxShadow: "0 10px 35px rgba(16, 107, 163, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
      transition: "transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
    },
    btn: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      fontWeight: 750,
      borderRadius: "14px",
      padding: "0.7rem 1.4rem",
      cursor: "pointer",
      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      border: "1px solid transparent",
      fontSize: "0.9rem",
    },
    btnPrimary: {
      backgroundColor: "#106ba3",
      color: "#ffffff",
      boxShadow: "0 4px 12px rgba(16, 107, 163, 0.15)",
    },
    btnSecondary: {
      backgroundColor: "rgba(255, 255, 255, 0.75)",
      color: "#106ba3",
      borderColor: "rgba(212, 175, 55, 0.25)",
    },
    btnDanger: {
      backgroundColor: "rgba(239, 68, 68, 0.05)",
      color: "#ef4444",
      borderColor: "rgba(239, 68, 68, 0.2)",
    },
    layoutGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "2rem",
    },
    badge: {
      fontSize: "0.75rem",
      fontWeight: 750,
      borderRadius: "12px",
      padding: "4px 12px",
      textTransform: "capitalize" as const,
    },
    badgePrimary: {
      background: "rgba(16, 107, 163, 0.08)",
      border: "1px solid rgba(16, 107, 163, 0.15)",
      color: "#106ba3",
    },
    badgeSecondary: {
      background: "rgba(212, 175, 55, 0.08)",
      border: "1px solid rgba(212, 175, 55, 0.2)",
      color: "#b5912d",
    }
  };


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setCurrentUser(usr);
    });
    return () => unsubscribe();
  }, []);

  const fetchProfile = async () => {
    if (!username) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/user/profile?username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        setTargetProfile(data.profile || null);
      }
      
      const listRes = await fetch("/api/user/list");
      if (listRes.ok) {
        const listData = await listRes.json();
        setAllUsersList(listData.users || []);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const handleFriendAction = async () => {
    if (!currentUser || !targetProfile || friendActionLoading) return;
    
    const isFriend = targetProfile.friends?.includes(currentUser.uid);
    const action = isFriend ? "remove" : "add";
    
    try {
      setFriendActionLoading(true);
      const res = await fetch("/api/user/friend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.uid,
          friendId: targetProfile.userId,
          action
        })
      });
      if (res.ok) {
        // Refresh local state bidirectionally
        setTargetProfile((prev: any) => {
          if (!prev) return prev;
          const currentFriends = prev.friends || [];
          const updatedFriends = isFriend 
            ? currentFriends.filter((id: string) => id !== currentUser.uid)
            : [...currentFriends, currentUser.uid];
          return { ...prev, friends: updatedFriends };
        });
      }
    } catch (err) {
      console.error("Error updating friendship:", err);
    } finally {
      setFriendActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "var(--background)", fontFamily: "var(--font-display)", position: "relative", overflow: "hidden"
      }}>
        {/* Animated ambient background spheres for visual consistency */}
        <div className="ambient-background" style={{ position: "absolute", width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}>
          <div className="sphere sphere-1" style={{ top: "-10%", left: "-10%", background: "radial-gradient(circle, rgba(16,107,163,0.15) 0%, rgba(16,107,163,0) 70%)", width: "600px", height: "600px", position: "absolute", filter: "blur(80px)" }}></div>
          <div className="sphere sphere-2" style={{ bottom: "-10%", right: "-10%", background: "radial-gradient(circle, rgba(212,175,55,0.1) 0%, rgba(212,175,55,0) 70%)", width: "600px", height: "600px", position: "absolute", filter: "blur(80px)" }}></div>
          <div className="sphere sphere-3" style={{ top: "40%", left: "40%", background: "radial-gradient(circle, rgba(243,123,29,0.1) 0%, rgba(243,123,29,0) 70%)", width: "500px", height: "500px", position: "absolute", filter: "blur(80px)" }}></div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem", zIndex: 1, position: "relative" }}>
          {/* Concentric circular glassmorphic spinner */}
          <div className="loader-container">
            <div className="loader-ring loader-ring-outer"></div>
            <div className="loader-ring loader-ring-middle"></div>
            <div className="loader-ring loader-ring-inner"></div>
            <div className="loader-center">
              <FiCpu className="loader-cpu-icon" />
            </div>
          </div>
          <div className="loader-text-glow" style={{ fontSize: "1.2rem", color: "var(--primary)", fontWeight: 600, letterSpacing: "1px" }}>
            {getT("loading")}
          </div>
        </div>
      </div>
    );
  }

  if (!targetProfile || !targetProfile.userId) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        backgroundColor: "#faf8f5", color: "#0f172a", fontFamily: "var(--font-sans), sans-serif", gap: "1.5rem", padding: "1rem"
      }}>
        <div className="profile-glass-card" style={{
          maxWidth: "450px", width: "100%", padding: "2.5rem", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.5rem"
        }}>
          <div style={{
            width: "80px", height: "80px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)",
            display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "#ef4444", fontSize: "2rem"
          }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: "1.5rem", margin: 0, border: "none", padding: 0 }}>{getT("notFound")}</h2>
          <button 
            onClick={() => router.push(`/${language}/home`)}
            className="profile-btn profile-btn-secondary"
            style={{ width: "100%", justifyContent: "center" }}
          >
            {dir === "rtl" ? <FiArrowRight /> : <FiArrowLeft />} {getT("back")}
          </button>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          .profile-glass-card {
            background: rgba(255, 255, 255, 0.8);
            border: 1px solid rgba(212, 175, 55, 0.25);
            border-radius: 24px;
            box-shadow: 0 12px 40px rgba(16, 107, 163, 0.05);
          }
          .profile-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 700;
            border-radius: 12px;
            padding: 0.75rem 1.5rem;
            cursor: pointer;
            transition: all 0.2s ease;
            border: 1px solid transparent;
          }
          .profile-btn-secondary {
            background-color: rgba(255, 255, 255, 0.9);
            color: #106ba3;
            border-color: rgba(212, 175, 55, 0.25);
          }
          .profile-btn-secondary:hover {
            background-color: #ffffff;
            border-color: #106ba3;
            transform: translateY(-1px);
          }
        `}} />
      </div>
    );
  }

  const handleCardMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.borderColor = "rgba(212, 175, 55, 0.4)";
    e.currentTarget.style.boxShadow = "0 12px 40px rgba(16, 107, 163, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.85)";
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "none";
    e.currentTarget.style.borderColor = "rgba(212, 175, 55, 0.22)";
    e.currentTarget.style.boxShadow = "0 10px 35px rgba(16, 107, 163, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.6)";
  };

  const handleBtnPrimaryMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = "#0d5582";
    e.currentTarget.style.transform = "translateY(-1.5px)";
    e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 107, 163, 0.25)";
  };

  const handleBtnPrimaryMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = "#106ba3";
    e.currentTarget.style.transform = "none";
    e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 107, 163, 0.15)";
  };

  const handleBtnSecondaryMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = "#ffffff";
    e.currentTarget.style.borderColor = "#106ba3";
    e.currentTarget.style.transform = "translateY(-1.5px)";
    e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 107, 163, 0.04)";
  };

  const handleBtnSecondaryMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.75)";
    e.currentTarget.style.borderColor = "rgba(212, 175, 55, 0.25)";
    e.currentTarget.style.transform = "none";
    e.currentTarget.style.boxShadow = "none";
  };

  const handleBtnDangerMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
    e.currentTarget.style.transform = "translateY(-1.5px)";
  };

  const handleBtnDangerMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.05)";
    e.currentTarget.style.transform = "none";
  };

  return (
    <div style={styles.root}>
      {/* Floating background spheres */}
      <div style={styles.ambientBg}>
        <div style={styles.sphere1}></div>
        <div style={styles.sphere2}></div>
        <div style={styles.sphere3}></div>
      </div>

      <div style={styles.container}>
        {/* Navigation Head */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button 
            onClick={() => router.push(`/${language}/home`)}
            onMouseEnter={handleBtnSecondaryMouseEnter}
            onMouseLeave={handleBtnSecondaryMouseLeave}
            style={{ ...styles.btn, ...styles.btnSecondary }}
          >
            {dir === "rtl" ? <FiArrowRight /> : <FiArrowLeft />} {getT("back")}
          </button>
          
          <button 
            onClick={() => router.push(`/${language}/home`)}
            onMouseEnter={handleBtnSecondaryMouseEnter}
            onMouseLeave={handleBtnSecondaryMouseLeave}
            style={{ ...styles.btn, ...styles.btnSecondary, padding: "0.7rem" }}
          >
            <FiHome style={{ fontSize: "1.1rem" }} />
          </button>
        </div>

        {/* Profile Card Header */}
        <div 
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          style={styles.glassCard}
        >
          <div style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: "2rem",
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "2rem"
            }}>
              {/* User Avatar */}
              <div style={{
                position: "relative",
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background: "#ffffff",
                border: "4px solid rgba(212, 175, 55, 0.25)",
                boxShadow: "0 8px 24px rgba(16, 107, 163, 0.03)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "4.5rem",
                flexShrink: 0
              }}>
                {targetProfile.avatar ? (
                  targetProfile.avatar.endsWith(".svg") ? (
                    <img src={targetProfile.avatar} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "contain" }} />
                  ) : (
                    <span>{targetProfile.avatar}</span>
                  )
                ) : (
                  <FiUser style={{ fontSize: "3rem", color: "#8a9ca8" }} />
                )}
                
                {/* Active/Onboarded Indicator */}
                <span style={{
                  position: "absolute",
                  bottom: "3px",
                  right: dir === "rtl" ? "auto" : "5px",
                  left: dir === "rtl" ? "5px" : "auto",
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: "3px solid #ffffff",
                  backgroundColor: targetProfile.onboardingCompleted ? "#0d9488" : "#8a9ca8",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.15)"
                }}></span>
              </div>

              {/* Core Info */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                    {targetProfile.name || targetProfile.email?.split("@")[0]}
                  </h1>
                  
                  {/* Classification Badge */}
                  <span style={{ ...styles.badge, ...styles.badgePrimary }}>
                    {targetProfile.userType || "student"}
                  </span>

                  {targetProfile.role && (
                    <span style={{ ...styles.badge, ...styles.badgeSecondary }}>
                      {targetProfile.role}
                    </span>
                  )}
                </div>

                <p style={{ color: "#6a7c88", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                  <FiMail style={{ color: "#106ba3" }} /> {targetProfile.email}
                </p>

                {/* Additional profile metadata items */}
                {targetProfile.age && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <span style={{
                      fontSize: "0.75rem", color: "#6a7c88", background: "rgba(212, 175, 55, 0.05)",
                      border: "1px solid rgba(212, 175, 55, 0.15)", padding: "4px 10px", borderRadius: "8px"
                    }}>
                      <strong>{getT("age")}:</strong> {targetProfile.age}
                    </span>
                    {targetProfile.country && (
                      <span style={{
                        fontSize: "0.75rem", color: "#6a7c88", background: "rgba(212, 175, 55, 0.05)",
                        border: "1px solid rgba(212, 175, 55, 0.15)", padding: "4px 10px", borderRadius: "8px",
                        display: "flex", alignItems: "center", gap: "0.25rem"
                      }}>
                        <FiGlobe style={{ color: "#106ba3" }} /> {targetProfile.country}
                      </span>
                    )}
                    {targetProfile.grade && (
                      <span style={{
                        fontSize: "0.75rem", color: "#6a7c88", background: "rgba(212, 175, 55, 0.05)",
                        border: "1px solid rgba(212, 175, 55, 0.15)", padding: "4px 10px", borderRadius: "8px",
                        display: "flex", alignItems: "center", gap: "0.25rem"
                      }}>
                        <FiBookOpen style={{ color: "#b5912d" }} /> 
                        {targetProfile.grade === "life_long" ? getT("lifeLongLearner") : targetProfile.grade}
                      </span>
                    )}
                  </div>
                )}

                {targetProfile.isApproved === false && (
                  <div style={{
                    marginTop: "0.5rem", padding: "0.5rem 1rem", background: "rgba(249, 115, 22, 0.08)",
                    border: "1px solid rgba(249, 115, 22, 0.15)", borderRadius: "8px", color: "#f97316",
                    fontSize: "0.75rem", fontWeight: 650
                  }}>
                    ⚠️ {getT("underageWarning")}
                  </div>
                )}
              </div>
            </div>

            {/* Friend Action Button */}
            {currentUser && currentUser.uid !== targetProfile.userId && (
              <button 
                onClick={handleFriendAction}
                disabled={friendActionLoading}
                onMouseEnter={isFriend ? handleBtnDangerMouseEnter : handleBtnPrimaryMouseEnter}
                onMouseLeave={isFriend ? handleBtnDangerMouseLeave : handleBtnPrimaryMouseLeave}
                style={{ 
                  ...styles.btn, 
                  ...(isFriend ? styles.btnDanger : styles.btnPrimary) 
                }}
              >
                {isFriend ? (
                  <>
                    <FiUserMinus /> {getT("removeFriend")}
                  </>
                ) : (
                  <>
                    <FiUserPlus /> {getT("addFriend")}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Detailed Attributes Layout */}
        <div style={styles.layoutGrid}>
          
          {/* Sidebar Attributes */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div 
              onMouseEnter={handleCardMouseEnter}
              onMouseLeave={handleCardMouseLeave}
              style={{ ...styles.glassCard, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}
            >
              <h3 style={{
                fontSize: "1.1rem", borderBottom: "1px solid rgba(212, 175, 55, 0.15)",
                display: "flex", alignItems: "center", gap: "0.5rem", margin: 0, paddingBottom: "0.5rem", fontWeight: 800
              }}>
                <FiAward style={{ color: "#106ba3" }} /> 
                <span>{language === "ar" ? "تفاصيل إضافية" : "Attributes"}</span>
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.9rem" }}>
                <div>
                  <p style={{ color: "#6a7c88", fontSize: "0.75rem", margin: 0, fontWeight: 700 }}>{getT("school")}</p>
                  <p style={{ fontWeight: 700, color: "#0f172a", margin: "2px 0 0 0" }}>{targetProfile.school || getT("notSpecified")}</p>
                </div>
                <div>
                  <p style={{ color: "#6a7c88", fontSize: "0.75rem", margin: 0, fontWeight: 700 }}>{getT("userType")}</p>
                  <p style={{ fontWeight: 700, color: "#106ba3", margin: "2px 0 0 0", textTransform: "capitalize" }}>{targetProfile.userType || "Student"}</p>
                </div>
                {targetProfile.role && (
                  <div>
                    <p style={{ color: "#6a7c88", fontSize: "0.75rem", margin: 0, fontWeight: 700 }}>{getT("role")}</p>
                    <p style={{ fontWeight: 700, color: "#b5912d", margin: "2px 0 0 0", textTransform: "capitalize" }}>{targetProfile.role}</p>
                  </div>
                )}
                {targetProfile.createdAt && (
                  <div>
                    <p style={{ color: "#6a7c88", fontSize: "0.75rem", margin: 0, fontWeight: 700 }}>{getT("joined")}</p>
                    <p style={{ fontWeight: 600, color: "#6a7c88", margin: "4px 0 0 0", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <FiCalendar style={{ color: "#106ba3" }} /> {new Date(targetProfile.createdAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Social Friends list card */}
          <div 
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
            style={{ ...styles.glassCard, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            <h3 style={{
              fontSize: "1.1rem", borderBottom: "1px solid rgba(212, 175, 55, 0.15)",
              display: "flex", alignItems: "center", gap: "0.5rem", margin: 0, paddingBottom: "0.5rem", fontWeight: 800
            }}>
              <FiUser style={{ color: "#b5912d" }} /> 
              <span>{getT("friends")} ({friendsList.length})</span>
            </h3>
            
            {friendsList.length === 0 ? (
              <div style={{ textAlign: "center", color: "#8a9ca8", fontSize: "0.9rem", padding: "3rem 0" }}>
                {getT("noFriends")}
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "1rem"
              }}>
                {friendsList.map((f: any) => (
                  <div 
                    key={f.userId}
                    onClick={() => router.push(`/${language}/profile/${f.username || f.userId}`)}
                    style={{
                      padding: "0.75rem 1rem",
                      background: "rgba(255, 255, 255, 0.8)",
                      border: "1px solid rgba(212, 175, 55, 0.15)",
                      borderRadius: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2.5px)";
                      e.currentTarget.style.borderColor = "#106ba3";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(16, 107, 163, 0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.borderColor = "rgba(212, 175, 55, 0.15)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(212, 175, 55, 0.25)",
                      fontSize: "1.25rem",
                      flexShrink: 0
                    }}>
                      <span>{f.avatar || "👤"}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.85rem", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {f.name || f.email?.split("@")[0]}
                      </p>
                      <p style={{ fontSize: "0.7rem", color: "#6a7c88", margin: 0, textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {f.userType || "Student"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
