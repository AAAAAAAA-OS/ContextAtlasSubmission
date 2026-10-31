import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),tempRoot=path.join(root,'.test-tmp');fs.mkdirSync(tempRoot,{recursive:true});
const run=(...args)=>{const r=spawnSync(process.execPath,['src/cli.mjs',...args],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr+'\n'+r.stdout);return r.stdout;};
test('documented CLI runs both five-round fixtures, pools coverage and resumes without calls',()=>{
  const dir=fs.mkdtempSync(path.join(tempRoot,'cli-')),atlas=path.join(dir,'atlas'),baseline=path.join(dir,'baseline'),comparison=path.join(dir,'comparison');
  try{
    run('demo','--output',atlas,'--defer-evaluation');
    run('demo','--method','baseline','--output',baseline,'--defer-evaluation');
    const studyFile=path.join(atlas,'study.json'),before=fs.readFileSync(studyFile,'utf8');
    run('compare','--atlas',atlas,'--baseline',baseline,'--output',comparison);
    assert.equal(fs.readFileSync(studyFile,'utf8'),before);
    const report=JSON.parse(fs.readFileSync(path.join(comparison,'comparison.json'),'utf8'));
    assert.equal(report.metrics.length,2);assert.equal(report.metrics[0].allocated,10);
    assert.ok(run('resume','--output',atlas).includes('no API calls'));
    assert.ok(run('compare','--atlas',atlas,'--baseline',baseline,'--output',comparison).includes('already completed'));
    const record=JSON.parse(fs.readFileSync(path.join(atlas,'manifest.json'),'utf8'));
    assert.equal(record.mode,'offline-fixture');assert.equal(record.plannedAssessments,20);
  }finally{assert.ok(path.resolve(dir).startsWith(tempRoot+path.sep));fs.rmSync(dir,{recursive:true,force:true});}
});
