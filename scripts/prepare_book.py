"""Render the user's PDF into local slide images without changing the source PDF."""
import hashlib
import json
from pathlib import Path
import shutil
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r'C:\Users\Faiz Syihab\Desktop\KANJI LOOK AND LEARN (Halaman PDF 185-209).pdf')
OUTPUT = ROOT / 'public' / 'book'
pages_dir = OUTPUT / 'pages'
pages_dir.mkdir(parents=True, exist_ok=True)
document = pdfium.PdfDocument(SOURCE)
assert len(document) == 25, 'Expected the provided 25-page excerpt'
manifest = {'title': 'KANJI LOOK AND LEARN', 'originalPageStart': 185, 'originalPageEnd': 209, 'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'pages': []}
for index in range(len(document)):
    page = document[index]
    bitmap = page.render(scale=2.5)
    image = bitmap.to_pil().convert('RGB')
    filename = f'page-{index + 1:02}.webp'
    image.save(pages_dir / filename, 'WEBP', quality=92, method=6)
    manifest['pages'].append({'slide': index + 1, 'pdfPage': 185 + index, 'src': f'/book/pages/{filename}', 'width': image.width, 'height': image.height})
    image.close()
    bitmap.close()
    page.close()
document.close()
shutil.copyfile(SOURCE, OUTPUT / 'kanji-look-and-learn-185-209.pdf')
(OUTPUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(f"Rendered {len(manifest['pages'])} slides at 180 dpi; original PDF copied byte-for-byte.")
print(f'Total image size: {sum(p.stat().st_size for p in pages_dir.glob("*.webp")) / 1024 / 1024:.2f} MiB')
