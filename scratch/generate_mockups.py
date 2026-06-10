import os
from PIL import Image, ImageDraw, ImageFont

# Define target output directory
output_dir = r"C:\Users\hesh1\.gemini\antigravity-cli\brain\cfb6304e-1af6-4871-962d-59e6066257c2\artifacts\builder3_visual_pack"
os.makedirs(output_dir, exist_ok=True)

# Select standard Windows fonts
try:
    font_title = ImageFont.truetype("segoeui.ttf", 24)
    font_body = ImageFont.truetype("segoeui.ttf", 16)
    font_sm = ImageFont.truetype("segoeui.ttf", 12)
    font_bold = ImageFont.truetype("segoeuib.ttf", 18)
    font_lg_bold = ImageFont.truetype("segoeuib.ttf", 28)
except IOError:
    font_title = ImageFont.load_default()
    font_body = ImageFont.load_default()
    font_sm = ImageFont.load_default()
    font_bold = ImageFont.load_default()
    font_lg_bold = ImageFont.load_default()

def draw_gradient_bg(draw, size, color1, color2):
    w, h = size
    for y in range(h):
        # Linear interpolation
        r = int(color1[0] + (color2[0] - color1[0]) * (y / h))
        g = int(color1[1] + (color2[1] - color1[1]) * (y / h))
        b = int(color1[2] + (color2[2] - color1[2]) * (y / h))
        draw.line([(0, y), (w, y)], fill=(r, g, b))

def draw_rounded_glass_panel(draw, rect, fill_color, border_color, border_width=1, radius=16):
    draw.rounded_rectangle(rect, fill=fill_color, outline=border_color, width=border_width, radius=radius)

# Mockup 1: library_dropdown_desktop_light
def make_library_dropdown_desktop_light():
    img = Image.new("RGB", (1440, 900))
    draw = ImageDraw.Draw(img)
    draw_gradient_bg(draw, (1440, 900), (240, 244, 248), (224, 231, 244))
    
    # Header bar
    draw_rounded_glass_panel(draw, (50, 40, 1390, 110), (255, 255, 255, 200), (16, 107, 163, 30), radius=12)
    draw.text((80, 58), "📖 Fahem Library Studio / فهم الذكي", fill=(15, 23, 42), font=font_title)
    
    # Active Library select dropdown panel
    dropdown_rect = (50, 150, 450, 480)
    draw_rounded_glass_panel(draw, dropdown_rect, (255, 255, 255, 220), (16, 107, 163, 50), radius=20)
    
    draw.text((80, 180), "🏫 Active Library / المكتبة النشطة", fill=(16, 107, 163), font=font_bold)
    
    # Selected value
    draw_rounded_glass_panel(draw, (80, 220, 420, 270), (248, 250, 252), (16, 107, 163, 60), radius=12)
    draw.text((100, 233), "🏫 Ministry Curriculum / المناهج الوزارية", fill=(15, 23, 42), font=font_body)
    draw.text((385, 233), "▼", fill=(16, 107, 163), font=font_body)
    
    # Dropdown Options
    libs = [
        ("🏛️ Ministry of Education / وزارة التعليم", "45 Books", True),
        ("📚 OpenStax Academic / مكتبة أوبن ستاكس", "12 Books", False),
        ("📁 Private Study Vault / الخزنة الخاصة", "8 Documents", False)
    ]
    
    y_offset = 290
    for lib, count, active in libs:
        bg_color = (241, 245, 249) if active else (255, 255, 255)
        border_col = (16, 107, 163, 80) if active else (226, 232, 240)
        draw_rounded_glass_panel(draw, (80, y_offset, 420, y_offset + 48), bg_color, border_col, radius=10)
        
        draw.text((95, y_offset + 14), lib, fill=(16, 107, 163) if active else (71, 85, 105), font=font_body)
        draw.text((350, y_offset + 14), count, fill=(46, 125, 50) if active else (100, 116, 139), font=font_sm)
        y_offset += 58
        
    img.save(os.path.join(output_dir, "library_dropdown_desktop_light.png"))

