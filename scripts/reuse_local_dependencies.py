"""Copy the known-working dependency installation without changing the UAS app."""
import json
from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[1]
reference = root.parent / 'latihankanjiUAS'
package = json.loads((root / 'package.json').read_text())
lock = json.loads((reference / 'package-lock.json').read_text())
lock['name'] = package['name']
lock['version'] = package['version']
lock['packages']['']['name'] = package['name']
lock['packages']['']['version'] = package['version']
lock['packages']['']['dependencies'] = package['dependencies']
lock['packages']['']['devDependencies'] = package['devDependencies']
(root / 'package-lock.json').write_text(json.dumps(lock, indent=2) + '\n')
shutil.copytree(reference / 'node_modules', root / 'node_modules', dirs_exist_ok=True)
print('Copied installed UAS dependency versions into isolated UTS node_modules.')
