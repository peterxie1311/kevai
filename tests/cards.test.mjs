import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const b=await build({entryPoints:['src/types/informationCards.tsx'],bundle:true,write:false,format:'esm',platform:'node'});
const {validateCard}=await import(`data:text/javascript;base64,${Buffer.from(b.outputFiles[0].text).toString('base64')}`);
const card={title:'Matchup notes',body:'Some verified information.',sources:[{title:'NBA',url:'https://www.nba.com/news'}],images:[],table:null,graph:null};
test('accepts bounded JSON cards including tables and sourced numeric graph points',()=>{
 const c={...card,table:{columns:['Team','Role'],rows:[['Boston','Away']]},graph:{label:'Reported points',points:[{label:'Game 1',value:22}]}};
 assert.deepEqual(validateCard(c),c);
});
test('rejects executable URLs, malformed tables, non-finite graphs and oversized cards',()=>{
 for(const value of [{...card,sources:[{title:'bad',url:'javascript:alert(1)'}]},{...card,images:[{src:'http://example.test/image',alt:'bad',caption:''}]},{...card,table:{columns:['A'],rows:[['a','b']]}},{...card,graph:{label:'bad',points:[{label:'a',value:Infinity}]}},{...card,body:'x'.repeat(9000)}]) assert.throws(()=>validateCard(value));
});