# Mockup 2: library_dropdown_mobile_dark
def make_library_dropdown_mobile_dark():
    img = Image.new("RGB", (360, 780))
    draw = ImageDraw.Draw(img)
    draw_gradient_bg(draw, (360, 780), (15, 23, 42), (30, 41, 59))
    
    # Dropdown panel
    draw_rounded_glass_panel(draw, (15, 40, 345, 450), (17, 24, 39, 230), (59, 130, 246, 60), radius=16)
    draw.text((35, 65), "🏫 Active Library / المكتبة النشطة", fill=(59, 130, 246), font=font_bold)
    
    # Dropdown Selector
    draw_rounded_glass_panel(draw, (35, 100, 325, 145), (30, 41, 59), (59, 130, 246, 80), radius=10)
    draw.text((50, 112), "🏫 Ministry Curriculum / المناهج", fill=(248, 250, 252), font=font_body)
    draw.text((295, 112), "▼", fill=(59, 130, 246), font=font_body)
    
    libs = [
        ("🏛️ Ministry of Education (MOE)", "45 Books", True),
        ("📚 OpenStax University Texts", "12 Books", False),
        ("📁 Private Study Vault (Secure)", "8 Files", False)
    ]
    
    y_offset = 175
    for lib, count, active in libs:
        bg_color = (30, 41, 59) if active else (17, 24, 39)
        border_col = (59, 130, 246, 120) if active else (51, 65, 85)
        draw_rounded_glass_panel(draw, (35, y_offset, 325, y_offset + 50), bg_color, border_col, radius=8)
        
        draw.text((45, y_offset + 14), lib, fill=(59, 130, 246) if active else (148, 163, 184), font=font_sm)
        draw.text((260, y_offset + 14), count, fill=(74, 222, 128) if active else (100, 116, 139), font=font_sm)
        y_offset += 60
        
    img.save(os.path.join(output_dir, "library_dropdown_mobile_dark.png"))

# Mockup 3: book_card_desktop_light
def make_book_card_desktop_light():
    img = Image.new("RGB", (1440, 900))
    draw = ImageDraw.Draw(img)
    draw_gradient_bg(draw, (1440, 900), (240, 244, 248), (224, 231, 244))
    
    # Library Grid Header
    draw.text((100, 150), "📚 Ministry Curriculum Catalog / مناهج وزارة التعليم", fill=(15, 23, 42), font=font_lg_bold)
    
    # Selected Book Card
    draw_rounded_glass_panel(draw, (100, 240, 420, 510), (255, 255, 255, 240), (16, 107, 163, 200), radius=20, border_width=2)
    # Highlight band at top
    draw.rounded_rectangle((100, 240, 420, 245), fill=(16, 107, 163), radius=20)
    
    # Selection Indicator (Checkmark)
    draw.ellipse((380, 255, 404, 279), fill=(16, 107, 163))
    draw.text((388, 258), "✓", fill=(255, 255, 255), font=font_sm)
    
    # Card Subject badge
    draw_rounded_glass_panel(draw, (125, 260, 250, 290), (240, 249, 255), (16, 107, 163, 50), radius=12)
    draw.text((140, 265), "📐 Mathematics / الرياضيات", fill=(16, 107, 163), font=font_sm)
    
    # Book title
    draw.text((125, 310), "High School Algebra &", fill=(15, 23, 42), font=font_bold)
    draw.text((125, 335), "Analytical Geometry", fill=(15, 23, 42), font=font_bold)
    draw.text((125, 365), "الجبر والهندسة التحليلية", fill=(16, 107, 163), font=font_title)
    
    # Details
    draw.text((125, 415), "Grade 11 Curriculum • Saudi Ministry", fill=(100, 116, 139), font=font_sm)
    
    # Active Study button
    draw_rounded_glass_panel(draw, (125, 445, 395, 490), (16, 107, 163), (16, 107, 163), radius=10)
    draw.text((180, 456), "📖 Study & Interact / دراسة وتفاعل", fill=(255, 255, 255), font=font_body)
    
    # Regular Book Card
    draw_rounded_glass_panel(draw, (460, 240, 780, 510), (255, 255, 255, 180), (16, 107, 163, 30), radius=20)
    draw.ellipse((740, 255, 764, 279), outline=(16, 107, 163, 100), width=2)
    
    draw_rounded_glass_panel(draw, (485, 260, 610, 290), (254, 242, 242), (239, 68, 68, 40), radius=12)
    draw.text((500, 265), "🧬 Biology / الأحياء", fill=(239, 68, 68), font=font_sm)
    
    draw.text((485, 310), "General Biology Course", fill=(15, 23, 42), font=font_bold)
    draw.text((485, 335), "for High Schools", fill=(15, 23, 42), font=font_body)
    draw.text((485, 365), "علم الأحياء للمرحلة الثانوية", fill=(71, 85, 105), font=font_title)
    draw.text((485, 415), "Grade 12 Curriculum • Saudi Ministry", fill=(100, 116, 139), font=font_sm)
    
    draw_rounded_glass_panel(draw, (485, 445, 755, 490), (241, 245, 249), (226, 232, 240), radius=10)
    draw.text((540, 456), "📖 Study & Interact / دراسة وتفاعل", fill=(71, 85, 105), font=font_body)
    
    img.save(os.path.join(output_dir, "book_card_desktop_light.png"))

