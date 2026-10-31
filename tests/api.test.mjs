import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {PythonProvider,apiConfig} from '../src/provider.mjs';

test('real Python bridge and OpenAI SDK honor the non-streaming API contract with an in-memory transport',async()=>{
  const previous=process.env.LLM_API_KEY;process.env.LLM_API_KEY='local-test-key';let provider;
  try{
    provider=new PythonProvider({python:process.env.PYTHON||'python',baseUrl:'https://mock.invalid/v1',model:'mock-model',reasoningEffort:'high',maxOutputTokens:500,timeoutSeconds:10,maxRetries:0}, {bridgePath:fileURLToPath(new URL('./mock_bridge.py',import.meta.url))});
    const results=await Promise.all([provider.request('actor','Return JSON only.',{text:'First — 测试'}),provider.request('actor','Return JSON only.',{text:'Second'})]);
    assert.equal(results.length,2);
    const received=results.map(result=>{assert.ok(!result.error,JSON.stringify(result));assert.equal(result.usage.total_tokens,15);return JSON.parse(result.content);});
    for(const request of received){assert.equal(request.path,'/v1/chat/completions');assert.equal(request.body.stream,false);assert.equal(request.body.reasoning_effort,'high');assert.deepEqual(request.body.response_format,{type:'json_object'});assert.equal(request.body.messages.length,2);assert.equal(request.authorizationPresent,true);}
    assert.ok(received.some(r=>r.body.messages[1].content.includes('First — 测试')));
  }finally{provider?.close();if(previous===undefined)delete process.env.LLM_API_KEY;else process.env.LLM_API_KEY=previous;}
});

test('OpenAI configuration uses Astra and max_completion_tokens without transmitting extra secrets',async()=>{
  const keys=['LLM_API_KEY','OPENAI_API_KEY','LLM_BASE_URL','LLM_MODEL','LLM_REASONING_EFFORT','LLM_TOKEN_PARAMETER','LLM_EXTRA_BODY_JSON'];
  const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));let provider;
  try{
    for(const k of keys)delete process.env[k];process.env.OPENAI_API_KEY='local-test-key';
    const config=apiConfig();assert.equal(config.model,'gpt-6-astra');assert.equal(config.reasoningEffort,'low');assert.equal(config.tokenParameter,'max_completion_tokens');assert.ok(!JSON.stringify(config).includes('local-test-key'));
    provider=new PythonProvider({...config,baseUrl:'https://mock.invalid/v1',maxRetries:0},{bridgePath:fileURLToPath(new URL('./mock_bridge.py',import.meta.url))});
    const result=await provider.request('decision','Return JSON only.',{contexts:[]});assert.ok(!result.error,JSON.stringify(result));
    const request=JSON.parse(result.content);assert.equal(request.body.max_completion_tokens,config.maxOutputTokens);assert.ok(!('max_tokens'in request.body));assert.equal(request.body.model,'gpt-6-astra');assert.equal(request.body.stream,false);
    process.env.LLM_EXTRA_BODY_JSON='{"stream":true}';assert.throws(apiConfig,/contract/);
    process.env.LLM_EXTRA_BODY_JSON='{"custom_api_key":"not-a-secret"}';assert.throws(apiConfig,/credentials/);
  }finally{provider?.close();for(const k of keys)if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}
});
