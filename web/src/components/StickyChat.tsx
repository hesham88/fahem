"use client";

import React, { useState, useEffect, useRef } from "react";
import { auth, storage } from "../lib/firebase";
import { authedFetch } from "../lib/authedFetch";
import { onAuthStateChanged, User } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useTranslation } from "../context/LanguageContext";
import InlineFeedbackCard from "./InlineFeedbackCard";
import { 
  FiMessageSquare, 
  FiX, 
  FiSend, 
  FiCpu, 
  FiShield, 
  FiLayers, 
  FiInfo, 
  FiZap,
  FiTerminal,
  FiCornerDownRight,
  FiCompass,
  FiGlobe,
  FiClock,
  FiPlus,
  FiTrash2,
  FiRefreshCw,
  FiFileText,
  FiMaximize2,
  FiSidebar,
  FiMinimize2,
  FiMic,
  FiMicOff,
  FiVolume2,
  FiVolumeX,
  FiEdit2,
  FiCheck,
  FiCopy,
  FiThumbsUp,
  FiThumbsDown,
  FiSquare
} from "react-icons/fi";


interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
  activeAgent?: string;
  showFeedbackCard?: boolean;
}

const chatTranslations: Record<string, Record<string, string>> = {
  en: {
    speech_unsupported: "Your browser does not support Speech Recognition.",
    welcome: "Welcome to Fahem! 🧠 Your Swarm of AI Tutors, in your pocket. I am ready to help you study your books and learning resources, get page-cited answers, build dynamic study schedules, take adaptive quizzes, and practice orally! Which subject or book are we studying today?",
    auto_explain_prompt: "Please explain this excerpt in detail and in simple terms: ",
    welcome_back: "Welcome back to this conversation! How can I assist you further?",
    confirm_delete_session: "Are you sure you want to delete this saved chat?",
    new_chat_welcome: "Welcome! I am ready to start a new conversation with you.",
    subject_desc_default: "Academic Subject",
    math_desc: "Algebra & Statistics",
    science_desc: "Biology, Physics, Chem",
    arabic_desc: "Arabic Linguistics & Grammar",
    book_desc_default: "Curriculum Book",
    algebra_desc: "OpenStax Algebra Textbook",
    chemistry_desc: "OpenStax Chemistry Volume",
    arabic_grammar_desc: "Simplified Arabic Grammar Rules",
    explain_command: "Detailed pedagogical explanation",
    summary_command: "High-density concepts & formulas sheet",
    practice_command: "Generate interactive question to solve",
    quiz_command: "Generate 3-question conceptual quiz",
    floating_trigger_title: "Talk with Fahem AI",
    companion_title: "Fahem Companion",
    responsible_ai: "Responsible AI Active",
    compact_overlay: "Compact Overlay",
    side_panel: "Side Panel",
    full_screen: "Full Screen",
    chat_history: "Chat History",
    email_label: "Email:",
    saved_chats: "Saved Chats",
    new_chat: "New Chat",
    rename_chat: "Rename Chat",
    loading_chats: "Loading chats...",
    no_saved_chats: "No saved chats yet",
    untitled_chat: "Untitled Chat",
    messages_count: "messages",
    active_page_context: "Active context from your books:",
    page_label: "Page",
    thinking_fetching: "Thinking & fetching knowledge...",
    read_aloud: "Read Aloud",
    speech_stop: "Stop",
    speech_listen: "Listen",
    ground_with_google: "Ground with Google Search",
    logs_label: "Logs",
    no_logs: "No runtime execution logs yet.",
    voice_dictation: "Voice Dictation / Oral Input",
    input_placeholder: "Ask your AI tutor companion (type @, #, or /)...",
    preset1_label: "Matrix Practice (p.14)",
    preset1_query: "Give me a practice question on Matrix Inversion from Algebra on page 14.",
    preset2_label: "Calvin Cycle (Biology)",
    preset2_query: "Explain the Calvin Cycle in Biology and what wavelengths chlorophyll absorbs least.",
    preset3_label: "Inchoative Verbs (Grammar)",
    preset3_query: "Explain Kaada and her Sisters and when its predicate must not be associated with 'An'.",
    preset4_label: "Mitosis vs Meiosis",
    preset4_query: "What is the key difference between Mitosis and Meiosis in Biology?",
    preset5_label: "Socrates' Philosophy",
    preset5_query: "Explain Socrates' method of elenchus (Socratic inquiry) in simple terms.",
    math_label: "📊 Math",
    science_label: "🧬 Science",
    arabic_label: "✍️ Arabic",
    algebra_label: "📚 College Algebra 2e",
    chemistry_label: "🧪 Chemistry 2e",
    arabic_grammar_label: "✍️ Simplified Arabic Grammar",
    explain_label: "💡 Explain Step-by-Step",
    summary_label: "📝 Generate Summary",
    practice_label: "✍️ Active Recall Challenge",
    quiz_label: "⚡ Quick Mastery Quiz"
  },
  ar: {
    speech_unsupported: "متصفحك لا يدعم التعرف على الصوت شفهياً.",
    welcome: "مرحباً بك في فاهم! 🧠 شبكة معلميك الخبراء بالذكاء الاصطناعي في جيبك. أنا جاهز لمساعدتك في مذاكرة كتبك ومصادرك الدراسية، الإجابة عن أسئلتك مع توثيق الصفحة الدقيقة، وضع جداول دراسية ذكية، خوض اختبارات تفاعلية، والممارسة الشفهية! ما المادة أو الكتاب الذي تود مذاكرته اليوم؟",
    auto_explain_prompt: "اشرح لي هذا الجزء بالتفصيل وبأسلوب مبسط: ",
    welcome_back: "مرحباً بك مجدداً في هذه المحادثة! كيف يمكنني مساعدتك أكثر؟",
    confirm_delete_session: "هل أنت متأكد من حذف هذه المحادثة المحفوظة؟",
    new_chat_welcome: "مرحباً بك! أنا جاهز لبدء محادثة جديدة معك.",
    subject_desc_default: "مادة دراسية",
    math_desc: "مواضيع الجبر والإحصاء",
    science_desc: "الأحياء والفيزياء والكيمياء",
    arabic_desc: "قواعد النحو واللغة",
    book_desc_default: "كتاب مدرسي",
    algebra_desc: "مرجع الجبر من OpenStax",
    chemistry_desc: "مرجع الكيمياء العامة",
    arabic_grammar_desc: "كتاب شرح قواعد اللغة",
    explain_command: "شرح وافٍ ومفصل خطوة بخطوة",
    summary_command: "تخليص عالي الكثافة (الخلاصة والزتونة)",
    practice_command: "سؤال تفاعلي يشجع المذاكرة النشطة",
    quiz_command: "اختبار قصير من 3 أسئلة مفاهيمية",
    floating_trigger_title: "تحدث مع فاهم",
    companion_title: "رفيق فاهم الذكي",
    responsible_ai: "الذكاء الاصطناعي المسؤول نشط",
    compact_overlay: "عائم مصغر",
    side_panel: "لوحة جانبية",
    full_screen: "ملء الشاشة",
    chat_history: "سجل المحادثات",
    email_label: "الحساب:",
    saved_chats: "المحادثات المحفوظة",
    new_chat: "محادثة جديدة",
    rename_chat: "إعادة تسمية المحادثة",
    loading_chats: "جاري تحميل المحادثات...",
    no_saved_chats: "لا توجد محادثات محفوظة بعد",
    untitled_chat: "محادثة بدون عنوان",
    messages_count: "رسائل",
    active_page_context: "سياق نشط من كتبك ومصادرك الدراسية:",
    page_label: "الصفحة",
    thinking_fetching: "جاري التفكير وسحب المعرفة...",
    read_aloud: "قراءة بصوت عالٍ شفهي",
    speech_stop: "إيقاف",
    speech_listen: "استماع شفهي",
    ground_with_google: "البحث في جوجل",
    logs_label: "السجلات",
    no_logs: "لا توجد سجلات تشغيل بعد.",
    voice_dictation: "إدخال بالصوت شفهي",
    input_placeholder: "اسأل رفيقك الدراسي الذكي عن محتوى الصفحة (اكتب @ أو # أو /)...",
    preset1_label: "تدريب مصفوفات (ص١٤)",
    preset1_query: "أعطني سؤالاً تدريبياً على معكوس المصفوفة من كتاب الجبر صفحة 14.",
    preset2_label: "دورة كالفن (الأحياء)",
    preset2_query: "اشرح لي دورة كالفن في الأحياء وما هي الأطوال الموجية الأقل امتصاصاً.",
    preset3_label: "أفعال الشروع (النحو)",
    preset3_query: "اشرح لي قاعدة كاد وأخواتها ومتى يمتنع اقتران خبرها بـ 'أن'.",
    preset4_label: "الروابط التساهمية",
    preset4_query: "اشرح الروابط التساهمية في الكيمياء وكيف تتشكل بين الذرات.",
    preset5_label: "ميكانيكا نيوتن",
    preset5_query: "اشرح قانون نيوتن الثالث للحركة وأعطني أمثلة عملية من حياتنا اليومية.",
    math_label: "➕ الرياضيات",
    science_label: "🧪 العلوم",
    arabic_label: "📖 اللغة العربية",
    algebra_label: "📚 College Algebra 2e",
    chemistry_label: "🧪 Chemistry 2e",
    arabic_grammar_label: "✍️ كتاب النحو المبسط",
    explain_label: "💡 شرح خطوة بخطوة",
    summary_label: "📝 ملخص عالي الكثافة",
    practice_label: "✍️ تحدي المذاكرة النشطة",
    quiz_label: "⚡ اختبار قصير للمستويات"
  },
  es: {
    speech_unsupported: "Su navegador no soporta el reconocimiento de voz.",
    welcome: "¡Bienvenido a Fahem! 🧠 Tu enjambre de tutores de IA en tu bolsillo. Estoy listo para ayudarte a estudiar tus libros y recursos de aprendizaje, obtener respuestas con citas de páginas, crear planes de estudio inteligentes, realizar cuestionarios dinámicos y practicar oralmente. ¿Qué materia o libro te gustaría estudiar hoy?",
    auto_explain_prompt: "Por favor, explique este fragmento en detalle y en términos sencillos: ",
    welcome_back: "¡Bienvenido de nuevo a esta conversación! ¿Cómo puedo ayudarte más?",
    confirm_delete_session: "¿Está seguro de que desea eliminar este chat guardado?",
    new_chat_welcome: "¡Bienvenido! Estoy listo para comenzar una nueva conversación contigo.",
    subject_desc_default: "Materia académica",
    math_desc: "Álgebra y Estadística",
    science_desc: "Biología, Física, Química",
    arabic_desc: "Lingüística y gramática árabe",
    book_desc_default: "Libro de texto",
    algebra_desc: "Libro de Álgebra de OpenStax",
    chemistry_desc: "Libro de Química de OpenStax",
    arabic_grammar_desc: "Reglas de gramática árabe simplificadas",
    explain_command: "Explicación detallada paso a paso",
    summary_command: "Resumen de conceptos y fórmulas",
    practice_command: "Generar pregunta interactiva para resolver",
    quiz_command: "Generar cuestionario conceptual de 3 preguntas",
    floating_trigger_title: "Hablar con Fahem AI",
    companion_title: "Compañero Fahem",
    responsible_ai: "IA responsable activa",
    compact_overlay: "Superposición compacta",
    side_panel: "Panel lateral",
    full_screen: "Pantalla completa",
    chat_history: "Historial de chat",
    email_label: "Correo electrónico:",
    saved_chats: "Chats guardados",
    new_chat: "Nuevo chat",
    rename_chat: "Renombrar Chat",
    loading_chats: "Cargando chats...",
    no_saved_chats: "Aún no hay chats guardados",
    untitled_chat: "Chat sin título",
    messages_count: "mensajes",
    active_page_context: "Contexto activo de sus libros:",
    page_label: "Página",
    thinking_fetching: "Pensando y recuperando conocimiento...",
    read_aloud: "Leer en voz alta",
    speech_stop: "Detener",
    speech_listen: "Escuchar",
    ground_with_google: "Buscar en Google",
    logs_label: "Registros",
    no_logs: "Aún no hay registros de ejecución.",
    voice_dictation: "Dictado de voz",
    input_placeholder: "Pregunte a su compañero tutor (escriba @, # o /)...",
    preset1_label: "Práctica de matrices (p.14)",
    preset1_query: "Dame una pregunta de práctica sobre la inversión de matrices de álgebra en la página 14.",
    preset2_label: "Ciclo de Calvin (Biología)",
    preset2_query: "Explique el ciclo de Calvin en biología y qué longitudes de onda absorbe menos la clorofila.",
    preset3_label: "Verbos incoativos (Gramática)",
    preset3_query: "Explique Kaada y sus hermanas y cuándo su predicado no debe asociarse con 'An'.",
    preset4_label: "Mitosis vs Meiosis",
    preset4_query: "¿Cuál es la diferencia clave entre la mitosis y la meiosis en biología?",
    preset5_label: "Filosofía de Sócrates",
    preset5_query: "Explique el método socrático de elenchus (indagación socrática) en términos sencillos.",
    math_label: "📊 Matemáticas",
    science_label: "🧬 Ciencias",
    arabic_label: "✍️ Árabe",
    algebra_label: "📚 College Algebra 2e",
    chemistry_label: "🧪 Chemistry 2e",
    arabic_grammar_label: "✍️ Gramática árabe simplificada",
    explain_label: "💡 Explicar paso a paso",
    summary_label: "📝 Generar resumen",
    practice_label: "✍️ Desafío de recuerdo activo",
    quiz_label: "⚡ Cuestionario de dominio rápido"
  },
  fr: {
    speech_unsupported: "Votre navigateur ne prend pas en charge la reconnaissance vocale.",
    welcome: "Bienvenue sur Fahem ! 🧠 Votre essaim de tuteurs IA dans votre poche. Je suis prêt à vous aider à étudier vos livres et ressources d'apprentissage, obtenir des réponses citées par page, créer des calendriers d'étude dynamiques, passer des quiz adaptatifs et pratiquer oralement ! Quelle matière ou livre étudions-nous aujourd'hui ?",
    auto_explain_prompt: "Veuillez expliquer cet extrait en détail et en termes simples : ",
    welcome_back: "Ravi de vous revoir dans cette discussion ! Comment puis-je vous aider davantage ?",
    confirm_delete_session: "Êtes-vous sûr de vouloir supprimer cette discussion enregistrée ?",
    new_chat_welcome: "Bienvenue ! Je suis prêt à commencer une nouvelle conversation avec vous.",
    subject_desc_default: "Matière académique",
    math_desc: "Algèbre & Statistique",
    science_desc: "Biologie, Physique, Chimie",
    arabic_desc: "Linguistique & Grammaire Arabe",
    book_desc_default: "Livre scolaire",
    algebra_desc: "Livre d'algèbre OpenStax",
    chemistry_desc: "Volume de chimie OpenStax",
    arabic_grammar_desc: "Règles de grammaire arabe simplifiées",
    explain_command: "Explication pédagogique détaillée",
    summary_command: "Fiche de concepts & formules à haute densité",
    practice_command: "Générer une question interactive à résoudre",
    quiz_command: "Générer un quiz conceptuel de 3 questions",
    floating_trigger_title: "Parler avec Fahem AI",
    companion_title: "Compagnon Fahem",
    responsible_ai: "IA responsable active",
    compact_overlay: "Superposition compacte",
    side_panel: "Panneau latéral",
    full_screen: "Plein écran",
    chat_history: "Historique des discussions",
    email_label: "E-mail :",
    saved_chats: "Discussions enregistrées",
    new_chat: "Nouvelle discussion",
    loading_chats: "Chargement des discussions...",
    no_saved_chats: "Pas encore de discussions enregistrées",
    untitled_chat: "Discussion sans titre",
    messages_count: "messages",
    active_page_context: "Contexte actif de vos livres :",
    page_label: "Page",
    thinking_fetching: "Réflexion et récupération des connaissances...",
    read_aloud: "Lire à haute voix",
    speech_stop: "Arrêter",
    speech_listen: "Écouter",
    ground_with_google: "Rechercher sur Google",
    logs_label: "Journaux",
    no_logs: "Pas encore de journaux d'exécution.",
    voice_dictation: "Saisie vocale",
    input_placeholder: "Demandez à votre compagnon tuteur (tapez @, # ou /)...",
    preset1_label: "Pratique des matrices (p.14)",
    preset1_query: "Donnez-moi une question d'entraînement sur l'inversion de matrice de l'algèbre à la page 14.",
    preset2_label: "Cycle de Calvin (Biologie)",
    preset2_query: "Expliquez le cycle de Calvin en biologie et quelles longueurs d'onde la chlorophylle absorbe le moins.",
    preset3_label: "Verbes inchoatifs (Grammaire)",
    preset3_query: "Expliquez Kaada et ses sœurs et quand son prédicat ne doit pas être associé à 'An'.",
    preset4_label: "Mitose vs Méiose",
    preset4_query: "Quelle est la différence clé entre la mitose et la méiose en biologie ?",
    preset5_label: "Philosophie de Socrate",
    preset5_query: "Expliquez la méthode socratique de l'elenchus (enquête socratique) en termes simples.",
    math_label: "📊 Mathématiques",
    science_label: "🧬 Sciences",
    arabic_label: "✍️ Arabe",
    algebra_label: "📚 College Algebra 2e",
    chemistry_label: "🧪 Chemistry 2e",
    arabic_grammar_label: "✍️ Grammaire arabe simplifiée",
    explain_label: "💡 Expliquer étape par étape",
    summary_label: "📝 Générer un résumé",
    practice_label: "✍️ Défi de rappel actif",
    quiz_label: "⚡ Quiz de maîtrise rapide"
  },
  de: {
    speech_unsupported: "Ihr Browser unterstützt keine Spracherkennung.",
    welcome: "Willkommen bei Fahem! 🧠 Ihr Schwarm von KI-Tutoren in Ihrer Tasche. Ich bin bereit, Ihnen beim Studium Ihrer Bücher und Lernressourcen zu helfen, zitierte Antworten zu erhalten, intelligente Studienpläne zu erstellen, adaptive Quizfragen zu lösen und mündlich zu üben! Welches Fach oder Buch lernen wir heute?",
    auto_explain_prompt: "Bitte erklären Sie diesen Auszug ausführlich und in einfachen Worten: ",
    welcome_back: "Willkommen zurück bei diesem Gespräch! Wie kann ich Ihnen weiterhelfen?",
    confirm_delete_session: "Sind Sie sicher, dass Sie diesen gespeicherten Chat löschen möchten?",
    new_chat_welcome: "Willkommen! Ich bin bereit, ein neues Gespräch mit Ihnen zu beginnen.",
    subject_desc_default: "Akademisches Fach",
    math_desc: "Algebra & Statistik",
    science_desc: "Biologie, Physik, Chemie",
    arabic_desc: "Arabische Linguistik & Grammatik",
    book_desc_default: "Lehrbuch",
    algebra_desc: "OpenStax Algebra-Lehrbuch",
    chemistry_desc: "OpenStax Chemie-Lehrbuch",
    arabic_grammar_desc: "Vereinfachte arabische Grammatikregeln",
    explain_command: "Ausführliche pädagogische Erklärung",
    summary_command: "Zusammenfassung von Konzepten & Formeln",
    practice_command: "Interaktive Frage zum Lösen generieren",
    quiz_command: "Konzeptionelles Quiz mit 3 Fragen generieren",
    floating_trigger_title: "Mit Fahem KI sprechen",
    companion_title: "Fahem Begleiter",
    responsible_ai: "Verantwortungsvolle KI aktiv",
    compact_overlay: "Kompakte Überlagerung",
    side_panel: "Seitenleiste",
    full_screen: "Vollbild",
    chat_history: "Chatverlauf",
    email_label: "E-Mail:",
    saved_chats: "Gespeicherte Chats",
    new_chat: "Neuer Chat",
    loading_chats: "Chats werden geladen...",
    no_saved_chats: "Noch keine gespeicherten Chats",
    untitled_chat: "Unbenannter Chat",
    messages_count: "Nachrichten",
    active_page_context: "Aktiver Kontext aus Ihren Büchern:",
    page_label: "Seite",
    thinking_fetching: "Nachdenken und Wissen abrufen...",
    read_aloud: "Vorlesen",
    speech_stop: "Stoppen",
    speech_listen: "Zuhören",
    ground_with_google: "Mit Google-Suche untermauern",
    logs_label: "Protokolle",
    no_logs: "Noch keine Laufzeitprotokolle.",
    voice_dictation: "Diktat / Mündliche Eingabe",
    input_placeholder: "Fragen Sie Ihren Lernbegleiter (tippen Sie @, # oder /)...",
    preset1_label: "Matrix-Übung (S.14)",
    preset1_query: "Geben Sie mir eine Übungsfrage zur Matrixinversion aus der Algebra auf Seite 14.",
    preset2_label: "Calvin-Zyklus (Biologie)",
    preset2_query: "Erklären Sie den Calvin-Zyklus in der Biologie und welche Wellenlängen Chlorophyll am wenigsten absorbiert.",
    preset3_label: "Inchoative Verben (Grammatik)",
    preset3_query: "Erklären Sie Kaada und ihre Schwestern und wann ihr Prädikat nicht mit 'An' verbunden sein darf.",
    preset4_label: "Mitose vs. Meiose",
    preset4_query: "Was ist der Hauptunterschied zwischen Mitose und Meiose in der Biologie?",
    preset5_label: "Sokrates' Philosophie",
    preset5_query: "Erklären Sie die sokratische Methode des Elenchus (sokratische Befragung) in einfachen Worten.",
    math_label: "📊 Mathematik",
    science_label: "🧬 Wissenschaft",
    arabic_label: "✍️ Arabisch",
    algebra_label: "📚 College Algebra 2e",
    chemistry_label: "🧪 Chemistry 2e",
    arabic_grammar_label: "✍️ Vereinfachte arabische Grammatik",
    explain_label: "💡 Schritt für Schritt erklären",
    summary_label: "📝 Zusammenfassung erstellen",
    practice_label: "✍️ Aktiver Abruftest",
    quiz_label: "⚡ Schnelles Meisterschafts-Quiz"
  },
  zh: {
    speech_unsupported: "您的浏览器不支持语音识别。",
    welcome: "欢迎来到 Fahem！🧠 您的口袋 AI 导师集群。我随时准备帮助您学习书籍和学习资源、获取带有页码引用的解答、制定智能学习计划、进行自适应测验并进行口语练习！我们今天学习哪门学科或哪本书？",
    auto_explain_prompt: "请详细且通俗地解释这段摘录：",
    welcome_back: "欢迎回到本次对话！我该如何进一步帮助您？",
    confirm_delete_session: "您确定要删除此保存的聊天吗？",
    new_chat_welcome: "欢迎！我已准备好与您开始新对话。",
    subject_desc_default: "学术学科",
    math_desc: "代数与统计",
    science_desc: "生物、物理、化学",
    arabic_desc: "阿拉伯语语言学与语法",
    book_desc_default: "教科书",
    algebra_desc: "OpenStax 代数教科书",
    chemistry_desc: "OpenStax 化学教科书",
    arabic_grammar_desc: "简明阿拉伯语语法规则",
    explain_command: "详细的步骤解释",
    summary_command: "高密度概念与公式摘要",
    practice_command: "生成互动式问题以解决",
    quiz_command: "生成包含3个概念问题的测验",
    floating_trigger_title: "与 Fahem AI 交流",
    companion_title: "Fahem 伴学助手",
    responsible_ai: "负责任的人工智能已激活",
    compact_overlay: "紧凑悬浮窗",
    side_panel: "侧边栏",
    full_screen: "全屏",
    chat_history: "聊天历史记录",
    email_label: "电子邮件：",
    saved_chats: "已保存的聊天",
    new_chat: "新聊天",
    loading_chats: "正在加载聊天...",
    no_saved_chats: "暂无已保存的聊天",
    untitled_chat: "无标题聊天",
    messages_count: "条消息",
    active_page_context: "书籍中的活动上下文：",
    page_label: "页",
    thinking_fetching: "正在思考并获取知识...",
    read_aloud: "朗读",
    speech_stop: "停止",
    speech_listen: "倾听",
    ground_with_google: "使用谷歌搜索作为依据",
    logs_label: "日志",
    no_logs: "暂无运行时执行日志。",
    voice_dictation: "语音输入",
    input_placeholder: "咨询您的伴学助手（输入 @、# 或 /）...",
    preset1_label: "矩阵练习（第14页）",
    preset1_query: "给我一个关于第14页代数中矩阵求逆的练习题。",
    preset2_label: "卡尔文循环（生物学）",
    preset2_query: "解释生物学中的卡尔文循环，以及叶绿素吸收最少的波长。",
    preset3_label: "起始动词（语法）",
    preset3_query: "解释 Kaada 及其姐妹词，以及什么时候它的谓语不能与 'An' 连用。",
    preset4_label: "有丝分裂与减数分裂",
    preset4_query: "生物学中有丝分裂和减数分裂的关键区别是什么？",
    preset5_label: "苏格拉底哲学",
    preset5_query: "用简单的语言解释苏格拉底的质问法（苏格拉底式探究）。",
    math_label: "📊 数学",
    science_label: "🧬 科学",
    arabic_label: "✍️ 阿拉伯语",
    algebra_label: "📚 College Algebra 2e",
    chemistry_label: "🧪 Chemistry 2e",
    arabic_grammar_label: "✍️ 简明阿拉伯语语法",
    explain_label: "💡 逐步解释",
    summary_label: "📝 生成摘要",
    practice_label: "✍️ 主动回忆挑战",
    quiz_label: "⚡ 快速掌握测验"
  },
  it: {
    speech_unsupported: "Il tuo browser non supporta il riconoscimento vocale.",
    welcome: "Benvenuto in Fahem! 🧠 Il tuo sciame di tutor IA in tasca. Sono pronto ad aiutarti a studiare i tuoi libri e le tue risorse di apprendimento, ottenere risposte citate dalle pagine, creare programmi di studio dinamici, fare quiz adattivi e fare pratica orale! Quale materia o libro studiamo oggi?",
    auto_explain_prompt: "Per favore, spiega questo estratto in dettaglio e in termini semplici: ",
    welcome_back: "Bentornato in questa conversazione! Come posso aiutarti ulteriormente?",
    confirm_delete_session: "Sei sicuro di voler eliminare questa chat salvata?",
    new_chat_welcome: "Benvenuto! Sono pronto per iniziare una nuova conversazione con te.",
    subject_desc_default: "Materia accademica",
    math_desc: "Algebra e Statistica",
    science_desc: "Biologia, Fisica, Chimica",
    arabic_desc: "Linguistica e grammatica araba",
    book_desc_default: "Libro di testo",
    algebra_desc: "Libro di testo di algebra OpenStax",
    chemistry_desc: "Volume di chimica OpenStax",
    arabic_grammar_desc: "Regole di grammatica araba semplificate",
    explain_command: "Spiegazione pedagogica dettagliata",
    summary_command: "Scheda di concetti e formule ad alta densità",
    practice_command: "Genera una domanda interattiva da risolvere",
    quiz_command: "Genera un quiz concettuale di 3 domande",
    floating_trigger_title: "Parla con Fahem AI",
    companion_title: "Compagno Fahem",
    responsible_ai: "IA responsabile attiva",
    compact_overlay: "Finestra compatta",
    side_panel: "Pannello laterale",
    full_screen: "Schermo intero",
    chat_history: "Cronologia chat",
    email_label: "E-mail:",
    saved_chats: "Chat salvate",
    new_chat: "Nuova chat",
    loading_chats: "Caricamento chat...",
    no_saved_chats: "Nessuna chat salvata",
    untitled_chat: "Chat senza titolo",
    messages_count: "messaggi",
    active_page_context: "Contesto attivo dai tuoi libri:",
    page_label: "Pagina",
    thinking_fetching: "Riflessione e recupero della conoscenza...",
    read_aloud: "Leggi ad alta voce",
    speech_stop: "Ferma",
    speech_listen: "Ascolta",
    ground_with_google: "Verifica con Google Search",
    logs_label: "Log",
    no_logs: "Nessun log di esecuzione.",
    voice_dictation: "Dettatura vocale",
    input_placeholder: "Chiedi al tuo compagno tutor (digita @, # o /)...",
    preset1_label: "Pratica con le matrici (p.14)",
    preset1_query: "Dammi una domanda pratica sull'inversione di matrici dall'algebra a pagina 14.",
    preset2_label: "Ciclo di Calvin (Biologia)",
    preset2_query: "Spiega il ciclo di Calvin in biologia e quali lunghezze d'onda la clorofilla assorbe meno.",
    preset3_label: "Verbi incoativas (Grammatica)",
    preset3_query: "Spiega Kaada e le sue sorelle e quando il suo predicato non deve essere associato a 'An'.",
    preset4_label: "Mitosi vs Meiosi",
    preset4_query: "Qual è la differenza fondamentale tra mitosi e meiosi in biologia?",
    preset5_label: "Filosofia di Socrate",
    preset5_query: "Spiega il metodo socratico dell'elenchus (indagine socratica) in termini semplici.",
    math_label: "📊 Matematica",
    science_label: "🧬 Scienze",
    arabic_label: "✍️ Arabo",
    algebra_label: "📚 College Algebra 2e",
    chemistry_label: "🧪 Chemistry 2e",
    arabic_grammar_label: "✍️ Grammatica araba semplificata",
    explain_label: "💡 Spiega passo dopo passo",
    summary_label: "📝 Genera riassunto",
    practice_label: "✍️ Sfida di richiamo attivo",
    quiz_label: "⚡ Quiz di padronanza rapida"
  }
};

