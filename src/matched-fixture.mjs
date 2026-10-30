// Deterministic software fixtures. These responses are not LLM research evidence.
import {readJson} from './provider.mjs';
const book=readJson(new URL('../prompts/matched/codebook.json',import.meta.url));
export const fixtureInput={title:'Market complementarity and alliance formation',x:'Market complementarity',y:'Vessel-sharing alliance formation',unit:'Potential alliance pair',timeHorizon:'The current alliance proposal',setting:'Two liner-shipping firms consider a voluntary vessel-sharing alliance.',task:'Rate the relationship between greater complementarity and alliance formation, keeping resource compatibility fixed.',xContrast:{lower:'More overlapping market portfolios',higher:'More nonoverlapping markets with at least one common market'},sharedFacts:['Both partners can operate a vessel-sharing alliance.','Resource compatibility remains fixed.'],rounds:5,contextsPerRound:2};
export class FixtureModel{
  constructor(){this.calls=[];}
  async call(role,system,payload){
    this.calls.push({role,system,payload:structuredClone(payload)});
    const codes=Object.keys(book.attributeConcepts);
    if(role==='planner')return {candidates:payload.candidate_ids.map((id,index)=>{
      const round=Number(id.match(/^r(\d+)/)[1]),code=codes[((round-1)*4+index)%codes.length];
      return {attribute_code:code,context:{id,title:`Illustrative ${code.replaceAll('_',' ')} contrast`,target_relation:'focal',shared_facts:payload.study.shared_facts,held_conditions:[],changed_attribute:{attribute:code.replaceAll('_',' '),reference:`Fixture level A of ${code}; cycle ${round}.`,candidate:`Fixture level B of ${code}; cycle ${round}.`},mechanism:'This programmed design exercises the workflow and makes no substantive prediction.',rival:'A different stated condition could explain the response.',discriminating_test:'Vary the stated condition while holding the task fixed.',expected_direction:'uncertain'}};
    })};
    if(role==='baseline')return {contexts:payload.ids.map((id,i)=>({id,title:`Illustrative baseline condition ${i+1}`,held_facts:[],changed_attribute:{attribute:codes[i%codes.length].replaceAll('_',' '),reference:`Fixture level A of ${codes[i%codes.length]}.`,candidate:`Fixture level B of ${codes[i%codes.length]}.`}}))};
    if(role==='reviewer')return {reviews:payload.candidates.map(c=>({id:c.context.id,atomic:true,construct_valid:true,coding_grounded:true,distinct:true,yield_potential:1,reason:'This fixture passes the programmed software checks.'}))};
    if(role==='decision')return {ratings:payload.contexts.map(c=>({context_id:c.context_id,score:c.narrative.includes('Fixture level B')?40:20,explanation:'This is a programmed fixture rating for software verification.'})),limitations:'No model or empirical inference is performed by this fixture.'};
    if(role.startsWith('eligibility_'))return {items:payload.pairs.map(p=>({id:p.id,admit:true,failure_codes:[],reason:'This is a programmed admission for software verification.'}))};
    if(role==='coverage'){
      const variable=p=>(p.reference.match(/Fixture level A of ([a-z_]+)/)?.[1]??'resource_slack').replaceAll('_',' ');
      const names=[...new Set(payload.pairs.map(variable))];
      return {attributes:names.map((name,i)=>{const code=name.replaceAll(' ','_'),concept=book.attributeConcepts[code]??'resource_conditions';return {attribute_id:`a${i+1}`,name,definition:`The changed fixture variable ${name}.`,concept,concept_key:concept};}),items:payload.pairs.map(p=>({id:p.id,attribute_id:`a${names.indexOf(variable(p))+1}`,rationale:'The code identifies the variable changed in the factual pair.'}))};
    }
    if(role==='extract')return {suggestions:[],note:'The offline fixture performs no extraction.'};
    throw new Error(`Unknown fixture role: ${role}`);
  }
}
export class FixtureProvider{
  constructor(model=new FixtureModel()){this.model=model;}
  async request(role,system,payload){return {content:JSON.stringify(await this.model.call(role,system,payload)),finishReason:'stop',providerModel:'offline-fixture',usage:{},attempts:0};}
  close(){}
}
