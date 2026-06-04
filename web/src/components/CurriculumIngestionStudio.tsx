import React, { useState, useEffect, useRef } from "react";
import { storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  FiBookOpen,
  FiPlus,
  FiRefreshCw,
  FiZap,
  FiList,
  FiTrash2,
  FiSearch,
  FiCpu,
  FiClock,
  FiHardDrive,
  FiActivity,
  FiGlobe,
  FiGrid,
  FiLayers,
  FiCheck,
  FiDownloadCloud,
  FiTerminal,
  FiPlay,
  FiPause,
  FiXCircle,
  FiCheckCircle,
  FiAlertCircle,
  FiSliders,
  FiChevronRight,
  FiChevronDown,
  FiFolder,
  FiFileText,
  FiInfo,
  FiEdit,
  FiSettings
} from "react-icons/fi";

interface Subject {
  _id: string;
  name: string;
  name_ar: string;
  grade_level: string;
  category: string;
  icon_emoji: string;
  books_count?: number;
}

interface ChapterSegment {
  id?: string;
  title: string;
  title_ar: string;
  page_start: number;
  page_end: number;
  concepts: string[];
}

interface QueueJob {
  id: string;
  fileName: string;
  bookTitle: string;
  bookTitleAr: string;
  subjectName: string;
  status: "idle" | "processing" | "completed" | "paused" | "failed" | "queued" | "downloading" | "pending_approval";
  progress: number; // 0 to 100
  totalPages: number;
  processedPages: number;
  speed: number; // pages/sec
  eta: number; // seconds
  startTime: number;
  isLocalSessionJob?: boolean;
  logs?: string[];
}

