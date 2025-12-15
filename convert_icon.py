from PIL import Image
import os

source_path = "public/img/icons/K11BOX.webp"
dest_path = "public/img/icons/icon-no-padding-512.png"

try:
    img = Image.open(source_path)
    print(f"Original size: {img.size}")
    
    # Resize to 512x512 if needed, using high quality resampling
    # We want to fill the square, so we resize the largest dimension to 512
    # But for an icon, usually we want it square. 
    # If the source is not square, we might need to crop or center, but user said "make it larger", 
    # so filling the 512x512 box is best.
    
    img = img.resize((512, 512), Image.Resampling.LANCZOS)
    img.save(dest_path, "PNG")
    print(f"Saved to {dest_path}")
except Exception as e:
    print(f"Error: {e}")
