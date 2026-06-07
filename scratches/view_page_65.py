import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

db_path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
with open(db_path, "r", encoding="utf-8") as f:
    db = json.load(f)

page = db["book_pages"][65]
print("PAGE 65 TITLE:", page.get("titleEn") or page.get("title"))
print("CONTENT EN:")
print(page.get("contentEn"))
print("---")
print("CONTENT AR:")
print(page.get("contentAr"))
