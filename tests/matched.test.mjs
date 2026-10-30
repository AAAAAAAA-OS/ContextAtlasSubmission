import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createStudy,compileAssessments,scorePair,runStudy,runComparison,validateCoverage,selectCandidates,PROMPTS,writeReports} from '../src/matched.mjs';
import {FixtureModel,fixtureInput,FixtureProvider} from '../src/matched-fixture.mjs';
import {RecordedModel} from '../src/provider.mjs';
const tempRoot=path.resolve('.test-tmp');fs.mkdirSync(tempRoot,{recursive:true});
const temporary=prefix=>fs.mkdtempSync(path.join(tempRoot,prefix));
function removeTemporary(directory){assert.ok(path.resolve(directory).startsWith(tempRoot+path.sep));fs.rmSync(directory,{recursive:true,force:true});}

test('frozen relationship prompt is loaded independently of planner',()=>{
  assert.ok(PROMPTS.decision.includes('Return JSON: ratings[{context_id,score,explanation}]'));
  assert.ok(!PROMPTS.decision.includes('yield_potential'));
});
test('signed conservative scoring preserves denominator and missingness',()=>{
  assert.deepEqual(scorePair([{reference:20,candidate:40},{reference:25,candidate:40}]),{yield:true,magnitude:15,deltas:[20,15]});
  assert.equal(scorePair([{reference:20,candidate:0},{reference:25,candidate:5}]).yield,true);
  assert.equal(scorePair([{reference:20,candidate:40},{reference:25,candidate:20}]).magnitude,0);
  assert.equal(scorePair([{reference:20,candidate:29},{reference:20,candidate:29}]).yield,false);
  assert.equal(scorePair([{reference:null,candidate:40},{reference:20,candidate:40}]).magnitude,null);
  assert.throws(()=>scorePair([{reference:NaN,candidate:20},{reference:20,candidate:40}]),/Invalid score/);
});
test('decisions reverse exact facts and reveal no planning metadata',()=>{
  const input=createStudy(fixtureInput).input,pair={id:'private-pair',title:'Secret expected reversal',held_facts:['The price is fixed.'],changed_attribute:{attribute:'Approval',reference:'Central consent',candidate:'Local consent'},mechanism:'secret',expected_direction:'reverse'};
  const [a,b]=compileAssessments(input,pair);
  assert.deepEqual(a.payload.contexts.map(x=>x.context_id),b.payload.contexts.map(x=>x.context_id).reverse());
  for(const c of a.payload.contexts)assert.equal(c.narrative,b.payload.contexts.find(x=>x.context_id===c.context_id).narrative.split('\n').reverse().join('\n'));
  const text=JSON.stringify(a.payload);for(const secret of ['Secret expected','mechanism','expected_direction','private-pair'])assert.ok(!text.includes(secret));
});
test('five-round search follows budget, carries memory only to planning, and exports metrics',async()=>{
  const model=new FixtureModel(),study=createStudy(fixtureInput);
  await runStudy(study,model,{concurrency:3});
  assert.equal(study.stage,'completed');assert.equal(study.rounds.length,5);assert.equal(study.assessments.length,20);assert.equal(model.calls.length,33);
  assert.deepEqual([study.metrics.yieldCount,study.metrics.allocated,study.metrics.magnitude],[10,10,20]);
  const planners=model.calls.filter(x=>x.role==='planner');assert.equal(planners[0].payload.prior_results.length,0);assert.equal(planners[4].payload.prior_results.length,8);
  for(const result of planners[4].payload.prior_results){assert.deepEqual(result.ratings,[{reference:20,candidate:40},{candidate:40,reference:20}]);assert.ok(!JSON.stringify(result).includes('explanation'));}
  assert.ok(planners[4].payload.prior_candidates.every(c=>c.context.expected_direction==='uncertain'));
  for(const review of model.calls.filter(x=>x.role==='reviewer')){assert.ok(!('prior_results'in review.payload));for(const c of [...review.payload.candidates,...review.payload.prior_candidates])assert.ok(!('expected_direction'in c.context));}
  for(const dec of model.calls.filter(x=>x.role==='decision'))assert.deepEqual(Object.keys(dec.payload).sort(),['background','contexts']);
  const directory=temporary('atlas-report-');
  try{writeReports(study,directory);assert.ok(fs.existsSync(path.join(directory,'report.md')));assert.equal(fs.readFileSync(path.join(directory,'results.csv'),'utf8').trim().split('\n').length,11);}finally{removeTemporary(directory);}
});
test('paired baseline comparison uses common blind admission and coding',async()=>{
  const model=new FixtureModel(),atlas=createStudy({...fixtureInput,rounds:2},'atlas-run'),baseline=createStudy({...fixtureInput,rounds:2,method:'baseline'},'baseline-run');
  const result=await runComparison(atlas,baseline,model);
  assert.equal(model.calls[0].role,'baseline');assert.equal(model.calls.filter(x=>x.role.startsWith('eligibility_')).length,2);assert.equal(model.calls.filter(x=>x.role==='coverage').length,1);
  const admissions=model.calls.filter(x=>x.role.startsWith('eligibility_'));assert.deepEqual(admissions[0].payload.pairs,admissions[1].payload.pairs.toReversed());assert.equal(result.eligibilityJudgments.length,2);assert.ok(result.eligibility.items.every(item=>item.judgments.length===2));
  const payload=model.calls.find(x=>x.role==='coverage').payload;
  assert.equal(payload.pairs.length,8);
  for(const p of payload.pairs)assert.deepEqual(Object.keys(p).sort(),['candidate','held_facts','id','reference']);
  assert.equal(atlas.metrics.allocated,baseline.metrics.allocated);assert.equal(result.metrics.length,2);assert.equal(atlas.evaluation.scope,'pooled-comparison');
  assert.ok(!('attribute_definitions'in model.calls[0].payload.study));assert.ok(!('source_evidence'in model.calls[0].payload.study));
});
test('no admissible candidates consumes allocated slots without replacement',async()=>{
  const base=new FixtureModel(),model={call:async(...args)=>{const result=await base.call(...args);if(args[0]==='reviewer')result.reviews.forEach(x=>x.construct_valid=false);return result;}};
  const study=createStudy({...fixtureInput,rounds:2});await runStudy(study,model);
  assert.equal(study.rounds.length,2);assert.equal(study.assessments.length,0);assert.equal(study.metrics.yield,0);assert.equal(study.metrics.missingSlots,4);assert.equal(study.metrics.magnitude,null);
});
test('post-search exclusions reduce yield and coverage but retain allocation',async()=>{
  const base=new FixtureModel(),model={call:async(...args)=>{const result=await base.call(...args);if(args[0]==='eligibility_1'){result.items[0].admit=false;result.items[0].failure_codes=['construct_drift'];}return result;}};
  const study=createStudy({...fixtureInput,rounds:1});await runStudy(study,model);
  assert.equal(study.metrics.yieldCount,1);assert.equal(study.metrics.allocated,2);assert.equal(study.metrics.yield,.5);assert.equal(study.metrics.attributeCoverage,1);
  const rejected=study.evaluation.eligibility.find(item=>!item.admit);assert.equal(rejected.judgments[0].admit,false);assert.equal(rejected.judgments[1].admit,true);
});
test('open final concepts use reusable other keys without seven-category cap',()=>{
  const response={attributes:[{attribute_id:'a',name:'Novel variable',definition:'An observable difference.',concept:'other',concept_key:'other_distinct_feature'}],items:[{id:'q',attribute_id:'a',rationale:'Changed feature.'}]};
  assert.equal(validateCoverage(response,['q']).attributes[0].concept_key,'other_distinct_feature');
  response.attributes[0].concept_key='misc';assert.throws(()=>validateCoverage(response,['q']),/concept/);
});
test('selector rewards substantive new coverage and prevents title-only duplication',async()=>{
  const input=createStudy({...fixtureInput,rounds:1}).input,model=new FixtureModel();
  const pool=(await model.call('planner','',{candidate_ids:['r1_c1','r1_c2','r1_c3','r1_c4'],study:{shared_facts:input.sharedFacts}})).candidates;
  const reviews=(await model.call('reviewer','',{candidates:pool})).reviews;
  const first=selectCandidates(pool,reviews,[],input.attributeConcepts);assert.equal(first.selectedIds.length,2);
  const second=selectCandidates(pool,reviews,[{candidates:pool,selected:[],results:[]}],input.attributeConcepts);assert.equal(second.selectedIds.length,0);
});
test('checkpoint resume reuses accepted provider responses after interruption',async()=>{
  const dir=temporary('atlas-resume-');
  const fixture=new FixtureModel(),provider=new FixtureProvider(fixture),recorded=new RecordedModel(provider,dir),study=createStudy({...fixtureInput,rounds:1});
  let halted=false;
  try{
    await assert.rejects(runStudy(study,recorded,{concurrency:1,save:s=>{if(s.assessments.length===1&&!halted){halted=true;throw new Error('Interrupted for test');}}}),/Interrupted/);
    const calls=fixture.calls.length;await runStudy(study,recorded,{concurrency:1});assert.equal(study.stage,'completed');assert.equal(fixture.calls.length,9);assert.ok(fixture.calls.length>calls);
    await runStudy(study,recorded);assert.equal(fixture.calls.length,9);
  }finally{removeTemporary(dir);}
});