# Mockup 4: book_card_mobile_dark
def make_book_card_mobile_dark():
    img = Image.new("RGB", (360, 780))
    draw = ImageDraw.Draw(img)
    draw_gradient_bg(draw, (360, 780), (15, 23, 42), (30, 41, 59))
    
    # Title
    draw.text((20, 30), "📚 Books Catalog", fill=(248, 250, 252), font=font_title)
    
    # Book Card
    card_rect = (20, 80, 340, 350)
    draw_rounded_glass_panel(draw, card_rect, (17, 24, 39, 220), (59, 130, 246, 180), radius=16, border_width=2)
    
    # Checkmark overlay
    draw.ellipse((300, 95, 324, 119), fill=(59, 130, 246))
    draw.text((308, 98), "✓", fill=(255, 255, 255), font=font_sm)
    
    # Badge
    draw_rounded_glass_panel(draw, (40, 100, 210, 128), (30, 58, 138), (59, 130, 246, 60), radius=8)
    draw.text((55, 105), "📐 Math / الرياضيات", fill=(96, 165, 250), font=font_sm)
    
    draw.text((40, 145), "High School Algebra", fill=(248, 250, 252), font=font_bold)
    draw.text((40, 175), "الجبر والهندسة التحليلية", fill=(59, 130, 246), font=font_title)
    draw.text((40, 225), "Grade 11 • MoE Saudi Arabia", fill=(148, 163, 184), font=font_sm)
    
    # Interactive button
    draw_rounded_glass_panel(draw, (40, 280, 320, 330), (59, 130, 246), (59, 130, 246), radius=10)
    draw.text((85, 292), "📖 Study & Interact", fill=(255, 255, 255), font=font_bold)
    
    # Second Book Card partial
    card_rect2 = (20, 370, 340, 640)
    draw_rounded_glass_panel(draw, card_rect2, (17, 24, 39, 150), (51, 65, 85), radius=16)
    draw_rounded_glass_panel(draw, (40, 390, 210, 418), (69, 10, 10), (239, 68, 68, 60), radius=8)
    draw.text((55, 395), "🧬 Biology / الأحياء", fill=(248, 113, 113), font=font_sm)
    draw.text((40, 435), "General Biology Text", fill=(248, 250, 252), font=font_bold)
    
    img.save(os.path.join(output_dir, "book_card_mobile_dark.png"))

