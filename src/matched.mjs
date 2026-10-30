import fs from 'node:fs';
import path from 'node:path';
import {digest,readJson,writeJson} from './provider.mjs';

const promptRoot=new URL('../prompts/matched/',import.meta.url);
export const PROMPTS=Object.fromEntries(['planner','reviewer','baseline','decision','eligibility','coverage'].map(name=>[name,fs.readFileSync(new URL(`${name}.txt`,promptRoot),'utf8')]));
const book=readJson(new URL('codebook.json',promptRoot));
export const CONCEPTS=['uncertainty','interdependence','heterogeneity','adaptation_costs','institutional_constraints','knowledge_and_learning','resource_conditions'];
const GATES=['atomic','construct_valid','coding_grounded','distinct'];
const clone=value=>structuredClone(value);
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const string=(value,max=Infinity)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const exact=(value,keys)=>object(value)&&Object.keys(value).sort().join('|')===[...keys].sort().join('|');
const idsMatch=(rows,ids)=>Array.isArray(rows)&&rows.length===ids.length&&new Set(rows.map(x=>x.id)).size===ids.length&&rows.every(x=>ids.includes(x.id));

export function validateInput(raw){
  assert(object(raw),'Study input must be an object.');
  const input={rounds:5,contextsPerRound:2,method:'atlas',...clone(raw)};
  for(const k of ['title','x','y','unit','timeHorizon','setting','task'])assert(string(input[k]),`${k} must be a nonempty string.`);
  assert(exact(input.xContrast,['lower','higher'])&&string(input.xContrast.lower)&&string(input.xContrast.higher)&&input.xContrast.lower!==input.xContrast.higher,'Provide distinct lower and higher X values.');
  assert(Array.isArray(input.sharedFacts)&&input.sharedFacts.length>0&&input.sharedFacts.every(x=>string(x,400)),'sharedFacts must contain nonempty strings of at most 400 characters.');
  assert(Number.isInteger(input.rounds)&&input.rounds>=1&&input.rounds<=100,'rounds must be from 1 to 100.');
  assert(input.contextsPerRound===2,'This workflow selects two pairs per round.');
  assert(['atlas','baseline'].includes(input.method),'method must be atlas or baseline.');
  input.attributeDefinitions??=clone(book.attributeDefinitions);input.attributeConcepts??=clone(book.attributeConcepts);
  assert(object(input.attributeDefinitions)&&object(input.attributeConcepts)&&Object.keys(input.attributeConcepts).length>0,'Provide an attribute dictionary.');
  assert(Object.keys(input.attributeDefinitions).sort().join('|')===Object.keys(input.attributeConcepts).sort().join('|'),'Every search attribute needs a definition and one primary concept.');
  for(const [code,concept] of Object.entries(input.attributeConcepts))assert(string(input.attributeDefinitions[code])&&CONCEPTS.includes(concept),'Invalid search attribute mapping.');
  return input;
}
export function createStudy(input,id='study'){
  input=validateInput(input);
  return {formatVersion:2,workflow:'matched-context-search',id,title:input.title,input,stage:'search',status:'ready',rounds:[],assessments:[],evaluation:null,createdAt:new Date().toISOString()};
}
export function publicTask(input){
  return {x:input.x,y:input.y,unit:input.unit,time_horizon:input.timeHorizon,x_contrast:clone(input.xContrast),setting:input.setting,task:input.task,shared_facts:clone(input.sharedFacts)};
}
function plannerStudy(input){return {...publicTask(input),source_evidence:input.sourceEvidence??null,attribute_definitions:input.attributeDefinitions,attribute_concepts:input.attributeConcepts};}
function validChanged(a){
  assert(exact(a,['attribute','reference','candidate'])&&Object.values(a).every(x=>string(x,400)&&!/[\r\n]/.test(x)),'Each changed attribute needs three concise single-line factual strings.');
  assert(a.reference.trim().toLowerCase()!==a.candidate.trim().toLowerCase(),'Reference and changed levels must differ.');
}
export function validateCandidates(response,ids,input){
  assert(exact(response,['candidates'])&&Array.isArray(response.candidates)&&response.candidates.length===4,'Planner must return four candidates.');
  const contexts=[];
  for(const row of response.candidates){
    assert(exact(row,['context','attribute_code'])&&Object.hasOwn(input.attributeConcepts,row.attribute_code),'Invalid planner attribute code.');
    const c=row.context;
    assert(exact(c,['id','title','target_relation','shared_facts','held_conditions','changed_attribute','mechanism','rival','discriminating_test','expected_direction']),'Invalid candidate fields.');
    assert(c.target_relation==='focal'&&string(c.title,140),'Invalid target or title.');
    assert(JSON.stringify(c.shared_facts)===JSON.stringify(input.sharedFacts),'Planner changed fixed common facts.');
    assert(Array.isArray(c.held_conditions)&&c.held_conditions.length<=4&&c.held_conditions.every(x=>exact(x,['attribute','value'])&&string(x.attribute,100)&&string(x.value,400)&&`${x.attribute}: ${x.value}`.length<=400),'Invalid held conditions.');
    validChanged(c.changed_attribute);
    for(const k of ['mechanism','rival','discriminating_test'])assert(string(c[k])&&c[k].trim().split(/\s+/).length<=70,`${k} must be at most 70 words.`);
    assert(['stronger','weaker','reverse','uncertain'].includes(c.expected_direction),'Invalid expected direction.');contexts.push(c);
  }
  assert(idsMatch(contexts,ids),'Planner returned incorrect or duplicate IDs.');return clone(response.candidates);
}
function validateBaseline(response,ids){
  assert(exact(response,['contexts'])&&idsMatch(response.contexts,ids),'Baseline returned incorrect IDs.');
  for(const c of response.contexts){
    assert(exact(c,['id','title','held_facts','changed_attribute'])&&string(c.title,140),'Invalid baseline fields.');
    assert(Array.isArray(c.held_facts)&&c.held_facts.length<=4&&c.held_facts.every(x=>string(x,400)&&!/[\r\n]/.test(x)),'Invalid held facts.');validChanged(c.changed_attribute);
  }
  return clone(response.contexts);
}
export function validateReviews(response,candidates){
  assert(exact(response,['reviews'])&&idsMatch(response.reviews,candidates.map(c=>c.context.id)),'Reviewer returned incorrect IDs.');
  for(const r of response.reviews)assert(exact(r,['id',...GATES,'yield_potential','reason'])&&GATES.every(k=>typeof r[k]==='boolean')&&[0,1,2].includes(r.yield_potential)&&string(r.reason),'Invalid review.');
  return clone(response.reviews);
}
function factualPair(candidate){
  const c=candidate.context??candidate;
  return {id:c.id,title:c.title,held_facts:c.held_facts??c.held_conditions.map(x=>`${x.attribute}: ${x.value}`),changed_attribute:clone(c.changed_attribute)};
}
const normalized=s=>s.trim().toLowerCase();
export function signature(row){
  const c=factualPair(row),a=c.changed_attribute;
  return digest({axis:row.attribute_code??normalized(a.attribute),levels:[a.reference,a.candidate].map(normalized).sort(),held:c.held_facts.map(normalized).sort()});
}
export function selectCandidates(candidates,reviews,previousRounds,mapping){
  const byReview=new Map(reviews.map(x=>[x.id,x]));
  const old=previousRounds.flatMap(r=>r.candidates??[]),oldSignatures=new Set(old.map(signature));
  const tested=previousRounds.flatMap(r=>(r.selected??[]).filter(x=>r.results?.some(v=>v.id===x.id)));
  const attrs=new Set(tested.map(x=>x.attribute_code)),concepts=new Set([...attrs].map(a=>mapping[a]));
  const unique=new Map();
  for(const c of [...candidates].sort((a,b)=>byReview.get(b.context.id).yield_potential-byReview.get(a.context.id).yield_potential||a.context.id.localeCompare(b.context.id))){
    const sig=signature(c);
    if(GATES.every(k=>byReview.get(c.context.id)[k])&&!oldSignatures.has(sig)&&!unique.has(sig))unique.set(sig,c);
  }
  const eligible=[...unique.values()].sort((a,b)=>a.context.id.localeCompare(b.context.id)),portfolios=[];
  const add=pair=>{
    const newAttributes=[...new Set(pair.map(c=>c.attribute_code))].filter(a=>!attrs.has(a));
    const newConcepts=[...new Set(pair.map(c=>mapping[c.attribute_code]))].filter(c=>!concepts.has(c));
    const objectives={yield:pair.reduce((n,c)=>n+byReview.get(c.context.id).yield_potential/2,0)/pair.length,attributes:newAttributes.length/2,concepts:newConcepts.length/7};
    const ids=pair.map(x=>x.context.id);portfolios.push({ids,objectives,newAttributes,newConcepts,score:.5*objectives.yield+.3*objectives.attributes+.2*objectives.concepts,tieKey:digest(['contextatlas-matched-v2',ids])});
  };
  if(eligible.length===1)add(eligible);else for(let i=0;i<eligible.length;i++)for(let j=i+1;j<eligible.length;j++)add([eligible[i],eligible[j]]);
  portfolios.sort((a,b)=>b.score-a.score||a.tieKey.localeCompare(b.tieKey));
  return {selectedIds:portfolios[0]?.ids??[],missingSlots:2-(portfolios[0]?.ids.length??0),eligibleIds:eligible.map(c=>c.context.id),portfolios};
}
export function compileAssessments(input,pair,namespace='study'){
  const c=factualPair(pair),a=c.changed_attribute;
  const mapping=Object.fromEntries(['reference','candidate'].map(label=>['W'+digest([namespace,c.id,label]).slice(0,20),label]));
  const cards=Object.entries(mapping).map(([id,label])=>({context_id:id,narrative:[...input.sharedFacts,...c.held_facts,`${a.attribute}: ${a[label]}`].join('\n')}));
  const background=[input.setting,`Unit: ${input.unit}. Time horizon: ${input.timeHorizon}.`,`Forecast the signed direction and strength of the relationship between ${input.x} and ${input.y}.`,input.task,`Compare lower X (${input.xContrast.lower}) with higher X (${input.xContrast.higher}). The X contrast and Y definition stay the same in both settings. Rate the relationship, not the overall level of Y.`,...input.sharedFacts].join('\n\n');
  return [0,1].map(repeat=>({id:`${c.id}:${repeat}`,pairId:c.id,repeat,mapping:clone(mapping),payload:{background,contexts:repeat?[...cards].reverse().map(x=>({...x,narrative:x.narrative.split('\n').reverse().join('\n')})):clone(cards)}}));
}
export function validateDecision(response,request){
  assert(exact(response,['ratings','limitations'])&&typeof response.limitations==='string','Invalid decision response.');
  const ids=request.payload.contexts.map(c=>c.context_id);
  assert(Array.isArray(response.ratings)&&response.ratings.length===2&&new Set(response.ratings.map(x=>x.context_id)).size===2,'Decision requires two unique ratings.');
  for(const r of response.ratings)assert(exact(r,['context_id','score','explanation'])&&ids.includes(r.context_id)&&(r.score===null||(typeof r.score==='number'&&Number.isFinite(r.score)&&r.score>=-100&&r.score<=100))&&string(r.explanation),'Invalid relationship rating.');
  return Object.fromEntries(response.ratings.map(r=>[request.mapping[r.context_id],r.score]));
}
export function scorePair(repeats,threshold=10){
  assert(repeats.length===2,'Two presentations are required.');
  if(repeats.some(r=>!r||['reference','candidate'].some(k=>r[k]===null||r[k]===undefined)))return {yield:false,magnitude:null,deltas:null};
  for(const r of repeats)for(const k of ['reference','candidate'])assert(typeof r[k]==='number'&&Number.isFinite(r[k])&&Math.abs(r[k])<=100,'Invalid score.');
  const deltas=repeats.map(r=>r.candidate-r.reference),same=deltas[0]*deltas[1]>0,magnitude=same?Math.min(...deltas.map(Math.abs)):0;
  return {yield:same&&magnitude>=threshold,magnitude,deltas};
}
function searchHistory(study){
  return {prior_candidates:study.rounds.flatMap(r=>r.candidates??[]),prior_selected_ids:study.rounds.flatMap(r=>r.selected??[]).map(c=>c.id),prior_results:study.rounds.flatMap(r=>r.results??[]).map(result=>({...result,ratings:[0,1].map(repeat=>clone(study.assessments.find(a=>a.pairId===result.id&&a.repeat===repeat)?.ratings??null))}))};
}
function blindReviewCandidate(row){
  const copy=clone(row);if(copy.context)delete copy.context.expected_direction;return copy;
}
async function boundedMap(items,concurrency,worker){
  let cursor=0;const errors=[];
  await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{while(cursor<items.length&&!errors.length){try{await worker(items[cursor++]);}catch(e){errors.push(e);}}}));
  if(errors.length)throw errors[0];
}
function validateEligibility(response,ids){
  assert(exact(response,['items'])&&idsMatch(response.items,ids),'Eligibility returned incorrect IDs.');
  const codes=['bundled_change','construct_drift','answer_cue','forced_outcome','incoherent','format'];
  for(const r of response.items)assert(exact(r,['id','admit','failure_codes','reason'])&&typeof r.admit==='boolean'&&Array.isArray(r.failure_codes)&&r.failure_codes.every(x=>codes.includes(x))&&r.admit===(r.failure_codes.length===0)&&string(r.reason),'Invalid eligibility judgment.');
  return response;
}
export function validateCoverage(response,ids){
  assert(exact(response,['attributes','items'])&&Array.isArray(response.attributes)&&idsMatch(response.items,ids),'Coverage returned incorrect IDs.');
  const attrs=new Map();
  for(const a of response.attributes){
    assert(exact(a,['attribute_id','name','definition','concept','concept_key'])&&[a.attribute_id,a.name,a.definition,a.concept_key].every(x=>string(x))&&!attrs.has(a.attribute_id),'Invalid or duplicate attribute.');
    assert(CONCEPTS.includes(a.concept)?a.concept_key===a.concept:a.concept==='other'&&/^other_[a-z0-9_]+$/.test(a.concept_key),'Invalid concept key.');attrs.set(a.attribute_id,a);
  }
  for(const r of response.items)assert(exact(r,['id','attribute_id','rationale'])&&(r.attribute_id===null||attrs.has(r.attribute_id))&&string(r.rationale),'Invalid coverage assignment.');
  assert([...attrs.keys()].every(id=>response.items.some(x=>x.attribute_id===id)),'Coverage has unused attributes.');return response;
}
function evaluationSet(studies){
  const mapping={},pairs=[];
  for(let index=0;index<studies.length;index++)for(const selected of studies[index].rounds.flatMap(r=>r.selected??[])){
    const c=factualPair(selected),id='Q'+digest(['evaluation',index,studies[index].id,c.id]).slice(0,20);
    mapping[id]={study:index,pairId:c.id};pairs.push({id,held_facts:c.held_facts,changed_attribute:c.changed_attribute});
  }
  pairs.sort((a,b)=>digest(['evaluation-order',a.id]).localeCompare(digest(['evaluation-order',b.id])));return {mapping,pairs};
}
export async function pooledEvaluation(studies,model,{save=()=>{},onProgress=()=>{}}={}){
  assert(studies.length>0&&studies.every(s=>s.stage==='assessed'||s.stage==='completed'),'Assess every study before pooled evaluation.');
  const fixed=publicTask(studies[0].input);assert(studies.every(s=>digest(publicTask(s.input))===digest(fixed)),'Pool only the same fixed research task.');
  const {mapping,pairs}=evaluationSet(studies);
  const eligibilityJudgments=[];
  if(pairs.length)for(const repeat of [0,1]){
    const shown=repeat?[...pairs].reverse():pairs;
    // Separate role keys keep both invocations fresh even if only one pair remains.
    eligibilityJudgments.push(validateEligibility(await model.call(`eligibility_${repeat+1}`,PROMPTS.eligibility,{study:fixed,pairs:shown}),pairs.map(p=>p.id)));
  }
  const eligibility={rule:'Admit only when both independent assessments admit the pair.',items:pairs.map(pair=>{
    const judgments=eligibilityJudgments.map(response=>response.items.find(item=>item.id===pair.id));
    return {id:pair.id,admit:judgments.every(item=>item.admit),failure_codes:[...new Set(judgments.flatMap(item=>item.failure_codes))],reason:judgments.map((item,index)=>`Assessment ${index+1}: ${item.reason}`).join(' '),judgments};
  })};
  const admitted=new Set(eligibility.items.filter(x=>x.admit).map(x=>x.id));
  // Titles, planning codes, explanations, method labels and outcomes never enter either judgment.
  const codingPairs=pairs.filter(x=>admitted.has(x.id)).map(x=>({id:x.id,held_facts:x.held_facts,reference:x.changed_attribute.reference,candidate:x.changed_attribute.candidate}));
  const coverage=codingPairs.length?validateCoverage(await model.call('coverage',PROMPTS.coverage,{fixed_task:fixed,pairs:codingPairs}),codingPairs.map(p=>p.id)):{attributes:[],items:[]};
  const attrs=new Map(coverage.attributes.map(a=>[a.attribute_id,a]));
  for(let index=0;index<studies.length;index++){
    const study=studies[index],rows=Object.entries(mapping).filter(([,v])=>v.study===index);
    study.evaluation={scope:studies.length>1?'pooled-comparison':'single-study',eligibilityRule:eligibility.rule,eligibility:rows.map(([id,v])=>({...eligibility.items.find(x=>x.id===id),pairId:v.pairId})),coverage:{attributes:coverage.attributes,items:rows.filter(([id])=>admitted.has(id)).map(([id,v])=>({...coverage.items.find(x=>x.id===id),pairId:v.pairId}))}};
    // Keep only the vocabulary used by this arm while preserving shared codes.
    const used=new Set(study.evaluation.coverage.items.map(x=>x.attribute_id).filter(Boolean));study.evaluation.coverage.attributes=[...used].map(id=>attrs.get(id));
    study.stage='completed';study.status='completed';study.completedAt=new Date().toISOString();study.metrics=summarize(study);save(study,index);
  }
  onProgress(`Evaluated ${pairs.length} anonymous pairs; ${admitted.size} admitted.`);
  return {mapping,eligibilityJudgments,eligibility,coverage,metrics:studies.map(s=>({method:s.input.method,...s.metrics}))};
}
export async function runStudy(study,model,{save=()=>{},concurrency=4,onProgress=()=>{},evaluate=true}={}){
  validateInput(study.input);assert(Number.isInteger(concurrency)&&concurrency>=1,'concurrency must be a positive integer.');
  const checkpoint=message=>{study.updatedAt=new Date().toISOString();save(study);if(message)onProgress(message);};
  if(study.stage==='completed')return study;
  study.status='running';delete study.error;checkpoint();
  try{
    const total=study.input.method==='atlas'?study.input.rounds:1;
    for(let n=1;n<=total;n++){
      let round=study.rounds.find(r=>r.number===n);
      if(!round){round={number:n};study.rounds.push(round);checkpoint();}
      if(round.results)continue;
      const prior={...study,rounds:study.rounds.filter(r=>r.number<n)};
      if(!round.candidates){
        const count=study.input.method==='atlas'?4:study.input.rounds*2,ids=Array.from({length:count},(_,i)=>`r${n}_c${i+1}`);
        if(study.input.method==='atlas')round.candidates=validateCandidates(await model.call('planner',PROMPTS.planner,{study:plannerStudy(study.input),candidate_ids:ids,...searchHistory(prior)}),ids,study.input);
        else round.candidates=validateBaseline(await model.call('baseline',PROMPTS.baseline,{study:publicTask(study.input),ids}),ids);
        checkpoint(`Prepared ${count} contextual designs for round ${n}.`);
      }
      if(!round.selected){
        if(study.input.method==='atlas'){
          if(!round.reviews){const {prior_results,...history}=searchHistory(prior);history.prior_candidates=history.prior_candidates.map(blindReviewCandidate);round.reviews=validateReviews(await model.call('reviewer',PROMPTS.reviewer,{study:plannerStudy(study.input),...history,candidates:round.candidates.map(blindReviewCandidate)}),round.candidates);checkpoint();}
          round.selection=selectCandidates(round.candidates,round.reviews,prior.rounds,study.input.attributeConcepts);
          round.selected=round.candidates.filter(c=>round.selection.selectedIds.includes(c.context.id)).map(c=>({...factualPair(c),attribute_code:c.attribute_code}));
        }else{round.selected=round.candidates.map(factualPair);round.selection={selectedIds:round.selected.map(c=>c.id),missingSlots:0};}
        checkpoint(`Selected ${round.selected.length} pairs in round ${n}.`);
      }
      const jobs=round.selected.flatMap(c=>compileAssessments(study.input,c,`${study.id}:${study.input.method}`)).filter(j=>!study.assessments.some(a=>a.id===j.id));
      await boundedMap(jobs,concurrency,async request=>{
        const response=await model.call('decision',PROMPTS.decision,request.payload),ratings=validateDecision(response,request);
        study.assessments.push({id:request.id,pairId:request.pairId,repeat:request.repeat,ratings,response,request});checkpoint();
      });
      study.assessments.sort((a,b)=>a.id.localeCompare(b.id));
      round.results=round.selected.map(c=>({id:c.id,...scorePair([0,1].map(r=>study.assessments.find(a=>a.pairId===c.id&&a.repeat===r)?.ratings))}));
      checkpoint(`Completed both presentations for round ${n}.`);
    }
    study.stage='assessed';study.status='assessed';checkpoint();
    if(evaluate)await pooledEvaluation([study],model,{save:()=>checkpoint(),onProgress});
    return study;
  }catch(error){study.status='stopped';study.error=error.message;checkpoint();throw error;}
}
export async function runComparison(atlas,baseline,model,{save=()=>{},concurrency=4,onProgress=()=>{}}={}){
  assert(atlas.input.method==='atlas'&&baseline.input.method==='baseline','Comparison requires atlas and baseline studies.');
  assert(atlas.input.rounds===baseline.input.rounds&&digest(publicTask(atlas.input))===digest(publicTask(baseline.input)),'Comparison requires the same task and allocated budget.');
  // Freeze the one-pass ideas before the adaptive search has any observations.
  await runStudy(baseline,model,{save:s=>save(s,1),concurrency,onProgress,evaluate:false});
  await runStudy(atlas,model,{save:s=>save(s,0),concurrency,onProgress,evaluate:false});
  return pooledEvaluation([atlas,baseline],model,{save,onProgress});
}
export function summarize(study){
  const allocated=study.input.rounds*2,all=study.rounds.flatMap(r=>r.results??[]),admitted=new Set(study.evaluation?.eligibility.filter(r=>r.admit).map(r=>r.pairId)??[]);
  const rows=all.filter(r=>admitted.has(r.id)),complete=rows.filter(r=>r.magnitude!==null),attrs=study.evaluation?.coverage.attributes??[],items=study.evaluation?.coverage.items??[];
  const known=new Set(attrs.filter(a=>a.concept!=='other').map(a=>a.concept_key)),other=new Set(attrs.filter(a=>a.concept==='other').map(a=>a.concept_key));
  return {allocated,selected:all.length,admitted:admitted.size,evaluable:complete.length,yieldCount:rows.filter(r=>r.yield).length,yield:rows.filter(r=>r.yield).length/allocated,magnitude:complete.length?complete.reduce((n,r)=>n+r.magnitude,0)/complete.length:null,attributeCoverage:attrs.length,conceptCoverage:known.size+other.size,knownConcepts:[...known].sort(),additionalConcepts:[...other].sort(),uncoded:items.filter(x=>x.attribute_id===null).length,missingSlots:allocated-all.length};
}
const csv=value=>'"'+String(value??'').replaceAll('"','""')+'"';
export function writeReports(study,output){
  fs.mkdirSync(output,{recursive:true});writeJson(path.join(output,'study.json'),study);
  const metrics=study.evaluation?summarize(study):null;
  const rows=study.rounds.flatMap(r=>(r.selected??[]).map(c=>{
    const design=r.candidates?.find(v=>v.context?.id===c.id)?.context;
    return {round:r.number,...c,...r.results?.find(v=>v.id===c.id),researchProposal:design?{mechanism:design.mechanism,rival:design.rival,discriminating_test:design.discriminating_test,expected_direction:design.expected_direction}:null,eligibility:study.evaluation?.eligibility.find(v=>v.pairId===c.id)??null,coding:study.evaluation?.coverage.items.find(v=>v.pairId===c.id)??null};
  }));
  writeJson(path.join(output,'report.json'),{title:study.title,method:study.input.method,status:study.status,metrics,contexts:rows});
  writeJson(path.join(output,'memory.json'),searchHistory(study));
  const headers=['id','round','attribute','reference','candidate','admitted','delta1','delta2','yield','magnitude','attribute_code','concept'];
  const lines=rows.map(r=>[r.id,r.round,r.changed_attribute.attribute,r.changed_attribute.reference,r.changed_attribute.candidate,r.eligibility?.admit,r.deltas?.[0],r.deltas?.[1],r.eligibility?.admit?r.yield:false,r.eligibility?.admit?r.magnitude:null,r.coding?.attribute_id,study.evaluation?.coverage.attributes.find(a=>a.attribute_id===r.coding?.attribute_id)?.concept_key].map(csv).join(','));
  fs.writeFileSync(path.join(output,'results.csv'),[headers.join(','),...lines].join('\n')+'\n');
  const text=[`# ${study.title}`,'',`Method: ${study.input.method==='atlas'?'ContextAtlas':'Direct prompting'}. Status: ${study.status}.`,'',metrics?`Yield: ${metrics.yieldCount}/${metrics.allocated}. Conservative magnitude: ${metrics.magnitude===null?'unavailable':metrics.magnitude.toFixed(2)}. Attribute coverage: ${metrics.attributeCoverage}. Concept coverage: ${metrics.conceptCoverage}.`:'Evaluation has not completed.','',`Each pair uses the same X contrast, Y, unit and time horizon. Two fresh assessments reverse setting and fact order. The final coding uses ${study.evaluation?.scope??'pending'} factual inputs. Coverage counts distinct coded variables and concepts, not a percentage of the full landscape.`,'','## Contextual comparisons',''];
  for(const r of rows){
    text.push(`### ${r.title}`,'',`${r.changed_attribute.attribute}: ${r.changed_attribute.reference} → ${r.changed_attribute.candidate}.`,'',`Admission: ${r.eligibility?.admit??'pending'}. ${r.eligibility?.reason??''} Changes in relationship ratings: ${r.deltas?.join(', ')??'unavailable'}.`,'');
    if(r.researchProposal)text.push(`Proposed mechanism: ${r.researchProposal.mechanism}`,`Rival account: ${r.researchProposal.rival}`,`Possible empirical test: ${r.researchProposal.discriminating_test}`,'');
  }
  text.push('The scores describe model judgments about candidate contextual contrasts. They support the design of subsequent empirical studies. Search memory is carried in the planning inputs; model weights are not updated.','');
  fs.writeFileSync(path.join(output,'report.md'),text.join('\n'));return {metrics,contexts:rows};
}
