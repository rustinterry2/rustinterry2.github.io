import {CrownState,Rng,T,IDS,SAXONS,NORMANS,SHORT,TIERS,LEAD,START_RANK,COLORS,HORSES,CASTLE_POS,PRICES,U,SUMMARY,COUNT,MONTH,ENGLAND,CASTLES} from './engine.js';
const W=852,H=1846,A='assets/';const gameCanvas=document.getElementById('game'),c=gameCanvas.getContext('2d',{alpha:false});
const color=(a)=>`rgb(${a.join(',')})`;const INK='#432018',LIGHT='#663021',BEIGE='#d3ab73';
const img={}, buttons=[];let fontMetrics,atlas,hit,paint,baseData,hitData,paintData,assetMap={};
let mode='splash',state=null,options={character:null,difficulty:'easy',map:'england'},mapInfo=null;
let selected=0,pendingTarget=null,attackingAlly=false,tactic='Stand and Fight',quantity={soldiers:0,knights:0,catapults:0},wantCastle=false,selectedCastle=null,transferDir='out';
let message='',backMode='orders',scene='',sceneReturn='orders',sceneNotice='',sceneNoticeBack='',sceneOverlay='',story=[],storyEnd='orders',pendingMaiden=null,summary=[],reportScroll=0,flashId=0,flashVisible=false,visualOwners=null,visualHorsePos=null,visualAlive=null,guide='conquest',guideTarget=0,guideTicks=0;
let queue=[],queueIndex=0,aiMessage='',aiRunning=false,pendingHomeAttack=null,pendingHumanFlash=0,lastSceneBefore='';let coloredMap=null,coloredMapKey='',tapActive=false;
let noticePortrait=null;
const outlineCache=new Map();
function loadImage(file){return new Promise((resolve,reject)=>{let im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Failed loading '+file));im.src=A+(assetMap[file]||file);});}
async function loadAssets(){let all=['board.png','font_atlas.png','hitmask.png','paint_alpha.png','title_splash.png','robin_sherwood.png','norman_castle.png','saxon_castle.png','maiden_swordfight.png','lady_catherine.png','the_end.png','tournament_joust.png','tournament_trumpets.png','home_castle_under_attack.png','home_castle_fallen.png'];
  all.push(...['wilfred','cedric','geoffrey','wolfric','robin','brian','edmund','philip','roger','reginald'].map(p=>'portrait_'+p+'.png'));
  assetMap=await (await fetch(A+'asset_manifest.json')).json();
  await Promise.all(all.map(async f=>{img[f]=await loadImage(f);}));
  fontMetrics=await (await fetch(A+'font_metrics.json')).json();atlas=img['font_atlas.png'];hit=img['hitmask.png'];paint=img['paint_alpha.png'];
  const temp=document.createElement('canvas');temp.width=W;temp.height=H;let ctx=temp.getContext('2d',{willReadFrequently:true});ctx.drawImage(img['board.png'],0,0);baseData=ctx.getImageData(0,0,W,H);ctx.clearRect(0,0,W,H);ctx.drawImage(hit,0,0);hitData=ctx.getImageData(0,0,W,H);ctx.clearRect(0,0,W,H);ctx.drawImage(paint,0,0);paintData=ctx.getImageData(0,0,W,H);}
const glyphCache=new Map();function glyph(style,ch,ink){let source=style==='report'?'small':style,metric=fontMetrics[source],g=metric.glyphs[ch]||metric.glyphs[' '];let [sx,sy,adv]=g,[tw,th]=metric.tile,key=`${source}/${ch}/${ink}`;if(!glyphCache.has(key)){
  let canvas=document.createElement('canvas');canvas.width=tw;canvas.height=th;let x=canvas.getContext('2d',{willReadFrequently:true});x.drawImage(atlas,sx,sy,tw,th,0,0,tw,th);let data=x.getImageData(0,0,tw,th);let rgb=(ink.match(/[a-f\d]{2}/gi)||[]).map(v=>parseInt(v,16));if(rgb.length!==3)rgb=[67,32,24];for(let i=0;i<data.data.length;i+=4){let alpha=data.data[i];data.data[i]=rgb[0];data.data[i+1]=rgb[1];data.data[i+2]=rgb[2];data.data[i+3]=alpha;}x.putImageData(data,0,0);glyphCache.set(key,canvas);
}return {canvas:glyphCache.get(key),adv:style==='report'?Math.round(adv*.93):adv};}
function width(text,style='body'){return [...String(text)].reduce((n,ch)=>n+glyph(style,ch,INK).adv,0);}
function text(str,x,y,style='body',ink=INK,align='left'){str=String(str);let off=align==='center'?width(str,style)/2:align==='right'?width(str,style):0;for(let ch of str){let g=glyph(style,ch,ink);if(ch!==' ')c.drawImage(g.canvas,Math.round(x-off),Math.round(y));off-=g.adv;}}
function fit(str,x,y,style='small',max=660){let s=String(str);while(width(s,style)>max&&s.length>8)s=s.slice(0,-5)+'...';text(s,x,y,style,INK,'center');}
function wrap(str,style='body',max=610){let lines=[],current='';for(let word of String(str).split(' ')){let candidate=(current+' '+word).trim();if(width(candidate,style)>max&&current){lines.push(current);current=word;}else current=candidate;}if(current)lines.push(current);return lines;}
function lines(items,start=1250,step=72,style='body'){let y=start;for(let line of items){let fragments=wrap(line,style,615);for(let frag of fragments){text(frag,W/2,y,style,LIGHT,'center');y+=step;} } }
function rule(y){c.strokeStyle='#a46a38';c.lineWidth=2;c.beginPath();c.moveTo(117,y);c.lineTo(735,y);c.stroke();c.fillStyle='#8b4f26';c.beginPath();c.moveTo(426,y-8);c.lineTo(435,y);c.lineTo(426,y+8);c.lineTo(418,y);c.fill();}
function button(key,label,rect,style='body',active=false){buttons.push({key,rect});let[x,y,x2,y2]=rect;c.fillStyle=active?'#c19562':'#d3ab73';c.fillRect(x,y,x2-x,y2-y);c.lineWidth=4;c.strokeStyle='#582c18';c.strokeRect(x+1,y+1,x2-x-2,y2-y-2);c.lineWidth=2;c.strokeStyle='#efcc99';c.strokeRect(x+7,y+7,x2-x-14,y2-y-14);text(label,(x+x2)/2,y+Math.max(1,(y2-y-fontMetrics[style].tile[1])/2),style,INK,'center');}
function header(title,sub=null){text(title,426,1013,'title',INK,'center');if(sub)text(sub,426,1091,'small',LIGHT,'center');rule(1154);}
function status(){let p=state.lords[state.human];return `${MONTH[state.month-1]} ${state.year}     Gold ${p.treasury}     Income ${state.income(state.human)}`;}
function portraitPath(l){let key=SHORT[l]?.toLowerCase()||'robin';return img['portrait_'+key+'.png']||img['lady_catherine.png'];}
function drawPortrait(l,[x,y,x2,y2],caption=true){let im=portraitPath(l);c.fillStyle='#754928';c.fillRect(x,y,x2-x,y2-y);c.strokeStyle='#3c2012';c.lineWidth=5;c.strokeRect(x,y,x2-x,y2-y);c.fillStyle='#dfb880';c.fillRect(x+8,y+8,x2-x-16,y2-y-16);let w=x2-x-28,h=y2-y-28;
  // Fit and crop like the Pyto portrait renderer.
  let ratio=Math.max(w/im.width,h/im.height),sw=w/ratio,sh=h/ratio,sx=(im.width-sw)/2,sy=Math.max(0,Math.min(im.height-sh,(im.height-sh)*.24));c.drawImage(im,sx,sy,sw,sh,x+14,y+12,w,h);c.lineWidth=3;c.strokeStyle='#5b301b';c.strokeRect(x+12,y+10,w+4,h+4);if(caption)text(SHORT[l]||l,(x+x2)/2,y2+7,'small',INK,'center');}
function castleGraphic(id,x,y){c.fillStyle='#bb8a52';c.strokeStyle='#2a140e';c.lineWidth=3;c.fillRect(x-13,y-3,26,19);c.strokeRect(x-13,y-3,26,19);for(let dx of [-11,0,11]){c.fillStyle='#d7ab72';c.fillRect(x+dx-4,y-10,8,13);c.strokeRect(x+dx-4,y-10,8,13);}c.fillStyle='#4d2d1b';c.fillRect(x-3,y+8,6,8);}
function horse(x,y,rgb){
  c.save();c.translate(Math.round(x-32),Math.round(y-23));
  c.fillStyle='#151210';
  c.fillRect(18,18,42,19);c.fillRect(12,12,19,24);
  c.fillRect(4,19,17,10);c.fillRect(11,7,7,12);
  c.fillRect(19,31,7,19);c.fillRect(32,32,7,18);
  c.fillRect(46,32,7,18);c.fillRect(54,30,7,17);
  c.fillRect(57,21,9,6);
  c.fillStyle='#352b25';c.fillRect(7,23,3,2);
  c.fillStyle=color(rgb);c.fillRect(31,14,15,13);
  c.fillStyle='#151210';c.fillRect(34,5,10,10);c.fillRect(29,25,21,3);
  c.restore();
}
const cachedCanvas=document.createElement('canvas');cachedCanvas.width=W;cachedCanvas.height=H;let cachedCtx=cachedCanvas.getContext('2d');
function coloredBoard(){let owners=IDS.map(id=>state.provinces[id].owner),castleIds=IDS.filter(id=>state.provinces[id].secondary_castle),key=JSON.stringify([owners,castleIds,mapInfo?.seed??null]);if(key===coloredMapKey&&coloredMap)return coloredMap;
  let canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;let x=canvas.getContext('2d');
  if(mapInfo?.type==='random'){
    x.drawImage(img['board.png'],0,0);
    // Hide England's original map with an old parchment patch; draw fresh kingdom at low resolution.
    x.fillStyle='#d7aa74';x.fillRect(78,130,698,802);
    let px=mapInfo.cells,pw=mapInfo.w,ph=mapInfo.h,scale=4;
    for(let yy=0;yy<ph;yy++)for(let xx=0;xx<pw;xx++){let id=px[yy*pw+xx];if(!id)continue;let edge=(xx===0||yy===0||xx===pw-1||yy===ph-1||px[yy*pw+xx-1]!==id||px[yy*pw+xx+1]!==id||px[(yy-1)*pw+xx]!==id||px[(yy+1)*pw+xx]!==id);x.fillStyle=edge?'#20130f':color(state.colors[state.provinces[id].owner]||[157,119,66]);x.fillRect(xx*scale,yy*scale,scale,scale);}
    for(let id of IDS){let pr=state.provinces[id];if(pr.home_castle||pr.secondary_castle){let [cx,cy]=mapInfo.castles[id];x.fillStyle='#c79a5e';x.fillRect(cx-13,cy-3,26,20);x.fillStyle='#22160f';x.strokeRect(cx-13,cy-3,26,20);for(let t of [-10,0,10]){x.fillStyle='#ebc58b';x.fillRect(cx+t-3,cy-9,7,10);}x.fillStyle='#4b2919';x.fillRect(cx-3,cy+7,6,10);}}
  }else{
    let data=new Uint8ClampedArray(baseData.data);for(let i=0;i<data.length;i+=4){let id=hitData.data[i];if(id===11)id=14;if(!T[id])continue;let owner=state.provinces[id].owner,cl=state.colors[owner]||[157,119,66],alpha=paintData.data[i]/255;if(alpha<=.001)continue;for(let z=0;z<3;z++)data[i+z]=Math.round(data[i+z]*(1-alpha)+cl[z]*alpha);}x.putImageData(new ImageData(data,W,H),0,0);
    for(let id of castleIds){if(CASTLES.includes(id))continue;let [cx,cy]=CASTLE_POS[id];x.fillStyle='#c69c65';x.strokeStyle='#2a140e';x.fillRect(cx-13,cy-3,26,19);x.strokeRect(cx-13,cy-3,26,19);for(let dx of [-10,0,10])x.fillRect(cx+dx-4,cy-10,8,13);}
  }
  coloredMapKey=key;coloredMap=canvas;return canvas;
}
function territoryOutline(id){
  const key=(mapInfo?.type==='random'?'r'+mapInfo.seed:'england')+':'+id;
  if(outlineCache.has(key))return outlineCache.get(key);
  const sheet=document.createElement('canvas');sheet.width=W;sheet.height=H;
  const x=sheet.getContext('2d');x.fillStyle='rgba(255,211,80,.98)';
  if(mapInfo?.type==='random'){
    const {cells,w,h}=mapInfo;
    for(let yy=1;yy<h-1;yy++)for(let xx=1;xx<w-1;xx++){
      const i=yy*w+xx;if(cells[i]!==id)continue;const px=xx*4,py=yy*4;
      if(cells[i-1]!==id)x.fillRect(px,py,4,4);
      if(cells[i+1]!==id)x.fillRect(px+2,py,3,4);
      if(cells[i-w]!==id)x.fillRect(px,py,4,3);
      if(cells[i+w]!==id)x.fillRect(px,py+2,4,3);
    }
  }else{
    const maskAt=(px,py)=>{if(px<0||py<0||px>=W||py>=H)return 0;
      const n=hitData.data[(py*W+px)*4];return n===11?14:n;};
    for(let py=140;py<945;py+=2)for(let px=35;px<817;px+=2){
      if(maskAt(px,py)!==id)continue;
      if(maskAt(px-3,py)!==id||maskAt(px+3,py)!==id||maskAt(px,py-3)!==id||maskAt(px,py+3)!==id)x.fillRect(px,py,3,3);
    }
  }
  outlineCache.set(key,sheet);return sheet;
}
function renderMap(){if(!state){c.drawImage(img['board.png'],0,0);return;}if(visualOwners){let saved=state.provinces;let hold={};for(let id of IDS){hold[id]=saved[id].owner;if(id in visualOwners)saved[id].owner=visualOwners[id];}coloredMapKey='';c.drawImage(coloredBoard(),0,0);for(let id of IDS)saved[id].owner=hold[id];coloredMapKey='';}else c.drawImage(coloredBoard(),0,0);
  for(let [l,p] of Object.entries(state.lords)){if(!(visualAlive?.[l]??p.alive))continue;let id=visualHorsePos?.[l]??p.campaign_province,pt=mapInfo?.type==='random'?mapInfo.horses[id]:HORSES[id];if(!pt)continue;horse(...pt,state.colors[l]||[120,155,220]);}
  if(selected>0&&['read','move','castle_pick','battle','passage'].includes(mode))c.drawImage(territoryOutline(selected),0,0);
  if(flashVisible&&flashId){let mask=mapInfo?.type==='random'?null:hitData;if(mask){c.fillStyle='rgba(255,205,104,.30)';for(let y=140;y<950;y+=4)for(let x=40;x<820;x+=4){if(mask.data[(y*W+x)*4]===flashId)c.fillRect(x,y,4,4);}}else c.drawImage(territoryOutline(flashId),0,0);}
}
function fullScreen(file,overlay=''){c.fillStyle='#000';c.fillRect(0,0,W,H);let im=img[file];let ratio=Math.min(W/im.width,(H-220)/im.height),dw=im.width*ratio,dh=im.height*ratio,dx=(W-dw)/2,dy=(H-dh)/2;c.imageSmoothingEnabled=file==='home_castle_under_attack.png'||file==='home_castle_fallen.png'?false:true;c.drawImage(im,dx,dy,dw,dh);c.imageSmoothingEnabled=true;if(overlay==='The End'){text('The End',192,720,'title','#150a07','center');text('The End',188,716,'title','#edcf87','center');}}
function renderSetup(){c.drawImage(img['board.png'],0,0);c.fillStyle='#e4bb81';c.fillRect(49,80,754,1692);c.strokeStyle='#61391f';c.lineWidth=9;c.strokeRect(49,80,754,1692);text('A Kingdom Awaits',426,111,'title',INK,'center');text('Choose thy lord and destiny',426,183,'small',LIGHT,'center');rule(232);text('I. Choose Thy Saxon Lord',426,252,'name',INK,'center');let lords=['Wolfric the Wild','Geoffrey Longsword','Cedric of Rotherwood','Wilfred of Ivanhoe'];lords.forEach((l,i)=>{let x=65+188*i,y=315,im=portraitPath(l),w=161,h=199,active=options.character===l;c.fillStyle=active?'#e0aa55':'#855632';c.fillRect(x-8,y-8,w+16,h+16);c.drawImage(im,x,y,w,h);c.lineWidth=active?6:4;c.strokeStyle=active?'#ffe088':'#4d2714';c.strokeRect(x,y,w,h);buttons.push({key:'setup_lord:'+l,rect:[x-8,y-8,x+w+8,651]});text(SHORT[l],x+w/2,530,'small',INK,'center');text(START_RANK[l],x+w/2,578,'small',LIGHT,'center');});button('setup_lord:random','Random Lord',[122,670,730,742],'body',options.character===null);rule(772);text('II. Choose Thy Challenge',426,796,'name',INK,'center');[['easy','Noble Quest','Two Saxon allies; rescue available'],['medium','Norman Peril','One Saxon ally; one lord turns Norman'],['hard','The Last Saxon','No Saxon allies; no maiden rescue']].forEach(([key,title,desc],i)=>{let y=854+i*116;button('setup_difficulty:'+key,title,[122,y,730,y+72],'body',options.difficulty===key);text(desc,426,y+76,'small',LIGHT,'center');});rule(1215);text('III. Choose Thy Kingdom',426,1236,'name',INK,'center');button('setup_map:england','England - Original Map',[122,1323,730,1395],'body',options.map==='england');button('setup_map:random','Random Kingdom',[122,1420,730,1492],'body',options.map==='random');text('A different realm with each new campaign',426,1510,'small',LIGHT,'center');rule(1590);button('setup_begin','Begin Campaign',[122,1646,730,1720]);}
function drawOrders(){header('Your orders?',status());[['conquest','Seek Conquest',1186],['army','Build Army',1284],['read','Read Map',1382],['end','End Month',1484],['history','History',1570]].forEach(([k,s,y])=>button(k,s,[85,y,505,y+82]));drawPortrait(state.human,[565,1140,751,1350]);text('Leadership',658,1396,'small',LIGHT,'center');text(state.rank(state.human),658,1450,'small',INK,'center');let p=state.lords[state.human];if(p.spouse){drawPortrait('Lady Catherine',[565,1494,751,1704]);text(`${SHORT[state.human]} of ${T[p.home_province][0]}`,285,1697,'small',INK,'center');}else fit(`${SHORT[state.human]} of ${T[p.home_province][0]}  /  Robin: ${p.robin_uses_remaining}`,426,1690);}
function drawRead(){header('Read Map','Tap any territory above');if(selected===-1){text('Sherwood Forest',426,1210,'name',INK,'center');lines(['Robin Hood dwells beneath the trees.','Seek his help in thy next enemy battle.'],1320,70,'small');}else if(selected&&T[selected]){let id=selected,pr=state.provinces[id],owner=pr.owner; text(T[id][0],426,1194,'name',INK,'center');rule(1280);[['Owner',owner?SHORT[owner]:'Unclaimed'],['Gold / month',T[id][1]],['Vassals left',state.remainingVassals(id)],['Castle',pr.home_castle?'Home':pr.secondary_castle?'Built':'None']].forEach(([k,v],i)=>{text(k,125,1310+i*61,'small',LIGHT);text(v,705,1310+i*61,'small',INK,'right');});if(owner&&state.lords[owner].home_province===id)drawPortrait(owner,[565,1470,743,1620]);}else lines(['Touch a province to learn its','owner, income, vassals and lord.','Read Map costs no turn.'],1250,90);button('back','Back to Orders',[165,1644,687,1716]);}
function drawConquest(){let p=state.lords[state.human],r=state.castleReserve(state.human);header('Seek Conquest',status());lines([`At: ${T[p.campaign_province][0]}`,`Castle: ${SUMMARY(r||p.home_army)}`,`Field: ${SUMMARY(p.campaign_army)}`,`Robin: ${p.robin_uses_remaining} times left${state.robin_pending?' - Pledged':''}`],1188,63,'small');button('transfer','Transfer Troops',[165,1460,687,1532]);button('move','Move Army',[165,1540,687,1612]);button('robin','See Robin',[165,1620,687,1692]);button('back','Back',[165,1700,687,1772]);}
function drawArmy(){let p=state.lords[state.human];header('Build Army',`Treasury: ${p.treasury} gold  /  Income: ${state.income(state.human)}`);[['soldiers','Soldiers',1],['knights','Knights',8],['catapults','Catapults',15],['castle','Castle',20]].forEach(([u,label,cost],i)=>{let y=1180+i*74;text(`${label}  ${cost} g`,123,y+6,'body',INK);text(u==='castle'?+(wantCastle):quantity[u],550,y+7,'body',INK,'right');button('minus:'+u,'-',[577,y,638,y+62]);button('plus:'+u,'+',[662,y,724,y+62]);});text('Field troops: '+SUMMARY(p.campaign_army),426,1474,'small',INK,'center');text('Home castle: '+SUMMARY(p.home_army),426,1528,'small',INK,'center');let cost=costOf();text(`Total: ${cost}   Remaining: ${Math.max(0,p.treasury-cost)}`,426,1582,'small',INK,'center');button('buy','Confirm Purchase',[165,1640,687,1707]);button('back','Back',[165,1720,687,1787]);}
function drawCastlePick(){header('Place Thy Castle','Tap an owned province without a castle');text(selectedCastle?T[selectedCastle][0]:'None selected',426,1262,'name',INK,'center');lines(['Castle cost: 20 gold','Includes a 10 soldier garrison','This purchase ends your turn'],1382,70,'small');button('build_confirm','Confirm Purchase',[165,1598,687,1670]);button('back','Cancel',[165,1678,687,1750]);}
function drawTransfer(){let p=state.lords[state.human],r=state.castleReserve(state.human);header('Transfer Troops',`At: ${T[p.campaign_province][0]} castle`);if(!r){lines(['Thy field army must be at one of','thy castles to transfer troops.'],1310,70);button('back','Back',[165,1668,687,1740]);return;}button('direction',transferDir==='out'?'Castle to Field':'Field to Castle',[165,1170,687,1242]);U.forEach((u,i)=>{let y=1260+i*94;text(`${u}  C:${r[u]} F:${p.campaign_army[u]}`,123,y,'small');text(quantity[u],550,y,'body',INK,'right');button('minus:'+u,'-',[577,y-8,638,y+54]);button('plus:'+u,'+',[662,y-8,724,y+54]);});button('transfer_confirm','Transfer',[165,1581,687,1653]);button('back','Back',[165,1668,687,1740]);}
function drawMove(){let p=state.lords[state.human];header('Move Army','Tap a bordering province above');text('From: '+T[p.campaign_province][0],426,1196,'name',INK,'center');lines(['Field army: '+SUMMARY(p.campaign_army),'Neutral or enemy attack ends the turn','Friendly travel is free','Tap Sherwood to request Robin'],1313,72,'small');button('back','Back to Conquest',[165,1622,687,1694]);}
function drawBattle(){let id=pendingTarget,pr=state.provinces[id];header('Battle Orders',T[id][0]+'  /  '+(pr.home_castle||pr.secondary_castle?'Siege':'Field battle'));lines(['Your army: '+SUMMARY(state.lords[state.human].campaign_army),'Defenders: '+SUMMARY(state.defenders(id))],1183,64,'small');[['Stand and Fight',88,1347],['Ferocious Attack',438,1347],['Outflank',88,1438],['Bombard',438,1438]].forEach(([t,x,y])=>button('tactic:'+t,t,[x,y,x+326,y+78],'small',t===tactic));text(`Estimated win chance: ${Math.round(state.expectedOdds(state.human,id,tactic)*100)} percent`,426,1533,'small',LIGHT,'center');button('fight','Attack',[165,1598,687,1670]);button('back','Cancel',[165,1678,687,1750]);}
function drawPassage(){header('An Allied Province',T[pendingTarget][0]);lines(['A fellow Saxon lord holds this land.','Seek safe passage, or take arms','against thy own ally?'],1260,75);button('pass_safe','Request Passage',[165,1510,687,1582]);button('pass_attack','Attack Ally',[165,1590,687,1662]);button('back','Cancel',[165,1670,687,1742]);}
function lordForLog(line){const match=String(line).match(/^([A-Za-z]+):/);return match?Object.keys(state.lords).find(l=>SHORT[l]===match[1]):null;}
function lordSquare(l,x,y,size=18){const rgb=state.colors[l];if(!rgb)return;c.fillStyle=color(rgb);c.fillRect(x,y,size,size);c.strokeStyle='#4c2a18';c.lineWidth=2;c.strokeRect(x,y,size,size);}
function reportLines(){return summary.flatMap(raw=>wrap(raw,'report',630).map((line,i)=>({line,lord:i===0?lordForLog(raw):null})));}
function drawReport(){
  header(state.outcome==='victory'?'The Crown Is Thine':state.outcome==='defeat'?'Thy Castle Is Lost':'The Month Passes',status());
  const all=reportLines(),visible=all.slice(reportScroll,reportScroll+8);
  visible.forEach(({line,lord},i)=>{const y=1180+i*49;text(line,426,y,'report',INK,'center');if(lord)lordSquare(lord,426-width(line,'report')/2-26,y+12);});
  if(all.length>8){button('report_up','Up',[85,1586,191,1646],'small');button('report_down','Down',[656,1586,767,1646],'small');}
  button('report_ok','Continue',[165,1664,687,1736]);
}
function drawHistory(){
  header('Chronicle',status());
  state.ledger.slice(-7).reverse().forEach((r,i)=>{
    const y=1202+i*63,date=MONTH[r.month-1]+' ',name=(SHORT[r.lord]||'')+': ';
    let label=name+r.action.replaceAll('_',' ');
    while(width(date+label,'small')>630&&label.length>12)label=label.slice(0,-5)+'...';
    const start=426-(width(date+label,'small')+23)/2;
    text(date,start,y,'small',INK);const x=start+width(date,'small');
    lordSquare(r.lord,x+1,y+12,17);text(label,x+24,y,'small',INK);
  });
  button('accounts','Royal Accounts',[90,1608,410,1680]);button('back','Back',[442,1608,762,1680]);
}
function drawAccounts(){let p=state.lords[state.human];header('Royal Accounts',status());let rows=[['Provinces',`${state.territoryCount(state.human)} of 18`],['Treasury',`${p.treasury} gold`],['Gold earned',p.gold_earned_total],['Gold spent',p.gold_spent_total],['Monthly income',state.income(state.human)],['Vassals recruited',p.vassals_recruited_total],['Troops lost',p.troops_lost_total],['Castles built',IDS.filter(id=>state.provinces[id].owner===state.human&&state.provinces[id].secondary_castle).length],['Leadership',`${Math.round(state.leadershipValue(state.human)*100)} (${state.rank(state.human)})`]];rows.forEach(([k,v],i)=>{text(k,132,1177+i*47,'small',LIGHT);text(v,705,1177+i*47,'small',INK,'right');});text('Home '+SUMMARY(p.home_army),426,1602,'small',INK,'center');text('Field '+SUMMARY(p.campaign_army),426,1644,'small',INK,'center');button('back_history','Back to History',[165,1678,687,1750]);}
function drawNotice(){
  header('A Royal Message',status());
  if(noticePortrait==='Robin Hood'){
    drawPortrait('Robin Hood',[540,1177,753,1440]);
    wrap(message,'body',365).slice(0,5).forEach((line,i)=>text(line,294,1220+i*77,'body',LIGHT,'center'));
  }else{
    wrap(message,'body',600).slice(0,7).forEach((line,i)=>text(line,426,1235+i*75,'body',LIGHT,'center'));
  }
  button('notice_ok','Continue',[165,1626,687,1698]);
}
function drawInvitation(maiden){header(maiden?'A Saxon Lady in Peril':'A Tournament',status());if(maiden)lines([`Word comes from the house of ${SHORT[pendingMaiden]}.`,'Lady Catherine has been seized by the','Normans and carried into a dark keep.','Wilt thou ride to her aid?'],1220,70);else lines(['A tournament has been called.','All the lords gather to joust.','Fame awaits the bold of heart.','Wilt thou ride in the lists?'],1220,70);button(maiden?'maiden_yes':'tournament_yes',maiden?'Ride to her aid':'Enter Tournament',[112,1538,740,1618]);button(maiden?'maiden_no':'tournament_no',maiden?'Refuse the plea':'Decline Invitation',[112,1630,740,1710]);}
function drawAi(){header('The Lords Take Their Turns',status());lines([aiMessage||'The other lords prepare their orders.'],1260,70,'small');}
function drawGuide(){if(guide==='off'||!['orders','conquest','transfer','move'].includes(mode))return;let target={conquest:'conquest',transfer:'transfer',plus:'plus:soldiers',move:'move'}[guide],btn=buttons.find(b=>b.key===target);let x,y;if(guide==='province'){let pt=mapInfo?.type==='random'?mapInfo.horses[guideTarget]:HORSES[guideTarget];if(!pt)return;[x,y]=pt;y-=37;}else if(btn){x=(btn.rect[0]+btn.rect[2])/2;y=btn.rect[1]-23;}else return;c.fillStyle='#ffd34f';c.strokeStyle='#5e3513';c.lineWidth=4;let dy=Math.sin(guideTicks/3)*8;c.beginPath();c.moveTo(x-18,y-35+dy);c.lineTo(x+18,y-35+dy);c.lineTo(x+18,y-10+dy);c.lineTo(x+29,y-10+dy);c.lineTo(x,y+17+dy);c.lineTo(x-29,y-10+dy);c.lineTo(x-18,y-10+dy);c.closePath();c.fill();c.stroke();}
function render(){if(!fontMetrics)return;buttons.length=0;c.clearRect(0,0,W,H);if(mode==='splash'){fullScreen('title_splash.png');return;}if(mode==='scene'){fullScreen(scene,sceneOverlay);return;}if(mode==='setup'){renderSetup();return;}renderMap();switch(mode){case 'orders':drawOrders();break;case 'read':drawRead();break;case 'conquest':drawConquest();break;case 'army':drawArmy();break;case 'castle_pick':drawCastlePick();break;case 'transfer':drawTransfer();break;case 'move':drawMove();break;case 'battle':drawBattle();break;case 'passage':drawPassage();break;case 'report':drawReport();break;case 'history':drawHistory();break;case 'accounts':drawAccounts();break;case 'notice':drawNotice();break;case 'tournament_offer':drawInvitation(false);break;case 'maiden_offer':drawInvitation(true);break;case 'ai_phase':drawAi();break;}drawGuide();}
function save(){if(!state||!['orders','report'].includes(mode))return;try{localStorage.setItem(savedKey,JSON.stringify({state:state.toJSON(),options,map:mapInfo?.type==='random'?'random':'england',mode:mode==='ai_phase'?'report':mode,summary}));document.getElementById('resume').hidden=false;}catch(e){console.warn('Unable to save:',e);}}
function alertText(s,back=mode){message=s;backMode=back;mode='notice';render();}
function sceneShow(file,returnMode=mode,notice='',noticeBack=returnMode,overlay=''){scene=file;sceneReturn=returnMode;sceneNotice=notice;sceneNoticeBack=noticeBack;sceneOverlay=overlay;mode='scene';render();}
function storyBegin(steps,ending='orders'){story=steps;storyEnd=ending;storyNext();}
function storyNext(){if(!story.length){mode=storyEnd==='orders'?'orders':storyEnd;render();return;}let [kind,payload]=story.shift();if(kind==='text')alertText(payload,'__story__');else if(kind==='scene')sceneShow(payload,'__story__');else if(kind==='action'){if(payload==='union'){state.maidenUnion(pendingMaiden);pendingMaiden=null;}storyNext();}}
function enterOrders(begin=false){mode='orders';selected=0;if(begin){let ally=Object.keys(state.lords).filter(l=>l!==state.human&&state.lords[l].alive&&state.lords[l].faction==='Saxon'&&state.friendly(state.human,l)&&state.territoryCount(l)===2);if(!state.maiden_rescue_done&&ally.length){pendingMaiden=ally[0];mode='maiden_offer';state.tournament_pending=false;}else if(state.tournament_pending&&!state.tournament_held){mode='tournament_offer';}}render();save();}
function startCampaign(){let seed=(Math.random()*4294967296)>>>0;mapInfo=options.map==='random'?randomMap(seed):null;state=new CrownState({seed,difficulty:options.difficulty,humanChoice:options.character,neighbors:mapInfo?.neighbors||ENGLAND});mode='orders';coloredMapKey='';visualOwners=null;visualHorsePos=null;visualAlive=null;guide='conquest';guideTarget=0;guideTicks=0;quantity={soldiers:0,knights:0,catapults:0};wantCastle=false;pendingTarget=null;pendingMaiden=null;queue=[];summary=[];reportScroll=0;enterOrders(true);}
function costOf(){return U.reduce((n,u)=>n+quantity[u]*PRICES[u],0)+(wantCastle?20:0);}
function clearQty(){quantity={soldiers:0,knights:0,catapults:0};wantCastle=false;}
function finishTurn(msg){summary=[`${SHORT[state.human]}: ${msg}`];queue=Object.keys(state.lords).filter(l=>l!==state.human&&state.lords[l].alive);state.rng.shuffle(queue);queueIndex=0;aiMessage='The other lords prepare their orders.';mode='ai_phase';render();save();setTimeout(nextAiStep,350);}
function showFlash(id,onDone){flashId=id;flashVisible=false;let ticks=0;let interval=setInterval(()=>{flashVisible=!flashVisible;render();if(++ticks===4){clearInterval(interval);flashId=0;flashVisible=false;visualOwners=null;visualHorsePos=null;visualAlive=null;coloredMapKey='';render();onDone?.();}},115);}
function nextAiStep(){if(mode!=='ai_phase'||aiRunning)return;if(pendingHumanFlash){let id=pendingHumanFlash;pendingHumanFlash=0;showFlash(id,()=>setTimeout(nextAiStep,250));return;}aiRunning=true;let loop=()=>{if(mode!=='ai_phase'){aiRunning=false;return;}if(queueIndex>=queue.length||state.outcome){let events='';if(!state.outcome){events=state.randomEvent();if(events)summary.push(events);let rec=state.advanceMonth();summary.push(`Taxes: +${rec[state.human]||0} gold to ${SHORT[state.human]}.`);let rivalry=state.possiblyRivalry();if(rivalry)summary.push(rivalry);state.checkEnd();if(!state.outcome&&!state.tournament_held&&!state.tournament_pending&&!state.maiden_rescue_done&&state.rng.random()<.10)state.tournament_pending=true;}mode='report';reportScroll=0;aiRunning=false;render();save();return;}
    let l=queue[queueIndex++],home=state.lords[state.human].home_province,beforeOwner=state.provinces[home].owner;let owners=Object.fromEntries(IDS.map(id=>[id,state.provinces[id].owner]));let oldHorse=Object.fromEntries(Object.entries(state.lords).map(([n,p])=>[n,p.campaign_province]));let oldAlive=Object.fromEntries(Object.entries(state.lords).map(([n,p])=>[n,p.alive]));let msg=state.aiOne(l),target=state.last_battle_target;summary.push(msg||`${SHORT[l]}: No action.`);aiMessage=msg;let changed=IDS.find(id=>owners[id]!==state.provinces[id].owner&&state.provinces[id].owner===l);if(!target&&changed)target=changed;
    if(target&&owners[target]){visualOwners=owners;visualHorsePos=oldHorse;visualAlive=oldAlive;if(target===home&&beforeOwner===state.human){let won=state.provinces[home].owner===state.human;pendingHomeAttack={attacker:l,target,won};aiRunning=false;sceneShow('home_castle_under_attack.png','__home_attack_intro__');save();return;}}
    render();if(target&&owners[target])showFlash(target,()=>setTimeout(loop,300));else setTimeout(loop,300);
  };loop();}
function resumeAi(){mode='ai_phase';render();setTimeout(nextAiStep,260);}
function afterHomeIntro(){let e=pendingHomeAttack;alertText(`${SHORT[e.attacker]} has reached ${T[e.target][0]}. Thy home castle is under attack! Man the walls and beat back the invader.`,'__home_flash__');}
function afterHomeFlash(){mode='ai_phase';render();showFlash(pendingHomeAttack.target,()=>{if(pendingHomeAttack.won)alertText('Thy men have held the castle. The invader is thrown back from thy gates.','__home_resume__');else alertText('Thy home castle has fallen. With its loss, thy cause in England is ended.','__home_defeat__');});}
function provinceAt(x,y){if(y<120||y>950||x<15||x>838)return 0;if(mapInfo?.type==='random'){let lx=Math.floor(x/4),ly=Math.floor(y/4);return mapInfo.cells[ly*mapInfo.w+lx]||0;}let id=hitData.data[(Math.floor(y)*W+Math.floor(x))*4];return T[id]?id:0;}
function guideTap(key){if(guide==='off')return;let expected={conquest:'conquest',transfer:'transfer',plus:'plus:soldiers',move:'move'}[guide];if(expected!==key){if(!(guide==='move'&&key==='plus:soldiers'))guide='off';return;}guide=({conquest:'transfer',transfer:'plus',plus:'move',move:'province'})[guide];if(guide==='province'){let p=state.lords[state.human];guideTarget=(state.neighbors[p.campaign_province]||[]).filter(id=>!state.provinces[id].owner).sort((a,b)=>T[b][2]-T[a][2])[0]||0;}}
function handleClick(x,y){if(mode==='splash'){mode='setup';render();return;}if(mode==='scene'){let back=sceneReturn;if(sceneNotice){let n=sceneNotice,b=sceneNoticeBack;sceneNotice='';alertText(n,b);return;}if(back==='__story__')storyNext();else if(back==='__new_campaign__'){mode='setup';render();}else if(back==='__home_attack_intro__')afterHomeIntro();else if(back==='__resume_ai__')resumeAi();else{mode=back;render();}return;}if(mode==='ai_phase')return;
  let key=buttons.slice().reverse().find(b=>x>=b.rect[0]&&y>=b.rect[1]&&x<=b.rect[2]&&y<=b.rect[3])?.key;
  if(key){try{action(key);}catch(e){console.error(e);alertText(e.message);}render();if(!['ai_phase'].includes(mode))save();return;}
  let id=provinceAt(x,y);if(!id)return;
  if(mode==='read'){selected=id;render();return;}
  if(mode==='castle_pick'){selected=id;selectedCastle=id;render();return;}
  if(mode==='move'){
    let [ok,why]=state.legalMove(state.human,id);if(!ok){alertText(why,'move');return;}guide=guide==='province'&&guideTarget===id?'off':guide;
    pendingTarget=id;selected=id;let owner=state.provinces[id].owner;if(owner===state.human){state.move(state.human,id);render();save();return;}
    if(!owner){let owners=Object.fromEntries(IDS.map(n=>[n,state.provinces[n].owner]));let oldHorse=Object.fromEntries(Object.entries(state.lords).map(([n,p])=>[n,p.campaign_province]));let oldAlive=Object.fromEntries(Object.entries(state.lords).map(([n,p])=>[n,p.alive]));let res=state.move(state.human,id);visualOwners=owners;visualHorsePos=oldHorse;visualAlive=oldAlive;pendingHumanFlash=id;finishTurn(res.text);return;}
    if(state.friendly(state.human,owner)){mode='passage';render();return;}mode='battle';tactic='Stand and Fight';render();
  }
}
function action(k){if(mode==='setup'){if(k.startsWith('setup_lord:'))options.character=k.endsWith(':random')?null:k.split(':').slice(1).join(':');else if(k.startsWith('setup_difficulty:'))options.difficulty=k.split(':')[1];else if(k.startsWith('setup_map:'))options.map=k.split(':')[1];else if(k==='setup_begin')startCampaign();return;}
  if(k==='notice_ok'){let back=backMode;if(back==='__story__')storyNext();else if(back==='__home_flash__')afterHomeFlash();else if(back==='__home_resume__'){pendingHomeAttack=null;resumeAi();}else if(back==='__home_defeat__'){pendingHomeAttack=null;sceneShow('home_castle_fallen.png','__new_campaign__','','','The End');}else{mode=back;}return;}
  if(k==='report_up'){reportScroll=Math.max(0,reportScroll-3);return;}if(k==='report_down'){reportScroll+=3;return;}
  if(k==='report_ok'){if(state.outcome)sceneShow(state.outcome==='victory'?'the_end.png':'home_castle_fallen.png','__new_campaign__','','',state.outcome==='defeat'?'The End':'');else enterOrders(true);return;}
  if(k==='tournament_yes'){state.tournament_pending=false;state.tournament_held=true;state.changeLeadership(state.human,.04);let r=state.changeRank(state.human,1);storyBegin([['scene','tournament_trumpets.png'],['text','Heralds sound their trumpets, and the lords gather before the lists.'],['scene','tournament_joust.png'],['text',`Before the assembled court, thou hast ridden with courage and won new renown. Thy leadership is now ${r}.`]]);return;}
  if(k==='tournament_no'){state.tournament_pending=false;state.tournament_held=true;state.changeLeadership(state.human,-.04);let r=state.changeRank(state.human,-1);alertText(`Thou hast declined the tournament. Thy leadership is now ${r}.`,'orders');return;}
  if(k==='maiden_yes'){let r=state.changeRank(state.human,1),ally=pendingMaiden;storyBegin([['text','By night thou dost approach the Norman stronghold. Steel must decide whether Lady Catherine shall be freed.'],['scene','maiden_swordfight.png'],['text','The Norman guards are overcome, and Lady Catherine is safely freed from the keep.'],['scene','lady_catherine.png'],['action','union'],['text',`Lady Catherine thanks thee for her rescue. The lands of ${SHORT[ally]} now stand with thine. Thy leadership is now ${r}.`]]);return;}
  if(k==='maiden_no'){state.maiden_rescue_done=true;state.changeLeadership(state.human,-.04);let r=state.changeRank(state.human,-1);pendingMaiden=null;alertText(`Thou hast refused the plea. Thy leadership is now ${r}.`,'orders');return;}
  if(k==='back'||k==='back_history'){if(k==='back_history')mode='history';else if(['transfer','move'].includes(mode))mode='conquest';else if(['battle','passage'].includes(mode)){mode='move';pendingTarget=null;}else if(mode==='castle_pick')mode='army';else mode='orders';return;}
  if(k==='read'){mode='read';selected=0;return;}if(k==='conquest'){guideTap(k);mode='conquest';return;}if(k==='army'){clearQty();mode='army';return;}if(k==='end'){finishTurn('Thy lord passed this month.');return;}if(k==='history'){mode='history';return;}if(k==='accounts'){mode='accounts';return;}
  if(k.startsWith('minus:')||k.startsWith('plus:')){if(guide!=='off'&&k==='plus:soldiers')guideTap(k);let sign=k.startsWith('plus:')?1:-1,u=k.split(':')[1];if(u==='castle'){if(sign<0)wantCastle=false;else if(state.lords[state.human].treasury>=costOf()+20)wantCastle=true;return;}let step=u==='soldiers'?5:1;if(mode==='transfer'){let r=state.castleReserve(state.human),source=transferDir==='out'?r:state.lords[state.human].campaign_army;if(!r)throw Error('Stand within one of thy castles to transfer troops');if(sign>0)quantity[u]+=Math.max(0,Math.min(step,source[u]-quantity[u]));else quantity[u]=Math.max(0,quantity[u]-step);}else if(mode==='army'){let available=state.lords[state.human].treasury-costOf();if(sign>0)quantity[u]+=Math.max(0,Math.min(step,Math.floor(available/PRICES[u])));else quantity[u]=Math.max(0,quantity[u]-step);}return;}
  if(k==='buy'){if(costOf()<=0)throw Error('Choose soldiers, knights, catapults or a castle');if(costOf()>state.lords[state.human].treasury)throw Error('Not enough gold');if(wantCastle){mode='castle_pick';selectedCastle=null;return;}completePurchase();return;}
  if(k==='build_confirm'){completePurchase();return;}
  if(k==='transfer'){guideTap(k);if(!state.transferHere(state.human))throw Error('Stand within one of thy castles to transfer troops');mode='transfer';transferDir='out';clearQty();return;}
  if(k==='direction'){transferDir=transferDir==='out'?'in':'out';clearQty();return;}
  if(k==='transfer_confirm'){state.transfer(state.human,quantity,transferDir);clearQty();mode='conquest';return;}
  if(k==='move'){guideTap(k);mode='move';selected=0;return;}
  if(k==='robin'){state.useRobin();sceneShow('robin_sherwood.png','conquest','Robin pledges aid to thy next enemy battle.','conquest');return;}
  if(k.startsWith('tactic:')){tactic=k.split(':').slice(1).join(':');return;}
  if(k==='pass_safe'){state.move(state.human,pendingTarget,'Stand and Fight',true);mode='move';selected=pendingTarget;pendingTarget=null;return;}
  if(k==='pass_attack'){attackingAlly=true;mode='battle';tactic='Stand and Fight';return;}
  if(k==='fight'){let id=pendingTarget,isCastle=state.provinces[id].home_castle||state.provinces[id].secondary_castle,fac=state.lords[state.provinces[id].owner]?.faction;let owners=Object.fromEntries(IDS.map(n=>[n,state.provinces[n].owner]));let oldHorse=Object.fromEntries(Object.entries(state.lords).map(([n,p])=>[n,p.campaign_province]));let oldAlive=Object.fromEntries(Object.entries(state.lords).map(([n,p])=>[n,p.alive]));let r=state.move(state.human,id,tactic,!attackingAlly);visualOwners=owners;visualHorsePos=oldHorse;visualAlive=oldAlive;pendingHumanFlash=id;attackingAlly=false;pendingTarget=null;finishTurn(r.text);if(isCastle)sceneShow(fac==='Norman'?'norman_castle.png':'saxon_castle.png','__resume_ai__');return;}
}
function completePurchase(){if(costOf()>state.lords[state.human].treasury)throw Error('Not enough gold');if(wantCastle){let id=selectedCastle,pr=state.provinces[id];if(!id||pr.owner!==state.human||pr.home_castle||pr.secondary_castle)throw Error('Choose an owned province without a castle');}let cost=costOf();if(COUNT(quantity))state.purchase(state.human,quantity);if(wantCastle)state.purchaseCastle(state.human,selectedCastle,true);clearQty();finishTurn(`Army purchased for ${cost} gold.`);}
function randomMap(seed){let rng=new Rng(seed),w=213,h=232,cells=new Uint8Array(w*h),ids=[...IDS],points=[],cx=106,cy=121;
  let inside=(x,y)=>{let a=Math.atan2((y-cy)/85,(x-cx)/79),r=Math.hypot((x-cx)/79,(y-cy)/85),wav=.84+.12*Math.sin(3*a+seed*.001)+.10*Math.sin(5*a+seed*.007)+.08*Math.sin(7*a+seed*.012);return r<wav;};
  for(let min of [23,20,17,14]){for(let tries=0;tries<5000&&points.length<18;tries++){let x=25+Math.floor(rng.random()*164),y=44+Math.floor(rng.random()*155);if(!inside(x,y)||!inside(x-7,y)||!inside(x+7,y)||!inside(x,y-7)||!inside(x,y+7))continue;if(points.some(p=>(p[0]-x)**2+(p[1]-y)**2<min**2))continue;points.push([x,y]);}if(points.length===18)break;}
  if(points.length<18)return null;
  let chosen=[points.reduce((a,b)=>a[0]+a[1]<b[0]+b[1]?a:b)];while(chosen.length<6){let rest=points.filter(p=>!chosen.includes(p));chosen.push(rest.reduce((a,b)=>Math.min(...chosen.map(q=>(q[0]-a[0])**2+(q[1]-a[1])**2))>Math.min(...chosen.map(q=>(q[0]-b[0])**2+(q[1]-b[1])**2))?a:b));}
  let byId={},home=[1,5,9,8,14,19];home.forEach((id,i)=>byId[id]=chosen[i]);let others=rng.shuffle(IDS.filter(id=>!home.includes(id))),rest=points.filter(p=>!chosen.includes(p));others.forEach((id,i)=>byId[id]=rest[i]);
  for(let y=25;y<220;y++)for(let x=15;x<199;x++){if(!inside(x,y))continue;let best=Infinity,choice=0;for(let id of IDS){let [px,py]=byId[id],dx=x-px+3*Math.sin(y*.094+id),dy=y-py+3*Math.sin(x*.082+id),n=dx*dx+dy*dy;if(n<best){best=n;choice=id;}}cells[y*w+x]=choice;}
  let adj=Object.fromEntries(IDS.map(id=>[id,new Set()]));for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let id=cells[y*w+x];if(!id)continue;for(let n of [cells[y*w+x+1],cells[(y+1)*w+x]])if(n&&n!==id){adj[id].add(n);adj[n].add(id);}}
  let neighbors=Object.fromEntries(IDS.map(id=>[id,[...adj[id]].sort((a,b)=>a-b)]));let anchors=Object.fromEntries(IDS.map(id=>[id,byId[id].map(v=>v*4)]));return{type:'random',seed,w,h,cells:[...cells],neighbors,horses:anchors,castles:anchors};
}
function restore(){try{let item=JSON.parse(localStorage.getItem(savedKey));if(!item)return false;state=CrownState.fromJSON(item.state);options=item.options;mapInfo=item.map==='random'?randomMap(state.seed):null;mode=['splash','ai_phase','scene'].includes(item.mode)?'orders':item.mode;summary=item.summary||[];coloredMapKey='';render();return true;}catch(e){console.warn('Save could not be restored',e);return false;}}
gameCanvas.addEventListener('pointerup',ev=>{if(tapActive)return;tapActive=true;setTimeout(()=>tapActive=false,100);let r=gameCanvas.getBoundingClientRect(),x=(ev.clientX-r.left)*W/r.width,y=(ev.clientY-r.top)*H/r.height;handleClick(x,y);});
document.getElementById('new-game').addEventListener('click',()=>{mode='setup';render();});
document.getElementById('resume').addEventListener('click',()=>{restore();});
setInterval(()=>{if(mode==='orders'&&guide!=='off'){guideTicks++;render();}},460);
loadAssets().then(()=>{render();if(localStorage.getItem(savedKey))document.getElementById('resume').hidden=false;}).catch(err=>{console.error(err);document.getElementById('status').textContent=err.message;alert('Unable to load Crown assets: '+err.message);});