const studioTranslations: Record<string, Record<string, string>> = {
  en: {
    studio_title: "Curriculum Ingestion Studio",
    active_agent: "1. Student Tutor Agent Cluster (Active & Protected)",
    ingest_pipeline: "2. Ingestion Pipeline (GCP Cloud Run Job)",
    telemetry_console: "Cloud Run Async Jobs Telemetry Console",
    active_executing: "ACTIVE EXECUTING",
    queue_empty: "QUEUE EMPTY",
    current_processing: "CURRENT PROCESSING BOOK",
    ingestion_velocity: "INGESTION VELOCITY",
    pages_sec: "pages/sec",
    eta_label: "ESTIMATED TIME OF ARRIVAL (ETA)",
    seconds_left: "seconds left",
    queue_remaining: "QUEUE REMAINING ITEMS",
    books_pending: "books pending",
    analyzing_page: "Analyzing: page {processed} of {total}",
    all_completed: "All asynchronous processing jobs completed!",
    queue_idle_desc: "The queue is currently idle. Ingest a new textbook to kick off a Cloud Run index process.",
    queue_idle_desc_super: "The queue is currently idle. Ingest a new textbook or use the crawler below to kick off a Cloud Run index process.",
    step1: "1. Download & Lock",
    step2: "2. OCR & PDF Parse",
    step3: "3. Semantic Embeds",
    step4: "4. Index Sync",
    completed: "COMPLETED",
    processing: "PROCESSING",
    pending: "PENDING",
    task_schedule: "Ingestion Cluster Task Schedule",
    refresh: "Refresh",
    job_id: "Job ID",
    file_name: "File Name",
    book_title: "Book Title",
    subject_name: "Subject Name",
    status_label: "Status",
    terminate_job: "Terminate Job",
    crawler_title: "Curriculum Crawler & Web Exploration Studio",
    crawler_desc: "Discover dynamic textbook references directly from portal links. Crawl catalogs, auto-detect chapter segments, and feed them into the ingestion workflow with one click.",
    spider_params: "Spider Parameters Configuration",
    target_portal: "Target School / Portal Domain",
    crawler_info: "Crawler set to Max Depth (3) and PDF-Only filter by default to accurately index direct textbook files.",
    crawl_progress_label: "Crawl & Extraction Progress:",
    crawling_nodes: "Crawling educational nodes...",
    crawl_explore: "Crawl & Explore Library",
    crawler_idle: "Crawler idle. Configure and launch a crawl.",
    crawler_dashboard_title: "Curriculum Exploration Dashboard & Directory Explorer",
    total_discovered: "Total Discovered",
    core_textbooks: "Core Textbooks",
    student_supports: "Student Supports",
    instructor_resources: "Instructor Resources",
    subject_added_success: "🏆 Subject added and propagated successfully!",
    subject_updated_success: "🏆 Subject updated successfully!",
    confirm_delete_subject: "Are you sure you want to delete this subject and all associated textbooks?",
    book_updated_success: "📚 Book updated successfully!",
    confirm_delete_book: "Are you sure you want to delete this book?",
    book_exists_error: "⚠️ This book already exists in the system.",
    book_registered_error: "⚠️ Textbook is already registered!",
    ingest_success: "🎉 Successfully started ingestion for {title}!",
    tab_subjects: "📂 Subjects Console",
    tab_books: "📚 Textbook Catalog",
    tab_ingest: "✍️ Manual Ingester",
    tab_lists: "⚙️ Configuration Lists",
    studio_desc: "Decoupled asynchronous processing pipelines powered by independent GCP Cloud Run Jobs to ingest and index textbook context without disrupting student-facing agent swarms.",
    active_agent_desc: "Stateless container app dedicated exclusively to ultra-fast student chats and real-time agent responses. Fully isolated from heavy CPU-bound parsing operations.",
    ingest_pipeline_desc: "On-demand containerized batch tasks triggered asynchronously to perform intensive OCR, multi-page chunking, vector generation, and Atlas index publishing.",
    book_draft_saved: "📚 Book metadata committed. Processing task pushed to Cloud Run Job queue!",
    import_bulk_success: "🎉 Successfully registered and scheduled {importedCount} textbooks for async indexing! Skipped {skippedCount} duplicates.",
    import_bulk_error: "⚠️ Import completed with errors. Succeeded: {importedCount}, Failed: {failedCount}, Skipped duplicates: {skippedCount}. Check terminal logs.",
    import_all_success: "🎉 Successfully registered and scheduled all {importedCount} discovered textbooks for async indexing! Skipped {skippedCount} duplicates.",
    import_all_error: "⚠️ Import completed with errors. Succeeded: {importedCount}, Failed: {failedCount}, Skipped duplicates: {skippedCount}. Check terminal logs.",
    bulk_delete_confirm: "Are you sure you want to permanently delete the {count} selected books?",
    bulk_delete_success: "🎉 Successfully deleted {count} textbooks!",
    bulk_delete_error: "⚠️ Bulk delete completed with errors. Succeeded: {successCount}, Failed: {failCount}",
    bulk_reindex_success: "🎉 Successfully enqueued {count} books for real-time re-indexing!",
    bulk_reindex_error: "⚠️ Bulk re-indexing finished with errors. Success: {queuedCount}, Failed: {failedCount}.",
    completed_status: "COMPLETED",
    processing_status: "PROCESSING",
    pending_status: "PENDING",
    crawled_subject_distribution: "Crawled Subject Distribution Metrics",
    select_all_discovered: "Select All Discovered",
    selected_resources_count: "Selected: {selectedCount} of {totalDiscovered} resources",
    importing_selected_status: "Importing Selected to Cluster...",
    import_selected_btn: "Bulk Ingest Selected ({selectedCount} Books)",
    importing_all_status: "Importing All Explored...",
    import_all_btn: "Import All Explored",
    progress_label: "Progress",
    action_label: "Action",
    files_count: "files",
    select_folder: "Select Subject Folder",
    type_core_book: "Core Book",
    type_student_support: "Student Support",
    type_instructor_support: "Instructor Support",
    configure_import_manually: "Configure & Import Manually",
    direct_ingest_single: "Direct Ingest Single Textbook",
    active_subjects_catalog: "Active Curriculum Subjects Catalog",
    no_subjects_loaded: "No subjects loaded in directory.",
    edit_textbook_title: "Edit Textbook Title",
    cancel_book_edit: "Cancel Edit",
    book_title_en: "Book Title (EN)",
    book_title_ar: "Book Title (AR)",
    commit_textbook_changes: "Commit Textbook Changes",
    active_textbook_repository: "Active Textbook Repository",
    no_books_active: "No textbooks active in catalog.",
    select_all: "Select All",
    clear_all: "Clear All",
    selected_count_label: "{count} selected",
    bulk_reindex: "Bulk Re-index",
    bulk_delete: "Bulk Delete",
    books_count_badge: "{count} books",
    edit_subject: "Edit Subject Details",
    cancel_edit: "Cancel Edit",
    subj_name_en: "Subject Name (EN)",
    subj_name_ar: "Subject Name (AR)",
    grade_level: "Grade Level",
    category: "Category",
    selected_icon: "Selected",
    save_changes: "Save Changes",
    add_new_subject: "Add New Subject Profile",
    create_subject: "Create Subject"
  },
  ar: {
    studio_title: "أستوديو المناهج",
    active_agent: "1. خادم وكيل تدريس الطلاب (نشط ومحمي)",
    ingest_pipeline: "2. مشغل معالجة المناهج (GCP Cloud Run Job)",
    telemetry_console: "مراقب قنوات الاستيراد غير المتزامنة",
    active_executing: "جاري المعالجة نشط",
    queue_empty: "الانتظار فارغ",
    current_processing: "الكتاب الجاري معالجته",
    ingestion_velocity: "سرعة الاستيراد والـ OCR",
    pages_sec: "صفحات / ثانية",
    eta_label: "الوقت التقديري المتبقي",
    seconds_left: "ثواني متبقية",
    queue_remaining: "المهام المتبقية في قائمة الانتظار",
    books_pending: "كتب قيد الانتظار",
    analyzing_page: "تحليل ونمذجة المستند: صفحة {processed} من أصل {total}",
    all_completed: "كل المهام غير المتزامنة منتهية بالكامل!",
    queue_idle_desc: "قائمة الانتظار فارغة حالياً. أضف كتاباً دراسياً جديداً لبدء مهمة معالجة متجهات ذكية.",
    queue_idle_desc_super: "قائمة الانتظار فارغة حالياً. أضف كتاباً دراسياً جديداً أو استخدم أداة الزحف بالأسفل لبدء مهمة معالجة متجهات ذكية.",
    step1: "استيراد والتحقق",
    step2: "المسح والـ OCR الذكي",
    step3: "التقطيع وتوليد المتجهات",
    step4: "مزامنة الفهرس",
    completed: "منتهي",
    processing: "قيد العمل",
    pending: "قيد الانتظار",
    task_schedule: "سجل وجدول مهام الاستيراد المعلقة",
    refresh: "تحديث",
    job_id: "رقم المهمة",
    file_name: "المستند",
    book_title: "عنوان الكتاب",
    subject_name: "المادة الدراسية",
    status_label: "الحالة",
    terminate_job: "إنهاء المهمة",
    crawler_title: "أداة الاستكشاف والزحف الإلكتروني للكتب",
    crawler_desc: "أدخل رابط بوابة المناهج التعليمية أو مكتبة المدرسة الرقمية لاستكشاف الكتب وملفات الـ PDF آلياً واستخلاص هيكلية الفصول منها لتجهيزها للاستيراد بلمسة واحدة.",
    spider_params: "عوامل زحف الشبكة",
    target_portal: "رابط البوابة المستهدفة",
    crawler_info: "تم تهيئة الزحف آلياً بالعمق الأقصى (3) وتصفية ملفات الـ PDF المباشرة للوصول الدقيق للمناهج.",
    crawl_progress_label: "تقدم الزحف والاستخلاص:",
    crawling_nodes: "جاري استكشاف الموقع...",
    crawl_explore: "ابدأ الزحف والاستكشاف آلياً",
    crawler_idle: "بوابة الزحف جاهزة للاستكشاف",
    crawler_dashboard_title: "لوحة استكشاف المناهج ومتصفح المجلدات الذكي",
    total_discovered: "إجمالي الملفات",
    core_textbooks: "الكتب المنهجية الأساسية",
    student_supports: "مساعدات الطالب",
    instructor_resources: "مصادر المعلم",
    subject_added_success: "🏆 تم إضافة المادة الدراسية الجديدة بنجاح!",
    subject_updated_success: "🏆 تم تعديل المادة الدراسية بنجاح!",
    confirm_delete_subject: "هل أنت متأكد من حذف هذه المادة وجميع الكتب المرتبطة بها؟",
    book_updated_success: "📚 تم تعديل معلومات الكتاب بنجاح!",
    confirm_delete_book: "هل أنت متأكد من حذف هذا الكتاب؟",
    book_exists_error: "⚠️ هذا الكتاب موجود بالفعل في النظام.",
    book_registered_error: "⚠️ الكتاب مسجل مسبقاً!",
    ingest_success: "🎉 تم بدء استيراد \"{title}\" بنجاح!",
    tab_subjects: "📂 إدارة المواد الدراسية",
    tab_books: "📚 كتالوج الكتب المنهجية",
    tab_ingest: "✍️ استيراد يدوي",
    tab_lists: "⚙️ تهيئة القوائم",
    studio_desc: "قنوات معالجة غير متزامنة تماماً مدعومة بـ GCP Cloud Run لتهيئة المناهج واستخلاص الأفكار وتحويلها لمصادر معرفية دون التأثير على وكلاء التدريس النشطين.",
    active_agent_desc: "خوادم stateless مخصصة للردود اللحظية والتفاعل المباشر للطلبة في الفصول الافتراضية. معزولة بالكامل عن العمليات الرياضية وحساب المتجهات الثقيلة.",
    ingest_pipeline_desc: "حاويات مهام (Jobs) تدور عند الطلب لاستخلاص النصوص بالـ OCR وتوليد المتجهات (Embeddings) وحفظها بقاعدة MongoDB Atlas. معزولة حاسوبياً.",
    book_draft_saved: "📚 تم حفظ مسودة الكتاب بنجاح وإرسال مهمة المعالجة اللامركزية!",
    import_bulk_success: "🎉 تم استيراد وتفعيل قائمة المعالجة لعدد {importedCount} كتب بنجاح! تم تخطي {skippedCount} مكرر.",
    import_bulk_error: "⚠️ اكتمل الاستيراد مع وجود أخطاء. الناجح: {importedCount}، الفاشل: {failedCount}، المكرر المتخطى: {skippedCount}. تفحص السجلات.",
    import_all_success: "🎉 تم استيراد وتفعيل قائمة المعالجة لجميع الكتب ({importedCount} كتاب) بنجاح! تم تخطي {skippedCount} مكرر.",
    import_all_error: "⚠️ اكتمل استيراد جميع الكتب مع وجود أخطاء. الناجح: {importedCount}، الفاشل: {failedCount}، المكرر المتخطى: {skippedCount}. تفحص السجلات.",
    bulk_delete_confirm: "هل أنت متأكد من حذف {count} من الكتب المحددة نهائياً؟",
    bulk_delete_success: "🎉 تم حذف عدد {count} كتب بنجاح!",
    bulk_delete_error: "⚠️ اكتمل الحذف الجماعي مع أخطاء. ناجح: {successCount}، فاشل: {failCount}",
    bulk_reindex_success: "🎉 تم إرسال {count} كتب لجدولة إعادة الفهرسة بنجاح!",
    bulk_reindex_error: "⚠️ اكتملت إعادة الفهرسة مع وجود أخطاء. الناجح: {queuedCount}، الفاشل: {failedCount}.",
    completed_status: "منتهي",
    processing_status: "قيد العمل",
    pending_status: "قيد الانتظار",
    crawled_subject_distribution: "توزيع المواد الأكاديمية المستكشفة",
    select_all_discovered: "تحديد الكل المستكشفة",
    selected_resources_count: "تم تحديد {selectedCount} من أصل {totalDiscovered} من المصادر والكتب",
    importing_selected_status: "جاري استيراد الحزمة المحددة...",
    import_selected_btn: "استيراد الحزمة المحددة لـ {selectedCount} كتب",
    importing_all_status: "جاري استيراد الكل...",
    import_all_btn: "استيراد جميع المناهج المستكشفة",
    progress_label: "التقدم",
    action_label: "التحكم",
    files_count: "ملفات",
    select_folder: "تحديد مجلد المادة",
    type_core_book: "كتاب أساسي",
    type_student_support: "مساعد الطالب",
    type_instructor_support: "مصدر المعلم",
    configure_import_manually: "التهيئة والاستيراد يدوياً",
    direct_ingest_single: "استيراد هذا الكتاب فوراً",
    active_subjects_catalog: "كتالوج المواد الدراسية النشطة",
    no_subjects_loaded: "لم يتم تحميل أي مواد في الدليل.",
    edit_textbook_title: "تعديل عنوان الكتاب",
    cancel_book_edit: "إلغاء التعديل",
    book_title_en: "عنوان الكتاب (إنجليزي)",
    book_title_ar: "عنوان الكتاب (عربي)",
    commit_textbook_changes: "حفظ التغييرات على الكتاب",
    active_textbook_repository: "مستودع الكتب الدراسية النشط",
    no_books_active: "لا توجد كتب دراسية نشطة في الكتالوج.",
    select_all: "تحديد الكل",
    clear_all: "إلغاء تحديد الكل",
    selected_count_label: "تم تحديد {count}",
    bulk_reindex: "إعادة فهرسة جماعية",
    bulk_delete: "حذف جماعي",
    books_count_badge: "{count} كتب",
    edit_subject: "تعديل تفاصيل المادة",
    cancel_edit: "إلغاء التعديل",
    subj_name_en: "اسم المادة (إنجليزي)",
    subj_name_ar: "اسم المادة (عربي)",
    grade_level: "الصف الدراسي",
    category: "الفئة",
    selected_icon: "محدد",
    save_changes: "حفظ التغييرات",
    add_new_subject: "إضافة ملف مادة دراسية جديد",
    create_subject: "إنشاء مادة"
  },
  es: {
    studio_title: "Estudio de Ingesta de Currículum",
    active_agent: "1. Clúster de Agentes Tutores (Activo y Protegido)",
    ingest_pipeline: "2. Canalización de Ingesta (GCP Cloud Run Job)",
    telemetry_console: "Consola de Telemetría de Trabajos Asíncronos de Cloud Run",
    active_executing: "PROCESAMIENTO ACTIVO",
    queue_empty: "COLA VACÍA",
    current_processing: "LIBRO EN PROCESO",
    ingestion_velocity: "VELOCIDAD DE INGESTA",
    pages_sec: "págs/seg",
    eta_label: "TIEMPO ESTIMADO DE LLEGADA (ETA)",
    seconds_left: "segundos restantes",
    queue_remaining: "ELEMENTOS RESTANTES EN COLA",
    books_pending: "libros pendientes",
    analyzing_page: "Analizando: página {processed} de {total}",
    all_completed: "¡Todos los trabajos de procesamiento asíncrono completados!",
    queue_idle_desc: "La cola está inactiva. Ingesta un nuevo libro de texto para iniciar el proceso.",
    queue_idle_desc_super: "La cola está inactiva. Ingesta un nuevo libro o usa el rastreador para comenzar.",
    step1: "1. Descargar y Bloquear",
    step2: "2. OCR y Análisis PDF",
    step3: "3. Incrustaciones Semánticas",
    step4: "4. Sincronización del Índice",
    completed: "COMPLETADO",
    processing: "PROCESANDO",
    pending: "PENDIENTE",
    task_schedule: "Programa de Tareas de Ingesta",
    refresh: "Actualizar",
    job_id: "ID del Trabajo",
    file_name: "Nombre del Archivo",
    book_title: "Título del Libro",
    subject_name: "Asignatura",
    status_label: "Estado",
    terminate_job: "Terminar Trabajo",
    crawler_title: "Rastreador de Currículum y Estudio de Exploración Web",
    crawler_desc: "Descubre referencias de libros directamente desde enlaces. Rastrea catálogos y detecta capítulos con un clic.",
    spider_params: "Configuración de Parámetros de Araña",
    target_portal: "Dominio / Portal de la Escuela",
    crawler_info: "Rastreador configurado a profundidad máxima (3) y filtro solo-PDF por defecto.",
    crawl_progress_label: "Progreso de Extracción:",
    crawling_nodes: "Rastreando nodos educativos...",
    crawl_explore: "Rastrear y Explorar Biblioteca",
    crawler_idle: "Rastreador inactivo. Configura y lanza un rastreo.",
    crawler_dashboard_title: "Panel de Exploración del Currículum",
    total_discovered: "Total Descubiertos",
    core_textbooks: "Libros de Texto Clave",
    student_supports: "Soportes para Estudiantes",
    instructor_resources: "Recursos para Instructores",
    subject_added_success: "🏆 ¡Asignatura agregada y propagada con éxito!",
    subject_updated_success: "🏆 ¡Asignatura actualizada con éxito!",
    confirm_delete_subject: "¿Está seguro de que desea eliminar esta asignatura y todos los libros de texto asociados?",
    book_updated_success: "📚 ¡Libro actualizado con éxito!",
    confirm_delete_book: "¿Está seguro de que desea eliminar este libro?",
    book_exists_error: "⚠️ Este libro ya existe en el sistema.",
    book_registered_error: "⚠️ ¡El libro de texto ya está registrado!",
    ingest_success: "🎉 ¡Iniciada con éxito la ingesta para {title}!",
    tab_subjects: "📂 Consola de Asignaturas",
    tab_books: "📚 Catálogo de Libros",
    tab_ingest: "✍️ Ingestor Manual",
    tab_lists: "⚙️ Configurar Listas",
    studio_desc: "Canales de procesamiento asíncronos desacoplados impulsados por GCP Cloud Run Jobs independientes para procesar e indexar el contexto de libros de texto sin interrumpir a los tutores activos.",
    active_agent_desc: "Aplicación de contenedor sin estado dedicada exclusivamente a chats ultra rápidos de estudiantes y respuestas de agentes en tiempo real. Totalmente aislada de operaciones de análisis de CPU pesadas.",
    ingest_pipeline_desc: "Tareas por lotes en contenedores bajo demanda activadas asíncronamente para realizar un OCR intensivo, fragmentación de múltiples páginas, generación de vectores y publicación de índices en Atlas.",
    book_draft_saved: "📚 ¡Metadatos del libro guardados. Tarea de procesamiento enviada a la cola de Cloud Run!",
    import_bulk_success: "🎉 ¡Se han registrado y programado con éxito {importedCount} libros para indexación asíncrona! Se omitieron {skippedCount} duplicados.",
    import_bulk_error: "⚠️ Importación completada con errores. Éxito: {importedCount}, Fallidos: {failedCount}, Duplicados omitidos: {skippedCount}. Revise los registros de terminal.",
    import_all_success: "🎉 ¡Se han registrado y programado con éxito todos los {importedCount} libros de texto descubiertos para indexación asíncrona! Se omitieron {skippedCount} duplicados.",
    import_all_error: "⚠️ Importación completada con errores. Éxito: {importedCount}, Fallidos: {failedCount}, Duplicados omitidos: {skippedCount}. Revise los registros de terminal.",
    bulk_delete_confirm: "¿Está seguro de que desea eliminar permanentemente los {count} libros seleccionados?",
    bulk_delete_success: "🎉 ¡Se eliminaron con éxito {count} libros de texto!",
    bulk_delete_error: "⚠️ Eliminación masiva completada con errores. Exitosos: {successCount}, Fallidos: {failCount}",
    bulk_reindex_success: "🎉 ¡Se han encolado con éxito {count} libros para la reindexación en tiempo real!",
    bulk_reindex_error: "⚠️ La reindexación masiva finalizó con errores. Éxito: {queuedCount}, Fallidos: {failedCount}.",
    completed_status: "COMPLETADO",
    processing_status: "EN PROCESO",
    pending_status: "PENDIENTE",
    crawled_subject_distribution: "Métricas de Distribución de Materias Exploradas",
    select_all_discovered: "Seleccionar todo lo descubierto",
    selected_resources_count: "Seleccionado: {selectedCount} de {totalDiscovered} recursos",
    importing_selected_status: "Importando selección al clúster...",
    import_selected_btn: "Ingesta masiva seleccionada ({selectedCount} libros)",
    importing_all_status: "Importando todo lo explorado...",
    import_all_btn: "Importar todo lo explorado",
    progress_label: "Progreso",
    action_label: "Acción",
    files_count: "archivos",
    select_folder: "Seleccionar carpeta de asignaturas",
    type_core_book: "Libro clave",
    type_student_support: "Soporte para estudiantes",
    type_instructor_support: "Recursos para instructores",
    configure_import_manually: "Configurar e importar manualmente",
    direct_ingest_single: "Ingesta directa de libro único",
    active_subjects_catalog: "Catálogo de Asignaturas de Currículum Activas",
    no_subjects_loaded: "No hay asignaturas cargadas en el directorio.",
    edit_textbook_title: "Editar título del libro de texto",
    cancel_book_edit: "Cancelar edición",
    book_title_en: "Título del libro (EN)",
    book_title_ar: "Título del libro (AR)",
    commit_textbook_changes: "Confirmar cambios del libro de texto",
    active_textbook_repository: "Repositorio de Libros de Texto Activos",
    no_books_active: "No hay libros de texto activos en el catálogo.",
    select_all: "Seleccionar todo",
    clear_all: "Limpiar todo",
    selected_count_label: "{count} seleccionados",
    bulk_reindex: "Reindexación masiva",
    bulk_delete: "Eliminación masiva",
    books_count_badge: "{count} libros",
    edit_subject: "Editar detalles de la asignatura",
    cancel_edit: "Cancelar edición",
    subj_name_en: "Nombre de la asignatura (EN)",
    subj_name_ar: "Nombre de la asignatura (AR)",
    grade_level: "Nivel de grado",
    category: "Categoría",
    selected_icon: "Seleccionado",
    save_changes: "Guardar cambios",
    add_new_subject: "Agregar nuevo perfil de asignatura",
    create_subject: "Crear asignatura"
  },
  fr: {
    studio_title: "Studio d'Ingestion de Programmes",
    active_agent: "1. Cluster d'Agents Tuteurs (Actif et Protégé)",
    ingest_pipeline: "2. Pipeline d'Ingestion (GCP Cloud Run Job)",
    telemetry_console: "Console de Télémétrie des Tâches Asynchrones de Cloud Run",
    active_executing: "TRAITEMENT ACTIF",
    queue_empty: "FILE D'ATTENTE VIDE",
    current_processing: "LIVRE EN COURS DE TRAITEMENT",
    ingestion_velocity: "VITESSE D'INGESTION",
    pages_sec: "pages/sec",
    eta_label: "TEMPS ESTIMÉ D'ARRIVÉE (ETA)",
    seconds_left: "secondes restantes",
    queue_remaining: "ÉLÉMENTS RESTANTS DANS LA FILE",
    books_pending: "livres en attente",
    analyzing_page: "Analyse : page {processed} de {total}",
    all_completed: "Toutes les tâches de traitement asynchrones sont terminées !",
    queue_idle_desc: "La file d'attente est inactive. Ingestez un nouveau manuel pour démarrer.",
    queue_idle_desc_super: "La file d'attente est inactive. Ingestez un manuel ou utilisez le robot.",
    step1: "1. Télécharger & Verrouiller",
    step2: "2. OCR & Analyse PDF",
    step3: "3. Embeddings Sémantiques",
    step4: "4. Synchro de l'Index",
    completed: "TERMINÉ",
    processing: "EN COURS",
    pending: "EN ATTENTE",
    task_schedule: "Calendrier des Tâches d'Ingestion",
    refresh: "Actualiser",
    job_id: "ID de la tâche",
    file_name: "Nom du fichier",
    book_title: "Titre du livre",
    subject_name: "Matière",
    status_label: "Statut",
    terminate_job: "Terminer la tâche",
    crawler_title: "Robot d'Exploration & Studio de Recherche Web",
    crawler_desc: "Découvrez des manuels à partir de liens de portail. Explorez des catalogues et détectez des chapitres en un clic.",
    spider_params: "Configuration des Paramètres du Robot",
    target_portal: "Portail / Domaine de l'École",
    crawler_info: "Robot réglé sur profondeur max (3) et filtre PDF uniquement par défaut.",
    crawl_progress_label: "Progression de l'Extraction :",
    crawling_nodes: "Exploration des nœuds éducatifs...",
    crawl_explore: "Explorer la bibliothèque",
    crawler_idle: "Robot inactif. Configurez et lancez une exploration.",
    crawler_dashboard_title: "Tableau d'Exploration du Programme",
    total_discovered: "Total Découvert",
    core_textbooks: "Manuels de Base",
    student_supports: "Supports Élèves",
    instructor_resources: "Ressources Enseignants",
    subject_added_success: "🏆 Matière ajoutée et propagée avec succès !",
    subject_updated_success: "🏆 Matière mise à jour avec succès !",
    confirm_delete_subject: "Êtes-vous sûr de vouloir supprimer cette matière et tous les manuels associés ?",
    book_updated_success: "📚 Livre mis à jour avec succès !",
    confirm_delete_book: "Êtes-vous sûr de vouloir supprimer ce livre ?",
    book_exists_error: "⚠️ Ce livre existe déjà dans le système.",
    book_registered_error: "⚠️ Le manuel est déjà enregistré !",
    ingest_success: "🎉 Ingestion commencée avec succès pour {title} !",
    tab_subjects: "📂 Console des Matières",
    tab_books: "📚 Catalogue des Manuels",
    tab_ingest: "✍️ Ingestion Manuelle",
    tab_lists: "⚙️ Configurer Listes",
    studio_desc: "Pipelines de traitement asynchrones découplés alimentés par des tâches indépendantes GCP Cloud Run pour ingérer et indexer le contexte des manuels sans perturber les agents de tutorat actifs.",
    active_agent_desc: "Application de conteneur sans état dédiée exclusivement aux discussions ultra-rapides des étudiants et aux réponses des agents en temps réel. Entièrement isolée des opérations d'analyse CPU lourdes.",
    ingest_pipeline_desc: "Tâches par lots conteneurisées à la demande déclenchées de manière asynchrone pour effectuer un OCR intensif, un découpage multipage, la génération de vecteurs et la publication d'index Atlas.",
    book_draft_saved: "📚 Métadonnées du manuel enregistrées. Tâche de traitement poussée vers la file d'attente de Cloud Run !",
    import_bulk_success: "🎉 Enregistrement et planification réussis de {importedCount} manuels pour l'indexation asynchrone ! {skippedCount} doublons ignorés.",
    import_bulk_error: "⚠️ Importation terminée avec des erreurs. Réussis : {importedCount}, Échoués : {failedCount}, Doublons ignorés : {skippedCount}. Vérifiez les journaux du terminal.",
    import_all_success: "🎉 Enregistrement et planification réussis de l'ensemble des {importedCount} manuels découverts pour l'indexation asynchrone ! {skippedCount} doublons ignorés.",
    import_all_error: "⚠️ Importation terminée avec des erreurs. Réussis : {importedCount}, Échoués : {failedCount}, Doublons ignorés : {skippedCount}. Vérifiez les journaux du terminal.",
    bulk_delete_confirm: "Êtes-vous sûr de vouloir supprimer définitivement les {count} manuels sélectionnés ?",
    bulk_delete_success: "🎉 Suppression réussie de {count} manuels !",
    bulk_delete_error: "⚠️ Suppression groupée terminée avec des erreurs. Réussis : {successCount}, Échoués : {failCount}",
    bulk_reindex_success: "🎉 Mise en file d'attente réussie de {count} livres pour réindexation en temps réel !",
    bulk_reindex_error: "⚠️ Réindexation groupée terminée avec des erreurs. Réussis : {queuedCount}, Échoués : {failedCount}.",
    completed_status: "COMPLÉTÉ",
    processing_status: "EN COURS",
    pending_status: "EN ATTENTE",
    crawled_subject_distribution: "Mesures de répartition des matières explorées",
    select_all_discovered: "Sélectionner tout ce qui a été découvert",
    selected_resources_count: "Sélectionné : {selectedCount} de {totalDiscovered} ressources",
    importing_selected_status: "Importation de la sélection dans le cluster...",
    import_selected_btn: "Ingestions groupées sélectionnées ({selectedCount} livres)",
    importing_all_status: "Importation de tout ce qui a été exploré...",
    import_all_btn: "Importer tout ce qui a été exploré",
    progress_label: "Progression",
    action_label: "Action",
    files_count: "fichiers",
    select_folder: "Sélectionner le dossier de la matière",
    type_core_book: "Livre de base",
    type_student_support: "Support élève",
    type_instructor_support: "Ressource enseignant",
    configure_import_manually: "Configurer et importer manuellement",
    direct_ingest_single: "Ingestion directe de livre unique",
    active_subjects_catalog: "Catalogue des Matières Actives",
    no_subjects_loaded: "Aucune matière chargée dans le répertoire.",
    edit_textbook_title: "Modifier le titre du manuel",
    cancel_book_edit: "Annuler la modification",
    book_title_en: "Titre du manuel (EN)",
    book_title_ar: "Titre du manuel (AR)",
    commit_textbook_changes: "Valider les modifications du manuel",
    active_textbook_repository: "Répertoire des Manuels Actifs",
    no_books_active: "Aucun manuel actif dans le catalogue.",
    select_all: "Tout sélectionner",
    clear_all: "Tout effacer",
    selected_count_label: "{count} sélectionnés",
    bulk_reindex: "Réindexation groupée",
    bulk_delete: "Suppression groupée",
    books_count_badge: "{count} manuels",
    edit_subject: "Modifier les détails de la matière",
    cancel_edit: "Annuler la modification",
    subj_name_en: "Nom de la matière (EN)",
    subj_name_ar: "Nom de la matière (AR)",
    grade_level: "Niveau scolaire",
    category: "Catégorie",
    selected_icon: "Sélectionné",
    save_changes: "Enregistrer les modifications",
    add_new_subject: "Ajouter un nouveau profil de matière",
    create_subject: "Créer la matière"
  },
  de: {
    studio_title: "Lehrplan-Ingestionsstudio",
    active_agent: "1. Tutoren-Agenten-Cluster (Aktiv & Geschützt)",
    ingest_pipeline: "2. Ingestions-Pipeline (GCP Cloud Run Job)",
    telemetry_console: "Cloud Run Async Jobs Telemetrie-Konsole",
    active_executing: "AKTIVE VERARBEITUNG",
    queue_empty: "WARTESCHLANGE LEER",
    current_processing: "AKTUELL VERARBEITETES BUCH",
    ingestion_velocity: "INGESTIONS-GESCHWINDIGKEIT",
    pages_sec: "Seiten/Sek",
    eta_label: "VORAUSSICHTLICHE ANKUNFTSZEIT (ETA)",
    seconds_left: "Sekunden übrig",
    queue_remaining: "VERBLEIBENDE BUCH-ELEMENTE",
    books_pending: "Bücher warten",
    analyzing_page: "Analyse: Seite {processed} von {total}",
    all_completed: "Alle asynchronen Verarbeitungsprozesse erfolgreich abgeschlossen!",
    queue_idle_desc: "Die Warteschlange ist leer. Fügen Sie ein neues Lehrbuch hinzu, um den Prozess zu starten.",
    queue_idle_desc_super: "Die Warteschlange ist leer. Neues Lehrbuch hinzufügen oder Crawler starten.",
    step1: "1. Herunterladen & Sperren",
    step2: "2. OCR & PDF-Analyse",
    step3: "3. Semantische Einbettungen",
    step4: "4. Index-Synchronisierung",
    completed: "FERTIGGESTELLT",
    processing: "IN ARBEIT",
    pending: "WARTEND",
    task_schedule: "Zeitplan der Ingestionsaufgaben",
    refresh: "Aktualisieren",
    job_id: "Job-ID",
    file_name: "Dateiname",
    book_title: "Buchtitel",
    subject_name: "Fach",
    status_label: "Status",
    terminate_job: "Job beenden",
    crawler_title: "Lehrplan-Crawler & Web-Explorationsstudio",
    crawler_desc: "Entdecken Sie Lehrbücher direkt aus Portal-Links. Durchsuchen Sie Kataloge und erkennen Sie Kapitel mit einem Klick.",
    spider_params: "Konfiguration der Crawler-Parameter",
    target_portal: "Schul-Portal / Domain",
    crawler_info: "Crawler standardmäßig auf maximale Tiefe (3) und Nur-PDF-Filter eingestellt.",
    crawl_progress_label: "Fortschritt des Crawls:",
    crawling_nodes: "Durchsuche Bildungsknoten...",
    crawl_explore: "Bibliothek durchsuchen",
    crawler_idle: "Crawler im Leerlauf. Konfigurieren und starten Sie den Crawler.",
    crawler_dashboard_title: "Lehrplan-Erkundungsdashboard",
    total_discovered: "Insgesamt entdeckt",
    core_textbooks: "Kern-Lehrbücher",
    student_supports: "Schüler-Unterstützung",
    instructor_resources: "Lehrer-Ressourcen",
    subject_added_success: "🏆 Fach erfolgreich hinzugefügt und verbreitet!",
    subject_updated_success: "🏆 Fach erfolgreich aktualisiert!",
    confirm_delete_subject: "Sind Sie sicher, dass Sie dieses Fach und alle zugehörigen Lehrbücher löschen möchten?",
    book_updated_success: "📚 Buch erfolgreich aktualisiert!",
    confirm_delete_book: "Sind Sie sicher, dass Sie dieses Buch löschen möchten?",
    book_exists_error: "⚠️ Dieses Buch existiert bereits im System.",
    book_registered_error: "⚠️ Lehrbuch ist bereits registriert!",
    ingest_success: "🎉 Ingestion für {title} erfolgreich gestartet!",
    tab_subjects: "📂 Fach-Konsole",
    tab_books: "📚 Lehrbuch-Katalog",
    tab_ingest: "✍️ Manuelles Ingestionsstudio",
    tab_lists: "⚙️ Listen konfigurieren",
    studio_desc: "Entkoppelte asynchrone Verarbeitungs-Pipelines, angetrieben von unabhängigen GCP Cloud Run-Jobs, um Lehrbuchkontexte aufzunehmen und zu indexieren, ohne den aktiven Tutor-Betrieb zu stören.",
    active_agent_desc: "Zustandslose Container-App, die ausschließlich für ultraschnelle Schüler-Chats und Echtzeit-Antworten der Tutoren reserviert ist. Vollständig isoliert von rechenintensiven CPU-Vorgängen.",
    ingest_pipeline_desc: "On-Demand-Container-Batch-Aufgaben, die asynchron ausgelöst werden, um intensives OCR, mehrseitiges Chunking, Vektorgenerierung und Atlas-Index-Veröffentlichung durchzuführen.",
    book_draft_saved: "📚 Buch-Metadaten gespeichert. Verarbeitungsaufgabe an Cloud Run-Warteschlange übergeben!",
    import_bulk_success: "🎉 {importedCount} Lehrbücher erfolgreich für die asynchrone Indexierung registriert und geplant! {skippedCount} Duplikate übersprungen.",
    import_bulk_error: "⚠️ Import mit Fehlern abgeschlossen. Erfolgreich: {importedCount}, Fehlgeschlagen: {failedCount}, Übersprungene Duplikate: {skippedCount}. Überprüfen Sie die Terminal-Protokolle.",
    import_all_success: "🎉 Alle {importedCount} entdeckten Lehrbücher erfolgreich für die asynchrone Indexierung registriert und geplant! {skippedCount} Duplikate übersprungen.",
    import_all_error: "⚠️ Import mit Fehlern abgeschlossen. Erfolgreich: {importedCount}, Fehlgeschlagen: {failedCount}, Übersprungene Duplikate: {skippedCount}. Überprüfen Sie die Terminal-Protokolle.",
    bulk_delete_confirm: "Sind Sie sicher, dass Sie die {count} ausgewählten Bücher dauerhaft löschen möchten?",
    bulk_delete_success: "🎉 {count} Lehrbücher erfolgreich gelöscht!",
    bulk_delete_error: "⚠️ Massenlöschung mit Fehlern abgeschlossen. Erfolgreich: {successCount}, Fehlgeschlagen: {failCount}",
    bulk_reindex_success: "🎉 {count} Bücher erfolgreich zur Echtzeit-Neuindexierung eingereiht!",
    bulk_reindex_error: "⚠️ Massen-Neuindexierung mit Fehlern abgeschlossen. Erfolgreich: {queuedCount}, Fehlgeschlagen: {failedCount}.",
    completed_status: "ABGESCHLOSSEN",
    processing_status: "IN BEARBEITUNG",
    pending_status: "AUSSTEHEND",
    crawled_subject_distribution: "Verteilungsmetriken für gecrawlte Fächer",
    select_all_discovered: "Alle entdeckten auswählen",
    selected_resources_count: "Ausgewählt: {selectedCount} von {totalDiscovered} Ressourcen",
    importing_selected_status: "Ausgewählte in den Cluster importieren...",
    import_selected_btn: "Ausgewählte massenhaft importieren ({selectedCount} Bücher)",
    importing_all_status: "Alle erkundeten importieren...",
    import_all_btn: "Alle erkundeten importieren",
    progress_label: "Fortschritt",
    action_label: "Aktion",
    files_count: "Dateien",
    select_folder: "Fachordner auswählen",
    type_core_book: "Kern-Lehrbuch",
    type_student_support: "Schüler-Unterstützung",
    type_instructor_support: "Lehrer-Ressourcen",
    configure_import_manually: "Manuell konfigurieren & importieren",
    direct_ingest_single: "Einzelnes Lehrbuch direkt importieren",
    active_subjects_catalog: "Katalog der aktiven Lehrplanfächer",
    no_subjects_loaded: "Keine Fächer im Verzeichnis geladen.",
    edit_textbook_title: "Lehrbuchtitel bearbeiten",
    cancel_book_edit: "Bearbeitung abbrechen",
    book_title_en: "Lehrbuchtitel (EN)",
    book_title_ar: "Lehrbuchtitel (AR)",
    commit_textbook_changes: "Lehrbuchänderungen speichern",
    active_textbook_repository: "Repository für aktive Lehrbücher",
    no_books_active: "Keine aktiven Lehrbücher im Katalog.",
    select_all: "Alle auswählen",
    clear_all: "Auswahl aufheben",
    selected_count_label: "{count} ausgewählt",
    bulk_reindex: "Massen-Neuindexierung",
    bulk_delete: "Massenlöschung",
    books_count_badge: "{count} Bücher",
    edit_subject: "Fachdetails bearbeiten",
    cancel_edit: "Bearbeitung abbrechen",
    subj_name_en: "Fachname (EN)",
    subj_name_ar: "Fachname (AR)",
    grade_level: "Klassenstufe",
    category: "Kategorie",
    selected_icon: "Ausgewählt",
    save_changes: "Änderungen speichern",
    add_new_subject: "Neues Fachprofil hinzufügen",
    create_subject: "Fach erstellen"
  },
  zh: {
    studio_title: "课程导入工作室",
    active_agent: "1. 智能辅导教师代理集群 (活动且安全保护)",
    ingest_pipeline: "2. 导入执行管道 (GCP Cloud Run 任务)",
    telemetry_console: "Cloud Run 异步处理任务遥测控制台",
    active_executing: "正在执行处理",
    queue_empty: "队列为空",
    current_processing: "当前处理的书籍",
    ingestion_velocity: "导入与 OCR 速度",
    pages_sec: "页/秒",
    eta_label: "预计剩余时间 (ETA)",
    seconds_left: "秒剩余",
    queue_remaining: "队列中剩余的书籍",
    books_pending: "本待处理",
    analyzing_page: "解析中：第 {processed} 页，共 {total} 页",
    all_completed: "所有异步处理任务已全部完成！",
    queue_idle_desc: "队列目前空闲。导入一本新教科书以启动处理流程。",
    queue_idle_desc_super: "队列目前空闲。注册一本新书或使用下方的爬虫来启动处理。",
    step1: "1. 下载与锁定",
    step2: "2. OCR 与 PDF 解析",
    step3: "3. 语义向量化嵌入",
    step4: "4. 索引库同步",
    completed: "已完成",
    processing: "处理中",
    pending: "排队中",
    task_schedule: "导入集群任务调度表",
    refresh: "刷新",
    job_id: "任务 ID",
    file_name: "文件名",
    book_title: "书籍标题",
    subject_name: "所属科目",
    status_label: "状态",
    terminate_job: "终止任务",
    crawler_title: "课程爬虫与网页内容发现工作室",
    crawler_desc: "直接从门户网站链接中发现教科书参考资源。一键抓取目录，自动检测章节分段，并送入导入工作流。",
    spider_params: "爬虫网络参数配置",
    target_portal: "目标学校 / 门户网站域名",
    crawler_info: "爬虫默认设置为最大深度 (3)，并自动过滤 PDF 文件以实现精准定位。",
    crawl_progress_label: "爬取与提取进度：",
    crawling_nodes: "正在爬取教育资源节点...",
    crawl_explore: "开始自动爬取与发现",
    crawler_idle: "爬虫空闲。请配置并启动爬虫。",
    crawler_dashboard_title: "课程勘探仪表板与智能目录浏览器",
    total_discovered: "发现资源总数",
    core_textbooks: "核心教科书",
    student_supports: "学生辅助资源",
    instructor_resources: "教师指导资源",
    subject_added_success: "🏆 科目已成功添加并传播！",
    subject_updated_success: "🏆 科目已成功更新！",
    confirm_delete_subject: "您确定要删除此科目及所有关联的教科书吗？",
    book_updated_success: "📚 书籍已成功更新！",
    confirm_delete_book: "您确定要删除这本书吗？",
    book_exists_error: "⚠️ 该书籍已存在于系统中。",
    book_registered_error: "⚠️ 教科书已注册！",
    ingest_success: "🎉 已成功开始为 \"{title}\" 导入数据！",
    tab_subjects: "📂 科目管理控制台",
    tab_books: "📚 课程图书目录",
    tab_ingest: "✍️ 手动导入器",
    tab_lists: "⚙️ 配置选项列表",
    studio_desc: "采用解耦的高效 GCP Cloud Run 异步批处理计算通道，在不干扰在线学生辅导集群的前提下，自动提取、切片并检索教材知识。",
    active_agent_desc: "无状态容器应用，专用于极速学生互动问答与实时辅导，完全隔离重度 CPU 密集型解析和向量计算。",
    ingest_pipeline_desc: "按需启动的容器化批处理任务，异步执行深度 OCR 文本识别、文档多页切片、语义向量生成并发布至 Atlas 索引中。",
    book_draft_saved: "📚 教材元数据已成功提交，解析与向量化任务已推送至 Cloud Run 任务队列！",
    import_bulk_success: "🎉 成功注册并调度 {importedCount} 本教材进行异步向量索引！已跳过 {skippedCount} 本重复教材。",
    import_bulk_error: "⚠️ 批量导入完成但存在错误。成功: {importedCount}，失败: {failedCount}，跳过重复: {skippedCount}。请检查终端日志。",
    import_all_success: "🎉 成功将发现的全部 {importedCount} 本教材注册并调度至异步索引管道！已跳过 {skippedCount} 本重复教材。",
    import_all_error: "⚠️ 批量导入完成但存在错误。成功: {importedCount}，失败: {failedCount}，跳过重复: {skippedCount}。请检查终端日志。",
    bulk_delete_confirm: "您确定要永久删除所选的 {count} 本教材吗？",
    bulk_delete_success: "🎉 成功删除 {count} 本教材！",
    bulk_delete_error: "⚠️ 批量删除完成但存在错误。成功: {successCount}，失败: {failCount}",
    bulk_reindex_success: "🎉 成功将 {count} 本教材加入实时重新索引队列！",
    bulk_reindex_error: "⚠️ 批量重新索引完成但存在部分错误。成功: {queuedCount}，失败: {failedCount}。",
    completed_status: "已完成",
    processing_status: "处理中",
    pending_status: "排队中",
    crawled_subject_distribution: "已爬取学科分布统计指标",
    select_all_discovered: "选择所有已发现的",
    selected_resources_count: "已选择：共 {totalDiscovered} 个资源中的 {selectedCount} 个",
    importing_selected_status: "正在将选中的资源导入集群...",
    import_selected_btn: "批量导入所选资源 ({selectedCount} 本书)",
    importing_all_status: "正在导入所有已发现的资源...",
    import_all_btn: "导入所有已勘探的资源",
    progress_label: "进度",
    action_label: "操作",
    files_count: "文件",
    select_folder: "选择科目文件夹",
    type_core_book: "核心教科书",
    type_student_support: "学生辅助资源",
    type_instructor_support: "教师指导资源",
    configure_import_manually: "手动配置与导入",
    direct_ingest_single: "直接导入单本教材",
    active_subjects_catalog: "启用课程科目目录",
    no_subjects_loaded: "目录中未加载任何科目。",
    edit_textbook_title: "编辑教科书标题",
    cancel_book_edit: "取消编辑",
    book_title_en: "教材标题 (EN)",
    book_title_ar: "教材标题 (AR)",
    commit_textbook_changes: "保存教材修改",
    active_textbook_repository: "活动教材库",
    no_books_active: "目录中没有活动教材。",
    select_all: "全选",
    clear_all: "清除选择",
    selected_count_label: "已选择 {count} 项",
    bulk_reindex: "批量重新索引",
    bulk_delete: "批量删除",
    books_count_badge: "{count} 本教材",
    edit_subject: "编辑科目信息",
    cancel_edit: "取消编辑",
    subj_name_en: "科目名称 (EN)",
    subj_name_ar: "科目名称 (AR)",
    grade_level: "年级水平",
    category: "分类",
    selected_icon: "已选中",
    save_changes: "保存修改",
    add_new_subject: "添加新科目档案",
    create_subject: "创建科目"
  },
  it: {
    studio_title: "Studio di Ingestione dei Programmi",
    active_agent: "1. Cluster Agenti Tutor (Attivo e Protetto)",
    ingest_pipeline: "2. Pipeline di Ingestione (GCP Cloud Run Job)",
    telemetry_console: "Console di Telemetria dei Lavori Asincroni di Cloud Run",
    active_executing: "ELABORAZIONE ATTIVA",
    queue_empty: "CODA VUOTA",
    current_processing: "LIBRO IN CORSO DI ELABORAZIONE",
    ingestion_velocity: "VELOCITÀ DI INGESTIONE",
    pages_sec: "pag/sec",
    eta_label: "TEMPS STIMATO DI ARRIVO (ETA)",
    seconds_left: "secondi rimasti",
    queue_remaining: "ELEMENTI RIMANENTI NELLA CODA",
    books_pending: "libri in attesa",
    analyzing_page: "Analisi: pagina {processed} di {total}",
    all_completed: "Tutti i lavori di elaborazione asincrona completati!",
    queue_idle_desc: "La coda è inattiva. Ingestisci un nuovo libro di testo per iniziare.",
    queue_idle_desc_super: "La coda è inattiva. Ingestisci un libro o usa il crawler per iniziare.",
    step1: "1. Scarica & Blocca",
    step2: "2. OCR & Analisi PDF",
    step3: "3. Embedding Semantici",
    step4: "4. Sincronizzazione dell'Indice",
    completed: "COMPLETATO",
    processing: "IN CORSO",
    pending: "IN ATTESA",
    task_schedule: "Pianificazione dei Lavori di Ingestione",
    refresh: "Aggiorna",
    job_id: "ID Lavoro",
    file_name: "Nome File",
    book_title: "Titolo del Libro",
    subject_name: "Materia",
    status_label: "Stato",
    terminate_job: "Termina Lavoro",
    crawler_title: "Crawler e Studio di Esplorazione Web dei Programmi",
    crawler_desc: "Trova riferimenti di libri dai link di portale. Esplora cataloghi e rileva i capitoli con un clic.",
    spider_params: "Configurazione dei Parametri del Ragno",
    target_portal: "Portale / Dominio della Scuola",
    crawler_info: "Crawler impostato su profondità max (3) e filtro solo-PDF como impostazione predefinita.",
    crawl_progress_label: "Progresso di Extrazione:",
    crawling_nodes: "Esplorando nodi educativi...",
    crawl_explore: "Esplora Biblioteca",
    crawler_idle: "Crawler inattivo. Configura e avvia un'esplorazione.",
    crawler_dashboard_title: "Pannello di Esplorazione del Programma",
    total_discovered: "Totale Rilevato",
    core_textbooks: "Libri di Testo Chiave",
    student_supports: "Supporti per Studenti",
    instructor_resources: "Risorse per Docenti",
    subject_added_success: "🏆 Materia aggiunta e propagata con successo!",
    subject_updated_success: "🏆 Materia aggiornata con successo!",
    confirm_delete_subject: "Sei sicuro di voler eliminare questa materia e tutti i libri di testo associati?",
    book_updated_success: "📚 Libro aggiornato con successo!",
    confirm_delete_book: "Sei sicuro di voler eliminare questo libro?",
    book_exists_error: "⚠️ Questo libro esiste già nel sistema.",
    book_registered_error: "⚠️ Il libro di testo è già registrato!",
    ingest_success: "🎉 Ingestione iniziata con successo per {title}!",
    tab_subjects: "📂 Console delle Materie",
    tab_books: "📚 Catalogo dei Libri",
    tab_ingest: "✍️ Ingestione Manuale",
    tab_lists: "⚙️ Configura Liste",
    studio_desc: "Pipeline di elaborazione asincrone disaccoppiate basate su lavori GCP Cloud Run indipendenti per elaborare e indicizzare il contesto dei libri senza interrompere i tutor attivi.",
    active_agent_desc: "App contenitore senza stato dedicata esclusivamente a chat ultra-rapide degli studenti e risposte degli agenti in tempo reale. Completamente isolata da pesanti operazioni di analisi della CPU.",
    ingest_pipeline_desc: "Attività batch containerizzate su richiesta attivate in modo asincrono per eseguire OCR intensivo, segmentazione multipagina, generazione di vettori e pubblicazione dell'indice su Atlas.",
    book_draft_saved: "📚 Metadati del libro salvati con successo. Attività di elaborazione inviata alla coda di Cloud Run!",
    import_bulk_success: "🎉 Registrati e pianificati con successo {importedCount} libri per l'indicizzazione asincrona! {skippedCount} duplicati ignorati.",
    import_bulk_error: "⚠️ Importazione completata con errori. Succeeded: {importedCount}, Failed: {failedCount}, Duplicati ignorati: {skippedCount}. Controlla i log del terminale.",
    import_all_success: "🎉 Registrati e pianificati con successo tutti i {importedCount} libri scoperti per l'indicizzazione asincrona! {skippedCount} duplicati ignorati.",
    import_all_error: "⚠️ Importazione completata con errori. Succeeded: {importedCount}, Failed: {failedCount}, Duplicati ignorati: {skippedCount}. Controlla i log del terminale.",
    bulk_delete_confirm: "Sei sicuro di voler eliminare definitivamente i {count} libri selezionati?",
    bulk_delete_success: "🎉 Eliminati con successo {count} libri!",
    bulk_delete_error: "⚠️ Cancellazione di massa completata con errori. Succeeded: {successCount}, Failed: {failCount}",
    bulk_reindex_success: "🎉 Enqueued con successo {count} libri per la reindicizzazione in tempo real-time!",
    bulk_reindex_error: "⚠️ Reindicizzazione di massa terminata con errori. Successo: {queuedCount}, Falliti: {failedCount}.",
    completed_status: "COMPLETATO",
    processing_status: "IN CORSO",
    pending_status: "IN ATTESA",
    crawled_subject_distribution: "Metriche di Distribuzione delle Materie Esplorate",
    select_all_discovered: "Seleziona tutti i rilevati",
    selected_resources_count: "Selezionati: {selectedCount} di {totalDiscovered} risorse",
    importing_selected_status: "Importazione dei selezionati nel cluster...",
    import_selected_btn: "Ingestione di massa dei selezionati ({selectedCount} libri)",
    importing_all_status: "Importazione di tutti i rilevati...",
    import_all_btn: "Importa tutti i rilevati",
    progress_label: "Progresso",
    action_label: "Azione",
    files_count: "file",
    select_folder: "Seleziona cartella della materia",
    type_core_book: "Libro di testo chiave",
    type_student_support: "Supporto per studenti",
    type_instructor_support: "Risorsa per docenti",
    configure_import_manually: "Configura e importa manualmente",
    direct_ingest_single: "Ingestione diretta di un singolo libro",
    active_subjects_catalog: "Catalogo delle Materie di Studio Attive",
    no_subjects_loaded: "Nessuna materia caricata nella directory.",
    edit_textbook_title: "Modifica titolo del libro",
    cancel_book_edit: "Annulla modifica",
    book_title_en: "Titolo del libro (EN)",
    book_title_ar: "Titolo del libro (AR)",
    commit_textbook_changes: "Salva modifiche del libro",
    active_textbook_repository: "Archivio dei Libri di Testo Attivi",
    no_books_active: "Nessun libro di testo attivo nel catalogo.",
    select_all: "Seleziona tutto",
    clear_all: "Deseleziona tutto",
    selected_count_label: "{count} selezionati",
    bulk_reindex: "Reindicizzazione di massa",
    bulk_delete: "Cancellazione di massa",
    books_count_badge: "{count} libri",
    edit_subject: "Modifica dettagli materia",
    cancel_edit: "Annulla modifica",
    subj_name_en: "Nome materia (EN)",
    subj_name_ar: "Nome materia (AR)",
    grade_level: "Livello scolastico",
    category: "Categoria",
    selected_icon: "Selezionato",
    save_changes: "Salva modifiche",
    add_new_subject: "Aggiungi nuovo profilo materia",
    create_subject: "Crea materia"
  }
};

