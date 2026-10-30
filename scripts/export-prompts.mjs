import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {FixtureModel} from '../src/matched-fixture.mjs';
import {createStudy,runComparison} from '../src/matched.mjs';
import {extractionPrompt} from '../src/extract.mjs';
import {readJson,writeJson,digest} from '../src/provider.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),directory=path.join(root,'prompts');
const fixture=new FixtureModel(),captured={},last={};
const model={call:async(role,system,payload)=>{captured[role]??={system,payload};last[role]={system,payload};return fixture.call(role,system,payload);}};
const input=readJson(path.join(root,'examples/shipping-complementarity.json'));
await runComparison(createStudy(input,'example-atlas'),createStudy({...input,method:'baseline'},'example-baseline'),model);
captured.extract={system:extractionPrompt,payload:{sourceText:'Insert a research excerpt here. Review the extracted specification before running a study.'}};
const manifest={description:'Exact English system prompts and representative user JSON captured from the shipped workflow. Contexts and ratings in these payloads are programmed software fixtures, not research results.',modelExample:'gpt-6-astra',roles:[]};
for(const [role,{system,payload}] of Object.entries(captured)){
  const systemFile=role==='extract'?'extract.system.txt':`matched/${role.startsWith('eligibility_')?'eligibility':role}.txt`;
  if(role==='extract')fs.writeFileSync(path.join(directory,systemFile),system);
  const payloadFile=`examples/${role}.payload.json`;
  writeJson(path.join(directory,payloadFile),payload);
  manifest.roles.push({role,systemFile,payloadFile,systemSha256:digest(system)});
}
writeJson(path.join(directory,'examples/planner.later-round.payload.json'),last.planner.payload);
writeJson(path.join(directory,'examples/reviewer.later-round.payload.json'),last.reviewer.payload);
writeJson(path.join(directory,'manifest.json'),manifest);
console.log(`Exported ${manifest.roles.length} role examples; no API requests made.`);
