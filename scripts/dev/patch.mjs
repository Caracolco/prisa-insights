// utilidad local: reemplazo literal con verificación
import * as fs from 'node:fs';
const [,, file, specFile] = process.argv;
let s = fs.readFileSync(file, 'utf8');
for (const [a, b] of JSON.parse(fs.readFileSync(specFile, 'utf8'))) {
  if (!s.includes(a)) { console.error('NO ENCONTRADO:', a.slice(0, 80)); process.exit(1); }
  s = s.replace(a, b);
}
fs.writeFileSync(file, s); console.log('ok', file);
