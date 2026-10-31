#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {apiConfig,loadDotEnv,PythonProvider,RecordedModel,readJson,writeJson,digest,usageSummary} from './provider.mjs';
import {createStudy,runStudy,pooledEvaluation,writeReports,publicTask} from './matched.mjs';
import {FixtureProvider} from './matched-fixture.mjs';
import {extractPaper} from './extract.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
function runtimeHashes(){
  const files=['src/matched.mjs','src/matched-fixture.mjs','src/provider.mjs','src/cli.mjs','src/extract.mjs','python/bridge.py',...fs.readdirSync(path.join(root,'prompts/matched')).sort().map(n=>'prompts/matched/'+n)];
  return Object.fromEntries(files.map(n=>[n,digest(fs.readFileSync(path.join(root,n),'utf8'))]));
}
const [command,...args]=process.argv.slice(2);
const switches=new Set(['--retry-uncertain','--defer-evaluation']);
const allowed=new Set(['--input','--output','--method','--atlas','--baseline',...switches]);
const options={};
function parse(){
  for(let i=0;i<args.length;i++){
    const name=args[i];if(!allowed.has(name)||name in options)throw new Error(`Unknown or duplicate argument: ${name}`);
    options[name]=switches.has(name)?true:args[++i];
    if(options[name]===undefined||String(options[name]).startsWith('--'))throw new Error(`Missing value: ${name}`);
  }
}
function acquireLock(directory){
  const lock=path.join(directory,'.run.lock');
  if(fs.existsSync(lock)){
    const previous=readJson(lock);let live=false;
    try{process.kill(previous.pid,0);live=true;}catch(error){if(error.code!=='ESRCH')live=true;}
    if(live)throw new Error(`Another process (${previous.pid}) is using this output directory.`);
    fs.unlinkSync(lock);
  }
  const fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,at:new Date().toISOString()}));fs.closeSync(fd);
  return()=>{if(fs.existsSync(lock))fs.unlinkSync(lock);};
}
function freshDirectory(output){
  if(fs.existsSync(output)&&fs.readdirSync(output).length)throw new Error('Output directory is not empty. Use a new directory or resume.');
  fs.mkdirSync(output,{recursive:true});
}
const fixtureConfig={model:'offline-fixture',concurrency:4,stream:false};
const fixtureProvider=()=>new FixtureProvider();
let provider,unlock;
try{
  parse();
  if(!['run','resume','demo','extract','compare'].includes(command))throw new Error('Use run, resume, demo, extract, or compare. See README.');
  if(command!=='demo'&&!options['--output'])throw new Error('--output is required.');
  if(options['--method']&&!['atlas','baseline'].includes(options['--method']))throw new Error('--method must be atlas or baseline.');
  if(command==='resume'&&['--input','--method','--defer-evaluation'].some(k=>options[k]))throw new Error('Resume uses the saved input, method and evaluation settings.');
  loadDotEnv();
  const output=path.resolve(options['--output']||'runs/offline-demo');
  if(command==='extract'){
    if(!options['--input'])throw new Error('--input must name a UTF-8 research excerpt.');
    if(fs.existsSync(output))throw new Error('Extraction output already exists. Choose a new file.');
    const config=apiConfig(),ledger=output+'.calls';freshDirectory(ledger);unlock=acquireLock(ledger);
    provider=new PythonProvider(config);const model=new RecordedModel(provider,ledger);
    try{writeJson(output,await extractPaper(model,options['--input']));}finally{writeJson(path.join(ledger,'usage.json'),usageSummary(ledger));}
    console.log(`Saved draft for researcher review to ${output}`);
  }else if(command==='compare'){
    if(!options['--atlas']||!options['--baseline'])throw new Error('Provide --atlas and --baseline run directories.');
    const inputs=['--atlas','--baseline'].map(k=>path.resolve(options[k]));
    if(inputs.some(p=>p===output||output.startsWith(p+path.sep)))throw new Error('Use a separate output directory for the comparison.');
    const sourceStudies=inputs.map(p=>readJson(path.join(p,'study.json'))),sourceManifests=inputs.map(p=>readJson(path.join(p,'manifest.json')));
    if(sourceStudies[0].input.method!=='atlas'||sourceStudies[1].input.method!=='baseline')throw new Error('The two methods are not matched to their arguments.');
    if(sourceStudies.some(s=>!['assessed','completed'].includes(s.stage)))throw new Error('Both searches must finish their assessments before comparison.');
    if(sourceStudies[0].input.rounds!==sourceStudies[1].input.rounds||digest(publicTask(sourceStudies[0].input))!==digest(publicTask(sourceStudies[1].input)))throw new Error('Compare the same fixed task and allocated context budget.');
    if(sourceManifests[0].mode!==sourceManifests[1].mode)throw new Error('Offline fixtures and model experiments cannot be pooled.');
    const isFixture=sourceManifests[0].mode==='offline-fixture',sources=sourceStudies.map(digest),manifestPath=path.join(output,'manifest.json');
    let manifest=fs.existsSync(manifestPath)?readJson(manifestPath):null;
    if(manifest){
      if(manifest.kind!=='comparison'||digest(manifest.sources)!==digest(sources)||digest(manifest.runtimeHashes)!==digest(runtimeHashes()))throw new Error('Comparison source or runtime changed. Use a new output directory.');
      if(manifest.status==='completed'){console.log(`Comparison already completed: ${output}`);process.exitCode=0;}
    }
    if(manifest?.status!=='completed'){
      const config=isFixture?fixtureConfig:apiConfig();
      if(manifest&&manifest.settingsSha256!==digest(config))throw new Error('Restore the recorded API settings before resuming this comparison.');
      if(!manifest)freshDirectory(output);unlock=acquireLock(output);
      manifest??={kind:'comparison',formatVersion:2,status:'running',mode:isFixture?'offline-fixture':'llm-api',sources,sourceSettings:sourceManifests.map(m=>m.settings),settings:config,settingsSha256:digest(config),runtimeHashes:runtimeHashes(),createdAt:new Date().toISOString()};
      writeJson(manifestPath,manifest);provider=isFixture?fixtureProvider():new PythonProvider(config);
      const model=new RecordedModel(provider,output,{retryUncertain:options['--retry-uncertain']}),copies=structuredClone(sourceStudies);
      let result;
      try{result=await pooledEvaluation(copies,model,{onProgress:console.log,save:(s,i)=>writeReports(s,path.join(output,i?'baseline':'atlas'))});}
      finally{writeJson(path.join(output,'usage.json'),usageSummary(output));}
      writeJson(path.join(output,'comparison.json'),result);
      const rows=result.metrics.map(m=>`| ${m.method==='atlas'?'ContextAtlas':'Direct prompting'} | ${m.yieldCount}/${m.allocated} | ${m.magnitude?.toFixed(2)??'unavailable'} | ${m.attributeCoverage} | ${m.conceptCoverage} |`);
      fs.writeFileSync(path.join(output,'comparison.md'),['# Matched comparison','',sourceStudies[0].title,'','| Method | Yield | Magnitude | Attributes | Concepts |','| --- | ---: | ---: | ---: | ---: |',...rows,'','The two methods share a pooled, blinded eligibility review and a single coverage vocabulary. Original run records remain unchanged. Context budgets are matched; API call counts can differ.','',isFixture?'These are deterministic software fixtures, not model or empirical results.':'These results describe the recorded model assessments.',''].join('\n'));
      manifest.status='completed';manifest.completedAt=new Date().toISOString();writeJson(manifestPath,manifest);
      console.log(`Saved comparison to ${output}`);
    }
  }else{
    let study,manifest;const checkpoint=path.join(output,'study.json');
    if(command==='resume'){
      study=readJson(checkpoint);manifest=readJson(path.join(output,'manifest.json'));
      if(manifest.formatVersion!==2||digest(runtimeHashes())!==digest(manifest.runtimeHashes))throw new Error('Use the same release and prompts that created this run.');
      if(digest(study.input)!==manifest.inputSha256)throw new Error('Study input changed. Start a new run.');
    }else{
      const input=readJson(options['--input']||path.join(root,'examples/shipping-complementarity.json'));
      if(options['--method'])input.method=options['--method'];
      study=createStudy(input,path.basename(output));freshDirectory(output);
    }
    if(study.stage==='completed'||(study.stage==='assessed'&&manifest?.deferEvaluation)){
      writeReports(study,output);console.log(`Study already ${study.stage}; no API calls made.`);
    }else{
      const isFixture=command==='demo'||manifest?.mode==='offline-fixture',config=isFixture?fixtureConfig:apiConfig();
      if(manifest&&digest(config)!==manifest.settingsSha256)throw new Error('Restore the recorded API settings or start a new run.');
      unlock=acquireLock(output);
      manifest??={kind:'study',formatVersion:2,createdAt:new Date().toISOString(),mode:isFixture?'offline-fixture':'llm-api',settings:config,settingsSha256:digest(config),runtimeHashes:runtimeHashes(),inputSha256:digest(study.input),deferEvaluation:!!options['--defer-evaluation'],allocatedPairs:study.input.rounds*2,plannedAssessments:study.input.rounds*4,note:isFixture?'Programmed offline software fixture; not research evidence.':'Fresh planning memory. Independent non-streaming model assessments.'};
      writeJson(path.join(output,'manifest.json'),manifest);writeJson(checkpoint,study);
      provider=isFixture?fixtureProvider():new PythonProvider(config);
      const model=new RecordedModel(provider,output,{retryUncertain:options['--retry-uncertain']});
      console.log(`Mode: ${manifest.mode}; method: ${study.input.method}; allocated pairs: ${manifest.allocatedPairs}.`);
      try{await runStudy(study,model,{save:s=>writeJson(checkpoint,s),concurrency:config.concurrency,onProgress:console.log,evaluate:!manifest.deferEvaluation});}
      finally{writeJson(path.join(output,'usage.json'),usageSummary(output));writeReports(study,output);}
      console.log(`Saved study and audit record to ${output}`);
    }
  }
}catch(error){console.error(error.message);process.exitCode=1;}
finally{provider?.close();unlock?.();}
