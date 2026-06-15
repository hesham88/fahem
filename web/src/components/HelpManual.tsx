"use client";

import React, { useState } from "react";
import { FiX, FiBookOpen, FiSearch } from "react-icons/fi";

/**
 * HelpManual — a layered, Google-Cloud-docs-style in-app user manual & FAQ.
 * Opened from the "?" button in the sidebar footer. Content mirrors
 * temp/user_manual.md (Fahem V0.1 User Manual & Step-by-Step Playbook).
 */

type Lang = "en" | "ar";

interface Section {
  id: string;
  title: { en: string; ar: string };
  // FC7.31: bodies are bilingual so an Arabic (RTL) UI renders the Arabic manual,
  // not the English content. Render isAr ? body.ar : body.en.
  body: { en: React.ReactNode; ar: React.ReactNode };
}

const C = {
  primary: "var(--primary)",
  border: "var(--card-border)",
  bg: "var(--card-bg)",
  fg: "var(--foreground)",
  muted: "#6a7c88",
};

function Cmd({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      background: "rgba(16,107,163,0.10)", color: "var(--primary)", padding: "1px 7px",
      borderRadius: "6px", fontFamily: "monospace", fontWeight: 700, fontSize: "0.85em",
    }}>{children}</code>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre style={{
      background: "rgba(2,6,23,0.04)", border: `1px solid ${C.border}`, borderRadius: "10px",
      padding: "12px 14px", overflowX: "auto", fontSize: "0.82rem", lineHeight: 1.6,
      fontFamily: "monospace", whiteSpace: "pre-wrap", margin: "0.5rem 0",
    }}>{children}</pre>
  );
}