export default function StickyChat() {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Demo sandbox identity (Tier-0/Tier-1 evaluation sessions, no Firebase user).
  // The companion must run with the exact same features but routed to the sandbox DB.
  const [demoMode, setDemoMode] = useState(false);
  const [demoIdentity, setDemoIdentity] = useState<{ uid: string; email: string | null; tier: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const decodeDemoToken = (raw: string): { uid: string; email: string | null; tier: number } | null => {
      try {
        const body = raw.split(".")[1];
        if (!body) return null;
        const normalized = body.replace(/-/g, "+").replace(/_/g, "/");
        const json = JSON.parse(decodeURIComponent(escape(window.atob(normalized))));
        // Strictly clamp the sandbox to Tier-0 or Tier-1 only.
        const tier = Number(json.tier) === 1 ? 1 : 0;
        return { uid: json.uid, email: json.email ?? null, tier };
      } catch (err) {
        console.error("[Companion] Failed to decode sandbox session token:", err);
        return null;
      }
    };

    const syncDemo = () => {
      const isDemo = localStorage.getItem("app_mode") === "demo" && !!localStorage.getItem("demo_auth_token");
      setDemoMode(isDemo);
      if (isDemo) {
        setDemoIdentity(decodeDemoToken(localStorage.getItem("demo_auth_token") || ""));
        // The companion replaces the quick tour in the sandbox, so surface it on first entry.
        // Once the visitor opens/closes it, that preference is respected via sessionStorage.
        if (sessionStorage.getItem("fahem_companion_is_open") === null) {
          setIsOpen(true);
        }
      } else {
        setDemoIdentity(null);
      }
    };

    syncDemo();
    window.addEventListener("storage", syncDemo);
    return () => window.removeEventListener("storage", syncDemo);
  }, []);

  // Load initial isOpen state from sessionStorage after mount to avoid Next.js SSR hydration mismatch
  useEffect(() => {
    if (typeof window !== "undefined") {
      const persisted = sessionStorage.getItem("fahem_companion_is_open");
      if (persisted === "true") {
        setIsOpen(true);
      }

      const handleForceOpen = () => setIsOpen(true);
      const handleForceClose = () => setIsOpen(false);
      window.addEventListener("fahem_chat_open", handleForceOpen);
      window.addEventListener("fahem_chat_close", handleForceClose);
      return () => {
        window.removeEventListener("fahem_chat_open", handleForceOpen);
        window.removeEventListener("fahem_chat_close", handleForceClose);
      };
    }
  }, []);

  // Sync isOpen state to sessionStorage when changed
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("fahem_companion_is_open", isOpen ? "true" : "false");
    }
  }, [isOpen]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [useGrounded, setUseGrounded] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string>("");
  // FC6.23: interrupt + transparent status. abortRef holds the live /api/agent stream
  // controller so the user can Stop it; statusTick rotates the human-readable status.
  const abortRef = useRef<AbortController | null>(null);
  const [statusTick, setStatusTick] = useState(0);
  const [sessionLogs, setSessionLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  // Multimodal Voice (STT & TTS) States & Helpers
  const [isListeningChat, setIsListeningChat] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const speakingMsgIdRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fahem_tts_voice") || "Aoede";
    }
    return "Aoede";
  });

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    if (typeof window !== "undefined") {
      localStorage.setItem("fahem_tts_voice", voiceId);
    }
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem("fahem_tts_voice");
      if (stored && stored !== selectedVoice) {
        setSelectedVoice(stored);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [selectedVoice]);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(ct("speech_unsupported"));
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = language === "ar" ? "ar-EG" : (language as string) === "es" ? "es-ES" : (language as string) === "fr" ? "fr-FR" : (language as string) === "de" ? "de-DE" : (language as string) === "zh" ? "zh-CN" : (language as string) === "it" ? "it-IT" : "en-US";

    rec.onstart = () => {
      setIsListeningChat(true);
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setInputValue((prev) => (prev ? prev + " " + transcript : transcript));
      }
    };

    rec.onerror = (err: any) => {
      console.error("Speech Recognition Error:", err);
      setIsListeningChat(false);
    };

    rec.onend = () => {
      setIsListeningChat(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListeningChat(false);
  };

  const toggleSpeechRecognition = () => {
    if (isListeningChat) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  };

  const speakMessageText = async (messageId: string, text: string) => {
    if (speakingMsgId === messageId) {
      if ((window as any)._activeAudio) {
        (window as any)._activeAudio.pause();
        (window as any)._activeAudio = null;
      }
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      speakingMsgIdRef.current = null;
      return;
    }

    if ((window as any)._activeAudio) {
      (window as any)._activeAudio.pause();
      (window as any)._activeAudio = null;
    }
    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/\[\^.*?\]/g, "")
      .replace(/\*\*|__/g, "")
      .replace(/\*|_/g, "")
      .replace(/`.*?`/g, "")
      .replace(/#+\s+/g, "")
      .replace(/-\s+/g, "")
      .trim();

    if (!cleanText) return;

    setSpeakingMsgId(messageId);
    speakingMsgIdRef.current = messageId;

    const runWebSpeechFallback = (txt: string) => {
      if (speakingMsgIdRef.current !== messageId) {
        return; // Stopped or switched message!
      }

      // Split cleanText into language-specific segments
      const rawSegments = txt.split(/([.?!:\n]+)/);
      
      interface SpeechSegment {
        text: string;
        lang: string;
      }
      
      const tempSegments: SpeechSegment[] = [];
      let currentText = "";
      
      for (let i = 0; i < rawSegments.length; i++) {
        const part = rawSegments[i];
        if (!part) continue;
        
        if (/^[.?!:\n]+$/.test(part)) {
          currentText += part;
        } else {
          if (currentText.trim()) {
            const hasArabic = /[\u0600-\u06FF]/.test(currentText);
            const lang = hasArabic 
              ? "ar-EG" 
              : (language === "ar" ? "ar-EG" : (language as string) === "es" ? "es-ES" : (language as string) === "fr" ? "fr-FR" : (language as string) === "de" ? "de-DE" : (language as string) === "zh" ? "zh-CN" : (language as string) === "it" ? "it-IT" : "en-US");
            tempSegments.push({ text: currentText, lang });
          }
          currentText = part;
        }
      }
      
      if (currentText.trim()) {
        const hasArabic = /[\u0600-\u06FF]/.test(currentText);
        const lang = hasArabic 
          ? "ar-EG" 
          : (language === "ar" ? "ar-EG" : (language as string) === "es" ? "es-ES" : (language as string) === "fr" ? "fr-FR" : (language as string) === "de" ? "de-DE" : (language as string) === "zh" ? "zh-CN" : (language as string) === "it" ? "it-IT" : "en-US");
        tempSegments.push({ text: currentText, lang });
      }

      // Merge consecutive segments of the same language
      const mergedSegments: SpeechSegment[] = [];
      for (const seg of tempSegments) {
        if (mergedSegments.length > 0 && mergedSegments[mergedSegments.length - 1].lang === seg.lang) {
          mergedSegments[mergedSegments.length - 1].text += " " + seg.text;
        } else {
          mergedSegments.push(seg);
        }
      }

      if (mergedSegments.length === 0) {
        if (speakingMsgIdRef.current === messageId) {
          setSpeakingMsgId(null);
          speakingMsgIdRef.current = null;
        }
        return;
      }

      let currentSegIndex = 0;

      const playNextSegment = () => {
        if (speakingMsgIdRef.current !== messageId) {
          return; // Stopped or switched message!
        }

        if (currentSegIndex >= mergedSegments.length) {
          setSpeakingMsgId(null);
          speakingMsgIdRef.current = null;
          return;
        }

        const segment = mergedSegments[currentSegIndex];
        const utterance = new SpeechSynthesisUtterance(segment.text.trim());
        (window as any)._activeUtterance = utterance;
        utterance.lang = segment.lang;

        const voices = window.speechSynthesis.getVoices();
        const langPrefix = segment.lang.split("-")[0];
        let selectedVoice = voices.find(v => v.lang.startsWith(langPrefix));
        if (!selectedVoice) {
          selectedVoice = voices.find(v => v.lang.startsWith("en"));
        }
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.onend = () => {
          if (speakingMsgIdRef.current === messageId) {
            currentSegIndex++;
            playNextSegment();
          }
        };

        utterance.onerror = (err) => {
          console.error("Speech Synthesis Segment Error:", err);
          if (speakingMsgIdRef.current === messageId) {
            currentSegIndex++;
            playNextSegment();
          }
        };

        window.speechSynthesis.speak(utterance);
      };

      playNextSegment();
    };

    try {
      const hasArabic = /[\u0600-\u06FF]/.test(cleanText);
      const reqLang = hasArabic ? "ar" : (language || "en");
      
      const res = await authedFetch("/api/audio/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanText,
          language: reqLang,
          voice: selectedVoice, // use the user's selected voice dynamically!
        })
      });

      if (speakingMsgIdRef.current !== messageId) {
        return; // User cancelled or switched before fetch returned
      }

      if (res.ok) {
        const data = await res.json();
        
        if (speakingMsgIdRef.current !== messageId) {
          return; // User cancelled or switched during parsing
        }

        if (data.success && data.audioContent) {
          const audioUrl = `data:${data.mimeType || "audio/wav"};base64,${data.audioContent}`;
          const audio = new Audio(audioUrl);
          (window as any)._activeAudio = audio;
          
          audio.onended = () => {
            if (speakingMsgIdRef.current === messageId) {
              setSpeakingMsgId(null);
              speakingMsgIdRef.current = null;
            }
            if ((window as any)._activeAudio === audio) {
              (window as any)._activeAudio = null;
            }
          };

          audio.onerror = (e) => {
            if (speakingMsgIdRef.current !== messageId) {
              return;
            }
            console.error("Premium Audio playback error, falling back to Web Speech:", e);
            runWebSpeechFallback(cleanText);
          };

          await audio.play();
          return;
        }
      }
      
      if (speakingMsgIdRef.current === messageId) {
        console.warn("Premium TTS request unsuccessful, falling back to Web Speech");
        runWebSpeechFallback(cleanText);
      }

    } catch (err) {
      if (speakingMsgIdRef.current === messageId) {
        console.error("Failed to run premium TTS:", err);
        runWebSpeechFallback(cleanText);
      }
    }
  };

  // Layout & Context States
  const [layoutMode, setLayoutMode] = useState<"compact" | "side" | "fullscreen">("compact");
  const [bookContext, setBookContext] = useState<any>(null);

  // Interactivity, Feedback & Pacing States
  const [selectedMcqs, setSelectedMcqs] = useState<Record<string, string>>({});
  const [likedMessages, setLikedMessages] = useState<Record<string, "like" | "dislike">>({});
  const [fillInAnswers, setFillInAnswers] = useState<Record<string, string>>({});
  const [awardedBlanks, setAwardedBlanks] = useState<Record<string, boolean>>({});
  const [chatPacing, setChatPacing] = useState<"instant" | "pedagogical">("instant");
  const [lockedLanguage, setLockedLanguage] = useState<"auto" | "en" | "ar">("auto");

  // Intent payload card state
  const [cardLoading, setCardLoading] = useState<Record<string, boolean>>({});
  const [cardSuccess, setCardSuccess] = useState<Record<string, string>>({});

  interface IntentPayload {
    type: string;
    action: string;
    target: any;
  }

  const parseIntentFromText = (text: string) => {
    if (!text) return { cleanText: "", intent: null };
    
    // Search for [INTENT: <json>]
    const intentMatch = text.match(/\[INTENT:\s*(\{[\s\S]*?\})\s*\]/);
    if (intentMatch) {
      try {
        const jsonStr = intentMatch[1];
        const intent = JSON.parse(jsonStr) as IntentPayload;
        // Strip the [INTENT: ...] pattern from display
        const cleanText = text.replace(/\[INTENT:\s*\{[\s\S]*?\}\s*\]/g, "").trim();
        return { cleanText, intent };
      } catch (err) {
        console.error("Failed to parse intent JSON:", err);
      }
    }
    return { cleanText: text, intent: null };
  };

  const renderIntentCard = (intent: IntentPayload, msgId: string) => {
    if (!intent) return null;
    const isLoading = !!cardLoading[msgId];
    const successMsg = cardSuccess[msgId];

    const isAr = language === "ar";

    // Handle Execute Action
    const handleExecuteAction = async () => {
      setCardLoading(prev => ({ ...prev, [msgId]: true }));
      try {
        if (intent.type === "navigation") {
          let action = intent.action;
          let target = intent.target;
          if (typeof target === "string") {
            try {
              target = JSON.parse(target);
            } catch (_) {}
          }
          if (action === "view_page" && target && (target.bookId || target.book_id)) {
            const bId = target.bookId || target.book_id;
            const pg = parseInt(target.page, 10) || 1;
            window.dispatchEvent(new CustomEvent("fahemNavigateBook", { detail: { bookId: bId, page: pg } }));
            setCardSuccess(prev => ({ ...prev, [msgId]: isAr ? "تم الانتقال بنجاح!" : "Navigated successfully!" }));
          } else if (action === "view_tab" && target && target.tab) {
            window.dispatchEvent(new CustomEvent("fahemNavigateTab", { detail: { tab: target.tab } }));
            setCardSuccess(prev => ({ ...prev, [msgId]: isAr ? "تم الانتقال بنجاح!" : "Navigated successfully!" }));
          } else {
            // Default fallback navigation dispatch
            window.dispatchEvent(new CustomEvent("fahemNavigateTab", { detail: { tab: action } }));
            setCardSuccess(prev => ({ ...prev, [msgId]: isAr ? "تم الانتقال بنجاح!" : "Navigated successfully!" }));
          }
        } else if (intent.type === "write" || intent.action?.startsWith("create_")) {
          let action = intent.action;
          let target = intent.target;
          if (typeof target === "string") {
            try {
              target = JSON.parse(target);
            } catch (_) {}
          }

          if (action === "create_practice" || action === "practice") {
            window.dispatchEvent(new CustomEvent("fahemNavigateTab", { detail: { tab: "practice" } }));
            
            const scopeType = target?.bookId || target?.book_id ? "book" : "subject";
            const bookId = target?.bookId || target?.book_id || "";
            const chapters = target?.selectedChapters || target?.chapters || [];
            const customConcepts = target?.customConcepts || target?.concepts || "";
            const subject = target?.subject || "General";
            const mode = target?.mode || "mcq";
            const format = target?.format || "infinite";
            // FC7.12b: forward question count + per-quiz timer when the companion set them.
            const questionCount = target?.questionCount;
            const durationSeconds = target?.durationSeconds;

            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("fahemFillAndLaunchPractice", {
                detail: {
                  scopeType,
                  bookId,
                  chapters,
                  customConcepts,
                  subject,
                  mode,
                  format,
                  questionCount,
                  durationSeconds
                }
              }));
            }, 300);

            setCardSuccess(prev => ({ ...prev, [msgId]: isAr ? "تم ملء الحقول وإطلاق الممارسة!" : "Practice fields populated and quest launched!" }));
          } else if (action === "create_zatona" || action === "zatona") {
            window.dispatchEvent(new CustomEvent("fahemNavigateTab", { detail: { tab: "zatona" } }));
            
            const scopeType = target?.bookId || target?.book_id ? "book" : (target?.subject ? "subject" : "text");
            const subject = target?.subject || "Math";
            const bookId = target?.bookId || target?.book_id || "";
            const chapters = target?.selectedChapters || target?.chapters || [];
            const customConcepts = target?.customConcepts || target?.concepts || "";
            const prompt = target?.concept || "";

            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("fahemFillAndLaunchZatona", {
                detail: {
                  scopeType,
                  subject,
                  bookId,
                  chapters,
                  customConcepts,
                  prompt
                }
              }));
            }, 300);

            setCardSuccess(prev => ({ ...prev, [msgId]: isAr ? "تم ملء الحقول وبدء العصر!" : "Zatona fields populated and digest started!" }));
          } else if (action === "create_assignment" || action === "assignment") {
            window.dispatchEvent(new CustomEvent("fahemNavigateTab", { detail: { tab: "social" } }));
            
            const groupId = target?.group_id || target?.groupId || "default";
            const title = target?.title || "New Assignment";
            const titleAr = target?.title_ar || target?.titleAr || "واجب جديد";
            const subjectId = target?.subject_id || target?.subjectId || null;
            const bookId = target?.book_id || target?.bookId || null;
            const timerSeconds = target?.timer_seconds || target?.timerSeconds || 120;
            const questions = target?.questions || [];

            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("fahemFillAndLaunchAssignment", {
                detail: {
                  group_id: groupId,
                  title,
                  title_ar: titleAr,
                  subject_id: subjectId,
                  book_id: bookId,
                  timer_seconds: timerSeconds,
                  questions
                }
              }));
            }, 300);

            setCardSuccess(prev => ({ ...prev, [msgId]: isAr ? "تم ملء حقول الواجب ونشره!" : "Assignment fields populated and deployed!" }));
          } else {
            throw new Error(`Unknown write action: ${action}`);
          }
        }
      } catch (err: any) {
        console.error("Intent action failed:", err);
        alert(isAr ? `فشلت العملية: ${err.message || err}` : `Action failed: ${err.message || err}`);
      } finally {
        setCardLoading(prev => ({ ...prev, [msgId]: false }));
      }
    };

    // Determine card styling, labels, icons, etc.
    let title = isAr ? "إجراء مقترح" : "Suggested Action";
    let buttonLabel = isAr ? "موافق وتطبيق" : "Accept Action";
    let icon = "⚡";
    let detailsText = "";

    if (intent.type === "navigation") {
      title = isAr ? "📍 انتقال سريع للمحتوى" : "📍 Instant Content Navigation";
      buttonLabel = isAr ? "انتقال الآن" : "Navigate Now";
      icon = "🚀";
      const action = intent.action;
      let target = intent.target;
      if (typeof target === "string") {
        try { target = JSON.parse(target); } catch (_) {}
      }
      if (action === "view_page") {
        detailsText = isAr 
          ? `فتح صفحة رقم ${target?.page || 1}` 
          : `Open textbook page ${target?.page || 1}`;
      } else if (action === "view_tab") {
        detailsText = isAr 
          ? `الذهاب لعلامة تبويب: ${target?.tab || ""}` 
          : `Go to tab: ${target?.tab || ""}`;
      } else {
        detailsText = isAr ? `انتقال سريع` : `Quick navigation`;
      }
    } else {
      const action = intent.action;
      let target = intent.target;
      if (typeof target === "string") {
        try { target = JSON.parse(target); } catch (_) {}
      }
      if (action === "create_practice" || action === "practice") {
        title = isAr ? "🎯 غارة مراجعة نشطة وممارسة" : "🎯 Active Recall & Practice Session";
        buttonLabel = isAr ? "إنشاء وبدء الممارسة" : "Create & Begin Practice";
        icon = "🧠";
        detailsText = isAr 
          ? `إنشاء ممارسة مخصصة لـ: ${target?.subject || "عام"}` 
          : `Create personalized practice on: ${target?.subject || "General"}`;
      } else if (action === "create_zatona" || action === "zatona") {
        title = isAr ? "⚡ توليد ملخص الزتونة الفوري" : "⚡ Instant Zatona Summary Core";
        buttonLabel = isAr ? "توليد وعرض الملخص" : "Generate & Read Zatona";
        icon = "💡";
        detailsText = isAr 
          ? `توليد زتونة مخصصة لـ: ${target?.concept?.slice(0, 60) || ""}` 
          : `Generate custom Zatona for: ${target?.concept?.slice(0, 60) || ""}`;
      } else if (action === "create_assignment" || action === "assignment") {
        title = isAr ? "📝 نشر واجب جديد للمجموعة" : "📝 Publish Group Assignment";
        buttonLabel = isAr ? "نشر وبدء الواجب" : "Publish & Assign";
        icon = "✏️";
        detailsText = isAr 
          ? `واجب: ${target?.title_ar || target?.title || "جديد"}` 
          : `Assignment: ${target?.title || "New"}`;
      }
    }

    return (
      <div
        className="intent-interactive-card"
        style={{
          marginTop: "1rem",
          padding: "1rem",
          borderRadius: "14px",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          boxShadow: "0 8px 32px 0 rgba(16, 107, 163, 0.08), inset 0 1px 1px rgba(255,255,255,0.2)",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          textAlign: isAr ? "right" : "left",
          direction: isAr ? "rtl" : "ltr",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          animation: "cardSlideIn 0.4s ease-out"
        }}
      >
        <style>{`
          @keyframes cardSlideIn {
            from { opacity: 0; transform: translateY(12px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes pulseGlow {
            0% { box-shadow: 0 0 4px rgba(16, 107, 163, 0.2); }
            100% { box-shadow: 0 0 12px rgba(16, 107, 163, 0.6); }
          }
          .intent-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(16, 107, 163, 0.25) !important;
            filter: brightness(1.05);
          }
          .intent-button:active {
            transform: translateY(1px);
          }
        `}</style>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.2rem" }}>{icon}</span>
          <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--primary)", letterSpacing: isAr ? "0" : "0.5px" }}>
            {title}
          </span>
        </div>

        {detailsText && (
          <div style={{ fontSize: "0.8rem", color: "var(--foreground)", opacity: 0.85, fontWeight: 500 }}>
            {detailsText}
          </div>
        )}

        {successMsg ? (
          <div 
            style={{ 
              fontSize: "0.82rem", 
              color: "#27ae60", 
              fontWeight: 700, 
              display: "flex", 
              alignItems: "center", 
              gap: "0.4rem",
              background: "rgba(46, 204, 113, 0.1)",
              padding: "0.5rem",
              borderRadius: "8px",
              border: "1px solid rgba(46, 204, 113, 0.2)"
            }}
          >
            ✓ {successMsg}
          </div>
        ) : (
          <button
            onClick={handleExecuteAction}
            disabled={isLoading}
            className="intent-button"
            style={{
              width: "100%",
              padding: "0.65rem 1rem",
              borderRadius: "10px",
              background: isLoading 
                ? "rgba(16, 107, 163, 0.2)" 
                : "linear-gradient(135deg, var(--primary) 0%, #1a8cc3 100%)",
              color: "#fff",
              border: "none",
              cursor: isLoading ? "not-allowed" : "pointer",
              fontSize: "0.8rem",
              fontWeight: 800,
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 2px 6px rgba(16, 107, 163, 0.15)",
              animation: isLoading ? "pulseGlow 1s infinite alternate" : "none"
            }}
          >
            {isLoading ? (
              <>
                <span 
                  style={{
                    width: "14px",
                    height: "14px",
                    border: "2px solid #fff",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.8s linear infinite"
                  }} 
                />
                {isAr ? "جاري المعالجة..." : "Processing..."}
              </>
            ) : (
              buttonLabel
            )}
          </button>
        )}
      </div>
    );
  };


  // Helper to parse standard MCQs
  const parseMcqFromText = (text: string) => {
    if (!text) return { isMcq: false, choices: [], correctKey: null, cleanText: "" };

    const choices: { key: string; text: string }[] = [];
    let correctKey: string | null = null;

    // Split text by lines
    const lines = text.split("\n");
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Match choice markers: e.g., A) Option, B. Option, or Arabic equivalents أ) الاختيار, ب) الاختيار
      const choiceMatch = trimmedLine.match(/^([A-D|أ|ب|ج|د|ه])[\)\.-]\s*(.+)$/i);
      if (choiceMatch) {
        const key = choiceMatch[1].toUpperCase();
        const choiceText = choiceMatch[2].trim();
        // Avoid duplicate choices
        if (!choices.some(c => c.key === key)) {
          choices.push({ key, text: choiceText });
        }
      }
    }

    // Extract correct answer: [Correct: B] or [Correct:ب]
    const correctMatch = text.match(/\[Correct:\s*([A-D|أ|ب|ج|د|ه])\s*\]/i);
    if (correctMatch) {
      correctKey = correctMatch[1].toUpperCase();
    }

    // If we have choices and a correct answer, it's an MCQ!
    const isMcq = choices.length > 0 && correctKey !== null;

    // Clean text for display - remove the bracketed Correct label
    const cleanText = text.replace(/\[Correct:\s*[A-D|أ|ب|ج|د|ه]\s*\]/gi, "").trim();

    return {
      isMcq,
      choices,
      correctKey,
      cleanText
    };
  };


  // Mentions Dropdown States
  const [mentionType, setMentionType] = useState<"subject" | "book" | "command" | null>(null);
  const [mentionSearch, setMentionQuery] = useState<string>("");
  const [showMentionsDropdown, setShowMentionsDropdown] = useState<boolean>(false);
  const [activeMentionIndex, setActiveMentionIndex] = useState<number>(0);
  const [dbSubjects, setDbSubjects] = useState<any[]>([]);

  useEffect(() => {
    setActiveMentionIndex(0);
  }, [showMentionsDropdown, mentionSearch]);
  const [dbBooks, setDbBooks] = useState<any[]>([]);


  // Saved Chats States
  const [sessions, setSessions] = useState<any[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string>("");
  const [editingTitle, setEditingTitle] = useState<string>("");

  // Dynamic Companion Suggestions States
  const [smartSuggestions, setSmartSuggestions] = useState<{ label: string; query: string; icon?: string }[]>([]);
  const [userActivities, setUserActivities] = useState<any[]>([]);

  const { language, dir, t } = useTranslation();

  const [selectedBookIds, setSelectedBookIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("fahem_selected_book_ids");
        return stored ? JSON.parse(stored) : [];
      } catch (err) {
        console.error("Failed to parse fahem_selected_book_ids:", err);
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    const syncSelectedBooks = () => {
      try {
        const stored = sessionStorage.getItem("fahem_selected_book_ids");
        setSelectedBookIds(stored ? JSON.parse(stored) : []);
      } catch (err) {
        console.error("Failed to sync fahem_selected_book_ids:", err);
      }
    };

    window.addEventListener("fahemRAGScopeChanged", syncSelectedBooks);
    syncSelectedBooks();

    return () => {
      window.removeEventListener("fahemRAGScopeChanged", syncSelectedBooks);
    };
  }, []);

  const ct = (key: string): string => {
    return chatTranslations[language]?.[key] || chatTranslations["en"]?.[key] || key;
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatLogsEndRef = useRef<HTMLDivElement>(null);
  const sendMessageRef = useRef<((text?: string) => Promise<void>) | undefined>(undefined);

  // Initialize welcome message based on language
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          text: ct("welcome"),
          timestamp: new Date()
        }
      ]);
    }
  }, [language, messages.length]);

  // Automatically trigger dynamic capabilities-grounded streaming welcome message
  useEffect(() => {
    if ((user || demoMode) && messages.length === 1 && messages[0]?.id === "welcome") {
      triggerDynamicWelcome(language);
    }
  }, [user, demoMode, language]);

  // Sync authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Saved Chats & Activities on Open
  useEffect(() => {
    const activeUid = user?.uid || demoIdentity?.uid;
    if ((user || demoMode) && isOpen && activeUid) {
      fetchSessions(activeUid);
      fetchUserActivities(activeUid);
    }
  }, [user, demoMode, demoIdentity, isOpen]);

  // Listen to custom textbook context changes from page.tsx
  useEffect(() => {
    const handleContextChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setBookContext(detail);
        
        if (detail.autoExplainText) {
          setIsOpen(true);
          setLayoutMode("side"); // Auto-expand to premium side-by-side mode!
          const autoExplainPrompt = `${ct("auto_explain_prompt")}"${detail.autoExplainText}"`;
          setTimeout(() => {
            if (sendMessageRef.current) {
              sendMessageRef.current(autoExplainPrompt);
            }
          }, 400);
        }
      } else {
        setBookContext(null);
        setLayoutMode("compact"); // Revert back to compact when leaving reader
      }
    };
    window.addEventListener("fahemBookContext", handleContextChange);
    return () => window.removeEventListener("fahemBookContext", handleContextChange);
  }, [language]);

  // Listen to selection popup actions from active reader
  useEffect(() => {
    const handleAskCompanion = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.text) {
        setIsOpen(true);
        setLayoutMode("side");
        setUseGrounded(true); // Auto-enable grounding for selection explain/summary (OR-25)
        
        // Ensure active page/book context is set for grounding with normalized selection fields
        const bookContextObj = {
          ...detail,
          selected_text: detail.selected_text || detail.text,
          book_id: detail.book_id || detail.bookId,
          page: detail.page || detail.pageNumber || detail.currentPage
        };
        setBookContext(bookContextObj);
        
        if (detail.bookId) {
          const bId = String(detail.bookId);
          setSelectedBookIds([bId]);
          try {
            sessionStorage.setItem("fahem_selected_book_ids", JSON.stringify([bId]));
          } catch (err) {
            console.error("Failed to save selected book ids:", err);
          }
        }
        
        setTimeout(() => {
          if (sendMessageRef.current) {
            sendMessageRef.current(detail.text);
          }
        }, 400);
      }
    };
    window.addEventListener("fahemAskCompanion", handleAskCompanion);
    return () => window.removeEventListener("fahemAskCompanion", handleAskCompanion);
  }, []);


  // Dynamic predictive companion suggestion engine
  useEffect(() => {
    if (isSending) return; // Prevent updates while streaming
    const isAr = language === "ar";
    const suggestions: { label: string; query: string; icon?: string }[] = [];

    // 1. Process recent user activity (e.g. active subject, incorrect practice history, last activity)
    const recentActivity = userActivities && userActivities.length > 0 ? userActivities[0] : null;

    if (recentActivity) {
      // Find incorrect or practice activity
      const failedPractice = userActivities.find((act: any) => act.type === "practice" && act.details?.isCorrect === false);
      if (failedPractice) {
        const topic = failedPractice.details?.subjectName || failedPractice.details?.bookTitle || failedPractice.details?.topic || "previous topic";
        suggestions.push({
          label: isAr ? `مراجعة مفهوم ${topic}` : `Review ${topic} concept`,
          query: isAr 
            ? `/explain اشرح لي مفهوم ${topic} بالتفصيل وبشكل مبسط لأنني أخطأت فيه سابقاً.` 
            : `/explain Please explain the concept of ${topic} step-by-step since I had trouble with it before.`,
          icon: "💡"
        });
      } else {
        // Just general last activity
        const actTopic = recentActivity.details?.topic || recentActivity.details?.bookTitle || recentActivity.details?.subjectName;
        if (actTopic) {
          suggestions.push({
            label: isAr ? `واصل مذاكرة ${actTopic}` : `Continue studying ${actTopic}`,
            query: isAr
              ? `دعنا نواصل مذاكرة موضوع ${actTopic} الذي كنت أدرسه للتو.`
              : `Let's continue our study of the topic ${actTopic} that I was just working on.`,
            icon: "📚"
          });
        }
      }
    }

    // 2. Process textbook bookContext (current active book and page)
    if (bookContext && bookContext.currentPage) {
      const page = bookContext.currentPage;
      const bTitle = bookContext.bookTitle || (isAr ? "الكتاب المدرسي" : "curriculum textbook");
      
      // Page active recall prompt
      suggestions.push({
        label: isAr ? `تحدي نشط (صفحة ${page})` : `Active Recall (p. ${page})`,
        query: isAr
          ? `/practice اختبرني في المفاهيم الأساسية لصفحة ${page} من كتاب ${bTitle}.`
          : `/practice Generate an active recall challenge for page ${page} of ${bTitle}.`,
        icon: "✍️"
      });

      // Page concept check summary
      suggestions.push({
        label: isAr ? `فحص المفاهيم (ص ${page})` : `Concept Check (p. ${page})`,
        query: isAr
          ? `ما هي أهم فكرة مفاهيمية أو قانون في صفحة ${page} من ${bTitle}؟`
          : `What is the most important conceptual takeaway or formula from page ${page} of ${bTitle}?`,
        icon: "🧠"
      });
    }

    // 3. Process current discussion sequence (last assistant message)
    const assistantMsgs = messages.filter((m) => m.role === "assistant" && m.id !== "welcome");
    const lastAssistantMsg = assistantMsgs.length > 0 ? assistantMsgs[assistantMsgs.length - 1].text : "";

    if (lastAssistantMsg) {
      // Analyze discussion context: Math, code, or formulas vs. generic concepts
      const hasMathOrCode = /[\+\-\*\/=\\\(\)\{\}\$`]|`{3}/.test(lastAssistantMsg);
      if (hasMathOrCode) {
        suggestions.push({
          label: isAr ? "تفكيك الحسابات" : "Step-by-step Math",
          query: isAr
            ? "هل يمكنك تفكيك وحساب الخطوات الرياضية أو القوانين السابقة وتوضيحها بالتفصيل؟"
            : "Can you break down the mathematical steps and formulas in your last response step-by-step?",
          icon: "➕"
        });
        suggestions.push({
          label: isAr ? "تحدي مسألة مماثلة" : "Similar Practice",
          query: isAr
            ? "/practice أعطني مسألة رياضية مماثلة للموضوع السابق لأقوم بحلها بنفسي واختبار فهمي."
            : "/practice Please generate a similar math problem so I can practice solving it on my own and test my understanding.",
          icon: "✍️"
        });
      } else {
        suggestions.push({
          label: isAr ? "لخص الشرح الأخير" : "Summarize last reply",
          query: isAr
            ? "/summary لخص لي ردك وشرحك الأخير في نقاط أساسية موجزة وسهلة الحفظ."
            : "/summary Summarize your last explanation into high-density key bullet points.",
          icon: "📝"
        });
        suggestions.push({
          label: isAr ? "اختبرني بالنقاط السابقة" : "Quick Concept Check",
          query: isAr
            ? "/quiz اختبرني في النقاط التي شرحتها للتو بثلاثة أسئلة اختيار من متعدد."
            : "/quiz Give me a quick 3-question conceptual quiz on the points you just explained.",
          icon: "⚡"
        });
      }
    }

    // 4. Fallback to default localized preset queries to maintain variety & seed interest
    const defaultPresets = [
      {
        label: ct("preset1_label"),
        query: ct("preset1_query"),
        icon: "📊"
      },
      {
        label: ct("preset2_label"),
        query: ct("preset2_query"),
        icon: "🧬"
      },
      {
        label: ct("preset3_label"),
        query: ct("preset3_query"),
        icon: "✍️"
      },
      {
        label: ct("preset4_label"),
        query: ct("preset4_query"),
        icon: "🧬"
      },
      {
        label: ct("preset5_label"),
        query: ct("preset5_query"),
        icon: "💡"
      }
    ];

    // Combine predictions and fill up to 5 slots
    const finalSuggestions = [...suggestions];
    for (const preset of defaultPresets) {
      if (finalSuggestions.length >= 6) break;
      // Avoid exact duplicates
      if (!finalSuggestions.some((s) => s.label === preset.label)) {
        finalSuggestions.push(preset);
      }
    }

    setSmartSuggestions(finalSuggestions.slice(0, 5));
  }, [messages, bookContext, userActivities, language, isSending]);

  // Manage layout class on body for side-panel push effect
  useEffect(() => {
    if (isOpen && layoutMode === "side") {
      document.body.classList.add("companion-side-open");
    } else {
      document.body.classList.remove("companion-side-open");
    }
    return () => {
      document.body.classList.remove("companion-side-open");
    };
  }, [isOpen, layoutMode]);

  // Scroll messages to bottom on change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeAgent]);

  // Scroll logs to bottom on change
  useEffect(() => {
    if (chatLogsEndRef.current) {
      chatLogsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [sessionLogs]);

  // Fetch subjects and books for mentions dropdown autocomplete
  useEffect(() => {
    const fetchMetadataForMentions = async () => {
      try {
        const [subRes, booksRes] = await Promise.all([
          authedFetch("/api/subjects"),
          authedFetch("/api/books")
        ]);
        if (subRes.ok) {
          const subData = await subRes.json();
          if (subData.success) {
            setDbSubjects(subData.subjects || []);
          }
        }
        if (booksRes.ok) {
          const booksData = await booksRes.json();
          if (booksData.success) {
            setDbBooks(booksData.books || []);
          }
        }
      } catch (err) {
        console.error("Error fetching subjects/books for mentions autocomplete:", err);
      }
    };
    fetchMetadataForMentions();
  }, []);


  async function fetchSessions(userIdVal?: string) {
    const activeUserId = userIdVal || user?.uid || demoIdentity?.uid;
    if (!activeUserId) return;
    setIsSessionsLoading(true);
    try {
      const response = await authedFetch(`/api/history?userId=${encodeURIComponent(activeUserId)}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Error fetching sessions in companion:", err);
    } finally {
      setIsSessionsLoading(false);
    }
  }

  async function fetchUserActivities(userIdVal?: string) {
    const activeUserId = userIdVal || user?.uid || demoIdentity?.uid;
    if (!activeUserId) return;
    try {
      const response = await authedFetch(`/api/activity?userId=${encodeURIComponent(activeUserId)}`);
      if (response.ok) {
        const data = await response.json();
        setUserActivities(data.activities || []);
      }
    } catch (err) {
      console.error("Error fetching user activities in companion:", err);
    }
  }

  async function loadSession(sessionIdVal: string) {
    if (!sessionIdVal) return;
    setIsSessionsLoading(true);
    try {
      const response = await authedFetch(`/api/history/detail?sessionId=${encodeURIComponent(sessionIdVal)}`);
      if (response.ok) {
        const data = await response.json();
        const sess = data.session;
        if (sess) {
          setCurrentSessionId(sess.sessionId);
          // Map session messages to Message interface
          const mappedMsgs: Message[] = (sess.messages || []).map((m: any, index: number) => ({
            id: `msg-${index}-${Date.now()}`,
            role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
            text: m.content || m.text || "",
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
          }));
          setMessages(mappedMsgs.length > 0 ? mappedMsgs : [
            {
              id: "welcome",
              role: "assistant",
              text: ct("welcome_back"),
              timestamp: new Date()
            }
          ]);
          setShowHistory(false); // Close history drawer
        }
      }
    } catch (err) {
      console.error("Error loading session in companion:", err);
    } finally {
      setIsSessionsLoading(false);
    }
  }

  async function deleteSession(sessionIdVal: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!sessionIdVal) return;
    const confirmMsg = ct("confirm_delete_session");
    if (!confirm(confirmMsg)) {
      return;
    }
    try {
      const response = await authedFetch(`/api/history?sessionId=${encodeURIComponent(sessionIdVal)}`, {
        method: "DELETE"
      });
      if (response.ok) {
        if (currentSessionId === sessionIdVal) {
          startNewChat();
        }
        await fetchSessions();
      }
    } catch (err) {
      console.error("Error deleting session in companion:", err);
    }
  }

  async function renameSession(sessionIdVal: string, newTitle: string) {
    if (!sessionIdVal || !newTitle.trim()) return;
    try {
      const response = await authedFetch("/api/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdVal, title: newTitle.trim() })
      });
      if (response.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.sessionId === sessionIdVal ? { ...s, title: newTitle.trim() } : s))
        );
      } else {
        console.error("Failed to rename session");
      }
    } catch (err) {
      console.error("Error renaming session:", err);
    } finally {
      setEditingSessionId("");
      setEditingTitle("");
    }
  }

  const triggerDynamicWelcome = async (lang: string) => {
    if (!user && !demoMode) return;
    try {
      const promptPayload = `Please provide an engaging welcome introduction outlining your actual capabilities as the Fahem AI Companion (such as book reading, smart study schedules, oral practice, adaptive quizzes, page-cited answers, and research node). Keep it friendly and concise, in the user's language: ${lang === "ar" ? "Arabic" : "English"}. Do not use markdown headers of level 1 or 2, use list bullet-points or emojis instead. Keep it extremely welcoming and premium.`;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === "welcome" ? { ...msg, text: "" } : msg
        )
      );

      const response = await authedFetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptPayload,
          language: lang,
        }),
      });

      if (!response.body) {
        throw new Error("No readable stream in response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = "";
      let chunkBuffer = "";
      let inFinalOutput = false;

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        let chunk = "";
        if (value) {
          chunk = decoder.decode(value, { stream: true });
        } else if (done) {
          chunk = decoder.decode();
        }
        chunkBuffer += chunk;

        let processed = true;
        while (processed && chunkBuffer.length > 0) {
          processed = false;

          if (!inFinalOutput) {
            const nlIdx = chunkBuffer.indexOf("\n");
            if (nlIdx !== -1) {
              const line = chunkBuffer.substring(0, nlIdx);
              chunkBuffer = chunkBuffer.substring(nlIdx + 1);
              processed = true;

              const trimmedLine = line.trim();
              if (trimmedLine) {
                if (trimmedLine.includes("=== Agent Final Output ===")) {
                  inFinalOutput = true;
                }
              }
            }
          } else {
            const boundaryIdx = chunkBuffer.indexOf("==========================");
            if (boundaryIdx !== -1) {
              const textBefore = chunkBuffer.substring(0, boundaryIdx);
              chunkBuffer = chunkBuffer.substring(boundaryIdx + "==========================".length);
              inFinalOutput = false;
              processed = true;

              if (textBefore) {
                accumulatedText += textBefore;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === "welcome" ? { ...msg, text: accumulatedText.trim() } : msg
                  )
                );
              }
            } else if (chunkBuffer.length > 30) {
              const safeLen = chunkBuffer.length - 30;
              const safeText = chunkBuffer.substring(0, safeLen);
              chunkBuffer = chunkBuffer.substring(safeLen);
              processed = true;

              accumulatedText += safeText;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === "welcome" ? { ...msg, text: accumulatedText.trim() } : msg
                )
              );
            }
          }
        }

        if (done && chunkBuffer.length > 0) {
          if (inFinalOutput) {
            let cleanText = chunkBuffer;
            const bIdx = cleanText.indexOf("==========================");
            if (bIdx !== -1) {
              cleanText = cleanText.substring(0, bIdx);
            }
            if (cleanText) {
              accumulatedText += cleanText;
            }
          } else {
            const trimmedLine = chunkBuffer.trim();
            if (trimmedLine && !trimmedLine.includes("==========================") && !trimmedLine.includes("[CLOSE]")) {
              if (!trimmedLine.startsWith("[METADATA]") &&
                  !trimmedLine.startsWith("[Unknown]") &&
                  !trimmedLine.startsWith("[Fahem Agent]") &&
                  !trimmedLine.startsWith("[Sub-Agent:") &&
                  !trimmedLine.startsWith("Prompt:")) {
                accumulatedText += chunkBuffer + "\n";
              }
            }
          }
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === "welcome" ? { ...msg, text: accumulatedText.trim() } : msg
            )
          );
          chunkBuffer = "";
        }
      }
    } catch (err) {
      console.error("Error fetching dynamic welcome message:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === "welcome" ? { ...msg, text: ct("welcome") } : msg
        )
      );
    }
  };

  const startNewChat = () => {
    setCurrentSessionId("");
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        text: ct("welcome"),
        timestamp: new Date()
      }
    ]);
    setSessionLogs([]);
    setShowHistory(false);
    if (user) {
      triggerDynamicWelcome(language);
    }
  };

  const getMentionOptions = () => {
    if (mentionType === "subject") {
      const opts = dbSubjects.map(sub => ({
        id: `@${sub._id || sub.id}`,
        label: `${sub.emoji || sub.icon_emoji || "📚"} ${language === "ar" ? sub.name_ar || sub.name : sub.name}`,
        desc: sub.category || ct("subject_desc_default")
      }));
      if (opts.length === 0) {
        opts.push(
          { id: "@math", label: ct("math_label"), desc: ct("math_desc") },
          { id: "@science", label: ct("science_label"), desc: ct("science_desc") },
          { id: "@arabic", label: ct("arabic_label"), desc: ct("arabic_desc") }
        );
      }
      return opts.filter(o => o.id.toLowerCase().includes(mentionSearch.toLowerCase()));
    }
    if (mentionType === "book") {
      const opts = dbBooks.map(b => ({
        id: `#${b._id || b.id}`,
        label: `📚 ${language === "ar" ? b.title_ar || b.title : b.title}`,
        desc: b.grade || ct("book_desc_default")
      }));
      if (opts.length === 0) {
        opts.push(
          { id: "#college-algebra", label: "📚 College Algebra 2e", desc: ct("algebra_desc") },
          { id: "#chemistry-handbook", label: "🧪 Chemistry 2e", desc: ct("chemistry_desc") },
          { id: "#arabic-grammar", label: "✍️ كتاب النحو المبسط", desc: ct("arabic_grammar_desc") }
        );
      }
      return opts.filter(o => o.id.toLowerCase().includes(mentionSearch.toLowerCase()));
    }
    if (mentionType === "command") {
      const opts = [
        { id: "/explain", label: ct("explain_label"), desc: ct("explain_command") },
        { id: "/summary", label: ct("summary_label"), desc: ct("summary_command") },
        { id: "/practice", label: ct("practice_label"), desc: ct("practice_command") },
        { id: "/quiz", label: ct("quiz_label"), desc: ct("quiz_command") }
      ];
      return opts.filter(o => o.id.toLowerCase().includes(mentionSearch.toLowerCase()));
    }
    return [];
  };

  const handleSelectMention = (optionId: string) => {
    const words = inputValue.split(/\s+/);
    words[words.length - 1] = optionId;
    setInputValue(words.join(" ") + " ");
    setShowMentionsDropdown(false);
    setMentionType(null);
    setMentionQuery("");
  };

  const parseInlineMarkdown = (text: string, msgId?: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[[^\]]+\]\([^)]+\)|\[[^\]:]+\s*:\s*[pP]\d+\]|\[[pP]\d+\]|\[Blank:[^\]]+\])/gi);
    return parts.map((part, pIdx) => {
      if (!part) return null;
      if (/^\[Blank:\s*(.+)\s*\]$/i.test(part)) {
        const expectedAnswer = part.match(/^\[Blank:\s*(.+)\s*\]$/i)![1].trim();
        const expectedAnswers = expectedAnswer.split("|").map(a => a.trim().toLowerCase());
        const blankKey = `${msgId || "default"}-${pIdx}`;
        const userAnswer = (fillInAnswers[blankKey] || "").trim().toLowerCase();
        const isCorrect = expectedAnswers.includes(userAnswer);
        
        return (
          <input
            key={pIdx}
            type="text"
            value={fillInAnswers[blankKey] || ""}
            onChange={(e) => {
              const val = e.target.value;
              setFillInAnswers(prev => ({ ...prev, [blankKey]: val }));
              
              const isUserCorrect = expectedAnswers.includes(val.trim().toLowerCase());
              if (isUserCorrect) {
                setAwardedBlanks(prev => {
                  if (!prev[blankKey]) {
                    const xpEvent = new CustomEvent("fahemXpGained", { detail: { xp: 10 } });
                    window.dispatchEvent(xpEvent);
                    return { ...prev, [blankKey]: true };
                  }
                  return prev;
                });
              }
            }}
            placeholder="..."
            style={{
              display: "inline-block",
              border: "none",
              borderBottom: isCorrect 
                ? "2px solid var(--accent-green, #2ecc71)" 
                : ((fillInAnswers[blankKey] || "").trim() ? "2px solid var(--accent-orange, #e74c3c)" : "2px dashed var(--primary)"),
              borderRadius: "4px",
              padding: "2px 8px",
              margin: "0 4px",
              width: `${Math.max(expectedAnswer.length * 10, 80)}px`,
              backgroundColor: isCorrect 
                ? "rgba(46, 204, 113, 0.1)" 
                : ((fillInAnswers[blankKey] || "").trim() ? "rgba(231, 76, 60, 0.05)" : "rgba(16, 107, 163, 0.03)"),
              color: isCorrect ? "#2ecc71" : "inherit",
              fontSize: "0.85rem",
              textAlign: "center",
              outline: "none",
              transition: "all 0.25s ease",
              fontWeight: isCorrect ? "700" : "400"
            }}
            title={isCorrect ? (language === "ar" ? "إجابة صحيحة! (+10 XP)" : "Correct answer! (+10 XP)") : ""}
            disabled={isCorrect}
          />
        );
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={pIdx} style={{ color: "var(--primary)", fontWeight: 800 }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={pIdx} style={{ background: "rgba(16, 107, 163, 0.08)", padding: "1px 4px", borderRadius: "4px", fontSize: "0.9em", color: "var(--primary)", fontFamily: "monospace" }}>{part.slice(1, -1)}</code>;
      }
      const customMatch = part.match(/^\[([^\]:]+)\s*:\s*([pP])(\d+)\]$/i);
      if (customMatch) {
        const bookId = customMatch[1].trim();
        const pageNum = parseInt(customMatch[3], 10) || 1;
        const displayLabel = `[p${pageNum}]`;
        return (
          <a
            key={pIdx}
            href={`?bookId=${bookId}&page=${pageNum}`}
            onClick={(e) => {
              e.preventDefault();
              const event = new CustomEvent("fahemNavigateBook", {
                detail: { bookId, page: pageNum }
              });
              window.dispatchEvent(event);
            }}
            style={{
              color: "var(--secondary, #d4af37)",
              textDecoration: "underline",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              background: "rgba(212, 175, 55, 0.08)",
              padding: "2px 6px",
              borderRadius: "6px",
              border: "1px solid rgba(212, 175, 55, 0.15)",
              transition: "all 0.2s"
            }}
            title={`Go to Book ${bookId}, Page ${pageNum}`}
          >
            📖 {displayLabel}
          </a>
        );
      }
      if (/^\[[pP]\d+\]$/.test(part)) {
        const pageNum = parseInt(part.slice(2, -1), 10) || 1;
        const bookId = selectedBookIds.length > 0 ? selectedBookIds[0] : "";
        return (
          <a
            key={pIdx}
            href={`?bookId=${bookId}&page=${pageNum}`}
            onClick={(e) => {
              e.preventDefault();
              const event = new CustomEvent("fahemNavigateBook", {
                detail: { bookId, page: pageNum }
              });
              window.dispatchEvent(event);
            }}
            style={{
              color: "var(--secondary, #d4af37)",
              textDecoration: "underline",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              background: "rgba(212, 175, 55, 0.08)",
              padding: "2px 6px",
              borderRadius: "6px",
              border: "1px solid rgba(212, 175, 55, 0.15)",
              transition: "all 0.2s"
            }}
            title={`Go to Page ${pageNum}`}
          >
            📖 {part}
          </a>
        );
      }
      if (part.startsWith("[") && part.includes("](")) {
        const closeBracketIdx = part.indexOf("](");
        const linkText = part.slice(1, closeBracketIdx);
        const linkUrl = part.slice(closeBracketIdx + 2, -1);
        
        if (linkUrl.includes("bookId=") || linkUrl.includes("page=")) {
          let bookId = "";
          let pageNum = 1;
          try {
            const urlObj = new URL(linkUrl.startsWith("?") ? `http://dummy.com${linkUrl}` : linkUrl);
            bookId = urlObj.searchParams.get("bookId") || "";
            const pageParam = urlObj.searchParams.get("page");
            if (pageParam) {
              pageNum = parseInt(pageParam, 10) || 1;
            }
          } catch (e) {
            const bookMatch = linkUrl.match(/bookId=([^&]+)/);
            const pageMatch = linkUrl.match(/page=(\d+)/);
            if (bookMatch) bookId = decodeURIComponent(bookMatch[1]);
            if (pageMatch) pageNum = parseInt(pageMatch[1], 10) || 1;
          }
          
          bookId = bookId.replace(/[^a-zA-Z0-9_\u0600-\u06FF\s-]/g, "").trim();
          
          let cleanLinkText = linkText;
          const textMatch = linkText.match(/(?:^|\[)?([^\]:]+)\s*:\s*[pP](\d+)(?:\])?$/i);
          if (textMatch) {
            const matchedPage = textMatch[2];
            cleanLinkText = `[p${matchedPage}]`;
          } else if (/^[pP](\d+)$/i.test(linkText)) {
            cleanLinkText = `[p${linkText.match(/[pP](\d+)/i)![1]}]`;
          }
          
          return (
            <a
              key={pIdx}
              href={linkUrl}
              onClick={(e) => {
                e.preventDefault();
                const event = new CustomEvent("fahemNavigateBook", {
                  detail: { bookId, page: pageNum }
                });
                window.dispatchEvent(event);
              }}
              style={{
                color: "var(--secondary, #d4af37)",
                textDecoration: "underline",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                background: "rgba(212, 175, 55, 0.08)",
                padding: "2px 6px",
                borderRadius: "6px",
                border: "1px solid rgba(212, 175, 55, 0.15)",
                transition: "all 0.2s"
              }}
              title={`Go to ${bookId} - Page ${pageNum}`}
            >
              📖 {cleanLinkText}
            </a>
          );
        }
        
        return (
          <a
            key={pIdx}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--primary)", textDecoration: "underline" }}
          >
            {linkText}
          </a>
        );
      }
      return part;
    });
  };

  const renderDeepLinkChips = (text: string) => {
    if (!text) return null;
    const lowerText = text.toLowerCase();
    const chips: React.ReactNode[] = [];
    
    // OR-3: Practice Workstation
    const hasPractice = lowerText.includes("/practice") || 
                        lowerText.includes("practice workstation") || 
                        lowerText.includes("practice tab") || 
                        lowerText.includes("منصة التدريب") || 
                        lowerText.includes("جلسة التدريب") ||
                        lowerText.includes("التدريب");
                        
    // OR-29: Study Plans
    const hasPlan = lowerText.includes("/plan") || 
                    lowerText.includes("study plan") || 
                    lowerText.includes("plans & zatona") || 
                    lowerText.includes("خطة الدراسة") || 
                    lowerText.includes("الخطط الدراسية") ||
                    lowerText.includes("الخطة");
                    
    // OR-29: Zatona
    const hasZatona = lowerText.includes("/zatona") || 
                      lowerText.includes("zatona") || 
                      lowerText.includes("الزتونة") || 
                      lowerText.includes("ملخص الزتونة") ||
                      lowerText.includes("زتونة");
                      
    if (hasPractice) {
      chips.push(
        <button
          key="practice-chip"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("fahemNavigateTab", { detail: { tab: "practice" } }));
          }}
          className="deep-link-chip"
          style={{
            background: "linear-gradient(135deg, rgba(46, 204, 113, 0.1) 0%, rgba(39, 174, 96, 0.15) 100%)",
            border: "1px solid rgba(46, 204, 113, 0.3)",
            color: "#27ae60",
            padding: "0.5rem 0.9rem",
            borderRadius: "14px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.8rem",
            fontWeight: 700,
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 2px 6px rgba(46, 204, 113, 0.05)"
          }}
        >
          🎯 {language === "ar" ? "منصة التدريب" : "Practice Workstation"}
        </button>
      );
    }
    
    if (hasPlan) {
      chips.push(
        <button
          key="plan-chip"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("fahemNavigateTab", { detail: { tab: "plan" } }));
          }}
          className="deep-link-chip"
          style={{
            background: "linear-gradient(135deg, rgba(155, 89, 182, 0.1) 0%, rgba(142, 68, 173, 0.15) 100%)",
            border: "1px solid rgba(155, 89, 182, 0.3)",
            color: "#8e44ad",
            padding: "0.5rem 0.9rem",
            borderRadius: "14px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.8rem",
            fontWeight: 700,
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 2px 6px rgba(155, 89, 182, 0.05)"
          }}
        >
          📅 {language === "ar" ? "خطة الدراسة" : "Study Plans"}
        </button>
      );
    }
    
    if (hasZatona) {
      chips.push(
        <button
          key="zatona-chip"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("fahemNavigateTab", { detail: { tab: "zatona" } }));
          }}
          className="deep-link-chip"
          style={{
            background: "linear-gradient(135deg, rgba(241, 196, 15, 0.1) 0%, rgba(243, 156, 18, 0.15) 100%)",
            border: "1px solid rgba(241, 196, 15, 0.3)",
            color: "#d4ac0d",
            padding: "0.5rem 0.9rem",
            borderRadius: "14px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.8rem",
            fontWeight: 700,
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 2px 6px rgba(241, 196, 15, 0.05)"
          }}
        >
          ⚡ {language === "ar" ? "ملخص الزتونة" : "Zatona Summary"}
        </button>
      );
    }
    
    if (chips.length === 0) return null;
    
    return (
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.6rem",
        marginTop: "0.75rem",
        paddingTop: "0.5rem",
        borderTop: "1px dashed rgba(16, 107, 163, 0.1)"
      }}>
        {chips}
      </div>
    );
  };

  const formatMessageText = (txt: string, msgId?: string) => {
    if (!txt) return "";
    
    const lines = txt.split("\n");
    const formattedElements: React.ReactNode[] = [];
    
    let currentLogBlock: string[] = [];
    
    const flushLogBlock = (keyIndex: number) => {
      if (currentLogBlock.length === 0) return;
      
      const logText = currentLogBlock.join("\n");
      
      formattedElements.push(
        <div 
          key={`log-${keyIndex}`} 
          className="terminal-console"
          style={{
            margin: "0.75rem 0",
            padding: "0.85rem 1rem",
            borderRadius: "12px",
            background: "rgba(10, 15, 12, 0.95)",
            backdropFilter: "blur(8px)",
            border: "1px solid var(--accent, #d4af37)",
            fontFamily: "monospace",
            fontSize: "0.8rem",
            color: "#e6e6e6",
            overflowX: "auto",
            textAlign: "start",
            position: "relative",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)",
          }}
        >
          <style>{`
            @keyframes terminal-pulse {
              0% { opacity: 0.4; box-shadow: 0 0 2px #00ff66; }
              100% { opacity: 1; box-shadow: 0 0 10px #00ff66; }
            }
          `}</style>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            paddingBottom: "0.4rem",
            marginBottom: "0.6rem",
            userSelect: "none"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#00ff66",
                display: "inline-block",
                boxShadow: "0 0 8px #00ff66",
                animation: "terminal-pulse 1.5s infinite alternate"
              }} />
              <span style={{ fontWeight: 600, color: "var(--accent, #d4af37)", fontSize: "0.75rem", letterSpacing: "1px" }}>
                SUPERADMIN CONSOLE
              </span>
            </div>
            <button
              onClick={(e) => {
                try {
                  navigator.clipboard.writeText(logText);
                  const btn = e.currentTarget;
                  btn.innerText = "COPIED ✅";
                  btn.style.color = "#5dfd8a";
                  setTimeout(() => { 
                    btn.innerText = "COPY"; 
                    btn.style.color = "#ccc";
                  }, 1500);
                } catch (err) {
                  console.error("Clipboard copy failed:", err);
                }
              }}
              title="Copy logs to clipboard"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "4px",
                color: "#ccc",
                fontSize: "0.7rem",
                padding: "2px 8px",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                if (e.currentTarget.innerText !== "COPIED ✅") {
                  e.currentTarget.style.color = "#ccc";
                }
              }}
            >
              COPY
            </button>
          </div>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.4", maxHeight: "300px", overflowY: "auto" }}>
            {currentLogBlock.map((logLine, lIdx) => {
              let lineStyle = { color: "#e6e6e6" };
              if (logLine.includes("[COMPLETE]") || logLine.includes("✅") || logLine.includes("100%")) {
                lineStyle = { color: "#5dfd8a" };
              } else if (logLine.includes("[WARNING]") || logLine.includes("⚠️")) {
                lineStyle = { color: "#ffb86c" };
              } else if (logLine.includes("[CRITICAL]") || logLine.includes("[SYSTEM_ERROR]") || logLine.includes("❌")) {
                lineStyle = { color: "#ff5555" };
              } else if (logLine.includes("[INIT]") || logLine.includes("[SYSTEM]")) {
                lineStyle = { color: "#8be9fd" };
              } else if (logLine.includes("[PARSER]") || logLine.includes("[VECTOR_INDEX]")) {
                lineStyle = { color: "#bd93f9" };
              }
              return (
                <div key={lIdx} style={{ ...lineStyle, padding: "2px 0" }}>
                  {logLine}
                </div>
              );
            })}
          </div>
        </div>
      );
      currentLogBlock = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed.startsWith("`") && trimmed.endsWith("`") && trimmed.length > 2) {
        currentLogBlock.push(trimmed.slice(1, -1));
      } else {
        if (currentLogBlock.length > 0) {
          flushLogBlock(i);
        }
        
        if (!trimmed) {
          formattedElements.push(<div key={`empty-${i}`} style={{ height: "0.5rem" }} />);
          continue;
        }

        if (trimmed.startsWith("###")) {
          formattedElements.push(<h4 key={`h4-${i}`} style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.5rem", marginBottom: "0.25rem", textAlign: "start" }}>{trimmed.slice(3).trim()}</h4>);
          continue;
        }
        if (trimmed.startsWith("##")) {
          formattedElements.push(<h3 key={`h3-${i}`} style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.75rem", marginBottom: "0.35rem", textAlign: "start" }}>{trimmed.slice(2).trim()}</h3>);
          continue;
        }

        if (trimmed.toLowerCase().startsWith("hint:") || trimmed.startsWith("تلميح:")) {
          const prefixLen = trimmed.toLowerCase().startsWith("hint:") ? 5 : 6;
          const hintText = trimmed.substring(prefixLen).trim();
          formattedElements.push(
            <details 
              key={`hint-${i}`}
              style={{ 
                background: "rgba(212, 175, 55, 0.05)", 
                border: "1px solid rgba(212, 175, 55, 0.2)", 
                borderInlineStart: "4px solid #d4af37", 
                margin: "0.5rem 0", 
                padding: "0.5rem 0.75rem", 
                borderRadius: "10px", 
                textAlign: "start",
                outline: "none"
              }}
            >
              <summary style={{ cursor: "pointer", fontWeight: "700", fontSize: "0.85rem", color: "#b58d1d", outline: "none", userSelect: "none" }}>
                💡 {language === "ar" ? "عرض التلميح" : "Reveal Hint"}
              </summary>
              <div style={{ marginTop: "0.4rem", fontSize: "0.82rem", color: "var(--foreground)" }}>
                {parseInlineMarkdown(hintText, msgId)}
              </div>
            </details>
          );
          continue;
        }

        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          const rest = trimmed.substring(2);
          formattedElements.push(
            <ul key={`ul-${i}`} style={{ margin: "0.25rem 0 0.25rem 1.25rem", padding: 0, listStyleType: "disc", textAlign: "start" }}>
              <li style={{ fontSize: "0.85rem", color: "inherit", lineHeight: "1.5" }}>
                {parseInlineMarkdown(rest, msgId)}
              </li>
            </ul>
          );
          continue;
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          const rest = numMatch[2];
          formattedElements.push(
            <ol key={`ol-${i}`} style={{ margin: "0.25rem 0 0.25rem 1.25rem", padding: 0, listStyleType: "decimal", textAlign: "start" }}>
              <li style={{ fontSize: "0.85rem", color: "inherit", lineHeight: "1.5" }}>
                {parseInlineMarkdown(rest, msgId)}
              </li>
            </ol>
          );
          continue;
        }

        formattedElements.push(
          <p key={`p-${i}`} style={{ margin: "0.25rem 0", fontSize: "0.85rem", lineHeight: "1.5", textAlign: "start" }}>
            {parseInlineMarkdown(trimmed, msgId)}
          </p>
        );
      }
    }
    
    if (currentLogBlock.length > 0) {
      flushLogBlock(lines.length);
    }
    
    return formattedElements;
  };

  useEffect(() => {
    sendMessageRef.current = handleSendMessage;
  });

  // FC6.23: gently rotate the transparent status while a stream is in flight so it never
  // looks frozen; resets when idle. The phrase itself is still anchored to the live agent.
  useEffect(() => {
    if (!isSending) { setStatusTick(0); return; }
    const id = setInterval(() => setStatusTick((t) => t + 1), 2200);
    return () => clearInterval(id);
  }, [isSending]);

  // FC6.23: map the SSE [METADATA] ActiveAgent value to a human-readable, non-log status.
  // When the agent is unknown/persistent, rotate generic phrases keyed off statusTick.
  const friendlyAgentStatus = (agent: string | undefined, tick: number, lang: string): string => {
    const a = (agent || "").toLowerCase();
    const ar = lang === "ar";
    if (a.includes("guardrail")) return ar ? "أتحقق من الأمان والنطاق…" : "Checking safety & scope…";
    if (a.includes("retriev") || a.includes("rag") || a.includes("knowledge")) return ar ? "أقرأ كتابك الدراسي…" : "Reading your textbook…";
    if (a.includes("search") || a.includes("google") || a.includes("ground")) return ar ? "أبحث في الويب…" : "Searching the web…";
    if (a.includes("practice") || a.includes("quiz")) return ar ? "أُجهّز تمرينك…" : "Preparing your practice…";
    if (a.includes("zatona") || a.includes("summar")) return ar ? "ألخّص المحتوى…" : "Distilling the content…";
    if (a.includes("assignment")) return ar ? "أُنشئ المهمة…" : "Building the assignment…";
    if (a.includes("compos") || a.includes("writer") || a.includes("final")) return ar ? "أصوغ الإجابة…" : "Composing your answer…";
    const rotation = ar
      ? ["أقرأ كتابك الدراسي…", "أستحضر الصفحات المناسبة…", "أصوغ الإجابة…"]
      : ["Reading your textbook…", "Citing the right pages…", "Composing your answer…"];
    return rotation[tick % rotation.length];
  };

  // FC6.23: abort the in-flight /api/agent stream when the user taps Stop.
  const handleStopStream = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      setSessionLogs((prev) => [...prev, "[System] Generation stopped by user."]);
    }
  };

  if (!user && !demoMode) return null; // Show after sign-in OR inside the Tier-0/Tier-1 demo sandbox

  async function handleSendMessage(textToSend?: string) {
    const activeUser = user;
    if (!activeUser && !demoMode) return;
    const queryText = (textToSend || inputValue).trim();
    if (!queryText || isSending) return;

    if (!textToSend) {
      setInputValue("");
    }

    const activeLanguage = lockedLanguage === "auto" ? language : lockedLanguage;

    const isSearchCommand = queryText.startsWith("/search ") || queryText.startsWith("/بحث ");
    if (isSearchCommand) {
      const searchSpaceIdx = queryText.indexOf(" ");
      const searchQuery = queryText.substring(searchSpaceIdx + 1).trim();
      
      const userMsgId = `msg-${Date.now()}-user`;
      const assistantMsgId = `msg-${Date.now()}-assistant`;
      
      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", text: queryText, timestamp: new Date() }
      ]);
      
      setIsSending(true);
      setActiveAgent("Retrieval Agent");
      setSessionLogs((prev) => [...prev, `[Search Command] Initiating global library page crawl for query: "${searchQuery}"`]);
      
      setMessages((prev) => [
        ...prev,
        { 
          id: assistantMsgId, 
          role: "assistant", 
          text: activeLanguage === "ar" ? "جاري البحث في مكتبة الكتب والصفحات... 🔍" : "Searching book library pages... 🔍", 
          timestamp: new Date(), 
          activeAgent: "Retrieval Agent" 
        }
      ]);
      
      try {
        const response = await authedFetch(`/api/books/pages?query=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        
        let responseText = "";
        
        if (data.success && data.results && data.results.length > 0) {
          if (activeLanguage === "ar") {
            responseText = `لقد بحثت في مكتبة المناهج الدراسية عن "**${searchQuery}**". إليك الصفحات المطابقة التي عثرت عليها بدقة:\n\n`;
            data.results.forEach((res: any) => {
              const bookTitle = res.bookTitleAr || res.bookTitleEn || res.bookTitle;
              const pageName = res.titleAr || res.titleEn || `صفحة ${res.pageNumber}`;
              const link = `?bookId=${encodeURIComponent(res.bookId)}&page=${res.pageNumber}`;
              responseText += `* 📖 **[${bookTitle} - ${pageName}](${link})**\n`;
              if (res.snippet) {
                responseText += `  > "...${res.snippet.trim()}..."\n\n`;
              }
            });
            responseText += `💡 *انقر فوق أي من الروابط أعلاه لفتح الكتاب والانتقال إلى الصفحة المحددة فوراً وبأمان!*`;
          } else {
            responseText = `I searched our textbooks library for "**${searchQuery}**". Here are the matching pages I found:\n\n`;
            data.results.forEach((res: any) => {
              const bookTitle = res.bookTitleEn || res.bookTitleAr || res.bookTitle;
              const pageName = res.titleEn || res.titleAr || `Page ${res.pageNumber}`;
              const link = `?bookId=${encodeURIComponent(res.bookId)}&page=${res.pageNumber}`;
              responseText += `* 📖 **[${bookTitle} - ${pageName}](${link})**\n`;
              if (res.snippet) {
                responseText += `  > "...${res.snippet.trim()}..."\n\n`;
              }
            });
            responseText += `💡 *Click any of the of the links above to open the book and navigate to that page instantly and securely!*`;
          }
        } else {
          if (activeLanguage === "ar") {
            responseText = `عذراً، لم أعثر على أي صفحات مطابقة تماماً للبحث عن "**${searchQuery}**" في مكتبة الكتب النشطة حالياً.\n\n💡 *نصيحة: جرب استخدام كلمات مفتاحية أكثر عمومية أو تأكد من إملاء الكلمة بشكل صحيح.*`;
          } else {
            responseText = `No exact matching pages were found in the textbooks library for "**${searchQuery}**".\n\n💡 *Tip: Try searching with more general keywords or double-check the spelling.*`;
          }
        }
        
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === assistantMsgId ? { ...msg, text: responseText, activeAgent: undefined } : msg
          )
        );
        setSessionLogs((prev) => [...prev, `[Search Command] Found ${data.results?.length || 0} page matches. Rendered results.`]);
      } catch (err) {
        console.error("Search command failure:", err);
        const errMsg = activeLanguage === "ar" ? "عذراً، حدث خطأ أثناء تنفيذ عملية البحث في المناهج." : "Sorry, an error occurred while searching the textbook archives.";
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === assistantMsgId ? { ...msg, text: errMsg, activeAgent: undefined } : msg
          )
        );
      } finally {
        setIsSending(false);
        setActiveAgent("");
      }
      return;
    }

    const isFeedbackTrigger = /feedback|report\s+a\s+problem|complaint|bug|issue|complaints|شکوى|تقرير\s+مشكلة|ملاحظات/i.test(queryText);
    if (isFeedbackTrigger) {
      const userMsgId = `msg-${Date.now()}-user`;
      const assistantMsgId = `msg-${Date.now()}-assistant`;
      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", text: queryText, timestamp: new Date() }
      ]);
      setIsSending(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: assistantMsgId, role: "assistant", text: "", timestamp: new Date(), showFeedbackCard: true }
        ]);
        setIsSending(false);
      }, 600);
      return;
    }



    const userMsgId = `msg-${Date.now()}-user`;
    const assistantMsgId = `msg-${Date.now()}-assistant`;

    // Add User Message
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text: queryText, timestamp: new Date() }
    ]);

    setIsSending(true);
    setActiveAgent("Guardrail Audit");
    setSessionLogs((prev) => [...prev, `[System] Initiating chat with Fahem Agent (Grounded: ${useGrounded ? "YES" : "NO"})`]);

    // Create a temporary streaming message block
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: "assistant", text: "", timestamp: new Date(), activeAgent: "Guardrail Audit" }
    ]);

    // Construct Context-Enriched Prompt Payload for RAG Grounding
    let promptPayload = queryText;
    if (bookContext) {
      const isArabic = activeLanguage === "ar";
      const title = isArabic ? (bookContext.book?.titleAr || bookContext.book?.title) : (bookContext.book?.titleEn || bookContext.book?.title);
      const chapter = isArabic ? bookContext.chapterTitleAr : bookContext.chapterTitleEn;
      const pageTitle = isArabic ? bookContext.titleAr : bookContext.titleEn;
      const content = isArabic ? (bookContext.contentAr || bookContext.contentEn) : (bookContext.contentEn || bookContext.contentAr);
      
      promptPayload = `[Context Reference: Textbook: "${title}", Chapter: "${chapter}", Section: "${pageTitle}", Page: ${bookContext.currentPage}] 

Page Content:
"""
${content}
"""

User Question: ${queryText}`;
      
      setSessionLogs((prev) => [...prev, `[RAG Grounding] Grounded directly in textbook: "${title}" - Page ${bookContext.currentPage}`]);
    }

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const endpoint = useGrounded ? "/api/agent/grounded" : "/api/agent";
      const response = await authedFetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptPayload,
          language: lockedLanguage !== "auto" ? lockedLanguage : ((bookContext && bookContext.translationLanguage && bookContext.translationLanguage !== "Original") ? bookContext.translationLanguage : language),
          sessionId: currentSessionId || undefined,
          selected_book_ids: selectedBookIds,
          selected_text: bookContext?.selected_text || undefined,
          book_id: bookContext?.book_id || bookContext?.book?._id || bookContext?.book?.id || undefined,
          page: bookContext?.page || bookContext?.currentPage || undefined
        }),
      });

      if (!response.body) {
        throw new Error("No readable stream in response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = "";
      let chunkBuffer = "";
      let inFinalOutput = false;

      while (!done) {
        if (controller.signal.aborted) { try { await reader.cancel(); } catch {} break; } // FC6.23: user Stop
        if (chatPacing === "pedagogical") {
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
        const { value, done: isDone } = await reader.read();
        done = isDone;
        let chunk = "";
        if (value) {
          chunk = decoder.decode(value, { stream: true });
        } else if (done) {
          chunk = decoder.decode();
        }
        chunkBuffer += chunk;

        let processed = true;
        while (processed && chunkBuffer.length > 0) {
          processed = false;

          if (!inFinalOutput) {
            const nlIdx = chunkBuffer.indexOf("\n");
            if (nlIdx !== -1) {
              const line = chunkBuffer.substring(0, nlIdx);
              chunkBuffer = chunkBuffer.substring(nlIdx + 1);
              processed = true;

              const trimmedLine = line.trim();
              if (trimmedLine) {
                if (trimmedLine.includes("=== Agent Final Output ===")) {
                  inFinalOutput = true;
                } else if (trimmedLine.startsWith("[METADATA]")) {
                  const metaContent = trimmedLine.replace("[METADATA] ", "").replace("[METADATA]", "").trim();
                  if (metaContent.startsWith("ActiveAgent:")) {
                    const currentAgent = metaContent.replace("ActiveAgent:", "").trim();
                    setActiveAgent(currentAgent);
                    setMessages((prev) => 
                      prev.map((msg) => 
                        msg.id === assistantMsgId ? { ...msg, activeAgent: currentAgent } : msg
                      )
                    );
                  } else if (metaContent.startsWith("SessionId:")) {
                    const activeSessId = metaContent.replace("SessionId:", "").trim();
                    setCurrentSessionId(activeSessId);
                  } else if (metaContent.startsWith("Duration:")) {
                    setSessionLogs((prev) => [...prev, `[Telemetry] ${metaContent}`]);
                  } else if (metaContent.startsWith("Credits:")) {
                    const val = parseInt(metaContent.replace("Credits:", "").trim(), 10);
                    if (!isNaN(val)) {
                      setCredits(val);
                    }
                  }
                } else if (
                  trimmedLine.startsWith("[Unknown]") ||
                  trimmedLine.startsWith("[Fahem Agent]") ||
                  trimmedLine.startsWith("[Sub-Agent:") ||
                  trimmedLine.includes("[SYSTEM LOG]")
                ) {
                  setSessionLogs((prev) => [...prev, trimmedLine]);
                }
              }
            }
          } else {
            // In final output mode
            const boundaryIdx = chunkBuffer.indexOf("==========================");
            if (boundaryIdx !== -1) {
              const textBefore = chunkBuffer.substring(0, boundaryIdx);
              chunkBuffer = chunkBuffer.substring(boundaryIdx + "==========================".length);
              inFinalOutput = false;
              processed = true;

              if (textBefore) {
                accumulatedText += textBefore;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId ? { ...msg, text: accumulatedText.trim() } : msg
                  )
                );
              }
            } else if (chunkBuffer.length > 30) {
              // Safe to output characters up to length - 30 to prevent leaking prefix of boundary marker
              const safeLen = chunkBuffer.length - 30;
              const safeText = chunkBuffer.substring(0, safeLen);
              chunkBuffer = chunkBuffer.substring(safeLen);
              processed = true;

              accumulatedText += safeText;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId ? { ...msg, text: accumulatedText.trim() } : msg
                )
              );
            }
          }
        }

        if (done && chunkBuffer.length > 0) {
          if (inFinalOutput) {
            let cleanText = chunkBuffer;
            const bIdx = cleanText.indexOf("==========================");
            if (bIdx !== -1) {
              cleanText = cleanText.substring(0, bIdx);
            }
            if (cleanText) {
              accumulatedText += cleanText;
            }
          } else {
            const trimmedLine = chunkBuffer.trim();
            if (trimmedLine && !trimmedLine.includes("==========================") && !trimmedLine.includes("[CLOSE]")) {
              if (!trimmedLine.startsWith("[METADATA]") &&
                  !trimmedLine.startsWith("[Unknown]") &&
                  !trimmedLine.startsWith("[Fahem Agent]") &&
                  !trimmedLine.startsWith("[Sub-Agent:") &&
                  !trimmedLine.startsWith("Prompt:")) {
                accumulatedText += chunkBuffer + "\n";
              }
            }
          }
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, text: accumulatedText.trim() } : msg
            )
          );
          chunkBuffer = "";
        }
      }

      if (controller.signal.aborted) {
        // FC6.23: user pressed Stop between reads — keep partial text, note it softly.
        setSessionLogs((prev) => [...prev, "[System] Generation stopped."]);
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== assistantMsgId) return msg;
            const stoppedNote = language === "ar" ? "⏹ تم الإيقاف." : "⏹ Stopped.";
            return { ...msg, text: (msg.text && msg.text.trim()) ? msg.text : stoppedNote };
          })
        );
      } else {
        setSessionLogs((prev) => [...prev, "[System] Streaming complete successfully."]);
        await fetchSessions(); // Refresh list to catch updated or new chats
        await fetchUserActivities(); // Refresh activities so suggestions reflect latest topics!
      }
    } catch (err: any) {
      // FC6.23: a user-initiated Stop is not an error — keep any partial answer and note it softly.
      if (err?.name === "AbortError" || controller.signal.aborted) {
        setSessionLogs((prev) => [...prev, "[System] Generation stopped."]);
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== assistantMsgId) return msg;
            const stoppedNote = language === "ar" ? "⏹ تم الإيقاف." : "⏹ Stopped.";
            return { ...msg, text: (msg.text && msg.text.trim()) ? msg.text : stoppedNote };
          })
        );
      } else {
        console.error("[sticky-chat] Stream retrieval failed:", err);
        setSessionLogs((prev) => [...prev, `[Error] ${err.message}`]);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, text: `Sorry, an error occurred: ${err.message}` }
              : msg
          )
        );
      }
    } finally {
      abortRef.current = null;
      setIsSending(false);
      setActiveAgent("");
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId ? { ...msg, activeAgent: undefined } : msg
        )
      );
      // Notify the dashboard so the Daily Token Budget widget re-fetches usage after each turn.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("fahem_tokens_updated"));
      }
    }
  };

  return (
    <>
      {/* Floating Sparkle Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: "2rem",
          [dir === "rtl" ? "left" : "right"]: "2rem",
          width: "3.5rem",
          height: "3.5rem",
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--primary), var(--secondary))",
          color: "#ffffff",
          border: "2px solid #ffffff",
          boxShadow: "0 8px 32px rgba(16, 107, 163, 0.3), 0 0 15px rgba(212, 175, 55, 0.2)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
          zIndex: 9999,
          transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          outline: "none"
        }}
        className="floating-chat-trigger"
        title={ct("floating_trigger_title")}
      >
        {isOpen ? (
          <FiX style={{ fontSize: "1.5rem", transition: "transform 0.3s ease" }} />
        ) : (
          <div style={{ position: "relative" }}>
            <FiMessageSquare style={{ fontSize: "1.5rem" }} />
            <span style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "var(--accent-orange)",
              border: "1.5px solid #ffffff",
              boxShadow: "0 0 5px var(--accent-orange)"
            }} className="status-dot"></span>
          </div>
        )}
      </button>

      {/* Slide-out Premium Chat Panel */}
      <div
        className="sticky-chat-panel"
        style={{
          position: "fixed",
          top: layoutMode === "compact" ? "1.5rem" : "0",
          bottom: layoutMode === "compact" ? "1.5rem" : "0",
          [dir === "rtl" ? "left" : "right"]: isOpen 
            ? (layoutMode === "compact" ? "1.5rem" : "0") 
            : (layoutMode === "fullscreen" ? "-100vw" : layoutMode === "side" ? "-540px" : "-460px"),
          width: layoutMode === "fullscreen" ? "100vw" : layoutMode === "side" ? "480px" : "400px",
          maxWidth: layoutMode === "fullscreen" ? "100%" : "calc(100vw - 1rem)",
          height: layoutMode === "compact" ? "calc(100dvh - 3rem)" : "100dvh",
          backgroundColor: "var(--sticky-chat-bg, rgba(253, 251, 247, 0.95))",
          backdropFilter: "blur(24px) saturate(190%)",
          WebkitBackdropFilter: "blur(24px) saturate(190%)",
          borderTop: layoutMode === "compact" ? "1px solid rgba(212, 175, 55, 0.35)" : "0px solid transparent",
          borderBottom: layoutMode === "compact" ? "1px solid rgba(212, 175, 55, 0.35)" : "0px solid transparent",
          borderLeft: layoutMode === "compact" 
            ? "1px solid rgba(212, 175, 55, 0.35)" 
            : ((layoutMode === "side" && dir !== "rtl") ? "1px solid rgba(212, 175, 55, 0.35)" : "0px solid transparent"),
          borderRight: layoutMode === "compact" 
            ? "1px solid rgba(212, 175, 55, 0.35)" 
            : ((layoutMode === "side" && dir === "rtl") ? "1px solid rgba(212, 175, 55, 0.35)" : "0px solid transparent"),
          borderRadius: layoutMode === "compact" ? "var(--border-radius-lg)" : "0",
          boxShadow: layoutMode === "fullscreen" ? "none" : (dir === "rtl" 
            ? "10px 15px 50px rgba(16, 107, 163, 0.15), -2px 0px 10px rgba(255, 255, 255, 0.5)" 
            : "-10px 15px 50px rgba(16, 107, 163, 0.15), 2px 0px 10px rgba(255, 255, 255, 0.5)"),
          zIndex: 9998,
          display: "flex",
          flexDirection: "column",
          transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden"
        }}
        dir={dir}
      >
        <div style={{
          width: "100%",
          maxWidth: layoutMode === "fullscreen" ? "850px" : "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          height: "100%",
          overflow: "hidden",
          position: "relative"
        }}>
          {/* Header Design */}
        <div
          style={{
            padding: "1.25rem",
            borderBottom: "1px dashed var(--card-border)",
            background: "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0.1))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(16, 107, 163, 0.1), rgba(212, 175, 55, 0.15))",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                border: "1px solid var(--card-border)",
                overflow: "hidden"
              }}
            >
              <img
                src="/brand/gemini.png"
                alt="Gemini Brand Asset"
                style={{
                  width: "1.4rem",
                  height: "1.4rem",
                  objectFit: "contain",
                  animation: "pulse-kf 2s infinite ease-in-out"
                }}
              />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", margin: 0, fontFamily: "var(--font-display)", fontWeight: 700 }}>
                {ct("companion_title")}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "var(--accent-green)" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--accent-green)" }}></span>
                <span>{ct("responsible_ai")}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>

            {/* Interactive Layout Mode Selectors */}
            <div className="sticky-chat-layout-controls" style={{ display: "flex", background: "var(--sticky-chat-option-toggle-bg, rgba(0,0,0,0.04))", padding: "2px", borderRadius: "10px", marginRight: "0.25rem" }}>
              <button
                onClick={() => setLayoutMode("compact")}
                style={{
                  background: layoutMode === "compact" ? "var(--sticky-chat-option-active-bg, #ffffff)" : "transparent",
                  border: "none",
                  borderRadius: "8px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  color: layoutMode === "compact" ? "var(--primary)" : "var(--foreground)",
                  display: "flex",
                  alignItems: "center"
                }}
                title={ct("compact_overlay")}
              >
                <FiMinimize2 />
              </button>
              <button
                onClick={() => setLayoutMode("side")}
                style={{
                  background: layoutMode === "side" ? "var(--sticky-chat-option-active-bg, #ffffff)" : "transparent",
                  border: "none",
                  borderRadius: "8px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  color: layoutMode === "side" ? "var(--primary)" : "var(--foreground)",
                  display: "flex",
                  alignItems: "center"
                }}
                title={ct("side_panel")}
              >
                <FiSidebar />
              </button>
              <button
                onClick={() => setLayoutMode("fullscreen")}
                style={{
                  background: layoutMode === "fullscreen" ? "var(--sticky-chat-option-active-bg, #ffffff)" : "transparent",
                  border: "none",
                  borderRadius: "8px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  color: layoutMode === "fullscreen" ? "var(--primary)" : "var(--foreground)",
                  display: "flex",
                  alignItems: "center"
                }}
                title={ct("full_screen")}
              >
                <FiMaximize2 />
              </button>
            </div>

            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                background: "none",
                border: "none",
                color: showHistory ? "var(--primary)" : "var(--foreground)",
                opacity: showHistory ? 1 : 0.6,
                cursor: "pointer",
                padding: "0.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                transition: "all 0.2s"
              }}
              title={ct("chat_history")}
            >
              <FiClock style={{ fontSize: "1.2rem" }} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "var(--foreground)",
                opacity: 0.6,
                cursor: "pointer",
                padding: "0.25rem"
              }}
            >
              <FiX style={{ fontSize: "1.2rem" }} />
            </button>
          </div>
        </div>

        {/* User Context & Guardrail Badge */}
        <div
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "rgba(16, 107, 163, 0.05)",
            borderBottom: "1px solid rgba(16, 107, 163, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.7rem",
            color: "var(--text-muted, #5a6e7c)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <FiShield style={{ color: "var(--primary)" }} />
            <span>ID: <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem" }}>{(user?.uid || demoIdentity?.uid || "sandbox").substring(0, 8)}...</code></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>{ct("email_label")} <strong style={{ color: "var(--foreground)" }}>{user?.email || demoIdentity?.email || (demoMode ? `Sandbox · Tier-${demoIdentity?.tier ?? 0}` : "")}</strong></span>
            {credits !== null && (
              <span style={{
                background: credits > 20 ? "rgba(46, 125, 50, 0.15)" : "rgba(198, 40, 40, 0.15)",
                color: credits > 20 ? "#2e7d32" : "#c62828",
                padding: "1px 6px",
                borderRadius: "4px",
                fontWeight: "bold",
                display: "inline-flex",
                alignItems: "center",
                gap: "2px"
              }}>
                <FiZap style={{ fontSize: "0.6rem" }} />
                {credits} CR
              </span>
            )}
          </div>
        </div>

        {/* Sliding History Panel */}
        <div
          className="sticky-chat-history-panel"
          style={{
            position: "absolute",
            top: "5rem", // Below the header
            bottom: 0,
            left: dir === "rtl" ? (showHistory ? 0 : "-100%") : "auto",
            right: dir === "rtl" ? "auto" : (showHistory ? 0 : "-100%"),
            width: "100%",
            backgroundColor: "var(--sticky-chat-history-bg, rgba(253, 251, 247, 0.96))",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            padding: "1.25rem",
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            opacity: showHistory ? 1 : 0,
            pointerEvents: showHistory ? "all" : "none"
          }}
        >
          {/* Header of History Panel */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem"
          }}>
            <h4 style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 800,
              color: "var(--primary)",
              fontFamily: "var(--font-display)"
            }}>
              {ct("saved_chats")}
            </h4>
            <span style={{
              fontSize: "0.75rem",
              background: "rgba(16, 107, 163, 0.08)",
              color: "var(--primary)",
              padding: "2px 8px",
              borderRadius: "10px",
              fontWeight: 700
            }}>
              {sessions.length}
            </span>
          </div>

          {/* New Chat Button */}
          <button
            onClick={startNewChat}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              width: "100%",
              padding: "0.65rem",
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              color: "#ffffff",
              border: "none",
              borderRadius: "var(--border-radius-md)",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)",
              transition: "all 0.25s",
              marginBottom: "1rem"
            }}
          >
            <FiPlus style={{ fontSize: "1rem" }} />
            <span>{ct("new_chat")}</span>
          </button>

          {/* Scrollable Saved Sessions */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              minHeight: 0
            }}
            className="custom-scrollbar"
          >
            {isSessionsLoading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", color: "var(--text-muted, #8a9ca8)" }}>
                <FiRefreshCw className="spin-icon" style={{ marginRight: "0.5rem", animation: "spin 2s linear infinite" }} />
                <span style={{ fontSize: "0.8rem" }}>{ct("loading_chats")}</span>
              </div>
            ) : sessions.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 1.5rem", color: "var(--text-muted, #8a9ca8)", textAlign: "center" }}>
                <FiFileText style={{ fontSize: "2rem", opacity: 0.3, marginBottom: "0.5rem" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{ct("no_saved_chats")}</span>
              </div>
            ) : (
              sessions.map((sess) => {
                const isActive = currentSessionId === sess.sessionId;
                return (
                  <div
                    key={sess.sessionId}
                    onClick={() => loadSession(sess.sessionId)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "var(--border-radius-md)",
                      background: isActive ? "rgba(16, 107, 163, 0.08)" : "var(--card-bg-glass-card, rgba(255, 255, 255, 0.45))",
                      border: `1px solid ${isActive ? "rgba(16, 107, 163, 0.25)" : "rgba(235, 220, 185, 0.25)"}`,
                      cursor: "pointer",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                      gap: "0.5rem"
                    }}
                    className="history-session-item"
                  >
                    {editingSessionId === sess.sessionId ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: 1, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") {
                              renameSession(sess.sessionId, editingTitle);
                            } else if (e.key === "Escape") {
                              setEditingSessionId("");
                              setEditingTitle("");
                            }
                          }}
                          autoFocus
                          style={{
                            fontSize: "0.85rem",
                            padding: "0.2rem 0.4rem",
                            borderRadius: "var(--border-radius-sm)",
                            border: "1px solid var(--primary)",
                            background: "var(--background)",
                            color: "var(--foreground)",
                            outline: "none",
                            flex: 1,
                            minWidth: 0
                          }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            renameSession(sess.sessionId, editingTitle);
                          }}
                          style={{
                            background: "var(--primary)",
                            border: "none",
                            padding: "4px 6px",
                            cursor: "pointer",
                            color: "#ffffff",
                            borderRadius: "var(--border-radius-sm)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s"
                          }}
                          title={ct("rename_chat")}
                        >
                          <FiCheck style={{ fontSize: "0.85rem" }} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSessionId("");
                            setEditingTitle("");
                          }}
                          style={{
                            background: "rgba(0, 0, 0, 0.05)",
                            border: "none",
                            padding: "4px 6px",
                            cursor: "pointer",
                            color: "var(--foreground)",
                            borderRadius: "var(--border-radius-sm)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s"
                          }}
                        >
                          <FiX style={{ fontSize: "0.85rem" }} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden", flex: 1 }}>
                          <FiFileText style={{ color: isActive ? "var(--primary)" : "#8a9ca8", flexShrink: 0, fontSize: "1rem" }} />
                          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" }}>
                            <span style={{
                              fontSize: "0.85rem",
                              fontWeight: isActive ? 700 : 600,
                              color: isActive ? "var(--primary)" : "var(--foreground)",
                              whiteSpace: "nowrap",
                              textOverflow: "ellipsis",
                              overflow: "hidden"
                            }} title={sess.title || "Untitled Chat"}>
                              {sess.title || ct("untitled_chat")}
                            </span>
                            <span style={{ fontSize: "0.72rem", color: "#8a9ca8" }}>
                              {sess.messageCount} {ct("messages_count")}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSessionId(sess.sessionId);
                              setEditingTitle(sess.title || "");
                            }}
                            style={{
                              background: "transparent",
                              border: "none",
                              padding: "6px",
                              cursor: "pointer",
                              color: "#8a9ca8",
                              borderRadius: "var(--border-radius-sm)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.2s"
                            }}
                            className="rename-session-btn"
                            title={ct("rename_chat")}
                          >
                            <FiEdit2 style={{ fontSize: "0.9rem" }} />
                          </button>

                          <button
                            onClick={(e) => deleteSession(sess.sessionId, e)}
                            style={{
                              background: "transparent",
                              border: "none",
                              padding: "6px",
                              cursor: "pointer",
                              color: "#8a9ca8",
                              borderRadius: "var(--border-radius-sm)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.2s"
                            }}
                            className="delete-session-btn"
                          >
                            <FiTrash2 style={{ fontSize: "0.9rem" }} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active Context Bar */}
        {bookContext && (
          <div style={{
            background: "rgba(16, 107, 163, 0.08)",
            padding: "0.5rem 1rem",
            fontSize: "0.75rem",
            color: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px dashed rgba(16, 107, 163, 0.15)",
            animation: "pulse-kf 2s infinite"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>📖</span>
              <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "220px" }}>
                {language === "ar" 
                  ? (bookContext.book?.titleAr || bookContext.book?.title) 
                  : (bookContext.book?.titleEn || bookContext.book?.title)}
              </strong>
            </div>
            <span>
              {`${ct("page_label")} ${bookContext.currentPage}`}
            </span>
          </div>
        )}

        {/* Messages Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            maxHeight: layoutMode === "fullscreen" 
              ? "calc(100dvh - 12rem)" 
              : layoutMode === "side" 
                ? "calc(100dvh - 10rem)" 
                : "calc(100dvh - 15rem)"
          }}
          className="custom-scrollbar"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                width: "100%"
              }}
            >
              {/* Message Bubble */}
              <div
                className={msg.role === "user" ? "user-bubble" : "message-bubble-wrapper"}
                style={{
                  maxWidth: "85%",
                  padding: "0.85rem 1rem",
                  position: "relative",
                  borderRadius: msg.role === "user" 
                    ? (dir === "rtl" ? "16px 16px 16px 0" : "16px 16px 0 16px") 
                    : (dir === "rtl" ? "16px 16px 0 16px" : "16px 16px 16px 0"),
                  backgroundColor: msg.role === "user" 
                    ? "var(--primary)" 
                    : likedMessages[msg.id] === "like"
                      ? "rgba(46, 204, 113, 0.07)"
                      : likedMessages[msg.id] === "dislike"
                        ? "rgba(231, 76, 60, 0.07)"
                        : "var(--card-bg-glass-dense, rgba(255, 255, 255, 0.85))",
                  color: msg.role === "user" ? "#ffffff" : "var(--foreground)",
                  border: msg.role === "user" 
                    ? "none" 
                    : likedMessages[msg.id] === "like"
                      ? "1px solid rgba(46, 204, 113, 0.35)"
                      : likedMessages[msg.id] === "dislike"
                        ? "1px solid rgba(231, 76, 60, 0.35)"
                        : "1px solid var(--card-border)",
                  boxShadow: msg.role === "user" ? "0 4px 12px rgba(16,107,163,0.15)" : "var(--shadow-sm)",
                  fontSize: "0.9rem",
                  lineHeight: "1.5",
                  wordBreak: "normal",
                  overflowWrap: "break-word",
                  whiteSpace: "pre-wrap"
                }}
              >
                {msg.role === "assistant" && (
                  <button
                    type="button"
                    className="floating-copy-btn"
                    onClick={(e) => {
                      try {
                        const { cleanText: intentCleanText } = parseIntentFromText(msg.text);
                        const mcqData = parseMcqFromText(intentCleanText);
                        navigator.clipboard.writeText(mcqData.cleanText);
                        const btn = e.currentTarget;
                        const origHtml = btn.innerHTML;
                        btn.innerHTML = "✓";
                        btn.style.backgroundColor = "#2ecc71";
                        btn.style.color = "#ffffff";
                        setTimeout(() => {
                          btn.innerHTML = origHtml;
                          btn.style.backgroundColor = "";
                          btn.style.color = "";
                        }, 1500);
                      } catch (err) {
                        console.error("Copy failed:", err);
                      }
                    }}
                    title={language === "ar" ? "نسخ النص" : "Copy to clipboard"}
                  >
                    <FiCopy style={{ fontSize: "0.8rem" }} />
                  </button>
                )}
                {msg.role === "user" ? (
                  <p style={{ margin: 0 }}>{msg.text}</p>
                ) : msg.showFeedbackCard ? (
                  <InlineFeedbackCard 
                    language={language} 
                    dir={dir} 
                    defaultName={user?.displayName || ""} 
                    defaultEmail={user?.email || ""} 
                    userId={user?.uid || ""} 
                  />
                ) : (
                  <>
                    {msg.text ? (
                      (() => {
                        const { cleanText: intentCleanText, intent } = parseIntentFromText(msg.text);
                        const mcqData = parseMcqFromText(intentCleanText);
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <div>{formatMessageText(mcqData.cleanText, msg.id)}</div>
                            {renderDeepLinkChips(intentCleanText)}
                            {intent && renderIntentCard(intent, msg.id)}
                            
                            {mcqData.isMcq && (
                              <div style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.4rem",
                                marginTop: "0.5rem",
                                borderTop: "1px dashed rgba(212, 175, 55, 0.2)",
                                paddingTop: "0.5rem",
                                width: "100%"
                              }}>
                                {mcqData.choices.map((choice) => {
                                  const isSelected = selectedMcqs[msg.id] === choice.key;
                                  const showAnswer = !!selectedMcqs[msg.id];
                                  const isCorrect = choice.key === mcqData.correctKey;
                                  
                                  let btnStyle: React.CSSProperties = {
                                    width: "100%",
                                    padding: "0.6rem 0.8rem",
                                    borderRadius: "10px",
                                    border: "1px solid var(--card-border)",
                                    background: "var(--card-bg-glass-card, rgba(255, 255, 255, 0.45))",
                                    color: "var(--foreground)",
                                    fontSize: "0.8rem",
                                    textAlign: "start",
                                    cursor: showAnswer ? "default" : "pointer",
                                    transition: "all 0.2s ease",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem"
                                  };

                                  if (showAnswer) {
                                    if (isCorrect) {
                                      btnStyle.background = "rgba(46, 204, 113, 0.15)";
                                      btnStyle.borderColor = "rgba(46, 204, 113, 0.5)";
                                      btnStyle.color = "#27ae60";
                                      btnStyle.fontWeight = 700;
                                    } else if (isSelected) {
                                      btnStyle.background = "rgba(231, 76, 60, 0.15)";
                                      btnStyle.borderColor = "rgba(231, 76, 60, 0.5)";
                                      btnStyle.color = "#c0392b";
                                      btnStyle.fontWeight = 700;
                                    } else {
                                      btnStyle.opacity = 0.6;
                                    }
                                  }

                                  return (
                                    <button
                                      key={choice.key}
                                      type="button"
                                      disabled={showAnswer}
                                      onClick={() => {
                                        if (showAnswer) return;
                                        const isChoiceCorrect = choice.key === mcqData.correctKey;
                                        setSelectedMcqs(prev => ({ ...prev, [msg.id]: choice.key }));
                                        
                                        // Telemetry Post to /api/activity
                                        authedFetch("/api/activity", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            action: "practice_attempt",
                                            status: isChoiceCorrect ? "correct" : "incorrect",
                                            details: {
                                              question: mcqData.cleanText.substring(0, 300),
                                              subject: bookContext?.book?.subject?.name || "General Companion",
                                              subtopic: bookContext?.titleEn || bookContext?.titleAr || "Chat Practice",
                                              isCorrect: isChoiceCorrect,
                                              xpGained: isChoiceCorrect ? 10 : 0
                                            }
                                          })
                                        }).catch(err => console.error("Activity telemetry failed:", err));

                                        if (isChoiceCorrect) {
                                          // Dispatch gamification event
                                          const xpEvent = new CustomEvent("fahemXpGained", { detail: { xp: 10 } });
                                          window.dispatchEvent(xpEvent);
                                        }
                                      }}
                                      style={btnStyle}
                                      className="mcq-option-btn"
                                    >
                                      <span style={{
                                        width: "1.5rem",
                                        height: "1.5rem",
                                        borderRadius: "50%",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        fontSize: "0.75rem",
                                        fontWeight: 800,
                                        background: isSelected 
                                          ? (isCorrect ? "#2ecc71" : "#e74c3c") 
                                          : (showAnswer && isCorrect ? "#2ecc71" : "rgba(16, 107, 163, 0.08)"),
                                        color: isSelected || (showAnswer && isCorrect) ? "#ffffff" : "var(--primary)",
                                        border: "1px solid rgba(212, 175, 55, 0.2)"
                                      }}>
                                        {choice.key}
                                      </span>
                                      <span style={{ flex: 1 }}>{choice.text}</span>
                                      {showAnswer && isCorrect && <span style={{ color: "#27ae60", fontWeight: 800 }}>✓</span>}
                                      {showAnswer && isSelected && !isCorrect && <span style={{ color: "#c0392b", fontWeight: 800 }}>✗</span>}
                                    </button>
                                  );
                                })}

                                {selectedMcqs[msg.id] && (
                                  <div style={{
                                    fontSize: "0.8rem",
                                    fontWeight: 700,
                                    color: selectedMcqs[msg.id] === mcqData.correctKey ? "var(--accent-green, #2ecc71)" : "var(--accent-orange, #e74c3c)",
                                    textAlign: "center",
                                    marginTop: "0.25rem",
                                    padding: "0.4rem",
                                    borderRadius: "8px",
                                    background: selectedMcqs[msg.id] === mcqData.correctKey ? "rgba(46, 204, 113, 0.1)" : "rgba(231, 76, 60, 0.1)",
                                    animation: "fadeIn 0.2s"
                                  }}>
                                    {selectedMcqs[msg.id] === mcqData.correctKey 
                                      ? (language === "ar" ? "🎉 إجابة صحيحة! أحسنت صنعاً (+10 نقاط خبرة)" : "🎉 Correct Answer! Excellent job (+10 XP)")
                                      : (language === "ar" ? `❌ إجابة غير صحيحة. الإجابة الصحيحة هي: ${mcqData.correctKey}` : `❌ Incorrect. The correct answer is: ${mcqData.correctKey}`)
                                    }
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span className="dot-typing"></span>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", transition: "opacity 0.3s ease" }}>
                          {friendlyAgentStatus(msg.activeAgent, statusTick, language)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Message Metadata / Active Agent State */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginTop: "0.35rem",
                  fontSize: "0.75rem",
                  color: "#8fa1ad"
                }}
              >
                <span>
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                {msg.role === "assistant" && msg.text && (
                  <>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => speakMessageText(msg.id, msg.text)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: speakingMsgId === msg.id ? "var(--accent-orange)" : "#8fa1ad",
                        cursor: "pointer",
                        padding: "2px 4px",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        transition: "all 0.2s"
                      }}
                      title={ct("read_aloud")}
                    >
                      {speakingMsgId === msg.id ? <FiVolumeX style={{ animation: "pulse-kf 1s infinite" }} /> : <FiVolume2 />}
                      <span style={{ fontSize: "0.7rem", fontWeight: 700 }}>
                        {speakingMsgId === msg.id 
                          ? ct("speech_stop") 
                          : ct("speech_listen")}
                      </span>
                    </button>

                    <span>•</span>
                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const { cleanText: intentCleanText } = parseIntentFromText(msg.text);
                          const mcqData = parseMcqFromText(intentCleanText);
                          navigator.clipboard.writeText(mcqData.cleanText);
                        } catch (err) {
                          console.error("Copy failed:", err);
                        }
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#8fa1ad",
                        cursor: "pointer",
                        padding: "2px 4px",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                        transition: "all 0.2s"
                      }}
                      title={language === "ar" ? "نسخ النص" : "Copy to clipboard"}
                    >
                      <FiCopy />
                    </button>

                    <span>•</span>
                    {/* Like Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setLikedMessages(prev => {
                          const current = prev[msg.id];
                          const next = current === "like" ? undefined : "like";
                          const updated = { ...prev };
                          if (next) updated[msg.id] = next;
                          else delete updated[msg.id];
                          return updated;
                        });
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: likedMessages[msg.id] === "like" ? "var(--accent-green, #2ecc71)" : "#8fa1ad",
                        cursor: "pointer",
                        padding: "2px 4px",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                        transition: "all 0.2s"
                      }}
                      title={language === "ar" ? "أعجبني" : "Like"}
                    >
                      <FiThumbsUp />
                    </button>

                    <span>•</span>
                    {/* Dislike Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setLikedMessages(prev => {
                          const current = prev[msg.id];
                          const next = current === "dislike" ? undefined : "dislike";
                          const updated = { ...prev };
                          if (next) updated[msg.id] = next;
                          else delete updated[msg.id];
                          return updated;
                        });
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: likedMessages[msg.id] === "dislike" ? "var(--accent-orange, #e74c3c)" : "#8fa1ad",
                        cursor: "pointer",
                        padding: "2px 4px",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                        transition: "all 0.2s"
                      }}
                      title={language === "ar" ? "لم يعجبني" : "Dislike"}
                    >
                      <FiThumbsDown />
                    </button>
                  </>
                )}
                {msg.activeAgent && (
                  <>
                    <span>•</span>
                    <span style={{ color: "var(--accent-orange)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.15rem" }}>
                      <FiZap className="spinning-icon" /> {friendlyAgentStatus(msg.activeAgent, statusTick, language)}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips Removed for FC.E2 */}

        {/* Interactive Option Toggles (Google Grounding, Voice Selector, Session Logs) */}
        <div
          className="sticky-chat-options"
          style={{
            padding: "0.5rem 1.25rem",
            borderTop: "1px solid rgba(235, 220, 185, 0.25)",
            backgroundColor: "var(--sticky-chat-form-bg, rgba(255,255,255,0.2))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.75rem"
          }}
        >
          {/* Grounding Switch */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={useGrounded}
              onChange={(e) => setUseGrounded(e.target.checked)}
              disabled={isSending}
              style={{
                accentColor: "var(--primary)",
                width: "14px",
                height: "14px",
                cursor: "pointer"
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: useGrounded ? "var(--primary)" : "var(--text-muted, #5a6e7c)", fontWeight: useGrounded ? 600 : 400 }}>
              <FiGlobe />
              <span>{ct("ground_with_google")}</span>
            </div>
          </label>

          {/* Premium TTS Voice Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.8rem" }}>🗣️</span>
            <select
              value={selectedVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              style={{
                padding: "2px 6px",
                borderRadius: "6px",
                border: "1px solid var(--card-border)",
                background: "var(--sticky-chat-input-bg, rgba(255, 255, 255, 0.8))",
                fontSize: "0.7rem",
                color: "var(--foreground)",
                cursor: "pointer",
                outline: "none",
                fontWeight: 600,
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
              title={ct("select_voice") || "Select Premium Voice"}
            >
              <option value="Aoede">Aoede</option>
              <option value="Kore">Kore</option>
              <option value="Leda">Leda</option>
              <option value="Zephyr">Zephyr</option>
              <option value="Puck">Puck</option>
              <option value="Charon">Charon</option>
              <option value="Fenrir">Fenrir</option>
            </select>
          </div>

        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="sticky-chat-form"
          style={{
            padding: "1rem",
            paddingInlineEnd: layoutMode === "fullscreen" ? "6.5rem" : "5.5rem",
            borderTop: "1px dashed var(--card-border)",
            backgroundColor: "var(--sticky-chat-form-bg, rgba(255,255,255,0.45))",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            position: "relative"
          }}
        >


          {/* Mentions Dropdown Popover */}
          {showMentionsDropdown && getMentionOptions().length > 0 && (
            <div style={{
              position: "absolute",
              bottom: "100%",
              left: "1rem",
              right: "1rem",
              zIndex: 10000,
              background: "var(--card-bg-glass-dense, rgba(255, 255, 255, 0.85))",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(16, 107, 163, 0.15)",
              borderRadius: "16px",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
              marginBottom: "0.5rem",
              padding: "0.5rem",
              maxHeight: "180px",
              overflowY: "auto"
            }} className="custom-scrollbar">
              {getMentionOptions().map((opt, idx) => {
                const isActive = idx === activeMentionIndex;
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectMention(opt.id)}
                    style={{
                      padding: "0.6rem 1rem",
                      borderRadius: "10px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "background 0.2s",
                      textAlign: "start",
                      background: isActive ? "rgba(16, 107, 163, 0.12)" : "none",
                      border: isActive ? "1px solid rgba(16, 107, 163, 0.25)" : "1px solid transparent"
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = "rgba(16, 107, 163, 0.08)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = isActive ? "rgba(16, 107, 163, 0.12)" : "none"; }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--primary)" }}>{opt.id}</span>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--foreground)" }}>{opt.label}</span>
                      <span style={{ fontSize: "0.7rem", color: "#6a7c88" }}>{opt.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Premium Active Scoping Badge */}
          {selectedBookIds.length > 0 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "rgba(16, 107, 163, 0.05)",
              border: "1px dashed rgba(16, 107, 163, 0.3)",
              borderRadius: "14px",
              padding: "0.5rem 0.8rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--primary)",
              direction: dir,
              animation: "fadeIn 0.25s ease-out",
              width: "100%",
              boxSizing: "border-box"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#106ba3",
                  boxShadow: "0 0 8px #106ba3",
                }}></span>
                <span>
                  {language === "ar" 
                    ? `تحديد نطاق البحث نشط: ${selectedBookIds.length} من الكتب المحددة` 
                    : `Active RAG Scoping: ${selectedBookIds.length} selected books`
                  }
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedBookIds([]);
                  sessionStorage.removeItem("fahem_selected_book_ids");
                  window.dispatchEvent(new CustomEvent("fahemRAGScopeChanged"));
                }}
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.3rem",
                  borderRadius: "50%",
                  width: "1.6rem",
                  height: "1.6rem",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
                  e.currentTarget.style.transform = "scale(1.1)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.08)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
                title={language === "ar" ? "مسح التحديد" : "Clear scope"}
              >
                <FiX style={{ fontSize: "0.95rem" }} />
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem", width: "100%", alignItems: "center" }}>
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "50%",
                backgroundColor: isListeningChat ? "#ef4444" : "rgba(16, 107, 163, 0.08)",
                color: isListeningChat ? "#ffffff" : "var(--primary)",
                border: "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: isListeningChat ? "0 0 12px rgba(239, 68, 68, 0.4)" : "none",
              }}
              title={ct("voice_dictation")}
              className={isListeningChat ? "pulse-icon" : ""}
            >
              {isListeningChat ? <FiMicOff style={{ fontSize: "1.1rem" }} /> : <FiMic style={{ fontSize: "1.1rem" }} />}
            </button>

            <input
              id="sticky-chat-input"
              type="text"
              value={inputValue}
              onChange={(e) => {
                const val = e.target.value;
                setInputValue(val);
                const words = val.split(/\s+/);
                const lastWord = words[words.length - 1];
                if (lastWord && lastWord.startsWith("@")) {
                  setMentionType("subject");
                  setMentionQuery(lastWord.slice(1));
                  setShowMentionsDropdown(true);
                } else if (lastWord && lastWord.startsWith("#")) {
                  setMentionType("book");
                  setMentionQuery(lastWord.slice(1));
                  setShowMentionsDropdown(true);
                } else if (lastWord && lastWord.startsWith("/")) {
                  setMentionType("command");
                  setMentionQuery(lastWord.slice(1));
                  setShowMentionsDropdown(true);
                } else {
                  setShowMentionsDropdown(false);
                  setMentionType(null);
                  setMentionQuery("");
                }
              }}
              onKeyDown={(e) => {
                if (showMentionsDropdown) {
                  const options = getMentionOptions();
                  if (options.length > 0) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActiveMentionIndex((prev) => (prev + 1) % options.length);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActiveMentionIndex((prev) => (prev - 1 + options.length) % options.length);
                    } else if (e.key === "Tab" || e.key === "Enter") {
                      e.preventDefault();
                      handleSelectMention(options[activeMentionIndex].id);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setShowMentionsDropdown(false);
                      setMentionType(null);
                      setMentionQuery("");
                    }
                  }
                }
              }}
              disabled={isSending}
              placeholder={ct("input_placeholder")}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                border: "1px solid var(--card-border)",
                borderRadius: "20px",
                fontSize: "0.85rem",
                fontFamily: "var(--font-sans)",
                backgroundColor: "var(--sticky-chat-input-bg, rgba(255, 255, 255, 0.9))",
                color: "var(--foreground)",
                outline: "none"
              }}
            />
            <button
              type={isSending ? "button" : "submit"}
              onClick={isSending ? handleStopStream : undefined}
              disabled={!isSending && !inputValue.trim()}
              aria-label={isSending ? (language === "ar" ? "إيقاف التوليد" : "Stop generating") : (language === "ar" ? "إرسال" : "Send")}
              title={isSending ? (language === "ar" ? "إيقاف" : "Stop") : undefined}
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "50%",
                backgroundColor: isSending ? "var(--secondary, #e74c3c)" : (!inputValue.trim() ? "var(--card-border)" : "var(--primary)"),
                color: isSending ? "#ffffff" : (!inputValue.trim() ? "var(--text-muted)" : "#ffffff"),
                border: "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: isSending ? "pointer" : (!inputValue.trim() ? "not-allowed" : "pointer"),
                boxShadow: isSending ? "0 4px 10px rgba(231, 76, 60, 0.25)" : (!inputValue.trim() ? "none" : "0 4px 10px rgba(16, 107, 163, 0.15)"),
                transition: "all 0.2s"
              }}
            >
              {isSending
                ? <FiSquare style={{ fontSize: "0.9rem", fill: "currentColor" }} />
                : <FiSend style={{ fontSize: "1rem", transform: dir === "rtl" ? "scaleX(-1)" : "none" }} />}
            </button>
          </div>
        </form>
        </div>
      </div>

      <style jsx global>{`
        .spinning-icon {
          animation: spin-kf 3s linear infinite;
        }
        @keyframes spin-kf {
          100% { transform: rotate(360deg); }
        }
        .pulse-icon {
          animation: pulse-kf 2s infinite;
        }
        @keyframes pulse-kf {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        .dot-typing {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: var(--primary);
          animation: dot-typing-kf 1s infinite alternate;
        }
        @keyframes dot-typing-kf {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.2); opacity: 1; }
        }
        .chip-btn:hover {
          background-color: var(--primary) !important;
          color: #ffffff !important;
          border-color: var(--primary) !important;
          transform: translateY(-1px);
        }
        .floating-chat-trigger:hover {
          transform: scale(1.1) translateY(-2px);
          box-shadow: 0 12px 40px rgba(16, 107, 163, 0.4), 0 0 20px rgba(212, 175, 55, 0.3) !important;
        }
        .delete-session-btn:hover {
          color: var(--accent-red) !important;
          background-color: rgba(235, 87, 87, 0.1) !important;
        }
        .history-session-item:hover {
          background-color: rgba(16, 107, 163, 0.04) !important;
          border-color: rgba(16, 107, 163, 0.12) !important;
        }
        .message-bubble-wrapper {
          position: relative;
        }
        .floating-copy-btn {
          position: absolute;
          top: 0.5rem;
          inset-inline-end: 0.5rem;
          opacity: 0;
          pointer-events: none;
          background: var(--card-bg-glass-dense, rgba(255, 255, 255, 0.85)) !important;
          backdrop-filter: blur(12px);
          border: 1px solid rgba(16, 107, 163, 0.15) !important;
          border-radius: 8px !important;
          width: 1.8rem;
          height: 1.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--primary) !important;
          transition: all 0.2s ease-out !important;
          z-index: 10;
          box-shadow: var(--shadow-sm);
          padding: 0 !important;
        }
        .message-bubble-wrapper:hover .floating-copy-btn {
          opacity: 1;
          pointer-events: auto;
          transform: scale(1.05);
        }
        .floating-copy-btn:hover {
          background: var(--primary) !important;
          color: #ffffff !important;
          box-shadow: 0 4px 10px rgba(16, 107, 163, 0.2);
          transform: scale(1.1) translateY(-1px);
        }
        .deep-link-chip:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(16, 107, 163, 0.2) !important;
          filter: brightness(1.05);
        }
      `}</style>
    </>
  );
}
