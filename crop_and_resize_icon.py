from PIL import Image

source_path = "public/img/icons/K11BOX.webp"
dest_path_512 = "public/img/icons/icon-no-padding-512.png"
dest_path_192 = "public/img/icons/icon-no-padding-192.png"

try:
    img = Image.open(source_path)
    
    # Get the bounding box of the non-transparent content
    bbox = img.getbbox()
    if bbox:
        print(f"Original size: {img.size}")
        print(f"Cropping to bbox: {bbox}")
        img = img.crop(bbox)
        print(f"Cropped size: {img.size}")
    else:
        print("No bounding box found (image might be empty or full solid).")

    # Resize to 512x512
    # We use the thumbnail method or resize. 
    # Since we want to FILL the icon, we force resize to 512x512.
    # The aspect ratio is very close to 1:1 (1621x1627), so distortion is negligible.
    
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save(dest_path_512, "PNG")
    print(f"Saved {dest_path_512}")

    # Resize to 192x192
    img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    img_192.save(dest_path_192, "PNG")
    print(f"Saved {dest_path_192}")

except Exception as e:
    print(f"Error: {e}")
