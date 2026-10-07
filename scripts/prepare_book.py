"""Render PDF 180-209 and package that excerpt without changing the source PDF."""
import hashlib
import json
from pathlib import Path
import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r'C:\Users\Faiz Syihab\Pictures\Certification\KANJI LOOK AND LEARN 512 Kanji with Illustrations and Mnemonic Hints (Genki Plus).pdf')
PAGE_START, PAGE_END = 180, 209
OUTPUT = ROOT / 'public' / 'book'
pages_dir = OUTPUT / 'pages'
pages_dir.mkdir(parents=True, exist_ok=True)
document = pymupdf.open(SOURCE)
assert len(document) >= PAGE_END, 'Source must contain PDF pages 180-209'
pdf_filename = f'kanji-look-and-learn-{PAGE_START}-{PAGE_END}.pdf'
manifest = {'title': 'KANJI LOOK AND LEARN', 'originalPageStart': PAGE_START, 'originalPageEnd': PAGE_END, 'pdf': pdf_filename, 'pages': []}
for index, number in enumerate(range(PAGE_START, PAGE_END + 1)):
    page = document[number - 1]
    bitmap = page.get_pixmap(dpi=180, alpha=False)
    image = Image.frombytes('RGB', (bitmap.width, bitmap.height), bitmap.samples)
    filename = f'page-{number}.webp'
    image.save(pages_dir / filename, 'WEBP', quality=92, method=6)
    manifest['pages'].append({'slide': index + 1, 'pdfPage': number, 'src': f'/book/pages/{filename}', 'width': image.width, 'height': image.height})
    image.close()
excerpt = pymupdf.open()
excerpt.insert_pdf(document, from_page=PAGE_START - 1, to_page=PAGE_END - 1)
excerpt.save(OUTPUT / pdf_filename, garbage=4, deflate=True)
excerpt.close()
document.close()
manifest['sourceSha256'] = hashlib.sha256((OUTPUT / pdf_filename).read_bytes()).hexdigest()
(OUTPUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(f"Rendered {len(manifest['pages'])} slides at 180 dpi; excerpt contains source PDF {PAGE_START}-{PAGE_END}.")
print(f'Total image size: {sum(p.stat().st_size for p in pages_dir.glob("*.webp")) / 1024 / 1024:.2f} MiB')
