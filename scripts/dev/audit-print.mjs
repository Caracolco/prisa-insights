import * as fs from 'node:fs';
const [,, prod, key, len='230'] = process.argv;
const s = JSON.parse(fs.readFileSync(`data/raw-cache/audit/${prod}-sample.json`,'utf8'))[key];
s.forEach((r,i)=>console.log(`${i+1}. ${key==='sentimiento'?`[${r.sentiment} ${r.confidence}] `:''}${key==='tematicas'?`[${r.topics.join(',')}] `:''}${r.t.slice(0,Number(len))}${key==='noRelevantes'?`  {${r.reason.slice(0,50)}}`:''}`));
