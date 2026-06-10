import os
from PIL import Image

src_dir = r"C:\Users\hesh1\Desktop\fahem\logos"
dest_dir = r"C:\Users\hesh1\Desktop\fahem\web\public\logos"

os.makedirs(dest_dir, exist_ok=True)

files = [
    "tech_photo_12.png",
    "Untitled design (21).png",
    "google_cloud.png"
]

for filename in files:
    src_path = os.path.join(src_dir, filename)
    dest_path = os.path.join(dest_dir, filename)
    
    if not os.path.exists(src_path):
        print(f"Error: source path {src_path} does not exist.")
        continue
        
    print(f"Compressing {filename}...")
    with Image.open(src_path) as img:
        # Convert to RGBA if not already
        if img.mode != "RGBA":
            img = img.convert("RGBA")
            
        # Get dimensions
        width, height = img.size
        print(f"Original dimensions: {width}x{height}, size: {os.path.getsize(src_path)} bytes")
        
        # Resize to max 128x128 to be super tiny and fast loading, as they are rendered at 24x24
        max_size = 128
        if width > max_size or height > max_size:
            if width > height:
                new_width = max_size
                new_height = int(height * (max_size / width))
            else:
                new_height = max_size
                new_width = int(width * (max_size / height))
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            print(f"Resized dimensions: {new_width}x{new_height}")
            
        # Save optimized png
        img.save(dest_path, "PNG", optimize=True, compress_level=9)
        print(f"Saved optimized to {dest_path}, size: {os.path.getsize(dest_path)} bytes\n")
