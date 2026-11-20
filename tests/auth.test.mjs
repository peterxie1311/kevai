import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({entryPoints:['src/services/auth.tsx'],bundle:true,write:false,format:'esm',platform:'node'});
const {createAuthService,validateCredentials}=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
const user={id:'user-1',email:'p@example.test'};
function setup(overrides={}) {
 const calls=[];
 const sdk={auth:{
  signInWithPassword:async(input)=>{calls.push(input);return {error:null}},
  getUser:async()=>({data:{user},error:null}),
  getSession:async()=>({data:{session:{user,access_token:'session-token'}},error:null}),
  signOut:async()=>({error:null}),...overrides,
 }};
 return {service:createAuthService(sdk),calls};
}
test('invalid credentials rejected before network',async()=>{
 const {service,calls}=setup();assert.match(validateCredentials('bad','pass'),/email/);await assert.rejects(service.login('bad','pass'),/email/);assert.equal(calls.length,0);
});
test('login verifies with server and trims email only',async()=>{
 const {service,calls}=setup();assert.equal(await service.getAccessToken(),undefined);assert.equal((await service.login(' p@example.test ',' pass ')).id,user.id);assert.deepEqual(calls[0],{email:'p@example.test',password:' pass '});assert.equal(await service.getAccessToken(),'session-token');await service.logout();assert.equal(await service.getAccessToken(),undefined);
});
test('wrong password and rejected server validation never grant a token',async()=>{
 const wrong=setup({signInWithPassword:async()=>({error:new Error('invalid')})}).service;
 await assert.rejects(wrong.login('p@example.test','password'),/Unable to sign in/);assert.equal(await wrong.getAccessToken(),undefined);
 const invalid=setup({getUser:async()=>({data:{user:null},error:new Error('invalid JWT')})}).service;
 await assert.rejects(invalid.login('p@example.test','password'),/verify/);assert.equal(await invalid.validateUser(),null);assert.equal(await invalid.getAccessToken(),undefined);
});
test('expired session locks token access',async()=>{
 let expired=false;const {service}=setup({getSession:async()=>({data:{session:expired?null:{user,access_token:'t'}},error:null})});await service.login('p@example.test','password');expired=true;assert.equal(await service.validateUser(),null);assert.equal(await service.getAccessToken(),undefined);
});
test('logout wins over a pending login',async()=>{
 let release;const waiting=new Promise(r=>release=r);const {service}=setup({getUser:async()=>{await waiting;return {data:{user},error:null}}});
 const login=service.login('p@example.test','password');await Promise.resolve();await service.logout();release();await assert.rejects(login,/cancelled/);assert.equal(await service.getAccessToken(),undefined);
});

test('signup validates matching and sufficiently long passwords before calling Supabase',async()=>{
 let calls=0;const {service}=setup({signUp:async()=>{calls++;return {data:{session:null},error:null}}});
 await assert.rejects(service.createAccount('p@example.test','short','short'),/8 characters/);
 await assert.rejects(service.createAccount('p@example.test','password','different'),/match/);
 assert.equal(calls,0);
});
test('email confirmation signup never grants access or reveals whether account existed',async()=>{
 const {service}=setup({signUp:async(input)=>{assert.equal(input.email,'p@example.test');return {data:{session:null,user},error:null}}});
 assert.deepEqual(await service.createAccount(' p@example.test ','password','password'),{user:null,confirmationRequired:true});assert.equal(await service.getAccessToken(),undefined);
});
test('signup with session still requires server user validation',async()=>{
 const {service}=setup({signUp:async()=>({data:{session:{user}},error:null})});
 assert.equal((await service.createAccount('p@example.test','password','password')).user.id,user.id);assert.equal(await service.getAccessToken(),'session-token');
 const denied=setup({signUp:async()=>({data:{session:{user}},error:null}),getUser:async()=>({data:{user:null},error:new Error('invalid')})}).service;
 await assert.rejects(denied.createAccount('p@example.test','password','password'),/verification failed/);assert.equal(await denied.getAccessToken(),undefined);
});
test('signup handles rate limit and server password policy failures',async()=>{
 for(const [error,pattern] of [[{status:429},/wait/],[{code:'weak_password'},/stronger/],[{status:400},/Unable to create/]]) {
 const {service}=setup({signUp:async()=>({data:{},error})});await assert.rejects(service.createAccount('p@example.test','password','password'),pattern);assert.equal(await service.getAccessToken(),undefined);
 }
});