# Mockup 5: toc_sidebar_desktop_light
def make_toc_sidebar_desktop_light():
    img = Image.new("RGB", (1440, 900))
    draw = ImageDraw.Draw(img)
    draw_gradient_bg(draw, (1440, 900), (240, 244, 248), (224, 231, 244))
    
    # Reader Panel Outer
    draw_rounded_glass_panel(draw, (50, 50, 1390, 850), (255, 255, 255, 220), (16, 107, 163, 50), radius=24)
    
    # TOC Sidebar
    draw_rounded_glass_panel(draw, (80, 80, 380, 820), (255, 255, 255, 240), (16, 107, 163, 60), radius=16)
    
    # Title
    draw.text((110, 110), "📖 Table of Contents", fill=(15, 23, 42), font=font_bold)
    draw.text((110, 135), "فهرس وموضوعات الكتاب", fill=(16, 107, 163), font=font_body)
    
    # Reset Filters Button
    draw_rounded_glass_panel(draw, (110, 175, 350, 215), (254, 242, 242), (239, 68, 68, 100), radius=10)
    draw.text((160, 185), "🔄 Reset Filters / إعادة ضبط", fill=(239, 68, 68), font=font_bold)
    
    # Interactive Sidebar Tabs
    draw_rounded_glass_panel(draw, (110, 230, 225, 265), (241, 245, 249), (226, 232, 240), radius=8)
    draw.text((125, 240), "📄 Pages / الصفحات", fill=(71, 85, 105), font=font_sm)
    
    draw_rounded_glass_panel(draw, (235, 230, 350, 265), (16, 107, 163), (16, 107, 163), radius=8)
    draw.text((250, 240), "📖 Chapters / الفصول", fill=(255, 255, 255), font=font_sm)
    
    # Chapter 1 (Expanded)
    draw_rounded_glass_panel(draw, (110, 290, 350, 480), (248, 250, 252), (16, 107, 163, 100), radius=12)
    draw.text((125, 305), "▼ Chapter 1: Linear Algebra", fill=(16, 107, 163), font=font_bold)
    draw.text((125, 325), "الفصل الأول: الجبر الخطي", fill=(100, 116, 139), font=font_sm)
    
    # Topics
    draw_rounded_glass_panel(draw, (125, 360, 335, 405), (255, 255, 255), (16, 107, 163, 200), radius=8)
    draw.text((140, 372), "• Section 1.1: Matrices (p. 12)", fill=(16, 107, 163), font=font_bold)
    
    draw_rounded_glass_panel(draw, (125, 415, 335, 460), (255, 255, 255), (226, 232, 240), radius=8)
    draw.text((140, 427), "• Section 1.2: Equations (p. 25)", fill=(71, 85, 105), font=font_body)
    
    # Main content viewer preview on right
    draw_rounded_glass_panel(draw, (400, 80, 1360, 820), (255, 255, 255, 150), (16, 107, 163, 20), radius=16)
    draw.text((440, 120), "Section 1.1: Matrices & Matrix Inversion", fill=(15, 23, 42), font=font_lg_bold)
    draw.text((440, 180), "In mathematics, a matrix is a rectangular array or table of numbers, symbols...", fill=(51, 65, 85), font=font_title)
    
    img.save(os.path.join(output_dir, "toc_sidebar_desktop_light.png"))

# Mockup 6: toc_sidebar_mobile_dark
def make_toc_sidebar_mobile_dark():
    img = Image.new("RGB", (360, 780))
    draw = ImageDraw.Draw(img)
    draw_gradient_bg(draw, (360, 780), (15, 23, 42), (30, 41, 59))
    
    draw_rounded_glass_panel(draw, (15, 30, 345, 750), (17, 24, 39, 230), (59, 130, 246, 80), radius=16)
    
    draw.text((35, 60), "📖 Table of Contents", fill=(248, 250, 252), font=font_bold)
    draw.text((35, 85), "فهرس موضوعات الكتاب والوحدات", fill=(59, 130, 246), font=font_sm)
    
    # Reset Button
    draw_rounded_glass_panel(draw, (35, 115, 325, 155), (127, 29, 29), (239, 68, 68, 120), radius=8)
    draw.text((70, 125), "🔄 Reset Filters / إعادة ضبط", fill=(248, 113, 113), font=font_bold)
    
    # Active unit card
    draw_rounded_glass_panel(draw, (35, 175, 325, 350), (30, 41, 59), (59, 130, 246, 150), radius=12)
    draw.text((50, 195), "▼ Chapter 1: Linear Matrices", fill=(59, 130, 246), font=font_bold)
    draw.text((50, 215), "الفصل الأول: المصفوفات والمحددات", fill=(148, 163, 184), font=font_sm)
    
    # Active section
    draw_rounded_glass_panel(draw, (50, 250, 310, 290), (17, 24, 39), (59, 130, 246, 200), radius=6)
    draw.text((65, 262), "• Sec 1.1: Introduction (p. 12)", fill=(59, 130, 246), font=font_bold)
    
    draw_rounded_glass_panel(draw, (50, 300, 310, 340), (17, 24, 39), (51, 65, 85), radius=6)
    draw.text((65, 312), "• Sec 1.2: Operations (p. 18)", fill=(148, 163, 184), font=font_sm)
    
    img.save(os.path.join(output_dir, "toc_sidebar_mobile_dark.png"))

