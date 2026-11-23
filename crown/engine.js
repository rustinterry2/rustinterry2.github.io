// Crown browser edition — campaign rules ported from crown.py, 2026-11-23.
// No DOM dependencies: use in tests and browser with same battle/AI rules.
export const U=['soldiers','knights','catapults'];
export const PRICES={soldiers:1,knights:8,catapults:15,castle:20};
export const T={1:['Cumbria',3,0],2:['Yorkshire',2,12],3:['Lancashire',4,6],4:['Lincolnshire',3,12],5:['Nottingham',2,0],6:['Gwynedd',2,16],7:['Leicester',2,5],8:['Norfolk',6,0],9:['Clwyd',3,0],10:['Cambridge',5,6],12:['Glamorgan',1,16],13:['Gloucester',7,12],14:['Buckingham',8,0],15:['Essex',6,8],16:['Hampshire',3,8],17:['Dorset',4,6],18:['Sussex',7,8],19:['Cornwall',8,0]};
export const IDS=Object.keys(T).map(Number);
export const ENGLAND={1:[2,3],2:[1,3,4],3:[1,2,5,6,7,9],4:[2,5,7,8,10],5:[3,4,7],6:[3,9,12],7:[3,4,5,9,10,13,14],8:[4,10,15],9:[3,6,7,12,13],10:[4,7,8,14,15],12:[6,9,13],13:[7,9,12,14,17],14:[7,10,13,15,16],15:[8,10,14,16,18],16:[14,15,17,18],17:[13,16,19],18:[15,16],19:[17]};
export const CASTLES=[1,5,9,8,14,19];
export const SAXON=[1,5,9], NORMAN=[8,14,19];
export const SAXONS=['Wilfred of Ivanhoe','Cedric of Rotherwood','Geoffrey Longsword','Wolfric the Wild'];
export const NORMANS=['Brian de Bois-Guilbert','Edmund the Grim','Philip Malvoisin','Roger Falconbridge','Reginald Front-de-Boeuf'];
export const SHORT={'Wilfred of Ivanhoe':'Wilfred','Cedric of Rotherwood':'Cedric','Geoffrey Longsword':'Geoffrey','Wolfric the Wild':'Wolfric','Brian de Bois-Guilbert':'Brian','Edmund the Grim':'Edmund','Philip Malvoisin':'Philip','Roger Falconbridge':'Roger','Reginald Front-de-Boeuf':'Reginald'};
export const LEAD={'Wilfred of Ivanhoe':1.13,'Cedric of Rotherwood':.96,'Geoffrey Longsword':.84,'Wolfric the Wild':.80,'Brian de Bois-Guilbert':1.11,'Edmund the Grim':1.24,'Philip Malvoisin':1.09,'Roger Falconbridge':1.11,'Reginald Front-de-Boeuf':.97};
export const TIERS=['Pathetic','Weak','Average','Fair','Strong','Excellent','Exalted','Peerless'];
export const START_RANK={'Wolfric the Wild':'Average','Geoffrey Longsword':'Fair','Cedric of Rotherwood':'Strong','Wilfred of Ivanhoe':'Excellent','Reginald Front-de-Boeuf':'Strong','Philip Malvoisin':'Strong','Brian de Bois-Guilbert':'Excellent','Roger Falconbridge':'Excellent','Edmund the Grim':'Excellent'};
export const COLORS={1:[84,91,191],5:[132,172,255],9:[33,39,140],8:[227,157,100],14:[216,67,83],19:[126,43,51]};
export const HORSES={1:[365,244],2:[505,227],3:[380,321],4:[575,386],5:[487,429],6:[279,416],7:[455,511],8:[656,454],9:[354,521],10:[579,532],12:[259,599],13:[404,630],14:[508,557],15:[623,640],16:[506,727],17:[372,760],18:[650,748],19:[175,846]};
export const CASTLE_POS={1:[391,228],5:[474,384],9:[356,457],8:[680,519],14:[496,634],19:[226,825],2:[500,210],3:[360,380],4:[564,425],6:[251,474],7:[435,500],10:[560,505],12:[231,647],13:[410,590],15:[622,609],16:[554,738],17:[385,815],18:[659,724]};
export const EMPTY=()=>({soldiers:0,knights:0,catapults:0});
export const COUNT=a=>U.reduce((n,u)=>n+a[u],0);
export const SUMMARY=a=>`${a.soldiers} S / ${a.knights} K / ${a.catapults} C`;
export const MONTH=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const clamp=(a,b,c)=>Math.max(a,Math.min(b,c));
const pyround=x=>Math.round(x+Number.EPSILON);
export const odds=(a,d)=>{a=Math.max(.001,a); d=Math.max(.001,d);return clamp(a*a/(a*a+d*d),.005,.995);};
export class Rng{
  constructor(seed){this.seed=(seed>>>0)||0x27c1b51;}
  random(){let t=this.seed+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
  choice(a){return a[Math.floor(this.random()*a.length)];}
  shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(this.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  sample(a,n){return this.shuffle([...a]).slice(0,n);}
  uniform(a,b){return a+(b-a)*this.random();}
}
export class CrownState{
  constructor({seed,difficulty='easy',humanChoice=null,neighbors=ENGLAND}={}){
    this.seed=seed??((Date.now()^Math.random()*4294967296)>>>0);
    this.rng=new Rng(this.seed);this.difficulty=difficulty;this.normanStyle='balanced';this.neighbors=neighbors;
    this.human=humanChoice||this.rng.choice(SAXONS);
    let sax=this.rng.shuffle([...SAXON]);const others=this.rng.sample(SAXONS.filter(x=>x!==this.human),2);
    let normans=this.rng.sample(NORMANS,3);
    const assignments={};[this.human,...others].forEach((x,i)=>assignments[sax[i]]=x);normans.forEach((x,i)=>assignments[NORMAN[i]]=x);
    this.provinces={};this.lords={};this.ledger=[];this.turn=0;this.month=10;this.year=1199;
    for(let pid of IDS){let lord=assignments[pid]||null,home=Boolean(lord);
      this.provinces[pid]={owner:lord,initial_vassals:T[pid][2],vassals_claimed:home||T[pid][2]===0,home_castle:home,secondary_castle:false,castle_garrison:0,castle_equipment:{knights:0,catapults:0}};
      if(lord) this.lords[lord]={faction:SAXON.includes(pid)?'Saxon':'Norman',home_province:pid,treasury:11,home_army:{soldiers:20,knights:0,catapults:0},campaign_army:EMPTY(),campaign_province:pid,alive:true,robin_uses_remaining:3,leadership_bonus:0,leadership_tier:START_RANK[lord],spouse:null,spouse_ally:null,gold_earned_total:0,gold_spent_total:0,vassals_recruited_total:0,troops_lost_total:0};
    }
    this.convertedLords=this.rng.sample(others,{easy:0,medium:1,hard:2}[difficulty]);
    this.convertedLords.forEach(n=>this.lords[n].faction='Norman');
    this.norman_home_ids=CASTLES.filter(p=>this.lords[assignments[p]].faction==='Norman');
    this.maiden_rescue_done=difficulty==='hard';this.robin_pending=false;this.tournament_pending=false;this.tournament_held=false;this.outcome=null;this.last_result='';this.last_taxes={};this.last_battle_target=0;this.hostilities=[];this.ai_goals={};this.norman_rivalry_emerged=false;
    this.colors={[this.human]:[132,172,255]};
    sax.slice(1).forEach((pid,i)=>this.colors[assignments[pid]]=[[84,91,191],[33,39,140]][i]);NORMAN.forEach(pid=>this.colors[assignments[pid]]=COLORS[pid]);
    this.convertedLords.forEach((l,i)=>this.colors[l]=[[190,80,83],[179,67,111]][i]);
    this.event('game_started',this.human,this.lords[this.human].home_province);
  }
  event(action,lord=null,province=null,details={}){this.ledger.push({id:this.ledger.length+1,turn:this.turn,year:this.year,month:this.month,action,lord,province,...details});}
  income(l){return IDS.filter(id=>this.provinces[id].owner===l).reduce((n,id)=>n+T[id][1],0);}
  territoryCount(l){return IDS.filter(id=>this.provinces[id].owner===l).length;}
  remainingVassals(id){let p=this.provinces[id];return p.vassals_claimed?0:p.initial_vassals;}
  leadershipValue(l){return Math.max(.65,LEAD[l]+this.lords[l].leadership_bonus);}
  rank(l){return this.lords[l].leadership_tier;}
  changeRank(l,d){let p=this.lords[l];p.leadership_tier=TIERS[clamp(TIERS.indexOf(p.leadership_tier)+d,0,7)];this.event('leadership_rank_changed',l);return p.leadership_tier;}
  changeLeadership(l,d){this.lords[l].leadership_bonus=clamp(this.lords[l].leadership_bonus+d,-.22,.22);this.event('leadership_adjusted',l);}
  friendly(a,b){return Boolean(b&&a!==b&&this.lords[b]&&this.lords[a].faction===this.lords[b].faction&&!this.hostilities.includes([a,b].sort().join('|')));}
  declareWar(a,b){if(this.friendly(a,b)){this.hostilities.push([a,b].sort().join('|'));this.event('alliance_broken',a,null,{enemy:b});return true;}return false;}
  retreat(l){if(this.lords[l]?.alive){let p=this.lords[l];let old=p.campaign_province;p.campaign_province=p.home_province;this.event('army_retreated',l,p.home_province,{from_province:old});}}
  purchase(l,units){let p=this.lords[l],cost=U.reduce((n,u)=>n+(units[u]||0)*PRICES[u],0);if(U.some(u=>!Number.isInteger(units[u]||0)||(units[u]||0)<0))throw Error('Invalid troop quantity');if(cost>p.treasury)throw Error('Not enough gold');p.treasury-=cost;p.gold_spent_total+=cost;for(let u of U)p.home_army[u]+=(units[u]||0);this.event('purchase_troops',l,null,{cost,units});return cost;}
  purchaseCastle(l,id,human=false){let p=this.provinces[id],lp=this.lords[l];if(p.owner!==l||p.home_castle||p.secondary_castle)throw Error('Castle requires an owned province without a castle');if(lp.treasury<20)throw Error('Not enough gold');lp.treasury-=20;lp.gold_spent_total+=20;p.secondary_castle=true;p.castle_garrison=human?10:15;this.event('build_castle',l,id);}
  transferHere(l){let p=this.lords[l],pr=this.provinces[p.campaign_province];return pr.owner===l&&(pr.home_castle||pr.secondary_castle);}
  castleReserve(l){if(!this.transferHere(l))return null;let p=this.lords[l],pr=this.provinces[p.campaign_province];return p.home_province===p.campaign_province?p.home_army:{soldiers:pr.castle_garrison, ...pr.castle_equipment};}
  transfer(l,units,direction='out'){
    let p=this.lords[l],r=this.castleReserve(l);if(!r)throw Error('Stand within one of thy castles to transfer troops');
    let from=direction==='out'?r:p.campaign_army,to=direction==='out'?p.campaign_army:r;
    if(!U.some(u=>units[u]>0))throw Error('Choose some troops to transfer');
    for(let u of U){if(!Number.isInteger(units[u]||0)||units[u]<0||units[u]>from[u])throw Error('Not enough '+u+' to transfer');}
    for(let u of U){from[u]-=units[u];to[u]+=units[u];}
    if(p.campaign_province!==p.home_province){let pr=this.provinces[p.campaign_province];pr.castle_garrison=r.soldiers;pr.castle_equipment={knights:r.knights,catapults:r.catapults};}
    this.event('transfer',l,p.campaign_province,{direction,units:{...units}});
  }
  useRobin(){let p=this.lords[this.human];if(this.robin_pending)throw Error('Robin is already pledged');if(p.robin_uses_remaining<=0)throw Error('Robin cannot help again');this.robin_pending=true;this.event('robin_pledged',this.human);}
  consumeRobin(a,b){if(a!==this.human||!this.robin_pending||!b)return false;let p=this.lords[a];this.robin_pending=false;if(p.robin_uses_remaining<1)return false;p.robin_uses_remaining--;this.event('robin_aid',a);return true;}
  legalMove(l,id){let p=this.lords[l],from=p.campaign_province;if(!this.provinces[id])return [false,'Choose a territory'];if(id===from)return [false,'The army is already there'];if(!this.neighbors[from].includes(id)&&!(id===p.home_province&&this.provinces[id].owner===l))return [false,'Move into a bordering province'];if(p.campaign_army.soldiers+p.campaign_army.knights===0)return [false,'Transfer soldiers or knights before marching'];let owner=this.provinces[id].owner,pr=this.provinces[id];if(owner!==l&&!this.friendly(l,owner)&&(pr.home_castle||pr.secondary_castle)&&p.campaign_army.catapults<1)return [false,'You need a catapult to siege a castle'];return [true,''];}
  strength(stack,l,t='Stand and Fight'){let soldier=stack.soldiers,knight=stack.knights*(t==='Ferocious Attack'?6.6:5),cat=stack.catapults*(t==='Bombard'?11:3),lead=this.leadershipValue(l);if(t==='Outflank')lead*=1.30;if(t==='Ferocious Attack')soldier*=1.12;return(soldier+knight+cat)*lead;}
  visiting(id){let owner=this.provinces[id].owner;if(!owner||!this.lords[owner].alive)return [];return Object.keys(this.lords).filter(l=>l!==owner&&this.lords[l].alive&&this.lords[l].campaign_province===id&&COUNT(this.lords[l].campaign_army)>0&&this.friendly(owner,l));}
  stacks(id){let pr=this.provinces[id],owner=pr.owner;if(!owner)return [];let p=this.lords[owner],a=[];if(pr.home_castle&&p.home_province===id)a.push({lord:owner,kind:'home',stack:p.home_army});if(p.campaign_province===id&&COUNT(p.campaign_army))a.push({lord:owner,kind:'campaign',stack:p.campaign_army});if((pr.home_castle||pr.secondary_castle)&&p.home_province!==id){let c={soldiers:pr.castle_garrison,...pr.castle_equipment};if(COUNT(c))a.push({lord:owner,kind:'castle',stack:c});}for(let visitor of this.visiting(id))a.push({lord:visitor,kind:'campaign',stack:this.lords[visitor].campaign_army});return a;}
  defenders(id){let a=EMPTY();for(let s of this.stacks(id))for(let u of U)a[u]+=s.stack[u];return a;}
  defensePower(id){return this.stacks(id).reduce((n,s)=>n+this.strength(s.stack,s.lord),0);}
  expectedOdds(l,id,t='Stand and Fight'){
    let owner=this.provinces[id].owner,army=this.lords[l].campaign_army;if(!owner||!COUNT(this.defenders(id)))return 1;
    let df=this.defensePower(id),castle=this.provinces[id].home_castle||this.provinces[id].secondary_castle;
    if(castle)df*=Math.max(1.10,1.85-.16*army.catapults);if(l===this.human&&this.robin_pending)df*=.74;return odds(this.strength(army,l,t),Math.max(df,castle?4:.01));
  }
  casualties(l,kind,loss){let p=this.lords[l],stack=p[kind+'_army'];for(let u of U){let n=loss[u]||0;stack[u]=Math.max(0,stack[u]-n);}p.troops_lost_total+=COUNT(loss);this.event('casualties',l,null,{kind,loss});}
  attackerCasualties(l,f,complete=false){let army=this.lords[l].campaign_army,loss=EMPTY();for(let u of U)loss[u]=complete?army[u]:Math.min(army[u],pyround(army[u]*f));if(COUNT(loss))this.casualties(l,'campaign',loss);return COUNT(loss);}
  defenderCasualties(id,f,captured=false){let owner=this.provinces[id].owner;if(!owner)return 0;let stacks=this.stacks(id);let fullHome=captured&&this.provinces[id].home_castle&&this.lords[owner].home_province===id;let losses=stacks.map(()=>EMPTY());for(let u of U){let partial=[];stacks.forEach((s,i)=>{let full=captured&&(s.kind==='castle'||s.kind==='home'||(fullHome&&s.lord===owner));if(full)losses[i][u]=s.stack[u];else if(s.stack[u])partial.push([i,s.stack[u]]);});let total=partial.reduce((x,[,q])=>x+q,0);if(!total)continue;let wanted=Math.min(total,Math.max(0,pyround(total*f))),assigned=0,remainder=[];for(let [i,q] of partial){let raw=wanted*q/total,w=Math.floor(raw);losses[i][u]=w;assigned+=w;remainder.push([raw-w,i]);}remainder.sort((a,b)=>b[0]-a[0]||a[1]-b[1]);for(let j=0;j<wanted-assigned;j++)losses[remainder[j][1]][u]++;}
    let count=0;stacks.forEach((s,i)=>{let loss=losses[i];if(COUNT(loss)){if(s.kind==='castle'){let p=this.provinces[id];p.castle_garrison=Math.max(0,p.castle_garrison-loss.soldiers);for(let u of ['knights','catapults'])p.castle_equipment[u]=Math.max(0,p.castle_equipment[u]-loss[u]);this.lords[s.lord].troops_lost_total+=COUNT(loss);this.event('casualties',s.lord,id,{kind:'castle',loss});}else this.casualties(s.lord,s.kind,loss);count+=COUNT(loss);}});return count;
  }
  claim(id,l){let p=this.provinces[id],old=p.owner;if(old===l)return 0;p.owner=l;let n=0;if(!old&&!p.vassals_claimed){n=p.initial_vassals;p.vassals_claimed=true;this.lords[l].campaign_army.soldiers+=n;this.lords[l].vassals_recruited_total+=n;}this.event('claim',l,id,{old_owner:old,vassals_added:n});return n;}
  checkEnd(){let home=this.lords[this.human].home_province;if(!this.lords[this.human].alive||this.provinces[home].owner!==this.human)return this.outcome='defeat';if(this.norman_home_ids.every(id=>this.provinces[id].owner===this.human))return this.outcome='victory';return this.outcome;}
  claimWar(id,l){let pr=this.provinces[id],previous=pr.owner,oldHome=Boolean(previous&&pr.home_castle&&this.lords[previous].home_province===id);pr.secondary_castle=false;pr.castle_garrison=0;pr.castle_equipment={knights:0,catapults:0};let got=this.claim(id,l);
    if(oldHome){let p=this.lords[previous];p.alive=false;p.home_army=EMPTY();p.campaign_army=EMPTY();for(let pp of Object.values(this.provinces))if(pp.owner===previous){pp.owner=null;pp.secondary_castle=false;pp.castle_garrison=0;pp.castle_equipment={knights:0,catapults:0};}this.event('lord_defeated',l,id,{defeated:previous});}
    for(let [visitor,p] of Object.entries(this.lords))if(visitor!==l&&p.alive&&p.campaign_province===id)this.retreat(visitor);this.checkEnd();return got;
  }
  move(l,id,t='Stand and Fight',passage=true){let [ok,why]=this.legalMove(l,id);if(!ok)throw Error(why);let p=this.lords[l],old=p.campaign_province,pr=this.provinces[id],victim=pr.owner,peace=this.friendly(l,victim);this.last_battle_target=0;
    if(victim===l||(peace&&passage)){p.campaign_province=id;this.event(peace?'safe_passage':'march',l,id);return {ends_turn:false,text:(peace?'Safe passage through ':'Marched to ')+T[id][0]+'.'};}
    if(victim){if((pr.home_castle||pr.secondary_castle)&&p.campaign_army.catapults<1)throw Error('A catapult is required to attack this castle');if(peace&&!passage)this.declareWar(l,victim);}
    if(!victim){this.attackerCasualties(l,Math.min(.09,this.rng.uniform(0,.07)));p.campaign_province=id;let got=this.claimWar(id,l);return {ends_turn:true,win:true,text:`Claimed ${T[id][0]}.${got?' +'+got+' vassals.':''}`};}
    let defenders=this.defenders(id),castle=pr.home_castle||pr.secondary_castle;this.last_battle_target=id;
    if(!COUNT(defenders)){if(castle&&p.campaign_army.catapults<1)throw Error('A catapult is required to attack this castle');p.campaign_province=id;this.claimWar(id,l);this.event('unopposed_capture',l,id);return {ends_turn:true,win:true,text:`${T[id][0]} taken without resistance.`};}
    for(let v of this.visiting(id))this.declareWar(l,v);
    let robin=this.consumeRobin(l,victim),atk=this.strength(p.campaign_army,l,t)*this.rng.uniform(.87,1.15),df=this.defensePower(id)*this.rng.uniform(.88,1.13);if(castle)df*=Math.max(1.10,1.85-.16*p.campaign_army.catapults);if(robin)df*=.74;df=Math.max(df,castle?4:.01);let win=this.rng.random()<odds(atk,df),lost=0,enemyLost=0,text='';
    if(win){lost=this.attackerCasualties(l,clamp(.055+.20*Math.pow(df/Math.max(1,atk),.70),.025,.52));enemyLost=this.defenderCasualties(id,clamp(.57+.12*Math.pow(atk/Math.max(1,df),.35),.38,.82),true);if(victim&&this.lords[victim].alive&&this.lords[victim].campaign_province===id)this.retreat(victim);if(castle&&p.campaign_army.catapults>0&&this.rng.random()<.18){this.casualties(l,'campaign',{soldiers:0,knights:0,catapults:1});lost++;}p.campaign_province=id;let got=this.claimWar(id,l);text=`${T[id][0]} captured!`+(lost?` Lost ${lost}.`:'')+(enemyLost?` Enemy lost ${enemyLost}.`:'')+(got?` +${got} vassals.`:'');}
    else{lost=this.attackerCasualties(l,clamp(.12+.28*Math.pow(df/Math.max(1,atk),.75),.08,.78));enemyLost=this.defenderCasualties(id,clamp(.16*Math.pow(atk/Math.max(1,df),.65),.08,.75));this.retreat(l);text=`Attack on ${T[id][0]} repelled.`+(lost?` Lost ${lost}.`:'')+(enemyLost?` Enemy lost ${enemyLost}.`:'');}
    this.event('battle',l,id,{defender:victim,castle,tactic:t,robin,won:win,losses:lost,defenders_lost:enemyLost});this.checkEnd();return{ends_turn:true,text,win};
  }
  aiTactic(l,id){if(!this.provinces[id].owner)return ['Stand and Fight',1];return ['Stand and Fight','Outflank','Ferocious Attack','Bombard'].map(t=>[t,this.expectedOdds(l,id,t)]).sort((a,b)=>b[1]-a[1])[0];}
  aiHomeDanger(l){let home=this.lords[l].home_province,worst=0;for(let [enemy,p] of Object.entries(this.lords)){if(enemy===l||!p.alive||this.friendly(l,enemy)||!this.neighbors[home].includes(p.campaign_province)||!p.campaign_army.catapults||!p.campaign_army.soldiers&&!p.campaign_army.knights)continue;worst=Math.max(worst,...['Outflank','Bombard','Ferocious Attack'].map(t=>this.expectedOdds(enemy,home,t)));}return worst;}
  aiGoal(l,id){let owner=this.provinces[id].owner;if(owner===l||this.friendly(l,owner))return 0;let score=7+3.3*T[id][1]+.6*this.remainingVassals(id);if(owner){score+=3.5;if(this.provinces[id].home_castle){score+=17+4.5*this.territoryCount(owner);if(this.lords[l].faction==='Saxon'&&this.norman_home_ids.includes(id))score+=16;if(owner===this.human)score+=8;}else if(this.provinces[id].secondary_castle)score+=5;}
    if(this.lords[l].faction==='Norman'){if(owner&&this.lords[owner].faction==='Saxon')score=1.45*score+18;else if(!owner)score*=.92;else score*=.62;if(owner&&this.lords[owner].faction==='Saxon'&&this.provinces[id].home_castle)score*=1.3;}
    return score+1.6*this.neighbors[id].filter(n=>!this.provinces[n].owner).length;
  }
  aiFloor(l,id){let castle=this.provinces[id].home_castle||this.provinces[id].secondary_castle,base=this.provinces[id].home_castle?.65:.72;return this.lords[l].faction==='Norman'&&castle?.60:castle?base:.72;}
  aiAccessible(l,steps=3){let visited=new Set([this.lords[l].home_province]),front=[...visited];for(let k=0;k<steps;k++){let next=[];for(let id of front)for(let n of this.neighbors[id]){let owner=this.provinces[n].owner;let c=this.provinces[n].home_castle||this.provinces[n].secondary_castle;if(owner&&owner!==l&&this.lords[owner].faction==='Saxon'&&!this.friendly(l,owner)&&c)return true;if(!owner||owner===l||this.friendly(l,owner))if(!visited.has(n)){visited.add(n);next.push(n);}}front=next;}return false;}
  aiPaths(l){let from=this.lords[l].campaign_province,dist={[from]:0},paths={[from]:[]},queue=[[0,from]];
    while(queue.length){queue.sort((a,b)=>a[0]-b[0]);let [d,id]=queue.shift();if(d>dist[id]+1e-8)continue;for(let n of this.neighbors[id]){let owner=this.provinces[n].owner,castle=this.provinces[n].home_castle||this.provinces[n].secondary_castle,cost=0;
        if(owner===l)cost=.88;else if(this.friendly(l,owner))cost=.96;else if(!owner){if(castle&&!this.lords[l].campaign_army.catapults)continue;cost=1.18;}else{if(castle&&!this.lords[l].campaign_army.catapults)continue;let o=this.aiTactic(l,n)[1];if(o<this.aiFloor(l,n))continue;cost=1.65+3*(1-o);}let nd=d+cost;if(nd+1e-8<(dist[n]??Infinity)){dist[n]=nd;paths[n]=[...paths[id],n];queue.push([nd,n]);}
      }}return{dist,paths};
  }
  aiPlan(l){let p=this.lords[l];if(!p.campaign_army.soldiers&&!p.campaign_army.knights)return null;let {dist,paths}=this.aiPaths(l),ranked=[];for(let [raw,path] of Object.entries(paths)){let id=+raw;if(!path.length||this.provinces[id].owner===l||this.friendly(l,this.provinces[id].owner))continue;let value=this.aiGoal(l,id);if(!value)continue;let [t,od]=this.aiTactic(l,id),a=p.campaign_army,unit=a.soldiers+8*a.knights+15*a.catapults,score=(od*value-.45*unit*(1-od)*.25)/(1+.43*Math.max(0,dist[id]-1));if(this.ai_goals[l]===id)score*=1.16;ranked.push({score,goal:id,path,tactic:t,odds:od});}ranked.sort((a,b)=>b.score-a.score||b.odds-a.odds||a.goal-b.goal);return ranked[0]?.score>=4?ranked[0]:null;}
  aiNeedSiege(l){let p=this.lords[l];if(p.home_army.catapults+p.campaign_army.catapults>0)return false;if(p.faction==='Norman'&&this.aiAccessible(l,3))return true;if(this.aiPlan(l))return false;let frontier=new Set(this.neighbors[p.campaign_province]);for(let n of [...frontier])for(let id of this.neighbors[n]){let o=this.provinces[id].owner;if(!o||o===l||this.friendly(l,o))frontier.add(id);}return [...frontier].some(id=>this.provinces[id].owner!==l&&!this.friendly(l,this.provinces[id].owner)&&(this.provinces[id].home_castle||this.provinces[id].secondary_castle));}
  aiRecruit(l,plan,danger){let p=this.lords[l];if(p.campaign_province!==p.home_province)return 0;let a=p.campaign_army,current=a.soldiers+5*a.knights,reserved=p.home_army.soldiers+5*p.home_army.knights,target=plan?14:34;if(p.faction==='Norman')target=Math.max(target,26);if(p.faction==='Norman'&&this.aiAccessible(l,3)){let enemies=IDS.filter(id=>{let o=this.provinces[id].owner;return o&&this.lords[o].faction==='Saxon'&&this.provinces[id].home_castle;});if(enemies.length){let best=Math.min(...enemies.map(id=>this.defensePower(id)*Math.max(1.1,1.85-.16*Math.max(1,a.catapults+p.home_army.catapults))));target=Math.max(target,Math.min(75,Math.floor(1.8*best/LEAD[l])));}}if(danger>=.48)target=Math.max(target,30);let deficit=Math.max(0,target-current-Math.max(0,reserved-7));if(danger>=.45&&p.home_army.soldiers<11)deficit=Math.max(deficit,11-p.home_army.soldiers);return Math.min(25,deficit);}
  aiFortress(l){let p=this.lords[l];if(p.treasury<44)return null;let candidates=[];for(let id of IDS){let pr=this.provinces[id];if(pr.owner!==l||pr.home_castle||pr.secondary_castle)continue;let en=this.neighbors[id].filter(n=>this.provinces[n].owner&&!this.friendly(l,this.provinces[n].owner)&&this.provinces[n].owner!==l);if(!en.length)continue;let armies=Object.keys(this.lords).filter(e=>e!==l&&this.lords[e].alive&&!this.friendly(l,e)&&this.neighbors[id].includes(this.lords[e].campaign_province)).length;let exp=2*en.length+3*armies+T[id][1]*.35;if(exp>=5)candidates.push([exp,id]);}candidates.sort((a,b)=>b[0]-a[0]||b[1]-a[1]);return candidates[0]?.[1]??null;}
  aiOne(l){let p=this.lords[l];if(!p.alive)return '';let home=p.home_province,location=p.campaign_province,funds=p.treasury,danger=this.aiHomeDanger(l);let name=SHORT[l];
    if(danger>=.50&&location!==home&&COUNT(p.campaign_army)>0){this.move(l,home);delete this.ai_goals[l];return `${name}: Returned home to defend the castle.`;}
    if(location===home){let reserve=danger>=.45?11:7,units={soldiers:Math.max(0,p.home_army.soldiers-reserve),knights:p.home_army.knights,catapults:p.home_army.catapults};if(COUNT(units))this.transfer(l,units);}
    let plan=this.aiPlan(l);
    if(location===home&&funds>=15&&this.aiNeedSiege(l)&&(p.faction==='Norman'&&this.aiAccessible(l,3)||!plan)&&p.campaign_army.soldiers+5*p.campaign_army.knights>=12){this.purchase(l,{catapults:1});return `${name}: Recruited a catapult for a planned siege.`;}
    if(location===home&&funds>=8){let need=this.aiRecruit(l,plan,danger);if(need>=5){let n=Math.min(need,Math.max(0,funds-(danger>=.6?0:3)));if(n>=5){this.purchase(l,{soldiers:n});return `${name}: Recruited ${n} soldiers for the campaign.`;}}}
    if(location===home&&p.treasury>=15&&this.aiNeedSiege(l)){this.purchase(l,{catapults:1});return `${name}: Recruited a catapult for a planned siege.`;}
    let castle=this.aiFortress(l);if(castle!==null&&(danger>=.45||!plan||plan.score<16)){this.purchaseCastle(l,castle);return `${name}: Fortified ${T[castle][0]}.`;}
    if(plan){let dest=plan.path[0],owner=this.provinces[dest].owner;if(owner===l||this.friendly(l,owner)){let r=this.move(l,dest);this.ai_goals[l]=plan.goal;return `${name}: ${r.text.replace(/\.$/,'')} toward ${T[plan.goal][0]}.`;}let [t,od]=this.aiTactic(l,dest);if(!owner||od>=this.aiFloor(l,dest)){let r=this.move(l,dest,t,false);if(r.win&&dest!==plan.goal)this.ai_goals[l]=plan.goal;else delete this.ai_goals[l];return `${name}: ${r.text}`;}delete this.ai_goals[l];}
    if(location!==home&&(funds>=8||COUNT(p.home_army)>7)){this.retreat(l);delete this.ai_goals[l];return `${name}: Withdrew to regroup at the home castle.`;}
    if(location===home&&p.treasury>=8&&p.home_army.soldiers<7){let n=Math.min(12,p.treasury);this.purchase(l,{soldiers:n});return `${name}: Reinforced the home garrison with ${n} soldiers.`;}
    return `${name}: Guarded ${T[p.campaign_province][0]}.`;
  }
  randomEvent(){if(this.rng.random()>=.10)return '';let living=Object.keys(this.lords).filter(l=>this.lords[l].alive),l=this.rng.choice(living),p=this.lords[l],kinds=this.rng.shuffle(['robbery','revolt','sabotage']);for(let kind of kinds){if(kind==='robbery'&&p.treasury>=2){let n=Math.max(1,Math.floor(p.treasury/2));p.treasury-=n;this.event('tax_robbery',l);return `${SHORT[l]}: Robbers stole ${n} gold.`;}if(kind==='revolt'){let can=IDS.filter(id=>this.provinces[id].owner===l&&!this.provinces[id].home_castle);if(can.length){let id=this.rng.choice(can),pr=this.provinces[id];pr.owner=null;pr.secondary_castle=false;pr.castle_garrison=0;pr.castle_equipment={knights:0,catapults:0};if(p.campaign_province===id)p.campaign_province=p.home_province;this.event('province_revolt',l,id);return `${SHORT[l]}: ${T[id][0]} revolted.`;}}if(kind==='sabotage'){let avail=['home','campaign'].filter(k=>p[k+'_army'].catapults>0);if(avail.length){let k=this.rng.choice(avail);this.casualties(l,k,{soldiers:0,knights:0,catapults:1});this.event('sabotage',l);return `${SHORT[l]}: A catapult was sabotaged.`;}}}return '';}
  advanceMonth(){this.turn++;if(this.month===12){this.month=1;this.year++;}else this.month++;let receipts={};for(let [l,p] of Object.entries(this.lords)){if(!p.alive)continue;let amount=this.income(l);p.treasury+=amount;p.gold_earned_total+=amount;receipts[l]=amount;this.event('monthly_tax',l,null,{received:amount,balance:p.treasury});}this.last_taxes=receipts;return receipts;}
  possiblyRivalry(){if(this.norman_rivalry_emerged||this.turn<8)return '';let remain=IDS.filter(id=>{let o=this.provinces[id].owner;return o&&this.lords[o].faction==='Saxon';}).length;if(remain>2||this.rng.random()>=.12)return '';let n=Object.keys(this.lords).filter(l=>this.lords[l].alive&&this.lords[l].faction==='Norman');if(n.length<2)return '';let [a,b]=this.rng.sample(n,2);this.norman_rivalry_emerged=true;this.declareWar(a,b);return `${SHORT[a]} and ${SHORT[b]} became bitter Norman rivals.`;}
  maidenUnion(ally){let l=this.human,p=this.lords[l],friend=this.lords[ally];if(this.maiden_rescue_done||!friend?.alive||friend.faction!=='Saxon')throw Error('This rescue is not available');let owned=IDS.filter(id=>this.provinces[id].owner===ally),home=friend.home_province;owned.forEach(id=>this.provinces[id].owner=l);let fort=this.provinces[home];fort.home_castle=true;fort.secondary_castle=false;fort.castle_garrison=0;fort.castle_equipment={knights:0,catapults:0};p.spouse='Lady Catherine';p.spouse_ally=ally;this.changeLeadership(l,.08);friend.alive=false;friend.home_army=EMPTY();friend.campaign_army=EMPTY();friend.campaign_province=home;this.maiden_rescue_done=true;this.event('maiden_union',l,home,{ally,territories:owned.length});this.checkEnd();return owned.length;}
  toJSON(){let {rng,...other}=this;return {...other,rngSeed:this.rng.seed};}
  static fromJSON(data){let state=Object.create(CrownState.prototype);Object.assign(state,data);state.rng=new Rng(data.rngSeed);return state;}
}
