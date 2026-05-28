from PIL import Image, ImageDraw
from pathlib import Path

out = Path('public/image')
out.mkdir(parents=True, exist_ok=True)
for i in range(1, 11):
    img = Image.new('RGB', (640, 640), (20*i, 40, 200-i*10))
    d = ImageDraw.Draw(img)
    d.text((30, 300), f'Plum Product {i}', fill=(255,255,255))
    img.save(out / f'sample_{i}.jpg', 'JPEG')
    img.resize((240,240)).save(out / f'thumb_sample_{i}.jpg', 'JPEG')
print('sample images generated')