# Mockup 7: pagination_desktop_light
def make_pagination_desktop_light():
    img = Image.new("RGB", (1440, 250))
    draw = ImageDraw.Draw(img)
    draw_gradient_bg(draw, (1440, 250), (240, 244, 248), (224, 231, 244))
    
    # Desktop Pagination Footer Container
    draw_rounded_glass_panel(draw, (50, 40, 1390, 210), (255, 255, 255, 220), (16, 107, 163, 50), radius=16)
    
    # Navigation Buttons
    draw_rounded_glass_panel(draw, (100, 95, 250, 155), (255, 255, 255), (16, 107, 163, 100), radius=12)
    draw.text((120, 112), "◀ Prev / السابق", fill=(16, 107, 163), font=font_bold)
    
    # Pages Indicator Array
    pages = [
        ("1", False), ("...", False), ("11", False), ("12", True), ("13", False), ("...", False), ("124", False)
    ]
    
    x_offset = 320
    for page, active in pages:
        bg_col = (16, 107, 163) if active else (255, 255, 255)
        border_col = (16, 107, 163) if active else (226, 232, 240)
        text_col = (255, 255, 255) if active else (71, 85, 105)
        
        draw_rounded_glass_panel(draw, (x_offset, 95, x_offset + 60, 155), bg_col, border_col, radius=12)
        
        # Center text alignment
        draw.text((x_offset + 20, 112), page, fill=text_col, font=font_bold)
        x_offset += 80
        
    # Next Button
    draw_rounded_glass_panel(draw, (1190, 95, 1340, 155), (16, 107, 163), (16, 107, 163), radius=12)
    draw.text((1210, 112), "Next / التالي ▶", fill=(255, 255, 255), font=font_bold)
    
    # Quick jump dropdown label
    draw.text((950, 115), "Go to / اذهب إلى:", fill=(100, 116, 139), font=font_sm)
    draw_rounded_glass_panel(draw, (1060, 95, 1140, 155), (255, 255, 255), (16, 107, 163, 60), radius=10)
    draw.text((1080, 112), "Page 12", fill=(15, 23, 42), font=font_body)
    
    img.save(os.path.join(output_dir, "pagination_desktop_light.png"))

# Mockup 8: pagination_mobile_dark
def make_pagination_mobile_dark():
    img = Image.new("RGB", (360, 200))
    draw = ImageDraw.Draw(img)
    draw_gradient_bg(draw, (360, 200), (15, 23, 42), (30, 41, 59))
    
    draw_rounded_glass_panel(draw, (10, 20, 350, 180), (17, 24, 39, 230), (59, 130, 246, 80), radius=12)
    
    # Mobile Prev Button
    draw_rounded_glass_panel(draw, (30, 65, 100, 115), (30, 41, 59), (51, 65, 85), radius=8)
    draw.text((45, 80), "◀ Prev", fill=(148, 163, 184), font=font_sm)
    
    # Interactive Middle indicators
    draw_rounded_glass_panel(draw, (120, 65, 240, 115), (59, 130, 246, 30), (59, 130, 246, 180), radius=10)
    draw.text((135, 78), "Page 12 of 124", fill=(59, 130, 246), font=font_bold)
    
    # Mobile Next Button
    draw_rounded_glass_panel(draw, (260, 65, 330, 115), (59, 130, 246), (59, 130, 246), radius=8)
    draw.text((275, 80), "Next ▶", fill=(255, 255, 255), font=font_bold)
    
    # Quick go to form
    draw.text((100, 140), "Go to Page:", fill=(148, 163, 184), font=font_sm)
    draw_rounded_glass_panel(draw, (185, 130, 260, 165), (17, 24, 39), (59, 130, 246, 60), radius=6)
    draw.text((215, 138), "12", fill=(248, 250, 252), font=font_sm)
    
    img.save(os.path.join(output_dir, "pagination_mobile_dark.png"))

