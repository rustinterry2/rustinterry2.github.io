import test from 'node:test';import assert from 'node:assert/strict';
import {CrownState,SAXONS,NORMANS,IDS,TIERS,START_RANK,LEAD,SUMMARY} from '../engine.js';
test('all Saxon lords retain their numerical leadership and labels',()=>{for(let l of SAXONS){let s=new CrownState({humanChoice:l,seed:24680});assert.equal(s.rank(l),START_RANK[l]);assert.equal(s.leadershipValue(l),LEAD[l]);}});
test('accepting invitation moves a single display tier, numeric bonus independent',()=>{let s=new CrownState({seed:16,humanChoice:'Wolfric the Wild'});s.changeRank(s.human,1);s.changeLeadership(s.human,.04);assert.equal(s.rank(s.human),'Fair');assert.ok(Math.abs(s.leadershipValue(s.human)-.84)<1e-8);s.changeRank(s.human,-1);s.changeLeadership(s.human,-.04);assert.equal(s.rank(s.human),'Average');assert.ok(Math.abs(s.leadershipValue(s.human)-.80)<1e-8);});
test('treasury, home recruitment, transfer and monthly tax are conserved',()=>{let s=new CrownState({seed:42});let p=s.lords[s.human],home=p.home_province;let before=p.treasury;s.purchase(s.human,{soldiers:5});assert.equal(p.treasury,before-5);assert.equal(p.home_army.soldiers,25);s.transfer(s.human,{soldiers:15,knights:0,catapults:0});assert.equal(p.campaign_army.soldiers,15);assert.equal(p.home_army.soldiers,10);s.advanceMonth();assert.equal(p.treasury,before-5+s.income(s.human));});
test('siegeless attacks on home castles are rejected',()=>{let s=new CrownState({seed:4});let h=s.human,enemy=Object.keys(s.lords).find(l=>s.lords[l].faction==='Norman');s.lords[h].campaign_army.soldiers=30;s.lords[h].campaign_province=s.lords[enemy].home_province===8?4:17;let target=s.lords[enemy].home_province;if(!s.neighbors[s.lords[h].campaign_province].includes(target))s.lords[h].campaign_province=s.neighbors[target][0];assert.equal(s.legalMove(h,target)[0],false);});
test('balanced AI resolves thousands of monthly actions without invalid state',()=>{for(let difficulty of ['easy','medium','hard'])for(let seed=1;seed<=25;seed++){let s=new CrownState({seed,difficulty});for(let m=0;m<30&&!s.outcome;m++){for(let l of Object.keys(s.lords)){if(l!==s.human&&s.lords[l].alive){s.aiOne(l);if(s.outcome)break;}}if(!s.outcome){s.randomEvent();s.advanceMonth();s.checkEnd();}for(let [l,p] of Object.entries(s.lords)){assert.ok(p.treasury>=0,`${difficulty} seed ${seed} treasury ${l}`);for(let a of [p.home_army,p.campaign_army])for(let u of ['soldiers','knights','catapults'])assert.ok(Number.isInteger(a[u])&&a[u]>=0,`${l} ${u}`);}}}});

test('neutral neighboring territory is claimed immediately',()=>{
  const s=new CrownState({seed:712,humanChoice:'Cedric of Rotherwood'});
  const h=s.human,p=s.lords[h],target=s.neighbors[p.home_province].find(id=>!s.provinces[id].owner);
  assert.ok(target!==undefined,'must have a neutral neighboring province');
  p.campaign_army.soldiers=10;
  const result=s.move(h,target);
  assert.equal(result.win,true);assert.equal(s.provinces[target].owner,h);
  assert.equal(s.last_battle_target,0);
});
test('unoccupied enemy province changes ownership without battle',()=>{
  const s=new CrownState({seed:122,humanChoice:'Cedric of Rotherwood'});
  const h=s.human,p=s.lords[h],target=s.neighbors[p.home_province].find(id=>!s.provinces[id].owner);
  assert.ok(target!==undefined);
  const rival=Object.keys(s.lords).find(l=>s.lords[l].faction==='Norman');
  s.provinces[target].owner=rival;s.provinces[target].vassals_claimed=true;
  p.campaign_army.soldiers=12;
  const result=s.move(h,target,'Stand and Fight',false);
  assert.equal(result.win,true);assert.equal(s.provinces[target].owner,h);
});
test('all Norman castles captured leads to victory',()=>{
  const s=new CrownState({seed:20,humanChoice:'Cedric of Rotherwood'}),h=s.human;
  for(const id of s.norman_home_ids)s.provinces[id].owner=h;
  assert.equal(s.checkEnd(),'victory');
});