export default function CurriculumIngestionStudio({ language, email }: { language: string; email?: string }) {
  const isSuperadmin = email && ["hesham1988@gmail.com", "contact@asdaa.co"].includes(email.toLowerCase().trim());

  const st = (key: string, variables?: Record<string, string>) => {
    let text = studioTranslations[language]?.[key] || studioTranslations["en"]?.[key] || key;
    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    return text;
  };
  // Lists and loading
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [booksList, setBooksList] = useState<any[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  // Dynamic Editable Lists with Default Grade support
  const [gradeLevels, setGradeLevels] = useState<string[]>(["Grade 10", "Grade 11", "Grade 12", "General"]);
  const [categories, setCategories] = useState<string[]>(["Science", "Mathematics", "Languages", "Social Studies"]);
  const [terms, setTerms] = useState<string[]>(["Term 1", "Term 2", "Term 3", "Full Year"]);
  const [languagesList, setLanguagesList] = useState<string[]>(["ar", "en", "fr"]);
  const [defaultGrade, setDefaultGrade] = useState<string>("Grade 11");

  // Inline inputs for appending custom selections
  const [newGradeVal, setNewGradeVal] = useState("");
  const [newCategoryVal, setNewCategoryVal] = useState("");
  const [newTermVal, setNewTermVal] = useState("");
  const [newLangVal, setNewLangVal] = useState("");

  // Tabs for the ROW 3 Management Console
  const [activeTab, setActiveTab] = useState<"subjects" | "books" | "ingest" | "lists">("subjects");

  // Subject Form States
  const [subjName, setSubjName] = useState("");
  const [subjNameAr, setSubjNameAr] = useState("");
  const [subjGrade, setSubjGrade] = useState("Grade 11");
  const [subjCategory, setSubjCategory] = useState("Science");
  const [subjEmoji, setSubjEmoji] = useState("🔬");
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [subjectSuccess, setSubjectSuccess] = useState<string | null>(null);
  const [subjectError, setSubjectError] = useState<string | null>(null);

  // Subject Editing States
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingSubjName, setEditingSubjName] = useState("");
  const [editingSubjNameAr, setEditingSubjNameAr] = useState("");
  const [editingSubjGrade, setEditingSubjGrade] = useState("Grade 11");
  const [editingSubjCategory, setEditingSubjCategory] = useState("Science");
  const [editingSubjEmoji, setEditingSubjEmoji] = useState("🔬");

  // Book Form States
  const [bookSubjId, setBookSubjId] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookTitleAr, setBookTitleAr] = useState("");
  const [bookGrade, setBookGrade] = useState("Grade 11");
  const [bookTerm, setBookTerm] = useState("Term 1");
  const [bookYear, setBookYear] = useState("2026");
  const [bookLang, setBookLang] = useState("ar");
  const [bookType, setBookType] = useState("core");
  const [bookSourceUrl, setBookSourceUrl] = useState("");
  const [bookStoragePath, setBookStoragePath] = useState("");
  const [isAdminUploading, setIsAdminUploading] = useState(false);
  const [pendingChapters, setPendingChapters] = useState<ChapterSegment[]>([]);

  // Book Editing States
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingBookSubjId, setEditingBookSubjId] = useState("");
  const [editingBookTitle, setEditingBookTitle] = useState("");
  const [editingBookTitleAr, setEditingBookTitleAr] = useState("");
  const [editingBookGrade, setEditingBookGrade] = useState("Grade 11");
  const [editingBookTerm, setEditingBookTerm] = useState("Term 1");
  const [editingBookYear, setEditingBookYear] = useState("2026");
  const [editingBookLang, setEditingBookLang] = useState("ar");
  const [editingBookType, setEditingBookType] = useState("core");
  const [editingBookSourceUrl, setEditingBookSourceUrl] = useState("");
  const [editingBookStoragePath, setEditingBookStoragePath] = useState("");
  const [editingBookChapters, setEditingBookChapters] = useState<ChapterSegment[]>([]);

  // Edit Book Chapter Builder States
  const [editChTitle, setEditChTitle] = useState("");
  const [editChTitleAr, setEditChTitleAr] = useState("");
  const [editChStartPage, setEditChStartPage] = useState<number>(1);
  const [editChEndPage, setEditChEndPage] = useState<number>(15);
  const [editChConcepts, setEditChConcepts] = useState("");

  // Interactive Chapter Builder States
  const [chTitle, setChTitle] = useState("");
  const [chTitleAr, setChTitleAr] = useState("");
  const [chStartPage, setChStartPage] = useState<number>(1);
  const [chEndPage, setChEndPage] = useState<number>(15);
  const [chConcepts, setChConcepts] = useState("");

  const [isIngestingBook, setIsIngestingBook] = useState(false);
  const [bookSuccess, setBookSuccess] = useState<string | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);

  // Web Crawler / Exploration Studio States
  const [crawlUrl, setBookCrawlUrl] = useState("https://openstax.org");
  const [crawlMaxDepth, setCrawlDepth] = useState<number>(3); // Set to max depth (3) by default
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState(0);
  const [crawlLogs, setCrawlLogs] = useState<string[]>([]);
  const [discoveredResources, setDiscoveredResources] = useState<any[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<"all" | "pdf" | "html">("pdf"); // Set to pdf filter by default
  const [selectedResources, setSelectedResources] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [importingBulk, setImportingBulk] = useState(false);

  // Ingestion Queue States
  const [queue, setQueue] = useState<QueueJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[SYSTEM] Ingestion Studio Queue initialized.",
    "[INFO] Cloud Run Async Executor listening on secure gcp-vpc router.",
    "[DEBUG] Shared lock system active on MongoDB Atlas primary database."
  ]);

  // Derived state for Terminal Log Viewer
  const jobForLogs = queue.find(j => j.id === selectedJobId) || queue.find(j => ["processing", "downloading", "queued", "idle"].includes(j.status));
  const logsToRender = jobForLogs && jobForLogs.logs && jobForLogs.logs.length > 0 ? jobForLogs.logs : terminalLogs;

  // TSK-079 Bulk Operations & Duplicate states
  const [expandedRepoFolders, setExpandedRepoFolders] = useState<Record<string, boolean>>({});
  const [selectedRepoBooks, setSelectedRepoBooks] = useState<Record<string, boolean>>({});
  const [isDeletingBulkRepo, setIsDeletingBulkRepo] = useState(false);
  const [isReindexingBulkRepo, setIsReindexingBulkRepo] = useState(false);

  // Duplicate Safeguard Helper
  const checkIfBookDuplicate = (title: string, subjectId: string, sourceUrl?: string) => {
    return booksList.some((b: any) => {
      if (sourceUrl && b.source_url && b.source_url === sourceUrl) return true;
      return (
        b.title.toLowerCase() === title.toLowerCase() &&
        b.subject_id === subjectId
      );
    });
  };

  const addTerminalLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  };

  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const crawlerContainerRef = useRef<HTMLDivElement>(null);

  // Automatically update form fields to match default grade whenever it changes
  useEffect(() => {
    setSubjGrade(defaultGrade);
    setBookGrade(defaultGrade);
  }, [defaultGrade]);

  // Load and persist list configurations in localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedGrades = localStorage.getItem("fahem_gradeLevels");
      const storedCats = localStorage.getItem("fahem_categories");
      const storedTerms = localStorage.getItem("fahem_terms");
      const storedLangs = localStorage.getItem("fahem_languages");
      const storedDefGrade = localStorage.getItem("fahem_defaultGrade");

      if (storedGrades) setGradeLevels(JSON.parse(storedGrades));
      if (storedCats) setCategories(JSON.parse(storedCats));
      if (storedTerms) setTerms(JSON.parse(storedTerms));
      if (storedLangs) setLanguagesList(JSON.parse(storedLangs));
      if (storedDefGrade) setDefaultGrade(storedDefGrade);
    }
  }, []);

  const saveListsToStorage = (updatedGrades?: string[], updatedCats?: string[], updatedTerms?: string[], updatedLangs?: string[], updatedDefGrade?: string) => {
    if (typeof window !== "undefined") {
      if (updatedGrades) localStorage.setItem("fahem_gradeLevels", JSON.stringify(updatedGrades));
      if (updatedCats) localStorage.setItem("fahem_categories", JSON.stringify(updatedCats));
      if (updatedTerms) localStorage.setItem("fahem_terms", JSON.stringify(updatedTerms));
      if (updatedLangs) localStorage.setItem("fahem_languages", JSON.stringify(updatedLangs));
      if (updatedDefGrade) localStorage.setItem("fahem_defaultGrade", updatedDefGrade);
    }
  };

  // Load and fetch initial books from database
  const fetchBooks = async (currentSubjectsList?: Subject[]) => {
    try {
      const response = await fetch("/api/books");
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.books)) {
          setBooksList(data.books); // Populate our list state of books

          const listToUse = currentSubjectsList || subjectsList;
          const mappedJobs = data.books.map((b: any) => {
            const targetSubject = listToUse.find(s => s._id === b.subject_id);
            const subjectName = targetSubject 
              ? (language === "ar" ? targetSubject.name_ar : targetSubject.name) 
              : b.subject_id;
            
            const cleanFileName = b.source_url 
              ? b.source_url.split("/").pop() || `${b.title.replace(/\s+/g, "_")}.pdf` 
              : b.storage_path 
                ? b.storage_path.split("/").pop() || `${b.title.replace(/\s+/g, "_")}.pdf`
                : `${b.title.replace(/\s+/g, "_")}.pdf`;

            const totalPages = b.total_pages || (b.chapters && b.chapters.length > 0 ? Math.max(...b.chapters.map((ch: any) => parseInt(ch.end_page || 0))) : 120);
            const processedPages = b.processed_pages !== undefined ? b.processed_pages : (b.ingestion_status === "completed" ? totalPages : 0);
            const progress = b.ingestion_progress !== undefined ? b.ingestion_progress : (b.ingestion_status === "completed" ? 100 : 0);
            const status = b.ingestion_status || "completed";

            return {
              id: b._id,
              fileName: cleanFileName,
              bookTitle: b.title,
              bookTitleAr: b.title_ar,
              subjectName: subjectName,
              status,
              progress,
              totalPages,
              processedPages,
              speed: 0,
              eta: 0,
              startTime: b.created_at ? b.created_at * 1000 : Date.now(),
              isLocalSessionJob: false,
              logs: b.ingestion_logs || []
            };
          });

          // Sort by newest first
          mappedJobs.sort((a: any, b: any) => b.startTime - a.startTime);
          setQueue(mappedJobs);
        }
      }
    } catch (err) {
      console.error("Failed to fetch books list:", err);
    }
  };

  // Load and fetch initial subjects
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
          // Fetch books immediately after receiving subjects
          fetchBooks(data.subjects);
        }
      }
    } catch (err) {
      console.error("Failed to fetch subjects list:", err);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  // Auto-scroll terminal log inside container (no viewport glitching/yanking)
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [queue, selectedJobId, terminalLogs]);

  useEffect(() => {
    if (crawlerContainerRef.current) {
      crawlerContainerRef.current.scrollTop = crawlerContainerRef.current.scrollHeight;
    }
  }, [crawlLogs]);

  // Adaptive Polling for active background jobs
  useEffect(() => {
    const hasActiveJobs = queue.some(job => 
      job.status === "processing" || 
      job.status === "downloading" || 
      job.status === "queued" || 
      job.status === "idle"
    );

    if (!hasActiveJobs) return;

    const interval = setInterval(() => {
      fetchBooks();
    }, 3000);

    return () => clearInterval(interval);
  }, [queue]);
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
        setSubjectSuccess(st("subject_added_success"));
        setSubjName("");
        setSubjNameAr("");
        fetchSubjects();
        addTerminalLog(`[CATALOG] Admin added new subject: ${subjName} (${subjGrade})`);
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

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !editingSubjectId || !editingSubjName || !editingSubjNameAr) return;
    setIsCreatingSubject(true);
    setSubjectSuccess(null);
    setSubjectError(null);

    try {
      const res = await fetch("/api/subjects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSubjectId,
          name: editingSubjName,
          name_ar: editingSubjNameAr,
          grade_level: editingSubjGrade,
          category: editingSubjCategory,
          icon_emoji: editingSubjEmoji,
          requesterEmail: email
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubjectSuccess(st("subject_updated_success"));
        setEditingSubjectId(null);
        fetchSubjects();
        addTerminalLog(`[CATALOG] Admin updated subject details: ${editingSubjName}`);
        setTimeout(() => setSubjectSuccess(null), 4000);
      } else {
        setSubjectError(data.error || "Failed to update subject.");
      }
    } catch (err: any) {
      setSubjectError(err.message || "Network error occurred while saving subject.");
    } finally {
      setIsCreatingSubject(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!email) return;
    if (!confirm(st("confirm_delete_subject"))) return;

    try {
      const res = await fetch(`/api/subjects?id=${id}&requesterEmail=${encodeURIComponent(email)}`, {
        method: "DELETE"
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addTerminalLog(`[CATALOG] Deleted subject with ID ${id}`);
        fetchSubjects();
      } else {
        alert(data.error || "Failed to delete subject.");
      }
    } catch (err: any) {
      console.error("Failed to delete subject:", err);
    }
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !editingBookId || !editingBookSubjId || !editingBookTitle || !editingBookTitleAr) return;
    setIsIngestingBook(true);
    setBookSuccess(null);
    setBookError(null);

    try {
      const res = await fetch("/api/books", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingBookId,
          subject_id: editingBookSubjId,
          title: editingBookTitle,
          title_ar: editingBookTitleAr,
          grade: editingBookGrade,
          term: editingBookTerm,
          year: editingBookYear,
          language: editingBookLang,
          book_type: editingBookType,
          source_url: editingBookSourceUrl,
          storage_path: editingBookStoragePath,
          chapters: editingBookChapters,
          requesterEmail: email
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBookSuccess(st("book_updated_success"));
        setEditingBookId(null);
        fetchSubjects(); // Refreshes and fetches books list
        addTerminalLog(`[CATALOG] Updated textbook metadata for: ${editingBookTitle}`);
        setTimeout(() => setBookSuccess(null), 4000);
      } else {
        setBookError(data.error || "Failed to update book.");
      }
    } catch (err: any) {
      setBookError(err.message || "Network error occurred.");
    } finally {
      setIsIngestingBook(false);
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!email) return;
    if (!confirm(st("confirm_delete_book"))) return;

    try {
      const res = await fetch(`/api/books?id=${id}&requesterEmail=${encodeURIComponent(email)}`, {
        method: "DELETE"
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addTerminalLog(`[CATALOG] Deleted book with ID ${id}`);
        fetchSubjects();
      } else {
        alert(data.error || "Failed to delete book.");
      }
    } catch (err: any) {
      console.error("Failed to delete book:", err);
    }
  };

  const handleIngestSingleDiscovered = async (book: any) => {
    if (!email) return;

    // Client-side safeguard check
    if (checkIfBookDuplicate(book.title, book.subjectId, book.url)) {
      addTerminalLog(`[DUPLICATE_SAFEGUARD] [WARNING] Blocked client ingestion of duplicate discovered textbook: "${book.title}"`);
      setBookError(st("book_exists_error"));
      setTimeout(() => setBookError(null), 4000);
      return;
    }

    addTerminalLog(`[CRAWLER] Initiating single book ingestion for: "${book.title}"...`);

    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: book.subjectId,
          title: book.title,
          title_ar: book.titleAr,
          grade: book.grade,
          term: book.term,
          year: book.year,
          language: book.language,
          book_type: book.bookType,
          source_url: book.url,
          storage_path: `/fahem-core-store/textbooks/${book.fileName}`,
          chapters: book.chapters,
          requesterEmail: email
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.message && data.message.includes("already exists")) {
          addTerminalLog(`[DUPLICATE_SAFEGUARD] [WARNING] Server intercepted duplicate discovered textbook: "${book.title}". Ingestion bypassed.`);
          setBookError(st("book_registered_error"));
          setTimeout(() => setBookError(null), 4000);
          return;
        }

        addTerminalLog(`[SUCCESS] Registered textbook: "${book.title}". Spawning isolated Cloud Run indexing job...`);

        if (data.book && data.book._id) {
          setSelectedJobId(data.book._id);
        }

        fetchSubjects();
        setBookSuccess(st("ingest_success", { title: language === "ar" ? book.titleAr : book.title }));
        setTimeout(() => setBookSuccess(null), 4000);
      } else {
        addTerminalLog(`[ERROR] Registration failed for: "${book.title}". Reason: ${data.error || "Server Error"}`);
        setBookError(data.error || "Failed to register book.");
        setTimeout(() => setBookError(null), 4000);
      }
    } catch (err: any) {
      addTerminalLog(`[ERROR] System fault during import: ${err.message}`);
    }
  };

  const handleAddChapter = () => {
    if (!chTitle || !chTitleAr) return;
    const newCh: ChapterSegment = {
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
    setChEndPage(Number(chEndPage) + 15);
    setChConcepts("");
  };

  const handleRemoveChapter = (index: number) => {
    setPendingChapters(pendingChapters.filter((_, i) => i !== index));
  };

  const handleIngestBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !bookSubjId || !bookTitle || !bookTitleAr) return;

    // Client-side safeguard check
    if (checkIfBookDuplicate(bookTitle, bookSubjId, bookSourceUrl)) {
      addTerminalLog(`[DUPLICATE_SAFEGUARD] [WARNING] Blocked client ingestion of duplicate textbook: "${bookTitle}"`);
      setBookError(st("book_exists_error"));
      setTimeout(() => setBookError(null), 4000);
      return;
    }

    setIsIngestingBook(true);
    setBookSuccess(null);
    setBookError(null);

    try {
      // 1. Commit metadata real-time to MongoDB
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
        if (data.message && data.message.includes("already exists")) {
          addTerminalLog(`[DUPLICATE_SAFEGUARD] [WARNING] Server intercepted duplicate textbook: "${bookTitle}". Ingestion bypassed.`);
          setBookError(st("book_registered_error"));
          setTimeout(() => setBookError(null), 4000);
          setIsIngestingBook(false);
          return;
        }

        setBookSuccess(st("book_draft_saved"));

        if (data.book && data.book._id) {
          setSelectedJobId(data.book._id);
        }

        const cleanFileName = bookSourceUrl 
          ? bookSourceUrl.split("/").pop() || `${bookTitle.replace(/\s+/g, "_")}.pdf` 
          : `${bookTitle.replace(/\s+/g, "_")}.pdf`;

        addTerminalLog(`[QUEUE] Pushed async processing job to GCP Cloud Run pool for: ${cleanFileName}`);

        // Refresh subjects and books count from the database
        fetchSubjects();

        // Reset form
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

  // Real Crawler & Content Discovery (Asynchronous / Polling)
  const handleStartCrawling = async () => {
    if (!crawlUrl) return;
    setIsCrawling(true);
    setCrawlProgress(0);
    setCrawlLogs([`[INIT] Despatching asynchronous request...`]);
    setDiscoveredResources([]);
    setSelectedResources({});

    addTerminalLog(`[CRAWLER] Initiating real web spider agent targeting ${crawlUrl}...`);

    try {
      const res = await fetch("/api/admin/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: crawlUrl,
          maxDepth: crawlMaxDepth,
          requesterEmail: email || "hesham1988@gmail.com"
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setIsCrawling(false);
        addTerminalLog(`[CRAWLER ERROR] ${data.error || "Failed to initiate crawl job."}`);
        setCrawlLogs([`[ERROR] Crawler initialization failed: ${data.error || "Failed to initiate crawl job."}`]);
        return;
      }

      const jobId = data.jobId;
      addTerminalLog(`[CRAWLER] Async job created: ${jobId}. Active Cloud Run polling sequence engaged...`);

      // Start Polling Interval
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/admin/crawl?jobId=${jobId}`);
          if (!pollRes.ok) {
            console.error("Crawl job polling failed");
            return;
          }
          const pollData = await pollRes.json();
          if (pollData.success) {
            // Update logs in the crawler terminal log feed
            if (pollData.logs && Array.isArray(pollData.logs)) {
              setCrawlLogs(pollData.logs);
            }

            // Update crawlProgress
            if (typeof pollData.progress === "number") {
              setCrawlProgress(pollData.progress);
            }

            // Map and update discovered list
            if (pollData.discovered && Array.isArray(pollData.discovered)) {
              const mappedDiscovered = pollData.discovered.map((book: any) => {
                const matchingSubj = subjectsList.find(s => 
                  book.title.toLowerCase().includes(s.name.toLowerCase()) || 
                  s.name.toLowerCase().includes(book.title.toLowerCase()) ||
                  book.fileName.toLowerCase().includes(s.name.toLowerCase())
                ) || subjectsList[0];

                return {
                  ...book,
                  subjectId: matchingSubj ? matchingSubj._id : "subj_algebra_stats",
                  subject: matchingSubj ? matchingSubj.name : "Pure Mathematics"
                };
              });

              setDiscoveredResources(mappedDiscovered);

              // Update folders expanded state
              const folderMap: Record<string, boolean> = {};
              mappedDiscovered.forEach((book: any) => {
                if (book.subject) {
                  folderMap[book.subject] = true;
                }
              });
              setExpandedFolders(prev => ({ ...prev, ...folderMap }));
            }

            // Check if job finished
            if (pollData.status === "completed") {
              clearInterval(pollInterval);
              setIsCrawling(false);
              setCrawlProgress(100);
              addTerminalLog(`[CRAWLER] Asynchronous job ${jobId} successfully completed! Discovered ${pollData.discovered?.length || 0} PDFs.`);
            } else if (pollData.status === "failed") {
              clearInterval(pollInterval);
              setIsCrawling(false);
              addTerminalLog(`[CRAWLER ERROR] Asynchronous job ${jobId} reported failure status.`);
            }
          }
        } catch (err: any) {
          console.error("Exception during crawl status polling:", err);
        }
      }, 1500);

    } catch (err: any) {
      setIsCrawling(false);
      addTerminalLog(`[CRAWLER FAULT] ${err.message || "Failed to contact crawling API."}`);
    }
  };

  // Bulk Ingest selected textbooks into system
  const handleImportSelectedBooks = async () => {
    const selectedList = discoveredResources.filter(res => selectedResources[res.id]);
    if (selectedList.length === 0) return;

    setImportingBulk(true);
    addTerminalLog(`[CRAWLER] Initiating bulk importation queue on GCP Cloud Run for ${selectedList.length} selected assets...`);

    let importedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const book of selectedList) {
      if (checkIfBookDuplicate(book.title, book.subjectId, book.url)) {
        skippedCount++;
        addTerminalLog(`[DUPLICATE_SAFEGUARD] [WARNING] Skipping duplicate discovered book: "${book.title}"`);
        continue;
      }

      addTerminalLog(`[CRAWLER] Registering book details in MongoDB for: "${book.title}"...`);
      try {
        const res = await fetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject_id: book.subjectId,
            title: book.title,
            title_ar: book.titleAr,
            grade: book.grade,
            term: book.term,
            year: book.year,
            language: book.language,
            book_type: book.bookType,
            source_url: book.url,
            storage_path: `/fahem-core-store/textbooks/${book.fileName}`,
            chapters: book.chapters,
            requesterEmail: email
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          if (data.message && data.message.includes("already exists")) {
            skippedCount++;
            addTerminalLog(`[DUPLICATE_SAFEGUARD] [WARNING] Server intercepted duplicate textbook: "${book.title}". Bypassed.`);
            continue;
          }

          importedCount++;
          addTerminalLog(`[SUCCESS] Registered textbook: "${book.title}". Spawning isolated Cloud Run indexing job...`);

          if (data.book && data.book._id) {
            setSelectedJobId(data.book._id);
          }
        } else {
          failedCount++;
          addTerminalLog(`[ERROR] Registration failed for: "${book.title}". Reason: ${data.error || "Server Error"}`);
        }
      } catch (err: any) {
        failedCount++;
        addTerminalLog(`[ERROR] System fault during import: ${err.message}`);
      }
    }

    setImportingBulk(false);
    setSelectedResources({});
    fetchSubjects();

    if (failedCount === 0) {
      setBookSuccess(st("import_bulk_success", { importedCount: String(importedCount), skippedCount: String(skippedCount) }));
      setTimeout(() => setBookSuccess(null), 5000);
    } else {
      setBookError(st("import_bulk_error", { importedCount: String(importedCount), failedCount: String(failedCount), skippedCount: String(skippedCount) }));
      setTimeout(() => setBookError(null), 5000);
    }
  };

  // Bulk Ingest all discovered resources (fully functional third ingestion flow)
  const handleImportAllCrawled = async () => {
    if (discoveredResources.length === 0) return;

    setImportingBulk(true);
    addTerminalLog(`[CRAWLER] Initiating full importation queue on GCP Cloud Run for all ${discoveredResources.length} discovered assets...`);

    let importedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const book of discoveredResources) {
      if (checkIfBookDuplicate(book.title, book.subjectId, book.url)) {
        skippedCount++;
        addTerminalLog(`[DUPLICATE_SAFEGUARD] [WARNING] Skipping duplicate discovered book: "${book.title}"`);
        continue;
      }

      addTerminalLog(`[CRAWLER] Registering book details in MongoDB for: "${book.title}"...`);
      try {
        const res = await fetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject_id: book.subjectId,
            title: book.title,
            title_ar: book.titleAr,
            grade: book.grade,
            term: book.term,
            year: book.year,
            language: book.language,
            book_type: book.bookType,
            source_url: book.url,
            storage_path: `/fahem-core-store/textbooks/${book.fileName}`,
            chapters: book.chapters,
            requesterEmail: email
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          if (data.message && data.message.includes("already exists")) {
            skippedCount++;
            addTerminalLog(`[DUPLICATE_SAFEGUARD] [WARNING] Server intercepted duplicate textbook: "${book.title}". Bypassed.`);
            continue;
          }

          importedCount++;
          addTerminalLog(`[SUCCESS] Registered textbook: "${book.title}". Spawning isolated Cloud Run indexing job...`);

          if (data.book && data.book._id) {
            setSelectedJobId(data.book._id);
          }
        } else {
          failedCount++;
          addTerminalLog(`[ERROR] Registration failed for: "${book.title}". Reason: ${data.error || "Server Error"}`);
        }
      } catch (err: any) {
        failedCount++;
        addTerminalLog(`[ERROR] System fault during import: ${err.message}`);
      }
    }

    setImportingBulk(false);
    setSelectedResources({});
    fetchSubjects();

    if (failedCount === 0) {
      setBookSuccess(st("import_all_success", { importedCount: String(importedCount), skippedCount: String(skippedCount) }));
      setTimeout(() => setBookSuccess(null), 5000);
    } else {
      setBookError(st("import_all_error", { importedCount: String(importedCount), failedCount: String(failedCount), skippedCount: String(skippedCount) }));
      setTimeout(() => setBookError(null), 5000);
    }
  };

  // TSK-079 Custom Bulk Operations Handlers
  const handleBulkDeleteRepoBooks = async () => {
    const selectedIds = Object.keys(selectedRepoBooks).filter(id => selectedRepoBooks[id]);
    if (selectedIds.length === 0) return;
    if (!email) return;

    if (!confirm(st("bulk_delete_confirm", { count: String(selectedIds.length) }))) return;

    setIsDeletingBulkRepo(true);
    addTerminalLog(`[BULK_OPERATIONS] Initiating bulk deletion of ${selectedIds.length} textbooks...`);

    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/books?id=${id}&requesterEmail=${encodeURIComponent(email)}`, {
          method: "DELETE"
        });
        const data = await res.json();
        if (res.ok && data.success) {
          successCount++;
          addTerminalLog(`[BULK_DELETE] Successfully deleted book with ID: ${id}`);
        } else {
          failCount++;
          addTerminalLog(`[BULK_DELETE] [ERROR] Failed to delete book ${id}: ${data.error || "Unknown Error"}`);
        }
      } catch (err: any) {
        failCount++;
        addTerminalLog(`[BULK_DELETE] [FATAL] Exception during deletion of book ${id}: ${err.message}`);
      }
    }

    setIsDeletingBulkRepo(false);
    setSelectedRepoBooks({});
    fetchSubjects();

    if (failCount === 0) {
      setBookSuccess(st("bulk_delete_success", { count: String(successCount) }));
      setTimeout(() => setBookSuccess(null), 4000);
    } else {
      setBookError(st("bulk_delete_error", { successCount: String(successCount), failCount: String(failCount) }));
      setTimeout(() => setBookError(null), 4000);
    }
  };

  const handleBulkReindexRepoBooks = async () => {
    const selectedIds = Object.keys(selectedRepoBooks).filter(id => selectedRepoBooks[id]);
    if (selectedIds.length === 0) return;

    setIsReindexingBulkRepo(true);
    addTerminalLog(`[BULK_OPERATIONS] Initiating bulk re-indexing of ${selectedIds.length} textbooks...`);

    let queuedCount = 0;
    let failedCount = 0;

    for (const id of selectedIds) {
      const book = booksList.find((b: any) => b._id === id);
      if (!book) continue;

      try {
        addTerminalLog(`[BULK_REINDEX] Dispatching re-indexing request for "${book.title}"...`);
        const res = await fetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: book._id,
            subject_id: book.subject_id,
            title: book.title,
            title_ar: book.title_ar,
            grade: book.grade || "General",
            term: book.term || "Term 1",
            year: book.year || "2026",
            language: book.language || "ar",
            book_type: book.book_type || "core",
            source_url: book.source_url || "",
            storage_path: book.storage_path || "",
            chapters: book.chapters || [],
            requesterEmail: email || "hesham1988@gmail.com",
            forceReindex: true
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          queuedCount++;
          addTerminalLog(`[SUCCESS] Re-indexing job triggered for: "${book.title}". Process registered under ID: ${book._id}`);
          setSelectedJobId(book._id);
        } else {
          failedCount++;
          addTerminalLog(`[ERROR] Re-indexing failed for "${book.title}": ${data.error || "Server Error"}`);
        }
      } catch (err: any) {
        failedCount++;
        addTerminalLog(`[ERROR] Network fault re-indexing "${book.title}": ${err.message}`);
      }
    }

    setIsReindexingBulkRepo(false);
    setSelectedRepoBooks({});
    fetchSubjects();

    if (failedCount === 0) {
      setBookSuccess(st("bulk_reindex_success", { count: String(queuedCount) }));
      setTimeout(() => setBookSuccess(null), 4000);
    } else {
      setBookError(st("bulk_reindex_error", { queuedCount: String(queuedCount), failedCount: String(failedCount) }));
      setTimeout(() => setBookError(null), 5000);
    }
  };

  const handlePreFillFromCrawler = (res: any) => {
    setBookTitle(res.title);
    setBookTitleAr(res.titleAr);
    setBookSourceUrl(res.url);
    setBookStoragePath(`/fahem-core-store/textbooks/${res.fileName}`);
    setPendingChapters(res.chapters);
    if (res.subjectId) {
      setBookSubjId(res.subjectId);
    }
    addTerminalLog(`[CRAWLER] Auto-filled book metadata from discovered resource: ${res.fileName}`);
  };

  const handleCancelJob = async (id: string) => {
    if (!email) return;
    try {
      addTerminalLog(`[QUEUE] Attempting manual administrative abort for Ingestion Job ${id}...`);
      const res = await fetch(`/api/books/cancel?bookId=${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterEmail: email })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addTerminalLog(`[QUEUE] Manually aborted Ingestion Job ${id}. Marking status failed in DB.`);
        fetchSubjects();
      } else {
        addTerminalLog(`[ERROR] Failed to abort job ${id}: ${data.error || "Unknown Error"}`);
        alert(data.error || "Failed to cancel job.");
      }
    } catch (err: any) {
      console.error("Failed to cancel job:", err);
      addTerminalLog(`[FATAL] Error aborting Ingestion Job ${id}: ${err.message}`);
    }
  };

  // Queue states calculation helper
  const activeProcessingJob = queue.find(j => j.status === "processing");
  const idleJobsCount = queue.filter(j => j.status === "idle").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", width: "100%" }}>
      
      {/* premium architectural layout card */}
      <div style={{
        background: "linear-gradient(135deg, rgba(16, 107, 163, 0.08) 0%, rgba(27, 163, 156, 0.04) 100%)",
        border: "1px solid rgba(16, 107, 163, 0.15)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: "3rem",
            height: "3rem",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--secondary), var(--primary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(16, 107, 163, 0.2)",
            color: "#ffffff"
          }}>
            <FiCpu style={{ fontSize: "1.5rem", animation: isCrawling || activeProcessingJob ? "spin 6s linear infinite" : "none" }} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.3rem", margin: 0, fontWeight: 800, color: "var(--primary)" }}>
              {st("studio_title")}
            </h2>
            <p style={{ margin: "0.25rem 0 0 0", color: "#4f6371", fontSize: "0.85rem" }}>
              {st("studio_desc")}
            </p>
          </div>
        </div>

        {/* Architectural Isolation Diagram */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
          marginTop: "0.75rem",
          background: "rgba(255,255,255,0.4)",
          padding: "1rem",
          borderRadius: "12px",
          border: "1px dashed var(--card-border)"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--accent-green)", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-green)", animation: "pulse 1.5s infinite" }} />
              {st("active_agent")}
            </span>
            <p style={{ fontSize: "0.7rem", color: "#5a6e7c", margin: 0 }}>
              {st("active_agent_desc")}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", borderInlineStart: "2px solid rgba(16, 107, 163, 0.1)", paddingInlineStart: "1rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--secondary)", animation: activeProcessingJob ? "pulse 1s infinite" : "none" }} />
              {st("ingest_pipeline")}
            </span>
            <p style={{ fontSize: "0.7rem", color: "#5a6e7c", margin: 0 }}>
              {st("ingest_pipeline_desc")}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Crawl Discovery & Ingestion Studio Progress Monitor */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "1.5rem"
      }}>
        
        {/* ROW 1: Real-time Cloud Run Async Pipeline Telemetry Console */}
        <section className="panel-card" style={{ width: "100%", padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
              <FiActivity style={{ color: "var(--secondary)" }} />
              <span>{st("telemetry_console")}</span>
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{
                fontSize: "0.7rem",
                padding: "2px 8px",
                borderRadius: "10px",
                background: activeProcessingJob ? "rgba(39, 174, 96, 0.1)" : "rgba(100, 116, 139, 0.1)",
                color: activeProcessingJob ? "var(--accent-green)" : "#64748b",
                fontWeight: 700
              }}>
                {activeProcessingJob 
                  ? st("active_executing") 
                  : st("queue_empty")}
              </span>
            </div>
          </div>

          {/* Active Job Dashboard Panel */}
          {activeProcessingJob ? (
            <div style={{
              background: "rgba(16, 107, 163, 0.04)",
              border: "1px solid rgba(16, 107, 163, 0.15)",
              borderRadius: "12px",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              marginBottom: "1rem"
            }}>
              {/* Job Info Grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "1rem"
              }}>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "#64748b", display: "block", textTransform: "uppercase" }}>
                    {st("current_processing")}
                  </span>
                  <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--primary)", display: "block", marginTop: "2px" }}>
                    📖 {language === "ar" ? activeProcessingJob.bookTitleAr : activeProcessingJob.bookTitle}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#4f6371", fontStyle: "italic", marginTop: "2px", display: "block" }}>
                    {activeProcessingJob.fileName}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "#64748b", display: "block", textTransform: "uppercase" }}>
                    {st("ingestion_velocity")}
                  </span>
                  <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--secondary)", fontFamily: "var(--font-mono)", display: "block", marginTop: "2px" }}>
                    ⚡ {activeProcessingJob.speed} {st("pages_sec")}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "#64748b", display: "block", textTransform: "uppercase" }}>
                    {st("eta_label")}
                  </span>
                  <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--accent-orange)", fontFamily: "var(--font-mono)", display: "block", marginTop: "2px" }}>
                    ⏱️ {activeProcessingJob.eta} {st("seconds_left")}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "#64748b", display: "block", textTransform: "uppercase" }}>
                    {st("queue_remaining")}
                  </span>
                  <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--foreground)", fontFamily: "var(--font-mono)", display: "block", marginTop: "2px" }}>
                    📦 {idleJobsCount} {st("books_pending")}
                  </span>
                </div>
              </div>

              {/* Progress Bar Component */}
              <div style={{ marginTop: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, marginBottom: "4px" }}>
                  <span>{st("analyzing_page", { processed: String(activeProcessingJob.processedPages), total: String(activeProcessingJob.totalPages) })}</span>
                  <span>{activeProcessingJob.progress}%</span>
                </div>
                <div style={{ width: "100%", height: "10px", background: "rgba(16, 107, 163, 0.1)", borderRadius: "5px", overflow: "hidden" }}>
                  <div style={{
                    width: `${activeProcessingJob.progress}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, var(--secondary) 0%, var(--primary) 100%)",
                    borderRadius: "5px",
                    transition: "width 0.4s ease-in-out"
                  }} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: "rgba(255, 255, 255, 0.4)",
              border: "1px dashed var(--card-border)",
              borderRadius: "12px",
              padding: "2rem",
              textAlign: "center",
              marginBottom: "1rem"
            }}>
              <FiCheckCircle style={{ fontSize: "2rem", color: "var(--accent-green)", marginBottom: "0.5rem" }} />
              <h4 style={{ fontSize: "1rem", margin: 0, fontWeight: 700 }}>
                {st("all_completed")}
              </h4>
              <p style={{ margin: "0.25rem 0 0 0", color: "#64748b", fontSize: "0.8rem" }}>
                {st(isSuperadmin ? "queue_idle_desc_super" : "queue_idle_desc")}
              </p>
            </div>
          )}

          {/* Stepper Pipeline Indicators */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.75rem",
            background: "rgba(255,255,255,0.45)",
            border: "1px solid var(--card-border)",
            borderRadius: "10px",
            padding: "1rem",
            marginBottom: "1rem"
          }}>
            {[
              { key: "step1", status: activeProcessingJob ? (activeProcessingJob.progress > 15 ? "done" : "current") : "done" },
              { key: "step2", status: activeProcessingJob ? (activeProcessingJob.progress > 45 ? "done" : activeProcessingJob.progress > 15 ? "current" : "pending") : "done" },
              { key: "step3", status: activeProcessingJob ? (activeProcessingJob.progress > 75 ? "done" : activeProcessingJob.progress > 45 ? "current" : "pending") : "done" },
              { key: "step4", status: activeProcessingJob ? (activeProcessingJob.progress > 95 ? "done" : activeProcessingJob.progress > 75 ? "current" : "pending") : "done" }
            ].map((step, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                opacity: step.status === "pending" ? 0.5 : 1,
                transition: "all 0.3s"
              }}>
                <div style={{
                  width: "1.5rem",
                  height: "1.5rem",
                  borderRadius: "50%",
                  background: step.status === "done" 
                    ? "var(--accent-green)" 
                    : step.status === "current" 
                      ? "var(--secondary)" 
                      : "rgba(100,116,139,0.15)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  animation: step.status === "current" ? "pulse 1.5s infinite" : "none"
                }}>
                  {step.status === "done" ? "✓" : idx + 1}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                    {st(step.key)}
                  </span>
                  <span style={{ fontSize: "0.6rem", color: "#64748b" }}>
                    {step.status === "done" 
                      ? st("completed") 
                      : step.status === "current" 
                        ? st("processing") 
                        : st("pending")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Cloud Run Terminal Log */}
          <div 
            ref={terminalContainerRef}
            style={{
              background: "#0d1117",
              border: "1px solid #21262d",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              maxHeight: "150px",
              overflowY: "auto",
              boxShadow: "inset 0 4px 16px rgba(0,0,0,0.8)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #21262d", paddingBottom: "4px", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "#8b949e", display: "flex", alignItems: "center", gap: "4px" }}>
                <FiTerminal /> GCP_CLOUD_RUN_JOB_LOGGER
              </span>
              <span style={{ fontSize: "0.6rem", fontFamily: "var(--font-mono)", color: "#58a6ff" }}>
                STATUS: 200 OK
              </span>
            </div>
            {terminalLogs.map((log, idx) => {
              let color = "#c9d1d9";
              if (log.includes("[SUCCESS]")) color = "#3fb950";
              else if (log.includes("[LAUNCH]")) color = "#58a6ff";
              else if (log.includes("[VECTOR]")) color = "#ff7b72";
              else if (log.includes("[PROCESSING]")) color = "#d2a8ff";
              return (
                <div key={idx} style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.7rem",
                  lineHeight: "1rem",
                  color: color,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all"
                }}>
                  {log}
                </div>
              );
            })}
          </div>

          {/* Queue List Table */}
          <div style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4f6371" }}>
                📋 {st("task_schedule")}
              </span>
              <button
                type="button"
                onClick={() => fetchBooks()}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--primary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "4px 8px",
                  borderRadius: "4px",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(16, 107, 163, 0.05)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <FiRefreshCw /> {st("refresh")}
              </button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: language === "ar" ? "right" : "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--card-border)", color: "#4f6371" }}>
                    <th style={{ padding: "0.5rem" }}>{st("job_id")}</th>
                    <th style={{ padding: "0.5rem" }}>{st("file_name")}</th>
                    <th style={{ padding: "0.5rem" }}>{st("subject_name")}</th>
                    <th style={{ padding: "0.5rem" }}>{st("progress_label")}</th>
                    <th style={{ padding: "0.5rem" }}>{st("status_label")}</th>
                    <th style={{ padding: "0.5rem", textAlign: "center" }}>{st("action_label")}</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((job) => (
                    <tr key={job.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                      <td style={{ padding: "0.5rem", fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 700 }}>{job.id}</td>
                      <td style={{ padding: "0.5rem" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 700 }}>{language === "ar" ? job.bookTitleAr : job.bookTitle}</span>
                          <span style={{ fontSize: "0.65rem", color: "#64748b" }}>{job.fileName}</span>
                        </div>
                      </td>
                      <td style={{ padding: "0.5rem" }}>{job.subjectName}</td>
                      <td style={{ padding: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ width: "60px", height: "6px", background: "rgba(100,116,139,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ width: `${job.progress}%`, height: "100%", background: job.status === "completed" ? "var(--accent-green)" : "var(--secondary)" }} />
                          </div>
                          <span>{job.progress}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        <span style={{
                          fontSize: "0.7rem",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: job.status === "completed" ? "rgba(39, 174, 96, 0.08)" : job.status === "processing" ? "rgba(16, 107, 163, 0.08)" : "rgba(100, 116, 139, 0.08)",
                          color: job.status === "completed" ? "var(--accent-green)" : job.status === "processing" ? "var(--primary)" : "#64748b",
                          fontWeight: 700
                        }}>
                          {job.status === "completed" 
                            ? st("completed_status") 
                            : job.status === "processing" 
                              ? st("processing_status") 
                              : st("pending_status")}
                        </span>
                      </td>
                      <td style={{ padding: "0.5rem", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleCancelJob(job.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#d32f2f",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            opacity: job.status === "completed" ? 0.3 : 1
                          }}
                          disabled={job.status === "completed"}
                          title={st("terminate_job")}
                        >
                          <FiXCircle />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ROW 2: Crawl & Discover Module */}
        {isSuperadmin && (
          <section className="panel-card" style={{ width: "100%", padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: "0 0 1rem 0", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>
              <FiGlobe style={{ color: "var(--primary)" }} />
              <span>{st("crawler_title")}</span>
            </h3>
            <p style={{ color: "#4f6371", fontSize: "0.85rem", marginBottom: "1rem" }}>
              {st("crawler_desc")}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
              {/* Crawler Parameters Panel */}
              <div style={{
                background: "rgba(255, 255, 255, 0.45)",
                border: "1px solid var(--card-border)",
                borderRadius: "10px",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem"
              }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.25rem", display: "block" }}>
                  ⚙️ {st("spider_params")}
                </span>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{st("target_portal")}</label>
                  <input
                    type="url"
                    placeholder="https://ellibrary.moe.gov.eg"
                    value={crawlUrl}
                    onChange={(e) => setBookCrawlUrl(e.target.value)}
                    style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.85rem" }}
                  />
                </div>

                <div style={{
                  background: "rgba(16, 107, 163, 0.04)",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px dashed rgba(16, 107, 163, 0.15)",
                  fontSize: "0.75rem",
                  color: "var(--primary)"
                }}>
                  ℹ️ {st("crawler_info")}
                </div>

                <button
                  type="button"
                  onClick={handleStartCrawling}
                  disabled={isCrawling || !crawlUrl}
                  style={{
                    background: "var(--primary)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.5rem",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: (isCrawling || !crawlUrl) ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    marginTop: "0.5rem"
                  }}
                >
                  {isCrawling ? (
                    <>
                      <FiRefreshCw className="spinning-icon" />
                      <span>{st("crawling_nodes")}</span>
                    </>
                  ) : (
                    <>
                      <FiSearch />
                      <span>{st("crawl_explore")}</span>
                    </>
                  )}
                </button>

                {isCrawling && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 700 }}>
                        {st("crawl_progress_label")}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--primary)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                        {crawlProgress}%
                      </span>
                    </div>
                    <div style={{ height: "6px", background: "rgba(16, 107, 163, 0.1)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{
                        width: `${crawlProgress}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, var(--primary) 0%, #00e5ff 100%)",
                        borderRadius: "3px",
                        transition: "width 0.4s ease-out"
                      }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Crawler Terminal Output */}
              <div 
                ref={crawlerContainerRef}
                style={{
                  background: "#0c0f13",
                  border: "1px solid #1a202c",
                  borderRadius: "10px",
                  padding: "0.75rem 1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                  height: "220px",
                  overflowY: "auto",
                  boxShadow: "inset 0 4px 12px rgba(0,0,0,0.6)"
                }}
              >
                <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "#6a7c88", borderBottom: "1px solid #1a202c", paddingBottom: "4px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                  🕷️ CRAWLER_EXPLORER_CONSOLE_OUTPUT
                </span>
                {crawlLogs.length === 0 ? (
                  <div style={{ color: "#4f6371", fontSize: "0.75rem", fontFamily: "var(--font-mono)", textAlign: "center", marginTop: "3rem" }}>
                    {st("crawler_idle")}
                  </div>
                ) : (
                crawlLogs.map((log, idx) => (
                  <div key={idx} style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.7rem",
                    lineHeight: "1rem",
                    color: "#a0aec0"
                  }}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Crawled Results Shelf */}
          {discoveredResources.length > 0 && (() => {
            const totalDiscovered = discoveredResources.length;
            const coreCount = discoveredResources.filter(r => r.bookType === "core").length;
            const studentSupportCount = discoveredResources.filter(r => r.bookType === "student_support").length;
            const instructorSupportCount = discoveredResources.filter(r => r.bookType === "instructor_support").length;

            const subjects = Array.from(new Set(discoveredResources.map((r: any) => r.subject)));

            const subjectTranslations: Record<string, Record<string, string>> = {
              "Computer Science": {
                en: "Computer Science",
                ar: "علوم الحاسوب",
                es: "Ciencias de la Computación",
                fr: "Informatique",
                de: "Informatik",
                zh: "计算机科学",
                it: "Informatica"
              },
              "Mathematics": {
                en: "Mathematics",
                ar: "الرياضيات",
                es: "Matemáticas",
                fr: "Mathématiques",
                de: "Mathematik",
                zh: "数学",
                it: "Matematica"
              },
              "Physics": {
                en: "Physics",
                ar: "الفيزياء",
                es: "Física",
                fr: "Physique",
                de: "Physik",
                zh: "物理",
                it: "Fisica"
              },
              "Chemistry": {
                en: "Chemistry",
                ar: "الكيمياء",
                es: "Química",
                fr: "Chimie",
                de: "Chemie",
                zh: "化学",
                it: "Chimica"
              },
              "Biology": {
                en: "Biology",
                ar: "علم الأحياء",
                es: "Biología",
                fr: "Biologie",
                de: "Biologie",
                zh: "生物",
                it: "Biologia"
              }
            };

            const isSubjectFullySelected = (subject: string) => {
              const subBooks = discoveredResources.filter(r => r.subject === subject);
              if (subBooks.length === 0) return false;
              return subBooks.every(r => selectedResources[r.id]);
            };

            const toggleSubjectSelection = (subject: string) => {
              const subBooks = discoveredResources.filter(r => r.subject === subject);
              const allSelected = isSubjectFullySelected(subject);
              setSelectedResources(prev => {
                const updated = { ...prev };
                subBooks.forEach(r => {
                  updated[r.id] = !allSelected;
                });
                return updated;
              });
            };

            const isAllSelected = discoveredResources.length > 0 && discoveredResources.every(r => selectedResources[r.id]);

            const toggleGlobalSelection = () => {
              const nextVal = !isAllSelected;
              setSelectedResources(() => {
                const updated: Record<string, boolean> = {};
                discoveredResources.forEach(r => {
                  updated[r.id] = nextVal;
                });
                return updated;
              });
            };

            const selectedCount = discoveredResources.filter(r => selectedResources[r.id]).length;

            return (
              <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                
                {/* Section Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    🔍 {st("crawler_dashboard_title")}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "#64748b", background: "rgba(16, 107, 163, 0.08)", padding: "2px 8px", borderRadius: "20px" }}>
                    OpenStax Deep-Crawled Assets
                  </span>
                </div>

                {/* VISUAL STATISTICS DASHBOARD */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.75rem",
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.5) 100%)",
                  borderRadius: "12px",
                  padding: "1rem",
                  border: "1px solid var(--card-border)",
                  boxShadow: "0 4px 20px -2px rgba(16, 107, 163, 0.05)"
                }}>
                  {/* Card 1: Total */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem" }}>
                    <div style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "10px",
                      background: "rgba(16, 107, 163, 0.1)",
                      color: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.2rem"
                    }}>
                      <FiSearch />
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "1.25rem", fontWeight: 800, color: "var(--foreground)", lineHeight: "1" }}>{totalDiscovered}</span>
                      <span style={{ display: "block", fontSize: "0.65rem", color: "#64748b", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {st("total_discovered")}
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Core Textbooks */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem" }}>
                    <div style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "10px",
                      background: "rgba(39, 174, 96, 0.1)",
                      color: "var(--accent-green)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.2rem"
                    }}>
                      📘
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "1.25rem", fontWeight: 800, color: "var(--foreground)", lineHeight: "1" }}>{coreCount}</span>
                      <span style={{ display: "block", fontSize: "0.65rem", color: "#64748b", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {st("core_textbooks")}
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Student Support */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem" }}>
                    <div style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "10px",
                      background: "rgba(241, 196, 15, 0.15)",
                      color: "#b78a02",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.2rem"
                    }}>
                      📒
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "1.25rem", fontWeight: 800, color: "var(--foreground)", lineHeight: "1" }}>{studentSupportCount}</span>
                      <span style={{ display: "block", fontSize: "0.65rem", color: "#64748b", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {st("student_supports")}
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Instructor Support */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem" }}>
                    <div style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "10px",
                      background: "rgba(230, 126, 34, 0.1)",
                      color: "#e67e22",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.2rem"
                    }}>
                      📙
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: "1.25rem", fontWeight: 800, color: "var(--foreground)", lineHeight: "1" }}>{instructorSupportCount}</span>
                      <span style={{ display: "block", fontSize: "0.65rem", color: "#64748b", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {st("instructor_resources")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SUBJECT DISTRIBUTION CHART */}
                <div style={{
                  background: "rgba(255, 255, 255, 0.55)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "12px",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem"
                }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#4f6371", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    📊 {st("crawled_subject_distribution")}
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.25rem" }}>
                    {subjects.map((subj: any) => {
                      const subjBooks = discoveredResources.filter(r => r.subject === subj);
                      const percentage = Math.round((subjBooks.length / totalDiscovered) * 100);
                      const localizedName = subjectTranslations[subj]?.[language] || subjectTranslations[subj]?.["en"] || subj;
                      
                      // Assign color scheme based on subject name
                      let barColor = "linear-gradient(90deg, #106ba3, #1ba39c)";
                      if (subj.includes("Computer")) barColor = "linear-gradient(90deg, #4f46e5, #06b6d4)";
                      else if (subj.includes("Math")) barColor = "linear-gradient(90deg, #db2777, #f43f5e)";
                      else if (subj.includes("Physic")) barColor = "linear-gradient(90deg, #d97706, #f59e0b)";
                      else if (subj.includes("Biolog")) barColor = "linear-gradient(90deg, #059669, #10b981)";
                      else if (subj.includes("Chemist")) barColor = "linear-gradient(90deg, #7c3aed, #8b5cf6)";

                      return (
                        <div key={subj} style={{ flex: "1 1 calc(20% - 0.5rem)", minWidth: "140px", background: "#f8fafc", border: "1px solid rgba(16, 107, 163, 0.05)", borderRadius: "8px", padding: "0.5rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", fontWeight: 700, color: "var(--foreground)" }}>
                            <span>{localizedName}</span>
                            <span>{subjBooks.length} ({percentage}%)</span>
                          </div>
                          <div style={{ height: "6px", width: "100%", background: "#e2e8f0", borderRadius: "10px", marginTop: "4px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${percentage}%`, background: barColor, borderRadius: "10px", transition: "width 0.8s ease-out" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* BULK ACTION TOOLBAR */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "linear-gradient(90deg, rgba(16, 107, 163, 0.04) 0%, rgba(27, 163, 156, 0.04) 100%)",
                  border: "1px solid rgba(16, 107, 163, 0.12)",
                  borderRadius: "10px",
                  padding: "0.75rem 1rem",
                  flexWrap: "wrap",
                  gap: "0.75rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, color: "var(--foreground)" }}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleGlobalSelection}
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          accentColor: "var(--primary)"
                        }}
                      />
                      <span>{st("select_all_discovered")}</span>
                    </label>

                    <div style={{ height: "16px", width: "1px", background: "rgba(16, 107, 163, 0.2)" }} />

                    <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 800 }}>
                      {st("selected_resources_count", { selectedCount: String(selectedCount), totalDiscovered: String(totalDiscovered) })}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      onClick={handleImportSelectedBooks}
                      disabled={selectedCount === 0 || importingBulk}
                      type="button"
                      style={{
                        background: selectedCount === 0 ? "#cbd5e1" : "linear-gradient(135deg, var(--secondary), var(--primary))",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "6px 16px",
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        cursor: (selectedCount === 0 || importingBulk) ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: selectedCount === 0 ? "none" : "0 4px 12px rgba(16, 107, 163, 0.15)",
                        transition: "all 0.2s"
                      }}
                    >
                      {importingBulk ? (
                        <>
                          <FiRefreshCw className="spinning-icon" />
                          <span>{st("importing_selected_status")}</span>
                        </>
                      ) : (
                        <>
                          <FiDownloadCloud />
                          <span>
                            {st("import_selected_btn", { selectedCount: String(selectedCount) })}
                          </span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleImportAllCrawled}
                      disabled={totalDiscovered === 0 || importingBulk}
                      type="button"
                      style={{
                        background: totalDiscovered === 0 ? "#cbd5e1" : "linear-gradient(135deg, #10b981, #059669)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "6px 16px",
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        cursor: (totalDiscovered === 0 || importingBulk) ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: totalDiscovered === 0 ? "none" : "0 4px 12px rgba(16, 185, 129, 0.15)",
                        transition: "all 0.2s"
                      }}
                    >
                      {importingBulk ? (
                        <>
                          <FiRefreshCw className="spinning-icon" />
                          <span>{st("importing_all_status")}</span>
                        </>
                      ) : (
                        <>
                          <FiDownloadCloud />
                          <span>
                            {st("import_all_btn")}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* DIRECTORY TREE EXPLORER */}
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  background: "rgba(255, 255, 255, 0.75)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "12px",
                  padding: "1rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                }}>
                  {subjects.map((subj: any) => {
                    const subBooks = discoveredResources.filter(r => r.subject === subj);
                    const isExpanded = !!expandedFolders[subj];
                    const isFullySelected = isSubjectFullySelected(subj);
                    const isPartiallySelected = !isFullySelected && discoveredResources.filter(r => r.subject === subj).some(r => selectedResources[r.id]);
                    const localizedSubj = subjectTranslations[subj]?.[language] || subjectTranslations[subj]?.["en"] || subj;

                    return (
                      <div key={subj} style={{ display: "flex", flexDirection: "column", border: "1px solid rgba(16, 107, 163, 0.05)", borderRadius: "8px", overflow: "hidden", marginBottom: "0.25rem" }}>
                        {/* Folder Header Row */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.6rem 0.8rem",
                          background: "linear-gradient(90deg, #f8fafc 0%, rgba(255,255,255,0.9) 100%)",
                          borderBottom: isExpanded ? "1px solid rgba(16, 107, 163, 0.08)" : "none",
                          transition: "background 0.2s"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                            {/* Expand Arrow Icon */}
                            <button
                              type="button"
                              onClick={() => setExpandedFolders(prev => ({ ...prev, [subj]: !prev[subj] }))}
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "#64748b",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "4px",
                                borderRadius: "4px",
                                transition: "all 0.2s"
                              }}
                            >
                              {isExpanded ? <FiChevronDown style={{ fontSize: "1rem" }} /> : <FiChevronRight style={{ fontSize: "1rem" }} />}
                            </button>

                            {/* Folder Icon */}
                            <FiFolder style={{ color: "var(--primary)", fontSize: "1.1rem" }} />

                            {/* Folder Name & Translate */}
                            <span 
                              onClick={() => setExpandedFolders(prev => ({ ...prev, [subj]: !prev[subj] }))}
                              style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--foreground)", cursor: "pointer", userSelect: "none" }}
                            >
                              {localizedSubj}
                            </span>

                            {/* Files Count Tag */}
                            <span style={{ fontSize: "0.65rem", background: "rgba(16, 107, 163, 0.06)", color: "var(--primary)", padding: "1px 6px", borderRadius: "10px", fontWeight: 700 }}>
                              {subBooks.length} {st("files_count")}
                            </span>
                          </div>

                          {/* Folder Checkbox */}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 700 }}>
                              {st("select_folder")}
                            </span>
                            <input
                              type="checkbox"
                              checked={isFullySelected}
                              ref={el => {
                                if (el) {
                                  el.indeterminate = isPartiallySelected;
                                }
                              }}
                              onChange={() => toggleSubjectSelection(subj)}
                              style={{
                                width: "16px",
                                height: "16px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                accentColor: "var(--primary)"
                              }}
                            />
                          </div>
                        </div>

                        {/* Folder Children List */}
                        {isExpanded && (
                          <div style={{
                            padding: "0.25rem 0.5rem 0.5rem 1.5rem",
                            background: "rgba(255,255,255,0.45)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem",
                            borderLeft: "2px solid rgba(16, 107, 163, 0.08)",
                            marginLeft: "1rem",
                            marginTop: "0.25rem"
                          }}>
                            {subBooks.map((res: any) => {
                              const isBookSelected = !!selectedResources[res.id];
                              
                              // Determine book Type details
                              let bookTypeLabel = st("type_core_book");
                              let bookTypeColor = "rgba(39, 174, 96, 0.1)";
                              let bookTypeTextColor = "var(--accent-green)";
                              let bookIcon = "📘";

                              if (res.bookType === "student_support") {
                                bookTypeLabel = st("type_student_support");
                                bookTypeColor = "rgba(241, 196, 15, 0.12)";
                                bookTypeTextColor = "#b78a02";
                                bookIcon = "📒";
                              } else if (res.bookType === "instructor_support") {
                                bookTypeLabel = st("type_instructor_support");
                                bookTypeColor = "rgba(230, 126, 34, 0.1)";
                                bookTypeTextColor = "#d35400";
                                bookIcon = "📙";
                              }

                              return (
                                <div
                                  key={res.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "0.4rem 0.6rem",
                                    background: isBookSelected ? "rgba(16, 107, 163, 0.03)" : "transparent",
                                    borderRadius: "6px",
                                    border: isBookSelected ? "1px solid rgba(16, 107, 163, 0.1)" : "1px solid transparent",
                                    transition: "all 0.15s"
                                  }}
                                  className="crawler-item-row"
                                >
                                  {/* Left: Checkbox, Icon, Title info */}
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1 }}>
                                    <input
                                      type="checkbox"
                                      checked={isBookSelected}
                                      onChange={() => {
                                        setSelectedResources(prev => ({
                                          ...prev,
                                          [res.id]: !prev[res.id]
                                        }));
                                      }}
                                      style={{
                                        width: "14px",
                                        height: "14px",
                                        borderRadius: "3px",
                                        cursor: "pointer",
                                        accentColor: "var(--primary)"
                                      }}
                                    />
                                    <span style={{ fontSize: "1rem" }}>{bookIcon}</span>
                                    
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground)" }}>
                                        {res.title}
                                      </span>
                                      {res.titleAr && res.titleAr !== res.title && (
                                        <span style={{ fontSize: "0.65rem", color: "#64748b", fontFamily: "Cairo, var(--font-sans)" }}>
                                          {res.titleAr}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Badges & Actions */}
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    {/* Type Badge */}
                                    <span style={{
                                      fontSize: "0.6rem",
                                      fontWeight: 800,
                                      background: bookTypeColor,
                                      color: bookTypeTextColor,
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      textTransform: "uppercase",
                                      whiteSpace: "nowrap"
                                    }}>
                                      {bookTypeLabel}
                                    </span>

                                    {/* Pages Badge */}
                                    <span style={{
                                      fontSize: "0.6rem",
                                      background: "rgba(226, 232, 240, 0.5)",
                                      color: "#475569",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      whiteSpace: "nowrap"
                                    }}>
                                      {res.totalPages} p
                                    </span>

                                    {/* Action buttons inside crawler list item */}
                                    <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                                      {/* Pre-fill Form */}
                                      <button
                                        onClick={() => handlePreFillFromCrawler(res)}
                                        type="button"
                                        title={st("configure_import_manually")}
                                        style={{
                                          padding: "4px",
                                          borderRadius: "4px",
                                          border: "1px solid rgba(16, 107, 163, 0.2)",
                                          background: "transparent",
                                          color: "var(--primary)",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          transition: "all 0.15s"
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = "var(--primary)";
                                          e.currentTarget.style.color = "#ffffff";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = "transparent";
                                          e.currentTarget.style.color = "var(--primary)";
                                        }}
                                      >
                                        <FiSliders style={{ fontSize: "0.75rem" }} />
                                      </button>

                                      {/* Direct Individual Ingestion */}
                                      <button
                                        onClick={() => handleIngestSingleDiscovered(res)}
                                        type="button"
                                        title={st("direct_ingest_single")}
                                        style={{
                                          padding: "4px",
                                          borderRadius: "4px",
                                          border: "1px solid rgba(27, 163, 156, 0.2)",
                                          background: "transparent",
                                          color: "var(--secondary)",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          transition: "all 0.15s"
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = "var(--secondary)";
                                          e.currentTarget.style.color = "#ffffff";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = "transparent";
                                          e.currentTarget.style.color = "var(--secondary)";
                                        }}
                                      >
                                        <FiZap style={{ fontSize: "0.75rem" }} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })()}
        </section>
      )}

        {/* ROW 3: Tabbed Subjects & Books Relational Console */}
        <section className="panel-card" style={{ width: "100%", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          
          {/* Custom Emojis List for the Picker */}
          {(() => {
            const emojisList = ["📚", "🔬", "📐", "🧪", "🪐", "🧬", "💻", "🎨", "🌍", "🗺️", "🧠", "⚖️", "📜", "💬", "🤖", "📖", "🔢", "✍️", "⚙️", "🛠️"];
            
            return (
              <>
                {/* Visual Tab Selection Header */}
                <div style={{
                  display: "flex",
                  borderBottom: "1px solid rgba(16, 107, 163, 0.1)",
                  marginBottom: "1rem",
                  gap: "1.25rem",
                  paddingBottom: "0.25rem",
                  flexWrap: "wrap"
                }}>
                  {[
                    { id: "subjects", key: "tab_subjects" },
                    { id: "books", key: "tab_books" },
                    { id: "ingest", key: "tab_ingest" },
                    { id: "lists", key: "tab_lists" }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setSubjectError(null);
                        setSubjectSuccess(null);
                        setBookError(null);
                        setBookSuccess(null);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        fontSize: "0.9rem",
                        fontWeight: 800,
                        color: activeTab === tab.id ? "var(--primary)" : "#64748b",
                        cursor: "pointer",
                        padding: "0.5rem 0.75rem",
                        borderBottom: activeTab === tab.id ? "3px solid var(--primary)" : "3px solid transparent",
                        transition: "all 0.15s",
                        fontFamily: language === "ar" ? "Cairo, var(--font-sans)" : "var(--font-sans)"
                      }}
                    >
                      {st(tab.key)}
                    </button>
                  ))}
                </div>

                {/* Main Notifications inside bottom console */}
                {subjectError && (
                  <div style={{ padding: "0.5rem", background: "rgba(211, 47, 47, 0.08)", border: "1px solid rgba(211, 47, 47, 0.15)", borderRadius: "4px", color: "#f87171", fontSize: "0.8rem" }}>
                    {subjectError}
                  </div>
                )}
                {subjectSuccess && (
                  <div style={{ padding: "0.5rem", background: "rgba(39, 174, 96, 0.08)", border: "1px solid rgba(39, 174, 96, 0.15)", borderRadius: "4px", color: "var(--accent-green)", fontSize: "0.8rem" }}>
                    {subjectSuccess}
                  </div>
                )}
                {bookError && (
                  <div style={{ padding: "0.5rem", background: "rgba(211, 47, 47, 0.08)", border: "1px solid rgba(211, 47, 47, 0.15)", borderRadius: "4px", color: "#f87171", fontSize: "0.8rem" }}>
                    {bookError}
                  </div>
                )}
                {bookSuccess && (
                  <div style={{ padding: "0.5rem", background: "rgba(39, 174, 96, 0.08)", border: "1px solid rgba(39, 174, 96, 0.15)", borderRadius: "4px", color: "var(--accent-green)", fontSize: "0.8rem" }}>
                    {bookSuccess}
                  </div>
                )}

                {/* TAB 1: Subjects Console */}
                {activeTab === "subjects" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
                    
                    {/* Add or Edit Form Panel */}
                    <div style={{ background: "rgba(255, 255, 255, 0.45)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
                      {editingSubjectId ? (
                        <form onSubmit={handleUpdateSubject} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--card-border)", paddingBottom: "4px" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)" }}>✏️ {language === "ar" ? "تعديل المادة الدراسية" : "Edit Subject"}</span>
                            <button
                              type="button"
                              onClick={() => setEditingSubjectId(null)}
                              style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}
                            >
                              {language === "ar" ? "إلغاء التعديل" : "Cancel Edit"}
                            </button>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "اسم المادة (إنجليزي)" : "Subject Name (English)"}</label>
                            <input
                              type="text"
                              value={editingSubjName}
                              onChange={(e) => setEditingSubjName(e.target.value)}
                              required
                              style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.8rem" }}
                            />
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "اسم المادة (عربي)" : "Subject Name (Arabic)"}</label>
                            <input
                              type="text"
                              value={editingSubjNameAr}
                              onChange={(e) => setEditingSubjNameAr(e.target.value)}
                              required
                              style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.8rem", fontFamily: "Cairo" }}
                            />
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "المرحلة الدراسية" : "Grade Level"}</label>
                              <select value={editingSubjGrade} onChange={(e) => setEditingSubjGrade(e.target.value)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.8rem" }}>
                                {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "التصنيف" : "Category"}</label>
                              <select value={editingSubjCategory} onChange={(e) => setEditingSubjCategory(e.target.value)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.8rem" }}>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          </div>

                          {/* Clickable Emoji Picker Grid */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>
                              {language === "ar" ? `الرمز المختار: ${editingSubjEmoji}` : `Selected Icon: ${editingSubjEmoji}`}
                            </label>
                            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", background: "rgba(255,255,255,0.7)", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--card-border)" }}>
                              {emojisList.map(em => (
                                <button
                                  key={em}
                                  type="button"
                                  onClick={() => setEditingSubjEmoji(em)}
                                  style={{
                                    background: editingSubjEmoji === em ? "var(--primary)" : "transparent",
                                    border: editingSubjEmoji === em ? "1px solid var(--primary)" : "1px solid transparent",
                                    borderRadius: "4px",
                                    fontSize: "1rem",
                                    padding: "4px",
                                    cursor: "pointer",
                                    transition: "all 0.1s"
                                  }}
                                >
                                  {em}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button type="submit" disabled={isCreatingSubject} style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: "6px", padding: "0.5rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                            {isCreatingSubject ? <FiRefreshCw className="spinning-icon" /> : <><FiCheck /> <span>{language === "ar" ? "حفظ التعديلات" : "Save Changes"}</span></>}
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleCreateSubject} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)", borderBottom: "1px solid var(--card-border)", paddingBottom: "4px" }}>➕ {language === "ar" ? "إضافة مادة دراسية جديدة" : "Add New Subject"}</span>
                          
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "اسم المادة (إنجليزي)" : "Subject Name (English)"}</label>
                            <input
                              type="text"
                              placeholder="e.g. Computer Science"
                              value={subjName}
                              onChange={(e) => setSubjName(e.target.value)}
                              required
                              style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.8rem" }}
                            />
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "اسم المادة (عربي)" : "Subject Name (Arabic)"}</label>
                            <input
                              type="text"
                              placeholder="مثال: علوم الحاسب"
                              value={subjNameAr}
                              onChange={(e) => setSubjNameAr(e.target.value)}
                              required
                              style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.8rem", fontFamily: "Cairo" }}
                            />
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "المرحلة الدراسية" : "Grade Level"}</label>
                              <select value={subjGrade} onChange={(e) => setSubjGrade(e.target.value)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.8rem" }}>
                                {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "التصنيف" : "Category"}</label>
                              <select value={subjCategory} onChange={(e) => setSubjCategory(e.target.value)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.8rem" }}>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          </div>

                          {/* Clickable Emoji Picker Grid */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>
                              {language === "ar" ? `الرمز المختار: ${subjEmoji}` : `Selected Icon: ${subjEmoji}`}
                            </label>
                            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", background: "rgba(255,255,255,0.7)", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--card-border)" }}>
                              {emojisList.map(em => (
                                <button
                                  key={em}
                                  type="button"
                                  onClick={() => setSubjEmoji(em)}
                                  style={{
                                    background: subjEmoji === em ? "var(--primary)" : "transparent",
                                    border: subjEmoji === em ? "1px solid var(--primary)" : "1px solid transparent",
                                    borderRadius: "4px",
                                    fontSize: "1rem",
                                    padding: "4px",
                                    cursor: "pointer",
                                    transition: "all 0.1s"
                                  }}
                                >
                                  {em}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button type="submit" disabled={isCreatingSubject} style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: "6px", padding: "0.5rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                            {isCreatingSubject ? <FiRefreshCw className="spinning-icon" /> : <><FiPlus /> <span>{language === "ar" ? "إنشاء المادة الدراسية" : "Create Subject"}</span></>}
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Active Subjects List */}
                    <div style={{ background: "rgba(255, 255, 255, 0.45)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--card-border)", maxHeight: "400px", overflowY: "auto" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)", display: "block", borderBottom: "1px solid var(--card-border)", paddingBottom: "4px", marginBottom: "0.5rem" }}>
                        📂 {language === "ar" ? "المواد الدراسية النشطة" : "Active Subjects Catalog"}
                      </span>

                      {subjectsList.length === 0 ? (
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{language === "ar" ? "لا توجد مواد مضافة بعد." : "No subjects loaded."}</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {subjectsList.map((subj) => (
                            <div key={subj._id} style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: "rgba(255, 255, 255, 0.85)",
                              padding: "0.5rem 0.75rem",
                              borderRadius: "6px",
                              border: "1px solid var(--card-border)",
                              fontSize: "0.8rem"
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontSize: "1.2rem" }}>{subj.icon_emoji}</span>
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  <span style={{ fontWeight: 700 }}>{language === "ar" ? subj.name_ar : subj.name}</span>
                                  <span style={{ fontSize: "0.65rem", color: "#64748b" }}>{subj.grade_level} • {subj.category} • {subj.books_count || 0} books</span>
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: "0.25rem" }}>
                                <button
                                  onClick={() => {
                                    setEditingSubjectId(subj._id);
                                    setEditingSubjName(subj.name);
                                    setEditingSubjNameAr(subj.name_ar);
                                    setEditingSubjGrade(subj.grade_level);
                                    setEditingSubjCategory(subj.category);
                                    setEditingSubjEmoji(subj.icon_emoji || "📚");
                                    setSubjectError(null);
                                    setSubjectSuccess(null);
                                  }}
                                  style={{ background: "transparent", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "0.9rem" }}
                                  title="Edit Subject"
                                >
                                  <FiEdit />
                                </button>
                                <button
                                  onClick={() => handleDeleteSubject(subj._id)}
                                  style={{ background: "transparent", border: "none", color: "#d32f2f", cursor: "pointer", fontSize: "0.9rem" }}
                                  title="Delete Subject"
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* TAB 2: Textbook Catalog */}
                {activeTab === "books" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    
                    {/* Expandable inline book edit console */}
                    {editingBookId && (
                      <div style={{ background: "rgba(16, 107, 163, 0.05)", border: "1px solid rgba(16, 107, 163, 0.2)", borderRadius: "8px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(16, 107, 163, 0.15)", paddingBottom: "4px" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)" }}>✏️ {language === "ar" ? "تعديل بيانات وفصول الكتاب المنهجي" : "Edit Textbook Metadata & Chapters"}</span>
                          <button
                            type="button"
                            onClick={() => setEditingBookId(null)}
                            style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}
                          >
                            {language === "ar" ? "إلغاء التعديل" : "Cancel Book Edit"}
                          </button>
                        </div>

                        <form onSubmit={handleUpdateBook} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "العنوان (إنجليزي)" : "Book Title (English)"}</label>
                              <input
                                type="text"
                                value={editingBookTitle}
                                onChange={(e) => setEditingBookTitle(e.target.value)}
                                required
                                style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.8rem" }}
                              />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "العنوان (عربي)" : "Book Title (Arabic)"}</label>
                              <input
                                type="text"
                                value={editingBookTitleAr}
                                onChange={(e) => setEditingBookTitleAr(e.target.value)}
                                required
                                style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.8rem", fontFamily: "Cairo" }}
                              />
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.35rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <label style={{ fontSize: "0.65rem", fontWeight: 700 }}>Subject</label>
                              <select value={editingBookSubjId} onChange={(e) => setEditingBookSubjId(e.target.value)} style={{ padding: "0.35rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }}>
                                {subjectsList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                              </select>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <label style={{ fontSize: "0.65rem", fontWeight: 700 }}>Grade</label>
                              <select value={editingBookGrade} onChange={(e) => setEditingBookGrade(e.target.value)} style={{ padding: "0.35rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }}>
                                {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <label style={{ fontSize: "0.65rem", fontWeight: 700 }}>Term</label>
                              <select value={editingBookTerm} onChange={(e) => setEditingBookTerm(e.target.value)} style={{ padding: "0.35rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }}>
                                {terms.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <label style={{ fontSize: "0.65rem", fontWeight: 700 }}>Lang</label>
                              <select value={editingBookLang} onChange={(e) => setEditingBookLang(e.target.value)} style={{ padding: "0.35rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }}>
                                {languagesList.map(l => <option key={l} value={l}>{l === "ar" ? "العربية" : l === "en" ? "English" : l}</option>)}
                              </select>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <label style={{ fontSize: "0.65rem", fontWeight: 700 }}>Type</label>
                              <select value={editingBookType} onChange={(e) => setEditingBookType(e.target.value)} style={{ padding: "0.35rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }}>
                                <option value="core">Core Book</option>
                                <option value="student_support">Student Guide</option>
                                <option value="instructor_support">Instructor Guide</option>
                              </select>
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <label style={{ fontSize: "0.7rem", fontWeight: 700 }}>Source URL</label>
                              <input type="text" value={editingBookSourceUrl} onChange={(e) => setEditingBookSourceUrl(e.target.value)} style={{ padding: "0.35rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <label style={{ fontSize: "0.7rem", fontWeight: 700 }}>Storage Path</label>
                              <input type="text" value={editingBookStoragePath} onChange={(e) => setEditingBookStoragePath(e.target.value)} style={{ padding: "0.35rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }} />
                            </div>
                          </div>

                          {/* Editable Chapters Builder inside Edit Book */}
                          <div style={{ background: "rgba(0,0,0,0.02)", border: "1px dashed rgba(16, 107, 163, 0.2)", borderRadius: "6px", padding: "0.5rem" }}>
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)", display: "block", marginBottom: "0.35rem" }}>📑 Chapters Segments Blueprint ({editingBookChapters.length})</span>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", maxHeight: "100px", overflowY: "auto", marginBottom: "0.5rem" }}>
                              {editingBookChapters.map((ch, idx) => (
                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,0.85)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", border: "1px solid var(--card-border)" }}>
                                  <span>{language === "ar" ? ch.title_ar : ch.title} (Pages {ch.page_start}-{ch.page_end})</span>
                                  <button type="button" onClick={() => setEditingBookChapters(editingBookChapters.filter((_, i) => i !== idx))} style={{ background: "transparent", border: "none", color: "#d32f2f", cursor: "pointer" }}><FiTrash2 /></button>
                                </div>
                              ))}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr", gap: "0.25rem", alignItems: "center" }}>
                              <input type="text" placeholder="Ch Title" value={editChTitle} onChange={(e) => setEditChTitle(e.target.value)} style={{ padding: "0.25rem", fontSize: "0.7rem", borderRadius: "4px", border: "1px solid var(--card-border)" }} />
                              <input type="text" placeholder="العنوان" value={editChTitleAr} onChange={(e) => setEditChTitleAr(e.target.value)} style={{ padding: "0.25rem", fontSize: "0.7rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontFamily: "Cairo" }} />
                              <input type="number" placeholder="Start" value={editChStartPage} onChange={(e) => setEditChStartPage(Number(e.target.value))} style={{ padding: "0.25rem", fontSize: "0.7rem", borderRadius: "4px", border: "1px solid var(--card-border)" }} />
                              <input type="number" placeholder="End" value={editChEndPage} onChange={(e) => setEditChEndPage(Number(e.target.value))} style={{ padding: "0.25rem", fontSize: "0.7rem", borderRadius: "4px", border: "1px solid var(--card-border)" }} />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!editChTitle || !editChTitleAr) return;
                                  setEditingBookChapters([...editingBookChapters, {
                                    title: editChTitle,
                                    title_ar: editChTitleAr,
                                    page_start: Number(editChStartPage),
                                    page_end: Number(editChEndPage),
                                    concepts: editChConcepts ? editChConcepts.split(",").map(c => c.trim()).filter(Boolean) : []
                                  }]);
                                  setEditChTitle("");
                                  setEditChTitleAr("");
                                  setEditChStartPage(Number(editChEndPage) + 1);
                                  setEditChEndPage(Number(editChEndPage) + 15);
                                  setEditChConcepts("");
                                }}
                                style={{ background: "rgba(27,163,156,0.1)", border: "1px solid var(--secondary)", borderRadius: "4px", padding: "4px", cursor: "pointer", fontSize: "0.7rem" }}
                              >
                                Add
                              </button>
                            </div>
                            <input type="text" placeholder="Concepts (comma-separated)" value={editChConcepts} onChange={(e) => setEditChConcepts(e.target.value)} style={{ padding: "0.25rem", fontSize: "0.7rem", borderRadius: "4px", border: "1px solid var(--card-border)", width: "100%", marginTop: "0.25rem" }} />
                          </div>

                          <button type="submit" disabled={isIngestingBook} style={{ background: "var(--secondary)", color: "#fff", border: "none", borderRadius: "6px", padding: "0.5rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                            {isIngestingBook ? <FiRefreshCw className="spinning-icon" /> : <><FiCheck /> <span>{language === "ar" ? "حفظ تعديلات الكتاب" : "Commit Textbook Changes"}</span></>}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Book catalog grouped by subject - Premium Collapsible Accordion checklist tree */}
                    <div style={{ background: "rgba(255, 255, 255, 0.45)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--card-border)", maxHeight: "500px", overflowY: "auto" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)", display: "block", borderBottom: "1px solid var(--card-border)", paddingBottom: "4px", marginBottom: "0.75rem" }}>
                        📚 {language === "ar" ? "فهرس ومستودع الكتب الحالية" : "Active Textbook Repository"}
                      </span>

                      {booksList.length === 0 ? (
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{language === "ar" ? "لا توجد كتب مضافة حالياً." : "No books active in DB."}</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          
                          {/* Accordion and Selection Toolbar */}
                          <div style={{
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center", 
                            background: "rgba(255, 255, 255, 0.6)", 
                            padding: "0.5rem 0.75rem", 
                            borderRadius: "8px", 
                            border: "1px solid var(--card-border)", 
                            marginBottom: "0.25rem",
                            gap: "0.5rem",
                            flexWrap: "wrap"
                          }}>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const allIds: Record<string, boolean> = {};
                                  booksList.forEach(b => { allIds[b._id] = true; });
                                  setSelectedRepoBooks(allIds);
                                  addTerminalLog(`[REPOS_SELECTION] Selected all ${booksList.length} textbooks in repository.`);
                                }}
                                style={{
                                  background: "rgba(16, 107, 163, 0.1)",
                                  color: "var(--primary)",
                                  border: "1px solid var(--primary)",
                                  borderRadius: "6px",
                                  padding: "0.3rem 0.6rem",
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  cursor: "pointer"
                                }}
                              >
                                {language === "ar" ? "تحديد الكل" : "Select All"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRepoBooks({});
                                  addTerminalLog(`[REPOS_SELECTION] Cleared active repository selection.`);
                                }}
                                style={{
                                  background: "rgba(100, 116, 139, 0.1)",
                                  color: "#475569",
                                  border: "1px solid rgba(100, 116, 139, 0.3)",
                                  borderRadius: "6px",
                                  padding: "0.3rem 0.6rem",
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  cursor: "pointer"
                                }}
                              >
                                {language === "ar" ? "إلغاء التحديد" : "Clear All"}
                              </button>
                              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)" }}>
                                {Object.keys(selectedRepoBooks).filter(id => selectedRepoBooks[id]).length} {language === "ar" ? "محدد" : "Selected"}
                              </span>
                            </div>

                            {/* Floating Action Bar / Operations Panel */}
                            {Object.keys(selectedRepoBooks).filter(id => selectedRepoBooks[id]).length > 0 && (
                              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                <button
                                  type="button"
                                  disabled={isReindexingBulkRepo}
                                  onClick={handleBulkReindexRepoBooks}
                                  style={{
                                    background: "linear-gradient(135deg, #1ba39c 0%, #106ba3 100%)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "0.35rem 0.75rem",
                                    fontSize: "0.7rem",
                                    fontWeight: 800,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    boxShadow: "0 2px 8px rgba(27, 163, 156, 0.35)"
                                  }}
                                >
                                  {isReindexingBulkRepo ? <FiRefreshCw className="spinning-icon" /> : <FiZap />}
                                  <span>{language === "ar" ? "إعادة الفهرسة" : "Bulk Re-index"}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeletingBulkRepo}
                                  onClick={handleBulkDeleteRepoBooks}
                                  style={{
                                    background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "0.35rem 0.75rem",
                                    fontSize: "0.7rem",
                                    fontWeight: 800,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    boxShadow: "0 2px 8px rgba(239, 68, 68, 0.35)"
                                  }}
                                >
                                  {isDeletingBulkRepo ? <FiRefreshCw className="spinning-icon" /> : <FiTrash2 />}
                                  <span>{language === "ar" ? "حذف جماعي" : "Bulk Delete"}</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Group books by subject in an Accordion tree */}
                          {subjectsList.map((subj) => {
                            const subjBooks = booksList.filter(b => b.subject_id === subj._id);
                            if (subjBooks.length === 0) return null;
                            const isExpanded = !!expandedRepoFolders[subj._id];

                            return (
                              <div key={subj._id} style={{
                                border: "1px solid var(--card-border)", 
                                borderRadius: "8px", 
                                marginBottom: "0.25rem", 
                                background: "rgba(255,255,255,0.7)",
                                overflow: "hidden",
                                transition: "all 0.25s ease-in-out"
                              }}>
                                {/* Subject Header (Accordion Toggler) */}
                                <div 
                                  onClick={() => setExpandedRepoFolders(prev => ({ ...prev, [subj._id]: !isExpanded }))}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "0.6rem 0.8rem",
                                    background: isExpanded ? "rgba(16, 107, 163, 0.08)" : "transparent",
                                    cursor: "pointer",
                                    borderBottom: isExpanded ? "1px solid var(--card-border)" : "none",
                                    transition: "background 0.2s ease"
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    {isExpanded ? <FiChevronDown style={{ color: "var(--primary)" }} /> : <FiChevronRight style={{ color: "#64748b" }} />}
                                    <FiFolder style={{ color: "var(--primary)", fill: isExpanded ? "rgba(16,107,163,0.2)" : "transparent" }} />
                                    <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--primary)" }}>
                                      {subj.icon_emoji} {language === "ar" ? subj.name_ar : subj.name} ({subj.grade_level})
                                    </span>
                                    <span style={{
                                      fontSize: "0.65rem",
                                      background: "rgba(16,107,163,0.1)",
                                      color: "var(--primary)",
                                      padding: "1px 6px",
                                      borderRadius: "10px",
                                      fontWeight: 700
                                    }}>
                                      {subjBooks.length} {language === "ar" ? "كتب" : "Books"}
                                    </span>
                                  </div>

                                  {/* Header selection helper checkbox */}
                                  <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center" }}>
                                    <input
                                      type="checkbox"
                                      checked={subjBooks.every(b => !!selectedRepoBooks[b._id])}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setSelectedRepoBooks(prev => {
                                          const updated = { ...prev };
                                          subjBooks.forEach(b => {
                                            updated[b._id] = checked;
                                          });
                                          return updated;
                                        });
                                        addTerminalLog(`[REPOS_SELECTION] ${checked ? "Selected" : "Deselected"} all books under ${subj.name}.`);
                                      }}
                                      style={{ width: "14px", height: "14px", cursor: "pointer" }}
                                      title={language === "ar" ? "تحديد كل كتب هذه المادة" : "Select all books in this subject"}
                                    />
                                  </div>
                                </div>

                                {/* Accordion Content / Books List under this subject */}
                                {isExpanded && (
                                  <div style={{ 
                                    display: "grid", 
                                    gridTemplateColumns: "1fr", 
                                    gap: "0.5rem", 
                                    padding: "0.75rem",
                                    background: "rgba(255, 255, 255, 0.45)"
                                  }}>
                                    {subjBooks.map((b) => {
                                      const isBookChecked = !!selectedRepoBooks[b._id];
                                      return (
                                        <div key={b._id} style={{ 
                                          display: "flex", 
                                          justifyContent: "space-between", 
                                          alignItems: "center", 
                                          background: isBookChecked ? "rgba(27, 163, 156, 0.05)" : "rgba(255, 255, 255, 0.9)", 
                                          padding: "0.5rem 0.75rem", 
                                          borderRadius: "6px", 
                                          border: isBookChecked ? "1px solid var(--secondary)" : "1px solid var(--card-border)", 
                                          fontSize: "0.75rem",
                                          transition: "all 0.2s ease"
                                        }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                                            {/* Select Checkbox */}
                                            <input
                                              type="checkbox"
                                              checked={isBookChecked}
                                              onChange={(e) => {
                                                const checked = e.target.checked;
                                                setSelectedRepoBooks(prev => ({
                                                  ...prev,
                                                  [b._id]: checked
                                                }));
                                                addTerminalLog(`[REPOS_SELECTION] ${checked ? "Selected" : "Deselected"} book: "${b.title}"`);
                                              }}
                                              style={{ width: "14px", height: "14px", cursor: "pointer" }}
                                            />

                                            <div style={{ display: "flex", flexDirection: "column" }}>
                                              <span style={{ fontWeight: 700, color: "var(--primary)" }}>📖 {language === "ar" ? b.title_ar : b.title}</span>
                                              <span style={{ fontSize: "0.65rem", color: "#64748b" }}>
                                                Type: {b.book_type} • Lang: {b.language} • {b.chapters?.length || 0} chapters
                                              </span>
                                            </div>
                                          </div>

                                          {/* Edit & Delete Action Buttons */}
                                          <div style={{ display: "flex", gap: "0.25rem" }}>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingBookId(b._id);
                                                setEditingBookSubjId(b.subject_id);
                                                setEditingBookTitle(b.title);
                                                setEditingBookTitleAr(b.title_ar);
                                                setEditingBookGrade(b.grade || "Grade 11");
                                                setEditingBookTerm(b.term || "Term 1");
                                                setEditingBookYear(b.year || "2026");
                                                setEditingBookLang(b.language || "ar");
                                                setEditingBookType(b.book_type || "core");
                                                setEditingBookSourceUrl(b.source_url || "");
                                                setEditingBookStoragePath(b.storage_path || "");
                                                setEditingBookChapters(b.chapters || []);
                                                setBookError(null);
                                                setBookSuccess(null);
                                              }}
                                              style={{ background: "transparent", border: "none", color: "var(--primary)", cursor: "pointer" }}
                                              title="Edit Book Details"
                                            >
                                              <FiEdit />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteBook(b._id)}
                                              style={{ background: "transparent", border: "none", color: "#d32f2f", cursor: "pointer" }}
                                              title="Delete Book"
                                            >
                                              <FiTrash2 />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* TAB 3: Manual Textbook Ingester */}
                {activeTab === "ingest" && (
                  <form onSubmit={handleIngestBook} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", background: "rgba(255, 255, 255, 0.45)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)", borderBottom: "1px solid var(--card-border)", paddingBottom: "4px" }}>✍️ {language === "ar" ? "استيراد وتجهيز كتاب منهجي جديد" : "Ingest New Textbook Context"}</span>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "اختر المادة المرتبطة" : "Select Target Subject"}</label>
                      <select
                        value={bookSubjId}
                        onChange={(e) => setBookSubjId(e.target.value)}
                        required
                        style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}
                      >
                        {subjectsList.length === 0 ? (
                          <option value="">{language === "ar" ? "جاري تحميل المواد الدراسية..." : "Loading subjects..."}</option>
                        ) : (
                          subjectsList.map((subj) => (
                            <option key={subj._id} value={subj._id}>
                              {subj.icon_emoji} {language === "ar" ? subj.name_ar : subj.name} ({subj.grade_level})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "عنوان الكتاب (إنجليزي)" : "Book Title (English)"}</label>
                        <input
                          type="text"
                          placeholder="e.g. Calculus Volume I"
                          value={bookTitle}
                          onChange={(e) => setBookTitle(e.target.value)}
                          required
                          style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}
                        />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>{language === "ar" ? "عنوان الكتاب (عربي)" : "Book Title (Arabic)"}</label>
                        <input
                          type="text"
                          placeholder="مثال: التفاضل والتكامل ج1"
                          value={bookTitleAr}
                          onChange={(e) => setBookTitleAr(e.target.value)}
                          required
                          style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "rgba(255,255,255,0.8)", fontSize: "0.85rem", fontFamily: "Cairo" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.35rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "#4f6371" }}>Grade</label>
                        <select value={bookGrade} onChange={(e) => setBookGrade(e.target.value)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }}>
                          {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "#4f6371" }}>Term</label>
                        <select value={bookTerm} onChange={(e) => setBookTerm(e.target.value)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }}>
                          {terms.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "#4f6371" }}>Lang</label>
                        <select value={bookLang} onChange={(e) => setBookLang(e.target.value)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }}>
                          {languagesList.map(l => <option key={l} value={l}>{l === "ar" ? "العربية" : l === "en" ? "English" : l}</option>)}
                        </select>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <label style={{ fontSize: "0.65rem", fontWeight: 700, color: "#4f6371" }}>Type</label>
                        <select value={bookType} onChange={(e) => setBookType(e.target.value)} style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }}>
                          <option value="core">Core Book</option>
                          <option value="student_support">Student Guide</option>
                          <option value="instructor_support">Instructor Guide</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4f6371" }}>
                        {language === "ar" ? "رابط المصدر أو تحميل ملف PDF" : "Source Document URL or Upload PDF File"}
                      </label>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input
                          type="url"
                          placeholder="https://ellibrary.moe.gov.eg/calc_g11.pdf"
                          value={bookSourceUrl}
                          onChange={(e) => {
                            setBookSourceUrl(e.target.value);
                            if (e.target.value) {
                              const cleanName = e.target.value.split("/").pop() || "textbook.pdf";
                              setBookStoragePath(`MOE Library/${cleanName}`);
                            }
                          }}
                          style={{ flex: 1, padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--card-border)", background: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }}
                        />
                        <label style={{
                          padding: "0.5rem 1rem",
                          background: "var(--primary)",
                          color: "#fff",
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                          fontWeight: "bold",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          whiteSpace: "nowrap"
                        }}>
                          {isAdminUploading ? (
                            <FiRefreshCw className="spinning-icon" />
                          ) : (
                            <FiDownloadCloud />
                          )}
                          <span>{language === "ar" ? "تحميل ملف" : "Upload File"}</span>
                          <input
                            type="file"
                            accept=".pdf"
                            style={{ display: "none" }}
                            disabled={isAdminUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setIsAdminUploading(true);
                                const path = `MOE Library/${Date.now()}_${file.name}`;
                                const storageRef = ref(storage, path);
                                uploadBytes(storageRef, file).then((snapshot) => {
                                  getDownloadURL(snapshot.ref).then(async (downloadURL) => {
                                    setBookSourceUrl(downloadURL);
                                    setBookStoragePath(path);
                                    const cleanName = file.name.replace(/\.[^/.]+$/, "");
                                    setBookTitle(cleanName);
                                    setBookTitleAr(cleanName);
                                    setIsAdminUploading(false);
                                    
                                    addTerminalLog(`[AUTO-TRIGGER] File arrived in Firebase Storage. Automatically initiating multi-stage ingestion...`);
                                    try {
                                      const triggerRes = await fetch("/api/books", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          subject_id: bookSubjId || "subj_user_uploads",
                                          title: cleanName,
                                          title_ar: cleanName,
                                          grade: bookGrade,
                                          term: bookTerm,
                                          year: bookYear,
                                          language: bookLang,
                                          book_type: bookType,
                                          source_url: downloadURL,
                                          storage_path: path,
                                          chapters: [],
                                          requesterEmail: email
                                        })
                                      });
                                      const triggerData = await triggerRes.json();
                                      if (triggerRes.ok && triggerData.success) {
                                        addTerminalLog(`[AUTO-TRIGGER] [SUCCESS] Ingestion job spawned for: ${file.name}`);
                                        alert(language === "ar" 
                                          ? `تم رفع الملف وتشغيل عملية الاستيراد تلقائياً لـ "${cleanName}"!` 
                                          : `File uploaded & ingestion automatically started for "${cleanName}"!`);
                                        fetchSubjects();
                                        if (triggerData.book && triggerData.book._id) {
                                          setSelectedJobId(triggerData.book._id);
                                        }
                                      } else {
                                        addTerminalLog(`[AUTO-TRIGGER] [ERROR] Auto-ingestion failed: ${triggerData.error || "Unknown error"}`);
                                        alert(language === "ar" ? "حدث خطأ أثناء بدء الاستيراد التلقائي." : "Auto-ingestion failed to start.");
                                      }
                                    } catch (err: any) {
                                      addTerminalLog(`[AUTO-TRIGGER] [FATAL] Connection failed: ${err.message}`);
                                    }
                                  });
                                }).catch((err) => {
                                  console.error("Admin upload failed:", err);
                                  setIsAdminUploading(false);
                                  alert(language === "ar" ? "فشل تحميل الملف." : "Failed to upload file.");
                                });
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Interactive chapters list builder */}
                    <div style={{ background: "rgba(0,0,0,0.02)", border: "1px dashed var(--card-border)", borderRadius: "8px", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px", color: "var(--primary)" }}><FiList /> {language === "ar" ? "فصول الكتاب المقترحة" : "Chapter Blueprint Segments"}</span>
                      {pendingChapters.length === 0 ? (
                        <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{language === "ar" ? "لا توجد فصول مضافة بعد. أضف فصولاً بالأسفل:" : "No segments defined. Build and link chapters below:"}</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", maxHeight: "100px", overflowY: "auto", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>
                          {pendingChapters.map((ch, index) => (
                            <div key={index} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.9)", padding: "4px 8px", borderRadius: "4px", fontSize: "0.75rem", border: "1px solid var(--card-border)" }}>
                              <span>{language === "ar" ? ch.title_ar : ch.title} (Pages {ch.page_start}-{ch.page_end})</span>
                              <button type="button" onClick={() => handleRemoveChapter(index)} style={{ background: "transparent", border: "none", color: "#d32f2f", cursor: "pointer", fontSize: "0.85rem" }}><FiTrash2 /></button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", background: "rgba(255,255,255,0.6)", padding: "0.5rem", borderRadius: "6px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem" }}>
                          <input type="text" placeholder="Chapter Title" value={chTitle} onChange={(e) => setChTitle(e.target.value)} style={{ padding: "0.35rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }} />
                          <input type="text" placeholder="عنوان الفصل بالعربي" value={chTitleAr} onChange={(e) => setChTitleAr(e.target.value)} style={{ padding: "0.35rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem", fontFamily: "Cairo" }} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "0.35rem", alignItems: "center" }}>
                          <input type="number" placeholder="Start" value={chStartPage} onChange={(e) => setChStartPage(Number(e.target.value))} style={{ padding: "0.35rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }} />
                          <input type="number" placeholder="End" value={chEndPage} onChange={(e) => setChEndPage(Number(e.target.value))} style={{ padding: "0.35rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }} />
                          <input type="text" placeholder="Concepts (comma-separated)" value={chConcepts} onChange={(e) => setChConcepts(e.target.value)} style={{ padding: "0.35rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem" }} />
                        </div>
                        <button type="button" onClick={handleAddChapter} disabled={!chTitle || !chTitleAr} style={{ background: "rgba(27, 163, 156, 0.12)", color: "var(--secondary)", border: "1px solid rgba(27,163,156,0.2)", borderRadius: "4px", padding: "4px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                          <FiPlus /> <span>{language === "ar" ? "إضافة فصل للمسودة" : "Add Chapter Segment"}</span>
                        </button>
                      </div>
                    </div>

                    <button type="submit" disabled={isIngestingBook || !bookSubjId || !bookTitle || !bookTitleAr} style={{ background: "var(--secondary)", color: "#fff", border: "none", borderRadius: "6px", padding: "0.6rem", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                      {isIngestingBook ? <FiRefreshCw className="spinning-icon" /> : <><FiZap /> <span>{language === "ar" ? "دفع للمزامنة والبدء بالاستيراد" : "Ingest Textbook & Start Indexing"}</span></>}
                    </button>
                  </form>
                )}

                {/* TAB 4: List Configurations */}
                {activeTab === "lists" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
                    
                    {/* Dynamic appends lists */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      
                      {/* Default Grade Selector */}
                      <div style={{ background: "rgba(255, 255, 255, 0.45)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)", display: "block", marginBottom: "0.5rem" }}>⭐ {language === "ar" ? "المرحلة الدراسية الافتراضية" : "Default Selection Grade"}</span>
                        <select
                          value={defaultGrade}
                          onChange={(e) => {
                            setDefaultGrade(e.target.value);
                            saveListsToStorage(undefined, undefined, undefined, undefined, e.target.value);
                            addTerminalLog(`[CONFIG] Saved default grade level: ${e.target.value}`);
                          }}
                          style={{ padding: "0.4rem", borderRadius: "6px", border: "1px solid var(--card-border)", fontSize: "0.8rem", width: "100%" }}
                        >
                          {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>

                      {/* Grade Levels Panel */}
                      <div style={{ background: "rgba(255, 255, 255, 0.45)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)", display: "block", marginBottom: "0.5rem" }}>🎓 {language === "ar" ? "المراحل الدراسية" : "Grade Levels"}</span>
                        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                          {gradeLevels.map(g => (
                            <span key={g} style={{ fontSize: "0.75rem", padding: "2px 8px", background: "rgba(16,107,163,0.08)", color: "var(--primary)", border: "1px solid rgba(16,107,163,0.15)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                              {g}
                              <button onClick={() => {
                                const updated = gradeLevels.filter(item => item !== g);
                                setGradeLevels(updated);
                                saveListsToStorage(updated);
                              }} style={{ background: "transparent", border: "none", color: "#d32f2f", cursor: "pointer", fontSize: "0.65rem", padding: 0 }}>×</button>
                            </span>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <input type="text" placeholder="Add Grade" value={newGradeVal} onChange={(e) => setNewGradeVal(e.target.value)} style={{ padding: "0.3rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem", flex: 1 }} />
                          <button onClick={() => {
                            if (!newGradeVal) return;
                            const updated = [...gradeLevels, newGradeVal];
                            setGradeLevels(updated);
                            saveListsToStorage(updated);
                            setNewGradeVal("");
                          }} style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: "4px", padding: "0 0.5rem", fontSize: "0.75rem", cursor: "pointer" }}>Add</button>
                        </div>
                      </div>

                      {/* Categories Panel */}
                      <div style={{ background: "rgba(255, 255, 255, 0.45)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)", display: "block", marginBottom: "0.5rem" }}>🔬 {language === "ar" ? "الأقسام والتصنيفات" : "Categories"}</span>
                        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                          {categories.map(c => (
                            <span key={c} style={{ fontSize: "0.75rem", padding: "2px 8px", background: "rgba(27,163,156,0.08)", color: "var(--secondary)", border: "1px solid rgba(27,163,156,0.15)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                              {c}
                              <button onClick={() => {
                                const updated = categories.filter(item => item !== c);
                                setCategories(updated);
                                saveListsToStorage(undefined, updated);
                              }} style={{ background: "transparent", border: "none", color: "#d32f2f", cursor: "pointer", fontSize: "0.65rem", padding: 0 }}>×</button>
                            </span>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <input type="text" placeholder="Add Category" value={newCategoryVal} onChange={(e) => setNewCategoryVal(e.target.value)} style={{ padding: "0.3rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem", flex: 1 }} />
                          <button onClick={() => {
                            if (!newCategoryVal) return;
                            const updated = [...categories, newCategoryVal];
                            setCategories(updated);
                            saveListsToStorage(undefined, updated);
                            setNewCategoryVal("");
                          }} style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: "4px", padding: "0 0.5rem", fontSize: "0.75rem", cursor: "pointer" }}>Add</button>
                        </div>
                      </div>

                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      
                      {/* Terms Panel */}
                      <div style={{ background: "rgba(255, 255, 255, 0.45)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)", display: "block", marginBottom: "0.5rem" }}>⏱️ {language === "ar" ? "الفصول الدراسية" : "Terms"}</span>
                        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                          {terms.map(t => (
                            <span key={t} style={{ fontSize: "0.75rem", padding: "2px 8px", background: "rgba(0,0,0,0.05)", color: "#475569", border: "1px solid var(--card-border)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                              {t}
                              <button onClick={() => {
                                const updated = terms.filter(item => item !== t);
                                setTerms(updated);
                                saveListsToStorage(undefined, undefined, updated);
                              }} style={{ background: "transparent", border: "none", color: "#d32f2f", cursor: "pointer", fontSize: "0.65rem", padding: 0 }}>×</button>
                            </span>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <input type="text" placeholder="Add Term" value={newTermVal} onChange={(e) => setNewTermVal(e.target.value)} style={{ padding: "0.3rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem", flex: 1 }} />
                          <button onClick={() => {
                            if (!newTermVal) return;
                            const updated = [...terms, newTermVal];
                            setTerms(updated);
                            saveListsToStorage(undefined, undefined, updated);
                            setNewTermVal("");
                          }} style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: "4px", padding: "0 0.5rem", fontSize: "0.75rem", cursor: "pointer" }}>Add</button>
                        </div>
                      </div>

                      {/* Languages Panel */}
                      <div style={{ background: "rgba(255, 255, 255, 0.45)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)", display: "block", marginBottom: "0.5rem" }}>🌍 {language === "ar" ? "اللغات المدعومة" : "Languages"}</span>
                        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                          {languagesList.map(l => (
                            <span key={l} style={{ fontSize: "0.75rem", padding: "2px 8px", background: "rgba(0,0,0,0.05)", color: "#475569", border: "1px solid var(--card-border)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                              {l === "ar" ? "ar (العربية)" : l === "en" ? "en (English)" : l}
                              <button onClick={() => {
                                const updated = languagesList.filter(item => item !== l);
                                setLanguagesList(updated);
                                saveListsToStorage(undefined, undefined, undefined, updated);
                              }} style={{ background: "transparent", border: "none", color: "#d32f2f", cursor: "pointer", fontSize: "0.65rem", padding: 0 }}>×</button>
                            </span>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <input type="text" placeholder="Add Lang" value={newLangVal} onChange={(e) => setNewLangVal(e.target.value)} style={{ padding: "0.3rem", borderRadius: "4px", border: "1px solid var(--card-border)", fontSize: "0.75rem", flex: 1 }} />
                          <button onClick={() => {
                            if (!newLangVal) return;
                            const updated = [...languagesList, newLangVal];
                            setLanguagesList(updated);
                            saveListsToStorage(undefined, undefined, undefined, updated);
                            setNewLangVal("");
                          }} style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: "4px", padding: "0 0.5rem", fontSize: "0.75rem", cursor: "pointer" }}>Add</button>
                        </div>
                      </div>

                    </div>

                  </div>
                )}
              </>
            );
          })()}

        </section>
      </div>
    </div>
  );
}
