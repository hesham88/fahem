"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "../../../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useTranslation, Language } from "../../../../context/LanguageContext";
import { 
  FiArrowLeft, 
  FiArrowRight, 
  FiUserPlus, 
  FiUserMinus, 
  FiMail, 
  FiGlobe, 
  FiAward, 
  FiBookOpen, 
  FiShield, 
  FiCalendar,
  FiHome,
  FiUser
} from "react-icons/fi";

const profileTranslations = {
  en: {
    back: "Back to Dashboard",
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
    back: "العودة للوحة التحكم",
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
    back: "Volver al panel",
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
    back: "Retour au tableau",
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
    back: "Zurück zum Dashboard",
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
    back: "返回仪表盘",
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
    back: "Torna alla Dashboard",
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
  const { userId } = useParams() as { userId: string };
  const { language, dir } = useTranslation();
  const router = useRouter();
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  const getT = (key: keyof typeof profileTranslations.en) => {
    const lang = (language as keyof typeof profileTranslations) || "en";
    const dictionary = profileTranslations[lang] || profileTranslations.en;
    return dictionary[key] || profileTranslations.en[key];
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setCurrentUser(usr);
    });
    return () => unsubscribe();
  }, []);

  const fetchProfile = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/user/profile?userId=${encodeURIComponent(userId)}`);
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
  }, [userId]);

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-display text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-emerald-500 border-r-2 border-transparent animate-spin"></div>
          <p className="text-slate-400 font-medium animate-pulse">{getT("loading")}</p>
        </div>
      </div>
    );
  }

  if (!targetProfile) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 font-display text-white px-4">
        <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-500 text-3xl">
          ⚠️
        </div>
        <h2 className="text-2xl font-bold">{getT("notFound")}</h2>
        <button 
          onClick={() => router.push(`/${language}/dashboard`)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 transition-all rounded-xl font-medium shadow-lg shadow-emerald-500/10 text-slate-950 text-sm"
        >
          {dir === "rtl" ? <FiArrowRight /> : <FiArrowLeft />} {getT("back")}
        </button>
      </div>
    );
  }

  const isFriend = targetProfile.friends?.includes(currentUser?.uid || "");
  const friendsList = allUsersList.filter((u: any) => targetProfile.friends?.includes(u.userId));

  return (
    <div className="min-h-screen bg-slate-950 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white font-display py-12 px-4 md:px-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        {/* Navigation Head */}
        <div className="flex justify-between items-center">
          <button 
            onClick={() => router.push(`/${language}/dashboard`)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 transition-all border border-slate-800 rounded-xl font-medium text-slate-300 text-sm hover:text-white"
          >
            {dir === "rtl" ? <FiArrowRight /> : <FiArrowLeft />} {getT("back")}
          </button>
          
          <button 
            onClick={() => router.push(`/${language}/dashboard`)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400 text-sm"
          >
            <FiHome />
          </button>
        </div>

        {/* Profile Card Header */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900/50 border border-slate-800/80 p-8 backdrop-blur-xl flex flex-col md:flex-row items-center md:items-start gap-8 shadow-2xl">
          {/* Subtle ambient light glow */}
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-emerald-500/5 rounded-full filter blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-blue-500/5 rounded-full filter blur-[100px] pointer-events-none"></div>

          {/* User Avatar */}
          <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-slate-800 shadow-xl bg-slate-950/60 flex items-center justify-center flex-shrink-0">
            {targetProfile.avatar ? (
              <span className="text-7xl">{targetProfile.avatar}</span>
            ) : (
              <FiUser className="text-6xl text-slate-600" />
            )}
            
            {/* Online/Offline status badge */}
            <span className={`absolute bottom-1 right-3 w-5 h-5 rounded-full border-4 border-slate-900 ${targetProfile.onboardingCompleted ? 'bg-emerald-500' : 'bg-slate-500 animate-pulse'}`}></span>
          </div>

          {/* Core Info Info */}
          <div className="flex-1 text-center md:text-start flex flex-col gap-3">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
                {targetProfile.name || targetProfile.email?.split("@")[0]}
              </h1>
              
              {/* Badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full capitalize">
                  {targetProfile.userType || "student"}
                </span>
                {targetProfile.role && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full capitalize">
                    {targetProfile.role}
                  </span>
                )}
              </div>
            </div>

            <p className="text-slate-400 flex items-center gap-2 justify-center md:justify-start text-sm">
              <FiMail className="text-slate-500" /> {targetProfile.email}
            </p>

            {targetProfile.age && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-400 mt-2">
                <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">{getT("age")}:</span> {targetProfile.age}
                </span>
                {targetProfile.country && (
                  <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
                    <FiGlobe className="text-blue-400" /> <span className="text-slate-300">{targetProfile.country}</span>
                  </span>
                )}
                {targetProfile.grade && (
                  <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
                    <FiBookOpen className="text-indigo-400" /> 
                    <span className="text-slate-300">
                      {targetProfile.grade === "life_long" ? getT("lifeLongLearner") : targetProfile.grade}
                    </span>
                  </span>
                )}
              </div>
            )}

            {targetProfile.isApproved === false && (
              <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-amber-400 text-xs text-center md:text-start">
                ⚠️ {getT("underageWarning")}
              </div>
            )}
          </div>

          {/* Friend Action Button */}
          {currentUser && currentUser.uid !== targetProfile.userId && (
            <button 
              onClick={handleFriendAction}
              disabled={friendActionLoading}
              className={`md:self-center px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg transition-all border ${
                isFriend 
                  ? "bg-slate-950 border-slate-800 hover:bg-rose-950/20 hover:border-rose-800/30 text-rose-400" 
                  : "bg-emerald-500 border-emerald-600 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/10"
              }`}
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

        {/* Detailed Attributes Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Metadata Sidebar details */}
          <div className="md:col-span-1 flex flex-col gap-6">
            <div className="bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6 flex flex-col gap-4 backdrop-blur-xl">
              <h3 className="text-lg font-bold border-b border-slate-800/80 pb-3 flex items-center gap-2 text-slate-300">
                <FiAward className="text-emerald-500" /> Attributes
              </h3>
              
              <div className="flex flex-col gap-3 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">{getT("school")}</p>
                  <p className="font-semibold text-slate-300">{targetProfile.school || getT("notSpecified")}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">{getT("userType")}</p>
                  <p className="font-semibold text-emerald-400 capitalize">{targetProfile.userType || "Student"}</p>
                </div>
                {targetProfile.role && (
                  <div>
                    <p className="text-slate-500 text-xs">{getT("role")}</p>
                    <p className="font-semibold text-blue-400 capitalize">{targetProfile.role}</p>
                  </div>
                )}
                {targetProfile.createdAt && (
                  <div>
                    <p className="text-slate-500 text-xs">{getT("joined")}</p>
                    <p className="font-medium text-slate-400 flex items-center gap-1.5 mt-0.5 text-xs">
                      <FiCalendar /> {new Date(targetProfile.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Social Friends Section */}
          <div className="md:col-span-2 bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-xl flex flex-col gap-4">
            <h3 className="text-lg font-bold border-b border-slate-800/80 pb-3 flex items-center gap-2 text-slate-300">
              <FiUser className="text-blue-500" /> {getT("friends")} ({friendsList.length})
            </h3>
            
            {friendsList.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                {getT("noFriends")}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {friendsList.map((f: any) => (
                  <div 
                    key={f.userId}
                    onClick={() => router.push(`/${language}/profile/${f.userId}`)}
                    className="p-3 bg-slate-950/50 hover:bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-2xl flex items-center gap-3 cursor-pointer transition-all hover:-translate-y-0.5"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner">
                      <span className="text-xl">{f.avatar || "👤"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-200 text-sm truncate">{f.name || f.email?.split("@")[0]}</p>
                      <p className="text-xs text-slate-500 truncate capitalize">{f.userType || "Student"}</p>
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
