"""Build the bounded UTS bank and local, revision-pinned KanjiVG stroke assets."""
import concurrent.futures
import hashlib
import io
import json
from pathlib import Path
import re
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src' / 'data' / 'source-vocabulary.json'
REVISION = '70a0b7ae0c18ceb5cb358274b029cce0234a43bc'
SVG_NS = '{http://www.w3.org/2000/svg}'

def download(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'KanjiUTS-data-builder'})
    return urllib.request.urlopen(request, timeout=90).read()

def build():
    groups = json.loads(SOURCE.read_text(encoding='utf-8'))
    assert len(groups) == 78 and sum(len(g['w']) for g in groups) == 491
    target = ROOT / 'src' / 'data'
    target.mkdir(parents=True, exist_ok=True)
    (target / 'source-vocabulary.json').write_text(json.dumps(groups, ensure_ascii=False, indent=2), encoding='utf-8')
    meetings, records, all_readings = [], {}, {}
    for tm in range(1, 8):
        members = [group for group in groups if group['tm'] == tm]
        meetings.append({'id': tm, 'kanji': [g['k'] for g in members], 'sourceCount': sum(len(g['w']) for g in members)})
        for group in members:
            for word, reading, meaning in group['w']:
                readings = re.split(r'[／/]', reading)
                all_readings.setdefault(word, set()).update(readings)
                key = (word, reading)
                if key not in records:
                    records[key] = {'id': hashlib.sha256('\0'.join(key).encode()).hexdigest()[:16], 'word': word, 'reading': reading, 'readings': readings, 'meanings': [], 'tms': [], 'roots': [], 'pages': []}
                item = records[key]
                for field, value in [('meanings', meaning), ('tms', tm), ('roots', group['k']), ('pages', group['p'])]:
                    if value not in item[field]:
                        item[field].append(value)
    for item in records.values():
        item['acceptedReadings'] = sorted(all_readings[item['word']])
    bank = {'meetings': meetings, 'entries': list(records.values()), 'sourceCount': sum(len(group['w']) for group in groups)}
    (target / 'bank.json').write_text(json.dumps(bank, ensure_ascii=False, indent=2), encoding='utf-8')
    chars = sorted({c for item in records.values() for c in item['word'] if '\u4e00' <= c <= '\u9fff' or c == '々'})
    print(f'Bank: {len(records)} vocabulary records, {len(chars)} writing characters', flush=True)
    archive = zipfile.ZipFile(io.BytesIO(download(f'https://codeload.github.com/KanjiVG/kanjivg/zip/{REVISION}')))
    names = {Path(name).name: name for name in archive.namelist() if '/kanji/' in name and name.endswith('.svg')}
    asset_dir = ROOT / 'public' / 'strokes'
    asset_dir.mkdir(parents=True, exist_ok=True)
    manifest = {'revision': REVISION, 'source': 'https://github.com/KanjiVG/kanjivg', 'license': 'CC BY-SA 3.0', 'copyright': 'Ulrich Apel', 'characters': {}}
    for char in chars:
        filename = f'{ord(char):05x}.svg'
        if filename not in names:
            raise RuntimeError(f'Missing KanjiVG character: {char} ({filename})')
        tree = ET.fromstring(archive.read(names[filename]))
        paths = [p for p in tree.iter(SVG_NS + 'path') if re.search(r'-s\d+$', p.attrib.get('id', ''))]
        paths.sort(key=lambda p: int(re.search(r'-s(\d+)$', p.attrib['id']).group(1)))
        assert paths, char
        asset = {'character': char, 'viewBox': [0, 0, 109, 109], 'paths': [p.attrib['d'] for p in paths]}
        (asset_dir / f'{ord(char):05x}.json').write_text(json.dumps(asset, ensure_ascii=False), encoding='utf-8')
        manifest['characters'][char] = len(paths)
    (asset_dir / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    (ROOT / 'public' / 'KANJIVG-LICENSE.txt').write_text('KanjiVG copyright (c) 2009-2026 Ulrich Apel.\nStroke path data distributed under Creative Commons Attribution-ShareAlike 3.0.\nhttps://creativecommons.org/licenses/by-sa/3.0/\nhttps://kanjivg.tagaini.net/\nSource revision: ' + REVISION + '\nLocal JSON conversion preserves stroke geometry and order.\n', encoding='utf-8')
    print(f'Local assets ready: {len(chars)} characters. Revision {REVISION}', flush=True)

if __name__ == '__main__':
    build()
