import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const b=await build({entryPoints:['src/services/games.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {parseNbaSchedule,parseEspnSchedule,getUpcomingGames}=await import(`data:text/javascript;base64,${Buffer.from(b.outputFiles[0].text).toString('base64')}`);
const now=new Date('2026-11-20T00:00:00Z');
const nbaGame=(id,date,status=1)=>({gameId:id,gameDateTimeUTC:date,gameStatus:status,homeTeam:{teamName:'Lakers',teamCity:'Los Angeles',teamTricode:'LAL'},awayTeam:{teamName:'Celtics',teamCity:'Boston',teamTricode:'BOS'},arenaName:'Arena'});
const nba=(games)=>({leagueSchedule:{gameDates:[{games}]}});
const event=(id,date,state='pre')=>({id,date,status:{type:{state,name:'STATUS_SCHEDULED'}},competitions:[{timeValid:true,venue:{fullName:'Arena'},competitors:[{homeAway:'home',team:{displayName:'Lakers',abbreviation:'LAL'}},{homeAway:'away',team:{displayName:'Celtics',abbreviation:'BOS'}}]}]});
test('NBA schedule filters past, live, completed, invalid, postponed and distant games; deduplicates and sorts',()=>{
 const a=nbaGame('a','2026-11-21T00:00:00Z');
 const games=parseNbaSchedule(nba([nbaGame('z','2026-11-22T00:00:00Z'),a,a,nbaGame('past','2026-11-19T00:00:00Z'),nbaGame('live','2026-11-21T00:00:00Z',2),nbaGame('final','2026-11-21T00:00:00Z',3),nbaGame('bad','invalid'),nbaGame('later','2026-12-01T00:00:00Z'),{...a,gameId:'postponed',gameStatusText:'Postponed'}]),now);
 assert.deepEqual(games.map(g=>g.id),['a','z']);assert.equal(games[0].away.name,'Boston Celtics');
});
test('ESPN parser identifies home/away, TBD and scheduled state',()=>{
 const a=event('a','2026-11-21T00:00:00Z');a.competitions[0].timeValid=false;
 const games=parseEspnSchedule({events:[a,event('done','2026-11-21T00:00:00Z','post')]},now);
 assert.equal(games.length,1);assert.equal(games[0].timeTbd,true);assert.equal(games[0].home.name,'Lakers');
 assert.throws(()=>parseEspnSchedule({message:'Bad feed'},now),/Invalid/);
});
test('NBA request failure uses daily ESPN data, deduplicates, and attributes source',async()=>{
 const calls=[];const data=await getUpcomingGames(undefined,async(url)=>{
 calls.push(String(url));if(String(url).includes('cdn.nba.com'))return new Response('',{status:403});
 return new Response(JSON.stringify({events:[event('a','2026-11-21T00:00:00Z')]}),{headers:{'content-type':'application/json'}});
 },now);
 assert.equal(data.source,'ESPN');assert.equal(data.games.length,1);assert.equal(calls.length,10);assert.ok(calls[1].includes('dates=20261119'));
});
test('cancellation never starts fallback requests',async()=>{
 const c=new AbortController();c.abort();let calls=0;await assert.rejects(getUpcomingGames(c.signal,async()=>{calls++;throw c.signal.reason;},now));assert.equal(calls,1);
});