function Callout({ kind, children }: { kind: "important" | "warning" | "tip"; children: React.ReactNode }) {
  const map = {
    important: { c: "#106ba3", bg: "rgba(16,107,163,0.08)", icon: "ℹ️", label: "IMPORTANT" },
    warning: { c: "#b45309", bg: "rgba(245,158,11,0.10)", icon: "⚠️", label: "WARNING" },
    tip: { c: "#0d9488", bg: "rgba(13,148,136,0.10)", icon: "💡", label: "TIP" },
  }[kind];
  return (
    <div style={{
      borderLeft: `4px solid ${map.c}`, background: map.bg, borderRadius: "8px",
      padding: "10px 14px", margin: "0.75rem 0", fontSize: "0.88rem", color: C.fg,
    }}>
      <div style={{ fontWeight: 800, color: map.c, fontSize: "0.72rem", letterSpacing: "0.05em", marginBottom: 4 }}>
        {map.icon} {map.label}
      </div>
      {children}
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h4 style={{ margin: "1.1rem 0 0.4rem", fontSize: "1rem", fontWeight: 800, color: C.fg }}>{children}</h4>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0.4rem 0", fontSize: "0.9rem", lineHeight: 1.7, color: C.fg }}>{children}</p>;
}
function UL({ children }: { children: React.ReactNode }) {
  return <ul style={{ margin: "0.4rem 0", paddingInlineStart: "1.2rem", fontSize: "0.9rem", lineHeight: 1.7, color: C.fg }}>{children}</ul>;
}

const SECTIONS: Section[] = [
  {
    id: "what",
    title: { en: "1 · What is Fahem?", ar: "١ · ما هو فهم؟" },
    body: {
      en: (
      <>
        <P><b>Fahem</b> (Arabic for &quot;Comprehending&quot;) is a secure, localized curriculum AI study assistant tailored strictly to official school textbooks — an interactive study partner for students, a diagnostic helper for parents, and an ingestion &amp; management studio for administrators.</P>
        <H>Core features</H>
        <UL>
          <li><b>Interactive Reading Room</b> — read your textbook on the left, chat with your AI Companion on the right.</li>
          <li><b>Deep-link citations</b> — the AI cites the exact page, e.g. <Cmd>[math_grade10:p42]</Cmd>; click it to jump the viewer to that page.</li>
          <li><b>A swarm of specialist agents</b> — tutors, quiz masters, planners and summarizers working together.</li>
          <li><b>Dual-language</b> — English &amp; Arabic layouts mirror automatically (LTR / RTL).</li>
        </UL>
      </>
      ),
      ar: (
      <>
        <P><b>فهم</b> مساعد دراسي ذكي آمن ومُوطّن، مُصمّم حصريًا حول الكتب المدرسية الرسمية — رفيق دراسة تفاعلي للطلاب، وأداة تشخيص لأولياء الأمور، واستوديو لاستيعاب المناهج وإدارتها للمشرفين.</P>
        <H>الميزات الأساسية</H>
        <UL>
          <li><b>غرفة القراءة التفاعلية</b> — اقرأ كتابك المدرسي على جهة، وتحدّث مع رفيقك الذكي على الجهة الأخرى.</li>
          <li><b>استشهادات بروابط مباشرة</b> — يستشهد الذكاء الاصطناعي بالصفحة بدقّة، مثل <Cmd>[math_grade10:p42]</Cmd>؛ انقر عليها لينتقل العارض إلى تلك الصفحة.</li>
          <li><b>سرب من الوكلاء المتخصّصين</b> — معلّمون ومُعدّو اختبارات ومُخطّطون ومُلخّصون يعملون معًا.</li>
          <li><b>لغتان</b> — تنعكس تخطيطات الإنجليزية والعربية تلقائيًا (يسار-يمين / يمين-يسار).</li>
        </UL>
      </>
      ),
    },
  },
  {
    id: "sandbox",
    title: { en: "2 · Quick-Look Sandbox", ar: "٢ · الوضع التجريبي" },
    body: {
      en: (
      <>
        <P>Before signing in, anyone can use <b>Sandbox Mode</b> for a safe &quot;quick look&quot;. It runs on an isolated side-by-side database and never touches production.</P>
        <UL>
          <li><b>Zero cost &amp; risk</b> — try searches, quizzes and summaries without spending real credits or altering student records.</li>
          <li><b>Automatic clean-up (TTL)</b> — sandbox sessions and test history are swept away automatically after your visit.</li>
        </UL>
      </>
      ),
      ar: (
      <>
        <P>قبل تسجيل الدخول، يمكن لأي شخص استخدام <b>الوضع التجريبي</b> لإلقاء «نظرة سريعة» آمنة. يعمل على قاعدة بيانات معزولة جنبًا إلى جنب ولا يمسّ بيئة الإنتاج أبدًا.</P>
        <UL>
          <li><b>بلا تكلفة أو مخاطرة</b> — جرّب عمليات البحث والاختبارات والملخّصات دون إنفاق رصيد حقيقي أو تغيير سجلات الطلاب.</li>
          <li><b>تنظيف تلقائي (TTL)</b> — تُحذف جلسات الوضع التجريبي وسجل الاختبارات تلقائيًا بعد انتهاء زيارتك.</li>
        </UL>
      </>
      ),
    },
  },
  {
    id: "student",
    title: { en: "3 · Student workflows", ar: "٣ · رحلة الطالب" },
    body: {
      en: (
      <>
        <H>Onboarding</H>
        <P>A friendly conversational sign-up collects your name, age, country, grade and school, then a unique username &amp; avatar (checked live).</P>
        <Callout kind="important">If your phone number is already verified, the SMS step is skipped automatically and you go straight to your dashboard.</Callout>
        <H>Reading &amp; side-by-side chat</H>
        <UL>
          <li>Open a textbook → the split-screen Reading Room opens.</li>
          <li>Highlight a difficult sentence, then click <b>Explain</b> or <b>Summary</b> — the selection is sent to the chat with its page context.</li>
          <li>Click any citation like <Cmd>[book_intro_python:p14]</Cmd> to jump the viewer to that page.</li>
          <li>Press <b>Read Page</b> to have the page read aloud with premium voices.</li>
        </UL>
        <H>Practice &amp; recall</H>
        <P>Type <Cmd>/practice</Cmd> or open <b>Practice Workstation</b>. Choose scope (subject or book), mode (MCQ / Written / Oral) and format (Infinite or Quiz Arena, timed). Grading updates your difficulty live.</P>
        <Callout kind="warning">Written recall blocks copy-paste to keep practice honest — pasting is disabled in the answer box.</Callout>
        <H>Zatona summary cards</H>
        <P>Ask &quot;Give me the Zatona of Chapter 4&quot; for ultra-dense study cards, bullet takeaways and concept maps.</P>
        <H>Private Study Vault</H>
        <P>Upload your own PDFs/notes in <b>Private Study Vault</b>, click <b>Ingest</b>, then chat privately about them — no one else can see your uploads.</P>
      </>
      ),
      ar: (
      <>
        <H>الانضمام والإعداد</H>
        <P>تسجيل حواري ودود يجمع اسمك وعمرك وبلدك وصفّك ومدرستك، ثم اسم مستخدم وصورة رمزية فريدين (يُتحقَّق منهما مباشرةً).</P>
        <Callout kind="important">إذا كان رقم هاتفك مُوثَّقًا بالفعل، تُتخطّى خطوة الرسائل القصيرة تلقائيًا وتنتقل مباشرةً إلى لوحة التحكم.</Callout>
        <H>القراءة والمحادثة جنبًا إلى جنب</H>
        <UL>
          <li>افتح كتابًا مدرسيًا ← تُفتح غرفة القراءة بشاشة مقسومة.</li>
          <li>ظلِّل جملة صعبة، ثم انقر <b>اشرح</b> أو <b>لخّص</b> — يُرسَل التحديد إلى المحادثة مع سياق صفحته.</li>
          <li>انقر أي استشهاد مثل <Cmd>[book_intro_python:p14]</Cmd> لينتقل العارض إلى تلك الصفحة.</li>
          <li>اضغط <b>اقرأ الصفحة</b> لسماع الصفحة بصوتٍ عالٍ بأصوات فاخرة.</li>
        </UL>
        <H>التدريب والاستذكار</H>
        <P>اكتب <Cmd>/practice</Cmd> أو افتح <b>منصة التدريب</b>. اختر النطاق (مادة أو كتاب)، والنمط (اختيار من متعدد / كتابي / شفهي)، والصيغة (لا نهائي أو حلبة الاختبار، مؤقّتة). يُحدِّث التقييم مستوى صعوبتك مباشرةً.</P>
        <Callout kind="warning">يمنع الاستذكار الكتابي النسخ واللصق للحفاظ على نزاهة التدريب — اللصق مُعطَّل في صندوق الإجابة.</Callout>
        <H>بطاقات زتونة الملخِّصة</H>
        <P>اطلب «أعطني زتونة الفصل الرابع» للحصول على بطاقات دراسية فائقة التكثيف، ونقاط مختصرة، وخرائط مفاهيم.</P>
        <H>خزنة الدراسة الخاصة</H>
        <P>ارفع ملفات PDF أو ملاحظاتك الخاصة في <b>خزنة الدراسة الخاصة</b>، وانقر <b>استوعب</b>، ثم تحدّث عنها بخصوصية — لا يستطيع أحد غيرك رؤية ما رفعته.</P>
      </>
      ),
    },
  },
  {
    id: "shortcuts",
    title: { en: "4 · Commands & shortcuts", ar: "٤ · الأوامر والاختصارات" },
    body: {
      en: (
      <>
        <UL>
          <li><Cmd>@subject</Cmd> — route a question to a subject, e.g. <Cmd>@math</Cmd>.</li>
          <li><Cmd>#book</Cmd> / <Cmd>#chapter</Cmd> — scope the search to a specific book or chapter.</li>
          <li><Cmd>/practice</Cmd> — start a quiz on the current topic.</li>
          <li><Cmd>/summarize</Cmd> — synthesize the current page.</li>
          <li><Cmd>/plan</Cmd> — request a study schedule.</li>
          <li><Cmd>/explain</Cmd> — quick interactive explanation of a term.</li>
          <li><Cmd>/guide</Cmd> — step-by-step tutoring tutorial.</li>
        </UL>
        <H>Example prompts</H>
        <Code>@math explain how we solve quadratic equations using the quadratic formula</Code>
        <Code>#book_intro_python #chapter-3 what is a list comprehension vs a for-loop?</Code>
        <Code>/practice generate a 5-question MCQ quiz on #chapter-2</Code>
        <Code>عايز الزتونة لدرس التمثيل الضوئي في جدول مقارنة مبسط مع أهم المصطلحات.</Code>
      </>
      ),
      ar: (
      <>
        <UL>
          <li><Cmd>@subject</Cmd> — وجِّه سؤالًا إلى مادة، مثل <Cmd>@math</Cmd>.</li>
          <li><Cmd>#book</Cmd> / <Cmd>#chapter</Cmd> — حدِّد نطاق البحث في كتاب أو فصل بعينه.</li>
          <li><Cmd>/practice</Cmd> — ابدأ اختبارًا في الموضوع الحالي.</li>
          <li><Cmd>/summarize</Cmd> — لخِّص الصفحة الحالية.</li>
          <li><Cmd>/plan</Cmd> — اطلب جدول مذاكرة.</li>
          <li><Cmd>/explain</Cmd> — شرح تفاعلي سريع لمصطلح.</li>
          <li><Cmd>/guide</Cmd> — درس إرشادي خطوة بخطوة.</li>
        </UL>
        <H>أمثلة على الطلبات</H>
        <Code>@math اشرح كيف نحل المعادلات التربيعية باستخدام القانون العام</Code>
        <Code>#book_intro_python #chapter-3 ما الفرق بين list comprehension وحلقة for؟</Code>
        <Code>/practice أنشئ اختبار اختيار من متعدد من ٥ أسئلة على #chapter-2</Code>
        <Code>عايز الزتونة لدرس التمثيل الضوئي في جدول مقارنة مبسط مع أهم المصطلحات.</Code>
      </>
      ),
    },
  },
  {
    id: "parent",
    title: { en: "5 · Parent workflows", ar: "٥ · رحلة ولي الأمر" },
    body: {
      en: (
      <>
        <UL>
          <li><b>Link your child</b> — enter their username/email; once they approve, accounts link.</li>
          <li><b>Set quotas</b> — weekly or monthly credit limits to control usage.</li>
          <li><b>Insights dashboard</b> — subject averages, weekly active hours, repeated misconceptions and response telemetry, with supportive AI advice.</li>
          <li><b>Community forums</b> — collaborate with other parents and teachers.</li>
        </UL>
        <Code>How is my child doing in @math? Which topics did they make the most errors on this week?</Code>
      </>
      ),
      ar: (
      <>
        <UL>
          <li><b>اربط حساب طفلك</b> — أدخل اسم المستخدم أو البريد الإلكتروني؛ بمجرد موافقته يُربَط الحسابان.</li>
          <li><b>حدِّد الحصص</b> — حدود رصيد أسبوعية أو شهرية للتحكم في الاستخدام.</li>
          <li><b>لوحة الرؤى</b> — متوسطات المواد، وساعات النشاط الأسبوعية، والمفاهيم الخاطئة المتكررة وبيانات الاستجابة، مع نصائح داعمة من الذكاء الاصطناعي.</li>
          <li><b>منتديات المجتمع</b> — تعاوَن مع أولياء أمور ومعلّمين آخرين.</li>
        </UL>
        <Code>كيف مستوى ابني في @math؟ وفي أي موضوعات ارتكب أكثر الأخطاء هذا الأسبوع؟</Code>
      </>
      ),
    },
  },
  {
    id: "admin",
    title: { en: "6 · Admin workflows", ar: "٦ · رحلة المشرف" },
    body: {
      en: (
      <>
        <H>Web-crawling the catalog</H>
        <P>In <b>Curriculum Ingestion Studio</b>, enter a curriculum domain and <b>Start Crawl</b>. The crawler adapts (OpenStax API or generic BFS), auto-classifies titles into curriculum slots.</P>
        <H>The 5-stage ingestion pipeline</H>
        <UL>
          <li><b>Fetcher</b> — download PDF, verify integrity, extract the table of contents.</li>
          <li><b>Layout OCR</b> — pages → images → Gemini Vision structure (grids, formulas, tables).</li>
          <li><b>Translation</b> — concurrent EN/AR block translation, layout preserved.</li>
          <li><b>Assembly &amp; Cover</b> — cluster pages into chapters, render covers, build mind maps.</li>
          <li><b>Embed</b> — 3072-dim vectors saved to MongoDB Atlas.</li>
        </UL>
        <Callout kind="tip">Embedding calls are wrapped in fallbacks so the pipeline keeps running even if an API call times out.</Callout>
        <H>Cost control</H>
        <P>Toggle credit limits, set weekly/monthly token caps per student or group, and run the sandbox-only Emergency Purge to clean test data (production is never touched).</P>
      </>
      ),
      ar: (
      <>
        <H>زحف الويب لبناء الفهرس</H>
        <P>في <b>استوديو استيعاب المناهج</b>، أدخِل نطاق منهج ثم اضغط <b>ابدأ الزحف</b>. يتكيّف الزاحف (واجهة OpenStax أو زحف عام بطريقة BFS)، ويصنّف العناوين تلقائيًا في خانات المنهج.</P>
        <H>خط الاستيعاب ذو المراحل الخمس</H>
        <UL>
          <li><b>الجالب</b> — تنزيل ملف PDF، والتحقق من سلامته، واستخراج جدول المحتويات.</li>
          <li><b>التعرّف على التخطيط (OCR)</b> — الصفحات ← صور ← هيكلة عبر Gemini Vision (شبكات، معادلات، جداول).</li>
          <li><b>الترجمة</b> — ترجمة متزامنة للكتل بالإنجليزية والعربية مع الحفاظ على التخطيط.</li>
          <li><b>التجميع والغلاف</b> — تجميع الصفحات في فصول، وتوليد الأغلفة، وبناء الخرائط الذهنية.</li>
          <li><b>التضمين</b> — متجهات بأبعاد ٣٠٧٢ تُحفظ في MongoDB Atlas.</li>
        </UL>
        <Callout kind="tip">استدعاءات التضمين محاطة ببدائل احتياطية كي يستمر الخط في العمل حتى لو انتهت مهلة أحد الاستدعاءات.</Callout>
        <H>التحكم في التكلفة</H>
        <P>فعِّل حدود الرصيد، واضبط أسقف رموز أسبوعية/شهرية لكل طالب أو مجموعة، وشغِّل التطهير الطارئ (في الوضع التجريبي فقط) لتنظيف بيانات الاختبار (بيئة الإنتاج لا تُمسّ أبدًا).</P>
      </>
      ),
    },
  },
  {
    id: "swarm",
    title: { en: "7 · The AI specialist swarm", ar: "٧ · فريق الوكلاء الذكي" },
    body: {
      en: (
      <>
        <P>Fahem runs a Swarm Architecture on Google ADK — micro-scoped agents collaborate:</P>
        <UL>
          <li><b>Companion Orchestrator</b> — memory, quota checks, intent routing, symbol parsing.</li>
          <li><b>Onboarding Agent</b> — guides profile setup.</li>
          <li><b>Academic Tutor</b> — grounded textbook explanations + citations (Grounded / Stylizer / Guardrail subagents).</li>
          <li><b>Quiz Agent</b> — parallel multi-chapter question generation &amp; grading.</li>
          <li><b>Planner Agent</b> — day-by-day study roadmaps.</li>
          <li><b>Insights Agent</b> — statistical aggregation of progress.</li>
          <li><b>Zatona Agent</b> — ultra-dense summary cards.</li>
          <li><b>Guardrails</b> — privacy &amp; safety firewall, sandbox isolation, fail-closed quotas.</li>
        </UL>
      </>
      ),
      ar: (
      <>
        <P>يعمل فهم بمعمارية «السرب» على Google ADK — حيث تتعاون وكلاء دقيقة التخصص:</P>
        <UL>
          <li><b>منسّق الرفيق</b> — الذاكرة، والتحقق من الحصص، وتوجيه النوايا، وتحليل الرموز.</li>
          <li><b>وكيل الإعداد</b> — يرشدك في تجهيز الملف الشخصي.</li>
          <li><b>المعلّم الأكاديمي</b> — شروحات من الكتاب المدرسي مع استشهادات (وكلاء فرعية: الاستناد / التنميق / الحارس).</li>
          <li><b>وكيل الاختبارات</b> — توليد وتصحيح أسئلة متوازٍ عبر عدة فصول.</li>
          <li><b>وكيل التخطيط</b> — خرائط مذاكرة يومًا بيوم.</li>
          <li><b>وكيل الرؤى</b> — تجميع إحصائي للتقدّم.</li>
          <li><b>وكيل الزتونة</b> — بطاقات ملخّصة فائقة التكثيف.</li>
          <li><b>الحواجز الواقية</b> — جدار حماية للخصوصية والأمان، وعزل الوضع التجريبي، وحصص تُغلَق عند الفشل.</li>
        </UL>
      </>
      ),
    },
  },
  {
    id: "faq",
    title: { en: "8 · FAQ", ar: "٨ · الأسئلة الشائعة" },
    body: {
      en: (
      <>
        <H>The companion says it doesn&apos;t know my book?</H>
        <P>Make sure the book is selected (RAG scope shows &quot;1 selected book&quot;) and finished ingesting. Open it from the Library so the active-book context is attached to your messages.</P>
        <H>My Daily Token Budget shows 0?</H>
        <P>Usage is metered per account across daily/weekly/monthly windows. If you just signed in, it populates after your first AI calls. When the budget is exhausted, AI services pause until the window resets.</P>
        <H>A citation didn&apos;t land on the right page?</H>
        <P>Citations navigate by the page&apos;s real number; if a book counts its cover as page 1 the label and index can differ by one — use the page box to jump exactly.</P>
        <H>How do I ask the companion how to do something?</H>
        <P>Just ask in plain language, e.g. &quot;How do I create a 10-question quiz from this book?&quot; — the companion knows this manual and will walk you through it.</P>
      </>
      ),
      ar: (
      <>
        <H>الرفيق يقول إنه لا يعرف كتابي؟</H>
        <P>تأكّد من اختيار الكتاب (يُظهر نطاق RAG «كتاب واحد مُختار») ومن اكتمال استيعابه. افتحه من المكتبة كي يُرفَق سياق الكتاب النشط برسائلك.</P>
        <H>ميزانية الرموز اليومية تظهر صفرًا؟</H>
        <P>يُحسب الاستخدام لكل حساب عبر نوافذ يومية/أسبوعية/شهرية. إن سجّلت دخولك للتو، فستُملأ بعد أول استدعاءاتك للذكاء الاصطناعي. وعند نفاد الميزانية تتوقف خدمات الذكاء الاصطناعي مؤقتًا حتى تتجدد النافذة.</P>
        <H>استشهاد لم يصل إلى الصفحة الصحيحة؟</H>
        <P>تنتقل الاستشهادات حسب رقم الصفحة الحقيقي؛ وإن عدّ الكتاب غلافه صفحةً رقم ١ فقد يختلف العنوان عن الفهرس بمقدار واحد — استخدم صندوق الصفحة للانتقال بدقّة.</P>
        <H>كيف أسأل الرفيق عن كيفية القيام بأمر ما؟</H>
        <P>اسأل بلغةٍ بسيطة، مثل «كيف أنشئ اختبارًا من ١٠ أسئلة من هذا الكتاب؟» — يعرف الرفيق هذا الدليل وسيرشدك خطوة بخطوة.</P>
      </>
      ),
    },
  },
];

export default function HelpManual({ language, onClose }: { language: Lang; onClose: () => void }) {
  const [active, setActive] = useState<string>("what");
  const [q, setQ] = useState("");
  const isAr = language === "ar";

  const filtered = q.trim()
    ? SECTIONS.filter((s) => (s.title.en + s.title.ar).toLowerCase().includes(q.trim().toLowerCase()))
    : SECTIONS;
  const current = SECTIONS.find((s) => s.id === active) || SECTIONS[0];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100000, background: "rgba(2,6,23,0.55)",
        backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "2vh 2vw",
      }}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1000px, 96vw)", height: "min(88vh, 900px)", background: C.bg,
          borderRadius: "18px", border: `1px solid ${C.border}`, boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 1.25rem", borderBottom: `1px solid ${C.border}`,
          background: "linear-gradient(135deg, rgba(16,107,163,0.08), rgba(99,102,241,0.06))",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <FiBookOpen style={{ fontSize: "1.3rem", color: C.primary }} />
            <div>
              <div style={{ fontWeight: 900, fontSize: "1.05rem", color: C.fg }}>
                {isAr ? "دليل المستخدم والأسئلة الشائعة" : "User Manual & FAQs"}
              </div>
              <div style={{ fontSize: "0.72rem", color: C.muted }}>
                {isAr ? "فهم — دليل الاستخدام خطوة بخطوة" : "Fahem — step-by-step playbook"}
              </div>
            </div>
          </div>
          <button onClick={onClose} type="button" title={isAr ? "إغلاق" : "Close"}
            style={{
              width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.border}`,
              background: C.bg, color: C.fg, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
            <FiX style={{ fontSize: "1.1rem" }} />
          </button>
        </div>

        {/* Body: nav + content */}
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* Nav */}
          <div style={{
            width: 250, borderInlineEnd: `1px solid ${C.border}`, padding: "0.85rem",
            overflowY: "auto", flexShrink: 0, background: "rgba(16,107,163,0.015)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "6px 10px", marginBottom: 10, background: C.bg,
            }}>
              <FiSearch style={{ color: C.muted, fontSize: "0.9rem" }} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={isAr ? "ابحث في الدليل…" : "Search the manual…"}
                style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "0.82rem", color: C.fg }}
              />
            </div>
            {filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                type="button"
                style={{
                  display: "block", width: "100%", textAlign: isAr ? "right" : "left",
                  padding: "9px 11px", marginBottom: 4, borderRadius: 9, cursor: "pointer",
                  border: "none", fontSize: "0.85rem", fontWeight: 700,
                  background: active === s.id ? "linear-gradient(135deg, var(--primary), var(--secondary))" : "transparent",
                  color: active === s.id ? "#fff" : C.fg,
                }}
              >
                {isAr ? s.title.ar : s.title.en}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.6rem" }}>
            <h3 style={{ marginTop: 0, fontSize: "1.25rem", fontWeight: 900, color: C.fg }}>
              {isAr ? current.title.ar : current.title.en}
            </h3>
            {isAr ? current.body.ar : current.body.en}
          </div>
        </div>
      </div>
    </div>
  );
}
