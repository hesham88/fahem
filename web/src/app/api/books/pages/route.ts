import { NextRequest } from "next/server";
import { isLocalEnv, getLocalDb, saveLocalDb } from "../../localDbHelper";
import { proxyRequest } from "../../proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const bookId = searchParams.get("bookId") || searchParams.get("book_id");

    if (!bookId && !query) {
      return new Response(JSON.stringify({ error: "Missing required parameters: bookId or query" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (query) {
      if (isLocalEnv()) {
        const db = getLocalDb();
        const pages = (db as any).book_pages || [];
        const books = db.books || [];
        const lowercaseQuery = query.toLowerCase();
        
        const results: any[] = [];
        
        // 1. Search DB pages
        pages.forEach((p: any) => {
          const content = (p.content || "").toLowerCase();
          const titleEn = (p.titleEn || "").toLowerCase();
          const titleAr = (p.titleAr || "").toLowerCase();
          const chEn = (p.chapterTitleEn || p.chapter_title_en || "").toLowerCase();
          const chAr = (p.chapterTitleAr || p.chapter_title_ar || "").toLowerCase();
          
          if (content.includes(lowercaseQuery) || 
              titleEn.includes(lowercaseQuery) || 
              titleAr.includes(lowercaseQuery) ||
              chEn.includes(lowercaseQuery) ||
              chAr.includes(lowercaseQuery)) {
            const book = books.find((b: any) => b._id === p.book_id || b.id === p.book_id || b._id === p.bookId || b.id === p.bookId);
            results.push({
              _id: p._id,
              bookId: p.book_id || p.bookId,
              bookTitle: book ? (book.titleAr || book.titleEn || book.title) : "Unknown Book",
              bookTitleEn: book ? (book.titleEn || book.title) : "Unknown Book",
              bookTitleAr: book ? (book.titleAr || book.title) : "Unknown Book",
              pageNumber: p.page_number || p.pageNum || 1,
              titleEn: p.titleEn || `Page ${p.page_number}`,
              titleAr: p.titleAr || `الصفحة ${p.page_number}`,
              chapterTitleEn: p.chapterTitleEn || p.chapter_title_en || "",
              chapterTitleAr: p.chapterTitleAr || p.chapter_title_ar || "",
              snippet: p.content ? (p.content.substring(0, 150) + "...") : ""
            });
          }
        });

        // 2. Search Static Fallback Textbook pages (from hardcoded pages list)
        const TEXTBOOK_PAGES_STATIC: Record<string, any> = {
          "Math": {
            titleEn: "Advanced Mathematics Grade 9",
            titleAr: "الرياضيات المتقدمة - الصف التاسع",
            chapters: [
              {
                titleEn: "Chapter 1: Matrices & Determinants",
                titleAr: "الفصل الأول: المصفوفات والمحددات",
                pages: [
                  { pageNum: 1, titleEn: "Introduction to Matrices", titleAr: "مقدمة في المصفوفات", contentEn: "A matrix is a rectangular array of numbers, symbols, or expressions...", contentAr: "المصفوفة هي تنظيم مستطيل الشكل..." },
                  { pageNum: 2, titleEn: "Basic Matrix Operations", titleAr: "العمليات الأساسية على المصفوفات", contentEn: "Matrix addition is the operation...", contentAr: "جمع المصفوفات هو عملية جمع العناصر المتناظرة..." },
                  { pageNum: 3, titleEn: "Determinants & Singularity", titleAr: "المحددات والمصفوفات المنفردة", contentEn: "A determinant is a scalar value...", contentAr: "المحدد هو قيمة عددية يتم حسابها..." },
                  { pageNum: 4, titleEn: "Cramer's Rule for Linear Systems", titleAr: "طريقة كرامر لحل المعادلات الخطية", contentEn: "Cramer's rule is an explicit formula...", contentAr: "طريقة كرامر هي صيغة صريحة..." }
                ]
              }
            ]
          },
          "Science": {
            titleEn: "Comprehensive Chemistry Handbook",
            titleAr: "كتاب الكيمياء الشامل والمبسط",
            chapters: [
              {
                titleEn: "Chapter 1: Atomic Structure",
                titleAr: "الفصل الأول: البنية الذرية للذرة",
                pages: [
                  { pageNum: 1, titleEn: "Atomic Theory Evolution", titleAr: "تطور نظرية بنية الذرة", contentEn: "The concept of the atom started...", contentAr: "بدأ مفهوم الذرة مع فلاسفة الإغريق..." },
                  { pageNum: 2, titleEn: "Quantum Numbers & Orbitals", titleAr: "أعداد الكم المحددة والمدارات", contentEn: "Four quantum numbers are used...", contentAr: "تُستخدم أربعة أعداد كم لتحديد حالة..." }
                ]
              }
            ]
          },
          "Arabic": {
            titleEn: "Grammar & Arabic Linguistics Keys",
            titleAr: "مفاتيح النحو وقواعد الصرف المبسطة",
            chapters: [
              {
                titleEn: "Chapter 1: Arabic Grammar Basics",
                titleAr: "الفصل الأول: أساسيات النحو وقواعد الإعراب",
                pages: [
                  { pageNum: 1, titleEn: "Parts of Speech", titleAr: "أقسام الكلام في اللغة العربية", contentEn: "Words in Arabic grammar are classified...", contentAr: "الكلمة في اللغة العربية تنقسم إلى..." },
                  { pageNum: 2, titleEn: "Nominative, Accusative & Genitive States", titleAr: "حالات الإعراب: الرفع، النصب، والجر", contentEn: "Arabic nouns change their endings...", contentAr: "تتغير أواخر الكلمات المعربة في اللغة العربية..." }
                ]
              }
            ]
          }
        };

        Object.keys(TEXTBOOK_PAGES_STATIC).forEach((subj) => {
          const bookData = TEXTBOOK_PAGES_STATIC[subj];
          bookData.chapters?.forEach((ch: any) => {
            ch.pages?.forEach((p: any) => {
              const contentEn = (p.contentEn || "").toLowerCase();
              const contentAr = (p.contentAr || "").toLowerCase();
              const tEn = (p.titleEn || "").toLowerCase();
              const tAr = (p.titleAr || "").toLowerCase();
              const chEn = (ch.titleEn || "").toLowerCase();
              const chAr = (ch.titleAr || "").toLowerCase();
              
              if (contentEn.includes(lowercaseQuery) || 
                  contentAr.includes(lowercaseQuery) || 
                  tEn.includes(lowercaseQuery) || 
                  tAr.includes(lowercaseQuery) || 
                  chEn.includes(lowercaseQuery) || 
                  chAr.includes(lowercaseQuery)) {
                results.push({
                  _id: `static_${subj}_${p.pageNum}`,
                  bookId: subj,
                  bookTitle: bookData.titleAr || bookData.titleEn,
                  bookTitleEn: bookData.titleEn,
                  bookTitleAr: bookData.titleAr,
                  pageNumber: p.pageNum,
                  titleEn: p.titleEn,
                  titleAr: p.titleAr,
                  chapterTitleEn: ch.titleEn,
                  chapterTitleAr: ch.titleAr,
                  snippet: (p.contentEn || p.contentAr || "").substring(0, 150) + "..."
                });
              }
            });
          });
        });

        return new Response(JSON.stringify({ success: true, results: results.slice(0, 15) }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      return await proxyRequest(`/user/books/search?query=${encodeURIComponent(query)}`, "GET");
    }

    if (isLocalEnv()) {
      const db = getLocalDb();
      const pages = (db as any).book_pages || [];
      
      let cleanBookId = bookId;
      if (!cleanBookId) {
        return new Response(JSON.stringify({ error: "Missing required parameter: bookId" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      if (cleanBookId.startsWith("custom_")) {
        cleanBookId = cleanBookId.replace("custom_", "");
      }

      let bookPages = pages
        .filter((p: any) => p.book_id === cleanBookId || p.book_id === bookId || p.bookId === cleanBookId || p.bookId === bookId)
        .sort((a: any, b: any) => (a.page_number || 0) - (b.page_number || 0));

      if (bookPages.length === 0) {
        console.log(`[Self-Healing Pages] Book ${bookId} has 0 pages in database. Generating rich learning content...`);
        const books = db.books || [];
        const book = books.find((b: any) => b._id === cleanBookId || b.book_id === cleanBookId || b._id === bookId || b.book_id === bookId);
        if (book) {
          const resolvedBookId = book._id || book.book_id || bookId;
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
                  _id: `page_${resolvedBookId}_${pageNumCounter}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                  book_id: resolvedBookId,
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
            const titleLower = (bookTitle || "").toLowerCase();
            const idLower = (bookId || "").toLowerCase();
            
            const isComputerScience = titleLower.includes("computer science") || idLower.includes("computer_science");
            const isPython = titleLower.includes("python") || idLower.includes("python");

            for (let i = 1; i <= 5; i++) {
              let pageContent = "";
              let formulas: string[] = [];
              let tips = "";
              
              if (isComputerScience) {
                if (i === 1) {
                  pageContent = `### Chapter 1: Introduction to Computer Systems & Hardware Architectures\n\nAt the heart of every modern computing machine lies the **Von Neumann Architecture**, a design proposed in 1945 by mathematician and physicist John von Neumann. This elegant blueprint defines a system with four main components: the Central Processing Unit (CPU), the Primary Memory (RAM), Secondary Storage (such as SSDs or HDDs), and Input/Output (I/O) interfaces.\n\n#### 1. The Central Processing Unit (CPU)\nThe CPU is often referred to as the brain of the computer. It executes instructions through a continuous cycle known as the **Fetch-Decode-Execute Cycle**:\n- **Fetch**: The control unit retrieves an instruction from the memory address specified by the Program Counter (PC).\n- **Decode**: The Control Unit decodes the binary instruction to determine what operation (e.g., addition, subtraction, memory load) is required.\n- **Execute**: The Arithmetic Logic Unit (ALU) performs the actual calculation or operation, and results are written back to registers or main memory.\n\n#### 2. The Memory Hierarchy\nComputer systems use a hierarchical storage structure to balance speed, cost, and capacity:\n- **Registers**: Located inside the CPU, registers are extremely fast but have tiny storage capacities (measured in bytes).\n- **Cache Memory**: Super-fast SRAM (Static RAM) placed close to the CPU core (L1, L2, L3 caches) to store frequently accessed data.\n- **Main Memory (RAM)**: Dynamic RAM (DRAM) that holds the active operating system, programs, and data. It is volatile, meaning all stored information is lost when power is turned off.\n- **Secondary Storage**: Non-volatile storage (such as NVMe Solid State Drives) used for permanent data retention.\n\n#### 3. Binary Representation\nAt the lowest physical level, computers process information using electrical signals that are either "ON" (represented as 1) or "OFF" (represented as 0). Each 1 or 0 is a **bit** (binary digit). A collection of 8 bits forms a **byte**, which can represent 256 distinct states. Numerical data, textual characters (using ASCII or Unicode standard tables), and instruction codes are all represented in binary base-2 notation.`;
                  formulas = ["Primary Memory Bandwidth: B = Clock\\_Rate \\times Bus\\_Width", "Memory Capacity: N = 2^{Address\\_Lines}"];
                  tips = "To visualize binary encoding, try representing the number 42 in binary (Answer: 101010).";
                } else if (i === 2) {
                  pageContent = `### Chapter 2: Foundations of Algorithms & Software Complexity\n\nAn **algorithm** is a precise, step-by-step sequence of instructions designed to solve a specific problem or perform a calculation. In computer science, we analyze algorithms not only for correctness but also for efficiency, utilizing a mathematical notation called **Big O Notation**.\n\n#### 1. Big O Complexity Analysis\nBig O notation describes how the execution time or space requirements of an algorithm grow relative to the size of the input data (denoted as $N$):\n- **O(1) - Constant Time**: Execution time remains unchanged regardless of input size (e.g., accessing an element in an array by index).\n- **O(log N) - Logarithmic Time**: The problem size is halved at each step (e.g., Binary Search).\n- **O(N) - Linear Time**: Time grows proportionally to input size (e.g., Linear Search through an unsorted array).\n- **O(N log N) - Linearithmic Time**: Standard for efficient sorting algorithms like Mergesort and Quicksort.\n- **O(N²) - Quadratic Time**: Double loops over the same dataset (e.g., Bubble Sort, Insertion Sort).\n\n#### 2. Key Sorting Algorithms\nSorting is a fundamental operation in computational science. Let's compare two main paradigms:\n- **Mergesort (Divide-and-Conquer)**:\n  - Divides the unsorted list into $N$ sublists, each containing 1 element.\n  - Repeatedly merges sublists to produce new sorted sublists until there is only 1 sublist remaining.\n  - Guaranteed time complexity of $O(N \\log N)$ in all cases, but requires $O(N)$ auxiliary memory.\n- **Quicksort (Partition-based)**:\n  - Picks an element as a 'pivot' and partitions the array around it.\n  - Recursively sorts the sub-arrays.\n  - Average-case complexity of $O(N \\log N)$ and operates in-place ($O(1)$ extra space), but can degrade to $O(N^2)$ if the pivot choices are poor.\n\n#### 3. Recursion\nRecursion occurs when a function calls itself directly or indirectly to solve smaller sub-problems of the same type. Every recursive function must contain a **base case** (to stop recursion and prevent stack overflow) and a **recursive step** (to reduce the problem size and progress toward the base case).`;
                  formulas = ["Time Complexity Growth: O(1) < O(\\log N) < O(N) < O(N \\log N) < O(N^2)", "Recursive Fibonacci: F(n) = F(n-1) + F(n-2) \\text{ for } n > 1"];
                  tips = "Always ensure your recursive algorithms have a well-defined base case to avoid a Stack Overflow Exception.";
                } else if (i === 3) {
                  pageContent = `### Chapter 3: Operating Systems Architecture & Computer Networks\n\nAn **Operating System (OS)** acts as an intermediary between computer hardware and user applications. Its primary duties include process management, memory allocation, storage control, and coordinating device communications.\n\n#### 1. Process and Thread Scheduling\nA **process** is an active program in execution with its own allocated memory space. A **thread** is the smallest unit of execution within a process; multiple threads of a process share the same memory space. The OS kernel uses scheduling algorithms (like Round Robin, Shortest Job First, or Multi-Level Feedback Queues) to share CPU execution time across active processes:\n- **Context Switching**: The process of saving the state of a running thread/process so that another can be executed, then restoring it later.\n- **Concurrency vs. Parallelism**: Concurrency is about managing multiple tasks at once (overlapping execution on a single core), while parallelism is about executing multiple tasks simultaneously (using multiple physical CPU cores).\n\n#### 2. Virtual Memory and Paging\nTo run programs larger than physical RAM, operating systems implement **Virtual Memory**. The physical memory is divided into fixed-size blocks called **page frames**, and virtual memory is divided into blocks called **pages**. The Memory Management Unit (MMU) translates virtual addresses to physical RAM addresses using a **Page Table**. If a page is requested but is not currently loaded in physical RAM, a **Page Fault** occurs, prompting the OS to retrieve it from secondary storage.\n\n#### 3. Computer Networks and the TCP/IP Stack\nNetworking enables disparate computing systems to exchange data safely. The **TCP/IP model** structures network communications into four logical layers:\n1. **Application Layer**: User-facing protocols (HTTP, HTTPS, FTP, DNS).\n2. **Transport Layer**: Host-to-host data delivery. **TCP** (Transmission Control Protocol) is connection-oriented and guarantees reliable, in-order packet delivery. **UDP** (User Datagram Protocol) is connectionless and prioritizes speed over reliability.\n3. **Internet Layer**: Packages packets into IP datagrams and routes them across networks using IP Addresses (IPv4 or IPv6).\n4. **Network Access Layer**: Deals with physical hardware connections, MAC addresses, and network interface cards.`;
                  formulas = ["TCP Transmission Window Size: W_{max} \\propto Bandwidth \\times RTT", "Page Translation: Physical\\_Address = Frame\\_Base + Offset"];
                  tips = "Use command line tools like 'ping' and 'traceroute' (or 'tracert' on Windows) to diagnose networking issues.";
                } else if (i === 4) {
                  pageContent = `### Chapter 4: Relational Databases & Linear Data Structures\n\nManaging and storing data efficiently is critical for any computer application. Computer science divides this into runtime **Data Structures** (in memory) and persistent **Database Management Systems** (on disk).\n\n#### 1. Fundamental Data Structures\nData structures organize data for optimal access and manipulation.\n- **Arrays**: Linear structures that store elements of the same type in contiguous memory locations. Offers $O(1)$ random access, but insertion/deletion requires shifting elements ($O(N)$ time).\n- **Linked Lists**: Nodes linked together via pointers. Insertion/deletion is fast ($O(1)$ if the node reference is known), but searching requires sequential traversal ($O(N)$ time).\n- **Hash Tables**: Key-value stores that use a **hash function** to map keys to indexes in an array. Offers average $O(1)$ time complexity for insertions, lookups, and deletions.\n- **Trees & Graphs**: Non-linear structures. Binary Search Trees (BST) allow logarithmic lookups, while Graphs model relationships between entities (nodes and edges).\n\n#### 2. Database Management Systems (DBMS)\nTo store information permanently, we utilize structured databases:\n- **Relational Databases (RDBMS)**: Organize data into tables consisting of rows and columns. They use **SQL** (Structured Query Language) for queries and guarantee **ACID properties**:\n  - **Atomicity**: Entire transaction succeeds or entire transaction is rolled back.\n  - **Consistency**: Data transitions from one valid state to another.\n  - **Isolation**: Concurrent transactions do not interfere with each other.\n  - **Durability**: Committed data remains safe even during system failures.\n- **NoSQL Databases**: Schema-less databases designed for horizontal scaling. Types include Document stores (MongoDB), Key-Value caches (Redis), and Wide-column databases (Cassandra).`;
                  formulas = ["Hash Table Index: index = hash(key) \\pmod{capacity}", "Relational Cardinality: 1:1 \\text{ (One-to-One)}, 1:N \\text{ (One-to-Many)}, N:M \\text{ (Many-to-Many)}"];
                  tips = "Adding an index to a database column can speed up SELECT queries dramatically, but slows down INSERT and UPDATE operations.";
                } else {
                  pageContent = `### Chapter 5: Introduction to Artificial Intelligence & Cybersecurity\n\nAs computer networks expand, securing digital assets and leveraging data intelligence have become the twin pillars of advanced technological development.\n\n#### 1. Artificial Intelligence and Machine Learning\n**Artificial Intelligence (AI)** is a broad field of study focused on creating systems that simulate human intelligence. **Machine Learning (ML)** is a subset of AI where algorithms learn patterns directly from data without explicit programming:\n- **Supervised Learning**: Models are trained on labeled data (e.g., predicting house prices using historical features).\n- **Unsupervised Learning**: Models identify natural clusters or structures in unlabeled datasets (e.g., customer segmentation).\n- **Deep Learning**: A subset of ML utilizing deep multi-layer Neural Networks modeled after biological brain structures to solve highly complex tasks like computer vision or natural language translation.\n\n#### 2. The Principles of Cybersecurity\nCybersecurity is the practice of protecting computer networks, systems, and programs from digital attacks:\n- **The CIA Triad**:\n  - **Confidentiality**: Ensuring data is accessible only to authorized entities (implemented via encryption).\n  - **Integrity**: Protecting data from unauthorized modification (implemented via hashing and digital signatures).\n  - **Availability**: Ensuring systems and resources are accessible when needed (implemented via redundancy and load balancing).\n\n#### 3. Cryptographic Foundations\nCryptography underpins all modern security mechanisms:\n- **Symmetric Cryptography**: Uses a single shared key for both encryption and decryption (e.g., AES standard). It is fast but requires safe key exchange.\n- **Asymmetric Cryptography**: Uses a public-private key pair (e.g., RSA). Data encrypted with the public key can only be decrypted with the matching private key, facilitating secure communication over unsecure channels.\n- **Cryptographic Hash Functions**: One-way algorithms (e.g., SHA-256) that convert arbitrary data into a fixed-size string. A minor change in input drastically changes the output hash (avalanche effect).`;
                  formulas = ["Symmetric Cipher: Ciphertext = E_K(Plaintext)", "Asymmetric RSA Key Pair: d \\cdot e \\equiv 1 \\pmod{\\phi(n)}", "Neural Network Node Output: y = \\sigma(\\sum w_i x_i + b)"];
                  tips = "Never write your own cryptography algorithms or store plain-text passwords. Always use standard salt-and-hash functions like bcrypt.";
                }
              } else if (isPython) {
                if (i === 1) {
                  pageContent = `### الفصل الأول: تهيئة البيئة والتعرف على كود بايثون الأول والمتغيرات\n\nمرحباً بك في عالم لغة **بايثون (Python)**! هي لغة برمجة عالية المستوى، مفسرة (Interpreted)، وتتميز ببساطتها الفائقة وقابليتها الكبيرة للقراءة والتطبيق الفوري. يُعد تصميم بايثون مثالياً للمطورين المبتدئين والمحترفين على حد سواء في شتى المجالات مثل تطوير الويب، هندسة البيانات، والذكاء الاصطناعي.\n\n#### 1. تهيئة بيئة التطوير (Setup)\nللبدء في كتابة أكواد بايثون، نقوم بتنزيل وتثبيت المفسر الرسمي من موقع بايثون. بمجرد التثبيت، يمكنك تشغيل ملفات بايثون التي تنتهي بامتداد \`.py\` عن طريق سطر الأوامر:\n\`\`\`bash\npython hello_world.py\n\`\`\`\nكود بايثون الأول والشهير هو سطر واحد بسيط ومباشر:\n\`\`\`python\nprint("أهلاً بك في لغة بايثون الفائقة!")\n\`\`\`\n\n#### 2. المتغيرات الديناميكية (Dynamic Typing)\nتتميز بايثون بأنها لغة ذات كتابة ديناميكية (Dynamically Typed). هذا يعني أنك لا تحتاج إلى تحديد نوع المتغير (مثل int أو string) بشكل مسبق عند تعريفه؛ حيث يتعرف مفسر بايثون على النوع تلقائياً بناءً على القيمة المسندة إليه:\n- **الأعداد الصحيحة (Integers)**: مثل \`age = 25\`\n- **الأعداد العشرية (Floats)**: مثل \`gpa = 3.9\`\n- **النصوص (Strings)**: مثل \`name = "فهم"\`\n- **القيم المنطقية (Booleans)**: مثل \`is_active = True\`\n\n#### 3. إدخال البيانات والتحويل (User Input & Type Casting)\nيمكنك التفاعل مع المستخدم للحصول على مدخلات باستخدام دالة \`input()\`. تذكر دائماً أن هذه الدالة تعيد المدخلات كنص (String)، لذا يجب تحويلها (Type Casting) إذا كنت تحتاجها كأرقام:\n\`\`\`python\nuser_input = input("أدخل عمرك: ")\nage = int(user_input)  # تحويل النص إلى رقم صحيح لإجراء عمليات حسابية\n\`\`\``;
                  formulas = ["Dynamic Typing: x = 10 \\rightarrow type(x) \\text{ is } int", "Type Casting: y = float(\"3.14\") \\rightarrow y = 3.14"];
                  tips = "استخدم دالة type() لمعرفة نوع أي متغير أثناء تشغيل الكود وتجربته في مفسر بايثون التفاعلي.";
                } else if (i === 2) {
                  pageContent = `### الفصل الثاني: التحكم في تدفق البرنامج والتعامل مع الشروط والتكرار\n\nأحد أهم ركائز البرمجة هو التحكم في كيفية تشغيل كود البرنامج بناءً على مدخلات وظروف متغيرة. سنتناول في هذا الجزء الجمل الشرطية وحلقات التكرار.\n\n#### 1. الجمل الشرطية (Conditionals)\nتستخدم بايثون الكلمات المفتاحية \`if\` و \`elif\` و \`else\` للتحقق من الشروط وتوجيه تدفق الكود. نستخدم المعاملات المنطقية للمقارنة مثل (\`==\` للمساواة، \`!=\` لعدم المساواة، \`>\` أكبر من، \`<\` أصغر من):\n\`\`\`python\nscore = 85\nif score >= 90:\n    print("التقدير: ممتاز")\nelif score >= 80:\n    print("التقدير: جيد جداً")\nelse:\n    print("التقدير: يحتاج إلى تحسين")\n\`\`\`\n\n#### 2. ميزة الإزاحة البادئة الهامة (Indentation)\nعلى عكس معظم لغات البرمجة التي تستخدم الأقواس المتعرجة \`{}\` لتحديد كتل الأكواد، تعتمد بايثون كلياً على **الإزاحة البادئة (Indentation)** (عادةً ما تكون 4 مسافات). الإزاحة الخاطئة ستؤدي فوراً إلى حدوث خطأ من نوع \`IndentationError\` ويجب الانتباه لها جيداً.\n\n#### 3. حلقات التكرار (Loops)\nلتكرار تنفيذ كتلة من الأكواد لعدد محدد من المرات أو بناءً على شرط معين، توفر بايثون آليتين:\n- **حلقة \`for\`**: مثالية للمرور على عناصر سلسلة أو مصفوفة محددة، وتستخدم غالباً مع دالة \`range()\`:\n  \`\`\`python\n  # طباعة الأعداد من 0 إلى 4\n  for i in range(5):\n      print("العدد:", i)\n  \`\`\`\n- **حلقة \`while\`**: تستمر في التكرار طالما أن الشرط المحدد يظل صحيحاً (True):\n  \`\`\`python\n  count = 0\n  while count < 3:\n      print("تكرار رقم:", count)\n      count += 1\n  \`\`\``;
                  formulas = ["Indentation Rule: 4 \\text{ spaces for each nested block}", "Comparison Syntax: a == b \\text{ (equality)}, a != b"];
                  tips = "تجنب الحلقات اللانهائية (Infinite Loops) في while عن طريق التأكد من تحديث شرط الحلقة دائماً داخل الكتلة المتكررة.";
                } else if (i === 3) {
                  pageContent = `### الفصل الثالث: هياكل البيانات المضمنة - القوائم، الصفوف، القواميس، والمجموعات\n\nتتميز لغة بايثون بهياكل بيانات مدمجة قوية ومرنة للغاية تتيح للمبرمج تخزين مجموعات البيانات والتحكم فيها بسهولة فائقة دون الحاجة لإعدادات معقدة.\n\n#### 1. القوائم (Lists)\nالقائمة عبارة عن مجموعة مرتبة وقابلة للتعديل (Mutable) من العناصر. يمكن أن تحتوي القائمة على عناصر من أنواع مختلفة، ونستخدم الأقواس المربعة \`[]\` لتعريفها:\n\`\`\`python\nfruits = ["تفاح", "موز", "برتقال"]\nfruits.append("فراولة")  # إضافة عنصر جديد\nprint(fruits[0])  # الوصول للعنصر الأول عبر الفهرس index 0 (تفاح)\n\`\`\`\n\n#### 2. الصفوف (Tuples)\nالصف عبارة عن مجموعة مرتبة ولكنها **غير قابلة للتعديل** (Immutable). بمجرد إنشاء الصف، لا يمكنك إضافة عناصر أو تعديلها أو حذفها. نستخدم الأقواس الدائرية \`()\` لتعريفه:\n\`\`\`python\ncoordinates = (24.7136, 46.6753)  # إحداثيات جغرافية ثابتة لا تتغير\n\`\`\`\n\n#### 3. القواميس (Dictionaries)\nالقاموس هو هيكل بيانات غير مرتب يقوم بتخزين البيانات على هيئة **مفتاح وقيمة** (Key-Value Pairs). المفاتيح يجب أن تكون فريدة، ونستخدم الأقواس المتعرجة \`{}\` لتعريفها:\n\`\`\`python\nstudent = {\n    "name": "أحمد",\n    "gpa": 3.8,\n    "major": "علوم حاسب"\n}\nprint(student["name"])  # أحمد\nstudent["gpa"] = 3.9  # تحديث المعدل الدراسي بسهولة\n\`\`\`\n\n#### 4. المجموعات (Sets)\nالمجموعة هي هيكل بيانات يحتوي على عناصر فريدة وغير مرتبة. لا تسمح المجموعات بتكرار القيم، وهي مثالية لإجراء العمليات الرياضية مثل الاتحاد والتقاطع والفرق.\n\`\`\`python\nnumbers = {1, 2, 2, 3}  # سيتم إهمال المكرر تلقائياً لتصبح المجموعة {1, 2, 3}\n\`\`\``;
                  formulas = ["List indexing: list[0] \\dots list[n-1]", "Dictionary access: value = dict[key]"];
                  tips = "استخدم القوائم (Lists) عندما تحتاج مصفوفة ديناميكية مرنة، والقواميس (Dictionaries) للوصول السريع للبيانات باستخدام المفاتيح.";
                } else if (i === 4) {
                  pageContent = `### الفصل الرابع: الدوال وتصميم الأكواد التراكبية واستيراد المكتبات\n\nكتابة الأكواد في ملف واحد طويل يجعل صيانتها وتصحيحها أمراً مستحيلاً. لذا، نستخدم **الدوال (Functions)** والموديولات البرمجية لتنظيم الأكواد وإعادة استخدامها بكفاءة.\n\n#### 1. تعريف واستدعاء الدوال (Functions)\nالدالة هي كتلة برمجية منظمة وقابلة لإعادة الاستخدام تُنفذ وظيفة محددة. نستخدم الكلمة المفتاحية \`def\` تليها اسم الدالة والأقواس التي تحتوي على المعاملات (Arguments):\n\`\`\`python\ndef calculate_area(length, width):\n    """دالة بسيطة لحساب مساحة المستطيل"""\n    area = length * width\n    return area\n\n# استدعاء الدالة وحفظ النتيجة\nresult = calculate_area(5, 10)\nprint("المساحة المحسوبة:", result)  # 50\n\`\`\`\n\n#### 2. نطاق المتغيرات (Variable Scope)\nتنقسم المتغيرات في بايثون إلى نوعين بناءً على مكان تعريفها:\n- **متغيرات محلية (Local Variables)**: يتم تعريفها داخل الدالة، ولا يمكن الوصول إليها خارجها.\n- **متغيرات عامة (Global Variables)**: يتم تعريفها في الجزء الرئيسي من الكود، ويمكن قراءتها من أي مكان.\n\n#### 3. البرمجة التراكبية واستيراد المكتبات (Modules & Imports)\nتوفر بايثون آلاف المكتبات الجاهزة التي يمكنك استيرادها واستخدمها لتوفير الوقت والجهد الهائل. نستخدم الأمر \`import\`:\n\`\`\`python\nimport math  # استيراد مكتبة الرياضيات الشهيرة\nresult = math.sqrt(16)  # حساب الجذر التربيعي للعدد 16\nprint("جذر 16 هو:", result)  # 4.0\n\nimport random  # استيراد مكتبة لتوليد قيم عشوائية\nrandom_choice = random.choice(["نعم", "لا", "ربما"])\n\`\`\``;
                  formulas = ["Function Definition: def function\\_name(parameters):", "Square Root function: math.sqrt(x) = \\sqrt{x}"];
                  tips = "احرص دائماً على كتابة شرح موجز (Docstring) في السطر الأول من دالتك لتوضيح هدفها والمدخلات والمخرجات.";
                } else {
                  pageContent = `### الفصل الخامس: معالجة الأخطاء الاستثنائية والتعامل الفعال مع الملفات\n\nفي هذا الفصل الختامي، سنتعلم كيفية جعل برامجنا متينة وقوية أمام الأخطاء المفاجئة أثناء التشغيل، بالإضافة إلى كيفية حفظ وقراءة البيانات من الملفات الخارجية بشكل دائم.\n\n#### 1. معالجة الأخطاء الاستثنائية (Exception Handling)\nأثناء تشغيل البرنامج، قد تحدث أخطاء غير متوقعة (مثل محاولة القسمة على صفر أو قراءة ملف غير موجود). إذا لم نتعامل مع هذه الأخطاء، سينهار البرنامج ويتوقف فوراً. توفر بايثون بنية \`try-except\` للتعامل الذكي مع هذه الاستثناءات:\n\`\`\`python\ntry:\n    number = int(input("أدخل رقماً: "))\n    result = 10 / number\n    print("النتيجة:", result)\nexcept ZeroDivisionError:\n    print("خطأ: لا يمكن القسمة على الصفر مطلقاً!")\nexcept ValueError:\n    print("خطأ: يرجى إدخال رقم صحيح صالح فقط!")\nfinally:\n    print("تم الانتهاء من عملية التحقق.")\n\`\`\`\n\n#### 2. قراءة وكتابة الملفات (File Input/Output)\nتيح لك بايثون التفاعل مع نظام الملفات لقراءة وتخزين البيانات. الطريقة الأكثر أماناً لفتح الملفات هي استخدام مدير السياق (Context Manager) عبر الكلمة المفتاحية \`with\`، حيث تضمن هذه الطريقة إغلاق الملف تلقائياً بعد انتهاء العملية حتى لو حدث خطأ:\n- **كتابة بيانات في ملف**:\n  \`\`\`python\n  with open("fahem_notes.txt", "w", encoding="utf-8") as file:\n      file.write("أهلاً بك في رفيق المذاكرة الذكي فهم!\\nبايثون لغة رائعة وسهلة الاستخدام.")\n  \`\`\`\n- **قراءة بيانات من ملف**:\n  \`\`\`python\n  with open("fahem_notes.txt", "r", encoding="utf-8") as file:\n      content = file.read()\n      print("محتوى الملف المقروء:\\n", content)\n  \`\`\``;
                  formulas = ["Context Manager Syntax: with open(filename, mode) as file_var:", "Exception Block Structure: try \\rightarrow except \\rightarrow else \\rightarrow finally"];
                  tips = "احرص دائماً على تحديد ترميز utf-8 عند فتح الملفات النصية لقراءة أو كتابة النصوص العربية بشكل صحيح وخالٍ من الرموز العشوائية.";
                }
              } else {
                // Generic Fallback
                if (lang === "ar") {
                  pageContent = `هذه هي الصفحة رقم ${i} من الكتاب المفتوح: "${bookTitle}".\nلقد تم استيراد هذا الكتاب الدراسي وهو الآن جاهز تماماً للدراسة والتحليل بواسطة أنظمة الفهم المتكاملة.\nمحتوى مخصص للتعلم:\n- في هذا الجزء سنقوم بشرح وتفسير الجوانب المختلفة لكتاب ${bookTitle}.\n- استخدم رفيق المحادثة الذكي للاستفسار والتعمق في أي فكرة غامضة أو صعبة.`;
                  formulas = [`مستوى التقدم: ص = ${i} / 5`];
                  tips = "اسأل المساعد 'اشرح لي محتوى هذه الصفحة ببساطة'";
                } else {
                  pageContent = `This is Page ${i} of the imported textbook: "${bookTitle}".\nThis content is dynamically synthesized and optimized to serve as high-grounding reading material for your course.\nCore study guide insights:\n- Analyze the structure and key highlights of ${bookTitle} on this page.\n- Use the companion chat panel on the right side to ask questions, solve challenges, or translate terminology.`;
                  formulas = [`Syllabus Progress: P = ${i} / 5`];
                  tips = "Ask the companion chat 'Give me a 3-bullet summary of Page " + i + "'";
                }
              }

              generatedPages.push({
                _id: `page_${resolvedBookId}_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                book_id: resolvedBookId,
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
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      });
    }

    // Proxy to Cloud Run Agent
    const proxyRes = await proxyRequest(`/user/books/pages?book_id=${bookId}`, "GET");
    const proxyData = await proxyRes.json();
    return new Response(JSON.stringify(proxyData), {
      status: proxyRes.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  }
}
