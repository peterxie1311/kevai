import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const built = await build({entryPoints:['src/api/index.tsx'],bundle:true,write:false,format:'esm',platform:'node'});
const api = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
const json = (value, status=200) => new Response(JSON.stringify(value), {status,headers:{'content-type':'application/json'}});
test('encodes query, JSON body and headers', async()=>{
  await api.request('https://example.test/api',{method:'POST',query:{q:'a & b',zero:0,skip:undefined},body:{ok:true}},async(url,init)=>{
    assert.equal(url.searchParams.get('q'),'a & b');assert.equal(url.searchParams.get('zero'),'0');assert.equal(url.searchParams.has('skip'),false);
    assert.equal(init.body,'{"ok":true}');assert.equal(init.headers.get('content-type'),'application/json');return json({ok:true});
  });
});
test('HTTP errors preserve status/data and never retry', async()=>{
 let count=0;await assert.rejects(api.request('https://example.test',{},async()=>{count++;return json({error:'limited'},429)}),e=>e instanceof api.ApiError && e.status===429 && e.data.error==='limited');assert.equal(count,1);
});
test('empty responses and malformed JSON',async()=>{
 assert.equal(await api.request('https://example.test',{},async()=>new Response(null,{status:204})),undefined);
 await assert.rejects(api.request('https://example.test',{},async()=>new Response('<html>',{headers:{'content-type':'application/json'}})),api.ApiError);
});
test('timeout and caller cancellation reach fetch',async()=>{
 const blocked=async(_,init)=>new Promise((resolve,reject)=>{
  if(init.signal.aborted) reject(init.signal.reason);
  else init.signal.addEventListener('abort',()=>reject(init.signal.reason),{once:true});
 });
 await assert.rejects(api.request('https://example.test',{timeoutMs:5},blocked),{name:'TimeoutError'});
 const controller=new AbortController();controller.abort();await assert.rejects(api.request('https://example.test',{signal:controller.signal},blocked),{name:'AbortError'});
});
test('Supabase headers, fresh tokens, RPC and write safeguards',async()=>{
 let token='one';const calls=[];
 const db=api.createSupabaseClient({url:'https://example.supabase.co',publishableKey:'sb_publishable_test',getAccessToken:()=>token},async(url,init)=>{calls.push({url,init});return json([])});
 await db.select('players',{id:'eq.1'});token='two';await db.rpc('stats',{id:1});
 assert.equal(calls[0].init.headers.get('apikey'),'sb_publishable_test');assert.equal(calls[0].init.headers.get('Authorization'),'Bearer one');assert.equal(calls[1].init.headers.get('Authorization'),'Bearer two');assert.equal(calls[1].url.pathname,'/rest/v1/rpc/stats');
 assert.throws(()=>db.remove('players',{}),/filter/);
 await db.update('players',{name:'A'},{id:'eq.1'});assert.equal(calls[2].init.method,'PATCH');
 assert.throws(()=>api.createSupabaseClient({url:'https://example.test',publishableKey:'sb_secret_test'}),/publishable/);
});
test('ChatGPT uses gateway, disables storage/streaming and extracts output',async()=>{
 const response={id:'r',output:[{type:'reasoning'},{type:'message',content:[{type:'output_text',text:'Hello'},{type:'refusal',text:'ignored'}]}]};
 const chat=api.createChatGPTClient({endpoint:'https://example.test/chat'},async(url,init)=>{assert.equal(url.pathname,'/chat');assert.equal(JSON.parse(init.body).store,false);assert.equal(JSON.parse(init.body).stream,false);return json(response)});
 assert.equal(api.responseText(await chat.respond({model:'test-model',input:'Hi'})),'Hello');
});
test('NBA gateway query and tabular conversion',async()=>{
 const nba=api.createNbaClient({gatewayUrl:'https://example.test/nba/stats'},async(url)=>{assert.equal(url.pathname,'/nba/stats/commonplayerinfo');assert.equal(url.searchParams.get('PlayerID'),'2544');return json({resultSets:[]})});
 await nba.stats('commonplayerinfo',{PlayerID:2544});assert.deepEqual(api.resultRows({name:'Players',headers:['id'],rowSet:[[1]]}),[{id:1}]);
 await assert.rejects(nba.stats('../escape'),/resource/);
});