# Mockup 9: studio_crud_desktop_light
def make_studio_crud_desktop_light():
    img = Image.new("RGB", (1440, 900))
    draw = ImageDraw.Draw(img)
    draw_gradient_bg(draw, (1440, 900), (240, 244, 248), (224, 231, 244))
    
    # Curriculum Ingestion Studio Panel
    draw_rounded_glass_panel(draw, (50, 50, 1390, 850), (255, 255, 255, 220), (16, 107, 163, 50), radius=24)
    
    draw.text((100, 100), "🏫 Curriculum Ingestion Studio / استوديو إدخال المناهج", fill=(15, 23, 42), font=font_lg_bold)
    draw.text((100, 140), "Add, edit, verify, and catalog school and university textbooks.", fill=(100, 116, 139), font=font_body)
    
    # Forms & actions container split
    form_rect = (100, 190, 800, 800)
    draw_rounded_glass_panel(draw, form_rect, (255, 255, 255, 240), (16, 107, 163, 60), radius=16)
    
    draw.text((130, 220), "🆕 Enter Academic Assets / إضافة مادة أكاديمية جديدة", fill=(16, 107, 163), font=font_bold)
    
    # Form fields
    fields = [
        ("Asset Title (English) / العنوان بالإنجليزية", "High School Algebra & Analytic Geometry"),
        ("Asset Title (Arabic) / العنوان بالعربية", "الجبر والهندسة التحليلية للمرحلة الثانوية"),
        ("Subject Color / ترميز لون المادة", "Mathematics (Blue)")
    ]
    
    y_offset = 270
    for label, val in fields:
        draw.text((130, y_offset), label, fill=(71, 85, 105), font=font_sm)
        draw_rounded_glass_panel(draw, (130, y_offset + 25, 770, y_offset + 70), (248, 250, 252), (226, 232, 240), radius=10)
        draw.text((150, y_offset + 37), val, fill=(15, 23, 42), font=font_body)
        y_offset += 90
        
    # Actions Bar at bottom of Form
    draw_rounded_glass_panel(draw, (130, 710, 770, 775), (241, 245, 249), (226, 232, 240), radius=12)
    
    # Save Action
    draw_rounded_glass_panel(draw, (550, 722, 750, 762), (46, 125, 50), (46, 125, 50), radius=8)
    draw.text((580, 732), "💾 Save Ingestion", fill=(255, 255, 255), font=font_bold)
    
    # Cancel Action
    draw_rounded_glass_panel(draw, (380, 722, 530, 762), (255, 255, 255), (239, 68, 68, 100), radius=8)
    draw.text((400, 732), "❌ Discard Actions", fill=(239, 68, 68), font=font_bold)
    
    # Logs / Status bar on right side
    draw_rounded_glass_panel(draw, (830, 190, 1340, 800), (15, 23, 42), (51, 65, 85), radius=16)
    draw.text((860, 220), "🕵️‍♂️ Fahem Verification Agent Logs", fill=(56, 189, 248), font=font_bold)
    
    logs = [
        "⏳ Uploading file to the secure cloud vault...",
        "⚙️ Running OCR structural extraction on textbook pages...",
        "✅ Academic validation complete. Confidence: 99.4%",
        "📥 Successfully synchronized with RAG indices!"
    ]
    y_log = 260
    for log in logs:
        draw.text((860, y_log), log, fill=(34, 197, 94) if "✅" in log or "Successfully" in log else (148, 163, 184), font=font_sm)
        y_log += 35
        
    img.save(os.path.join(output_dir, "studio_crud_desktop_light.png"))

