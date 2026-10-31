import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {validateInput} from '../src/matched.mjs';
import {readJson,digest} from '../src/provider.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const walk=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(directory,e.name)):[path.join(directory,e.name)]);
let checked=0;
for(const folder of ['src','scripts','tests'])for(const file of walk(path.join(root,folder)).filter(f=>f.endsWith('.mjs'))){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8',windowsHide:true});
  if(result.status!==0)throw new Error(result.stderr);checked++;
}
for(const name of fs.readdirSync(path.join(root,'examples')).filter(n=>n.endsWith('.json')))validateInput(readJson(path.join(root,'examples',name)));
const manifest=readJson(path.join(root,'prompts/manifest.json'));
for(const r of manifest.roles){
  const system=fs.readFileSync(path.join(root,'prompts',r.systemFile),'utf8');
  if(digest(system)!==r.systemSha256)throw new Error(`Prompt export drift: ${r.role}. Run npm run export-prompts.`);
  if(!/json/i.test(system))throw new Error(`JSON-mode instruction missing: ${r.role}.`);
  readJson(path.join(root,'prompts',r.payloadFile));
}
console.log(`Validated ${checked} JavaScript files, all study examples and ${manifest.roles.length} prompt exports.`);
