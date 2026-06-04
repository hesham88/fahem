import { NextRequest } from "next/server";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get("bookId") || searchParams.get("book_id");

    if (!bookId) {
      return new Response(JSON.stringify({ error: "Missing required parameter: bookId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      const pages = (db as any).book_pages || [];
      let bookPages = pages
        .filter((p: any) => p.book_id === bookId)
        .sort((a: any, b: any) => (a.page_number || 0) - (b.page_number || 0));

      if (bookPages.length === 0) {
        console.log(`[Self-Healing Pages] Book ${bookId} has 0 pages in database. Generating rich learning content...`);
        const books = db.books || [];
        const book = books.find((b: any) => b._id === bookId);
        if (book) {
          const lang = book.language || "en";
          const generatedPages: any[] = [];
          
          if (book.chapters && book.chapters.length > 0) {
            let pageNumCounter = 1;
            book.chapters.forEach((ch: any) => {
              const chTitle = lang === "ar" ? (ch.title_ar || ch.title) : (ch.title || ch.title_ar);
              const conceptsList = ch.concepts ? ch.concepts.join(", ") : "";
              
              // Generate 3 pages for this chapter
              for (let i = 1; i <= 3; i++) {
                let pageContent = "";
                let formulas: string[] = [];
                let tips = "";
                
                if (lang === "ar") {
                  if (i === 1) {
                    pageContent = `مرحباً بك في دراسة الفصل: "${chTitle}".\nفي هذه الصفحة، سنستكشف المفاهيم الأساسية والأفكار الجوهرية لبرنامج المذاكرة الخاص بك. يُركز هذا الجزء على فهم الأُسس وتوضيح كيف تترابط العناصر العلمية معاً لتشكيل المبدأ العام.\nالمفاهيم الرئيسية التي سنغطيها تشمل: ${conceptsList || "مبادئ عامة وشرح تفصيلي"}.\nتأكت من قراءة كل فقرة بعناية وتدوين النقاط الهامة لمراجعتها لاحقاً مع رفيق المذاكرة فهم.`;
                    formulas = ["القاعدة العامة للمادة: م = أ × (ب + ج)"];
                    tips = "اكتب @ للتحدث مع المساعد الخاص بالمادة.";
                  } else if (i === 2) {
                    pageContent = `الجانب العملي والتطبيقي للفصل: "${chTitle}".\nهنا ندرج أمثلة محلولة خطوة بخطوة لمساعدتك على ترسيخ المعرفة الفكرية وتحويلها إلى مهارة عملية.\nمثال 1: كيف نقوم بتطبيق المفهوم في سيناريو حقيقي؟\nالحل: نقوم بتهيئة المعطيات أولاً، ثم نطبق الصيغة القياسية ونقوم بالتحقق من النتيجة النهائية لتطابق المخرجات النموذجية.\nالتمارين المقترحة:\n1. قم بحل مسألة مشابهة باستخدام قيم مختلفة.\n2. ناقش هذا الحل مع زملائك في النادي الاجتماعي للمادة.`;
                    formulas = ["معادلة التوازن الأساسية: ع = ص² - ٤"];
                    tips = "استخدم أداة التطبيق العملي والممارسة لتقييم مستواك الحالي.";
                  } else {
                    pageContent = `ملخص شامل وقائمة المراجعة السريعة للفصل: "${chTitle}".\nفي نهاية دراسة هذا الفصل، إليك أهم الخلااصات التي يجب أن تتذكرها دائماً:\n- الفهم السليم للمصطلحات يسهل حل أي مشكلة معقدة.\n- الممارسة المستمرة والمستقرة هي مفتاح النجاح والتميز الدراسي.\nمذكرة المراجعة السريعة:\n1. راجع التعاريف الأساسية بشكل دوري.\n2. تأكد من قدرتك على حل المثال التطبيقي دون النظر للإجابة.\n3. اطرح أي سؤال متبقي على الذكاء الاصطناعي التوليدي.`;
                    formulas = ["معدل الكفاءة: ك = (المخرجات / المدخلات) × 100%"];
                    tips = "يمكنك توليد اختبار سريع على هذا الفصل مباشرة!";
                  }
                } else {
                  // English
                  if (i === 1) {
                    pageContent = `Welcome to the core study guide for Chapter: "${chTitle}".\nIn this section, we break down the fundamental concepts and foundational mechanics. Grounding yourself in these principles will ensure a smooth learning journey.\nKey Focus Areas: ${conceptsList || "General academic overview and terminology"}.\nBe sure to analyze how these pieces fit into the broader system, and use the Fahem Chat Companion to clarify any complex aspects in real-time.`;
                    formulas = ["Fundamental Standard: Y = f(X) + e"];
                    tips = "Type @ to direct your question to the specialized tutor for this subject.";
                  } else if (i === 2) {
                    pageContent = `Practical application and hands-on examples for Chapter: "${chTitle}".\nLet's apply what we've learned through step-by-step solved walkthroughs and programming/mathematical exercises.\nWalkthrough Example:\n1. Initialize and configure the system variables.\n2. Apply the core algorithm or transformation formula.\n3. Validate output completeness and handle edge cases.\nTry changing the inputs and observe how the output responds to build dynamic intuition!`;
                    formulas = ["Efficiency Metric: E = Work_Done / Time_Taken"];
                    tips = "Use the 'Practice' tab to take a gamified challenge on this exact chapter.";
                  } else {
                    pageContent = `Summary, checklist, and core takeaways for Chapter: "${chTitle}".\nTo solidify your understanding before moving forward, review this high-impact checklist:\n- Recall the definitions and syntax/rules of ${conceptsList || "the core concepts"}.\n- Walk through the application flow from memory.\n- Connect the dots between these concepts and previous chapters.\nGrounding Key: "Active recall is 10x more effective than passive reading!"`;
                    formulas = ["Success Rate: S = (Recall_Correct / Total_Challenges)"];
                    tips = "Ask your Companion 'Create a flashcard of this page' to test your active recall!";
                  }
                }
                
                generatedPages.push({
                  _id: `page_${bookId}_${pageNumCounter}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                  book_id: bookId,
                  page_number: pageNumCounter,
                  content: pageContent,
                  formulas: formulas,
                  tips: tips
                });
                pageNumCounter++;
              }
            });
          } else {
            // No chapters - generate 5 default pages based on book title
            const bookTitle = lang === "ar" ? (book.title_ar || book.title) : (book.title || book.title_ar);
            for (let i = 1; i <= 5; i++) {
              let pageContent = "";
              let formulas: string[] = [];
              let tips = "";
              
              if (lang === "ar") {
                pageContent = `هذه هي الصفحة رقم ${i} من الكتاب المفتوح: "${bookTitle}".\nلقد تم استيراد هذا الكتاب الدراسي وهو الآن جاهز تماماً للدراسة والتحليل بواسطة أنظمة الفهم المتكاملة.\nمحتوى مخصص للتعلم:\n- في هذا الجزء سنقوم بشرح وتفسير الجوانب المختلفة لكتاب ${bookTitle}.\n- استخدم رفيق المحادثة الذكي للاستفسار والتعمق في أي فكرة غامضة أو صعبة.`;
                formulas = [`مستوى التقدم: ص = ${i} / 5`];
                tips = "اسأل المساعد 'اشرح لي محتوى هذه الصفحة ببساطة'";
              } else {
                pageContent = `This is Page ${i} of the imported textbook: "${bookTitle}".\nThis content is dynamically synthesized and optimized to serve as high-grounding reading material for your course.\nCore study guide insights:\n- Analyze the structure and key highlights of ${bookTitle} on this page.\n- Use the companion chat panel on the right side to ask questions, solve challenges, or translate terminology.`;
                formulas = [`Syllabus Progress: P = ${i} / 5`];
                tips = "Ask the companion chat 'Give me a 3-bullet summary of Page " + i + "'";
              }
              
              generatedPages.push({
                _id: `page_${bookId}_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                book_id: bookId,
                page_number: i,
                content: pageContent,
                formulas: formulas,
                tips: tips
              });
            }
          }
          
          if (!(db as any).book_pages) {
            (db as any).book_pages = [];
          }
          (db as any).book_pages.push(...generatedPages);
          saveLocalDb(db);
          
          bookPages = generatedPages;
        }
      }

      return new Response(JSON.stringify({ success: true, pages: bookPages }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Proxy to Cloud Run Agent
    return await proxyRequest(`/user/books/pages?book_id=${bookId}`, "GET");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