# Mockup 10: studio_crud_mobile_dark
def make_studio_crud_mobile_dark():
    img = Image.new("RGB", (360, 780))
    draw = ImageDraw.Draw(img)
    draw_gradient_bg(draw, (360, 780), (15, 23, 42), (30, 41, 59))
    
    # Studio container on mobile
    draw_rounded_glass_panel(draw, (15, 20, 345, 750), (17, 24, 39, 230), (59, 130, 246, 80), radius=16)
    
    draw.text((30, 50), "🏫 Curriculum Ingestion Studio", fill=(248, 250, 252), font=font_title)
    
    # Input Field title
    draw.text((35, 110), "Asset Title (English) / العنوان بالإنجليزية", fill=(148, 163, 184), font=font_sm)
    draw_rounded_glass_panel(draw, (35, 135, 325, 180), (30, 41, 59), (59, 130, 246, 60), radius=8)
    draw.text((45, 147), "High School Algebra Text", fill=(248, 250, 252), font=font_sm)
    
    # Ingestion steps
    draw.text((35, 210), "Curriculum Ingestion Pipeline / خطوات الإدخال", fill=(59, 130, 246), font=font_bold)
    
    steps = [
        ("✔ Ingest Metadata", True),
        ("✔ Structural Parser", True),
        ("⏳ Academic Verification", False),
        ("🔲 Align indices", False)
    ]
    
    y_step = 245
    for step, done in steps:
        bg_step = (30, 58, 138) if done else (30, 41, 59)
        border_step = (59, 130, 246, 150) if done else (51, 65, 85)
        draw_rounded_glass_panel(draw, (35, y_step, 325, y_step + 45), bg_step, border_step, radius=8)
        draw.text((50, y_step + 12), step, fill=(255, 255, 255) if done else (148, 163, 184), font=font_sm)
        y_step += 55
        
    # Actions panel
    draw_rounded_glass_panel(draw, (35, 620, 325, 720), (30, 41, 59), (51, 65, 85), radius=12)
    
    # Save button
    draw_rounded_glass_panel(draw, (185, 640, 310, 690), (34, 197, 94), (34, 197, 94), radius=8)
    draw.text((215, 652), "💾 Save", fill=(255, 255, 255), font=font_bold)
    
    # Cancel button
    draw_rounded_glass_panel(draw, (50, 640, 175, 690), (127, 29, 29), (127, 29, 29), radius=8)
    draw.text((75, 652), "❌ Discard", fill=(255, 255, 255), font=font_bold)
    
    img.save(os.path.join(output_dir, "studio_crud_mobile_dark.png"))

# Mockup 11: emoji_picker_desktop_light
def make_emoji_picker_desktop_light():
    img = Image.new("RGB", (600, 400))
    draw = ImageDraw.Draw(img)
    draw_gradient_bg(draw, (600, 400), (240, 244, 248), (224, 231, 244))
    
    # Emoji popover modal
    draw_rounded_glass_panel(draw, (50, 50, 550, 350), (255, 255, 255, 250), (16, 107, 163, 120), radius=16, border_width=2)
    
    draw.text((80, 80), "🎓 Curated Academic Emojis / رموز أكاديمية", fill=(16, 107, 163), font=font_bold)
    draw.text((80, 110), "Select a localized icon identifier representing your field:", fill=(100, 116, 139), font=font_sm)
    
    # Emoji Grid
    emojis = [
        ["📐 Math", "🧬 Biology", "🧪 Chem", "🔭 Physics"],
        ["📖 Literature", "🌐 Lang", "💻 CS", "🎨 Art"],
        ["⚖ Law", "🎼 Music", "🏛️ History", "🧠 Psych"]
    ]
    
    y_grid = 150
    for row in emojis:
        x_grid = 80
        for em in row:
            draw_rounded_glass_panel(draw, (x_grid, y_grid, x_grid + 100, y_grid + 45), (241, 245, 249), (226, 232, 240), radius=8)
            draw.text((x_grid + 12, y_grid + 12), em, fill=(15, 23, 42), font=font_sm)
            x_grid += 112
        y_grid += 58
        
    img.save(os.path.join(output_dir, "emoji_picker_desktop_light.png"))

# Execute generations
print("Generating Mockups...")
make_library_dropdown_desktop_light()
make_library_dropdown_mobile_dark()
make_book_card_desktop_light()
make_book_card_mobile_dark()
make_toc_sidebar_desktop_light()
make_toc_sidebar_mobile_dark()
make_pagination_desktop_light()
make_pagination_mobile_dark()
make_studio_crud_desktop_light()
make_studio_crud_mobile_dark()
make_emoji_picker_desktop_light()
print("All Mockups Generated successfully!")
