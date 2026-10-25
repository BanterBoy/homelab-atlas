import {LOGO_IDS, logoById, logoDataUri} from './catalog.js';

export const SCHEMA_VERSION = 1;
export const THEMES = ['navy','light','midnight'];
export const DENSITIES = ['comfortable','compact'];
export const LIMITS = {bytes:1_000_000,devices:80,services:800,groups:160,networks:30,connections:160,text:120,hardware:12};
const ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const palettes = {
  navy:{bg:'#07131f',panel:'#0d2233',card:'#102b3e',line:'#2b6175',text:'#e8f3f6',muted:'#90aeba',chip:'#163a4d'},
  light:{bg:'#edf4f6',panel:'#ffffff',card:'#ffffff',line:'#91afba',text:'#132d38',muted:'#55717c',chip:'#d9e9ed'},
  midnight:{bg:'#0e0b1a',panel:'#19142a',card:'#211a36',line:'#67579d',text:'#f0edff',muted:'#aaa0cc',chip:'#31284c'}
};
export const uid = prefix => `${prefix}-${crypto.randomUUID().slice(0,8)}`;
export const escapeXml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

export function sampleProject() {
  return {schemaVersion:1,revision:1,title:'Home Lab',subtitle:'Local services & network map',theme:'navy',columns:3,density:'comfortable',networks:[
    {id:'net-internet',name:'Internet',kind:'Internet',accent:'#48bfe3'},{id:'net-router',name:'Core Router',kind:'Router',accent:'#4dd4ac'},{id:'net-switch',name:'Core Switch',kind:'Switch',accent:'#7dd3fc'}
  ],vlans:[{id:'vlan-main',name:'Main',color:'#34d399'},{id:'vlan-iot',name:'IoT',color:'#fbbf24'},{id:'vlan-guest',name:'Guest',color:'#a78bfa'}],devices:[
    {id:'dev-storage',name:'Atlas Storage',role:'Storage & infrastructure',icon:'truenas',accent:'#22b8cf',network:'Main',hardware:['8-core CPU · 64 GB RAM','72 TB ZFS storage'],groups:[{id:'grp-infra',name:'Infrastructure',services:services([['truenas','TrueNAS'],['docker','Docker'],['portainer','Portainer'],['grafana','Grafana'],['prometheus','Prometheus'],['uptime-kuma','Uptime Kuma'],['nginx-proxy-manager','Proxy Manager'],['vaultwarden','Vaultwarden']])},{id:'grp-cloud',name:'Cloud & backup',services:services([['nextcloud','Nextcloud'],['immich','Immich'],['paperless-ngx','Paperless'],['restic','Restic']])}]},
    {id:'dev-media',name:'Media Server',role:'Streaming & automation',icon:'unraid',accent:'#f59f00',network:'Main',hardware:['12-core CPU · 32 GB RAM','Hardware transcoding'],groups:[{id:'grp-media',name:'Media stack',services:services([['jellyfin','Jellyfin'],['sonarr','Sonarr'],['radarr','Radarr'],['prowlarr','Prowlarr'],['bazarr','Bazarr'],['seerr','Seerr'],['qbittorrent','qBittorrent'],['sabnzbd','SABnzbd']])},{id:'grp-ha',name:'Home Assistant VM',services:services([['home-assistant','Home Assistant'],['music-assistant','Music Assistant'],['mosquitto','Mosquitto'],['node-red','Node-RED']])}]},
    {id:'dev-ai',name:'Compute Node',role:'Local inference',icon:'open-webui',accent:'#8b5cf6',network:'Main',hardware:['16-core CPU · 64 GB RAM','24 GB accelerator'],groups:[{id:'grp-ai',name:'Inference',services:services([['ollama','Ollama'],['open-webui','Open WebUI'],['qwen','Qwen',3],['n8n','n8n']])}]}
  ],connections:[{id:'conn-wan',from:'net-internet',to:'net-router',label:'WAN'},{id:'conn-lan',from:'net-router',to:'net-switch',label:'LAN'},{id:'conn-storage',from:'net-switch',to:'dev-storage',label:'Main'},{id:'conn-media',from:'net-switch',to:'dev-media',label:'Main'},{id:'conn-ai',from:'net-switch',to:'dev-ai',label:'Main'}]};
}
function services(items){return items.map(([logo,name,count=1],i)=>({id:`svc-${logo}-${i}`,logo,name,count}));}
export function emptyProject(){const p=sampleProject(); return {...p,title:'Untitled Home Lab',subtitle:'',revision:1,networks:[],vlans:[],devices:[],connections:[]};}

export function parseProject(text) {
  if (new TextEncoder().encode(text).length > LIMITS.bytes) throw new Error('File is larger than 1 MB.');
  let data; try { data=JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  validateProject(data); return structuredClone(data);
}
export function validateProject(p) {
  const fail=m=>{throw new Error(m)}; const str=(v,n='text')=>{if(typeof v!=='string'||v.length>LIMITS.text)fail(`${n} must be text under ${LIMITS.text + 1} characters.`)};
  if(!p||typeof p!=='object'||Array.isArray(p))fail('Project must be an object.');
  const exact=(o,allowed,label)=>{if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!allowed.includes(k)))fail(`${label} has an invalid structure.`)};
  exact(p,['schemaVersion','revision','title','subtitle','theme','columns','density','networks','vlans','devices','connections'],'Project');
  if(p.schemaVersion!==SCHEMA_VERSION)fail(`Unsupported schema version: ${p.schemaVersion ?? 'missing'}.`);
  str(p.title,'Title'); str(p.subtitle,'Subtitle'); if(!Number.isInteger(p.revision)||p.revision<0||p.revision>1_000_000_000)fail('Invalid revision.'); if(!THEMES.includes(p.theme))fail('Unknown theme.'); if(!DENSITIES.includes(p.density))fail('Unknown density.'); if(!Number.isInteger(p.columns)||p.columns<1||p.columns>4)fail('Columns must be 1–4.');
  for(const [key,max] of [['devices',LIMITS.devices],['networks',LIMITS.networks],['vlans',LIMITS.networks],['connections',LIMITS.connections]]) if(!Array.isArray(p[key])||p[key].length>max)fail(`Invalid or excessive ${key}.`);
  const ids=new Set(); const addId=(id,label)=>{if(typeof id!=='string'||!ID_RE.test(id)||ids.has(id))fail(`${label} has an invalid or duplicate ID.`);ids.add(id)}; let serviceCount=0,groupCount=0;
  for(const n of p.networks){exact(n,['id','name','kind','accent'],'Network');addId(n.id,'Network');str(n.name);str(n.kind);if(!COLOR_RE.test(n.accent))fail('Invalid network color.');}
  for(const v of p.vlans){exact(v,['id','name','color'],'VLAN');addId(v.id,'VLAN');str(v.name);if(!COLOR_RE.test(v.color))fail('Invalid VLAN color.');}
  for(const d of p.devices){exact(d,['id','name','role','icon','accent','network','hardware','groups'],'Device');addId(d.id,'Device');str(d.name);str(d.role);str(d.network);if(!LOGO_IDS.has(d.icon))fail(`Unknown logo: ${d.icon}.`);if(!COLOR_RE.test(d.accent))fail('Invalid device color.');if(!Array.isArray(d.hardware)||d.hardware.length>LIMITS.hardware)fail('Invalid hardware facts.');d.hardware.forEach(x=>str(x,'Hardware fact'));if(!Array.isArray(d.groups)||d.groups.length>LIMITS.groups)fail('Invalid service groups.');for(const g of d.groups){exact(g,['id','name','services'],'Group');addId(g.id,'Group');groupCount++;str(g.name);if(!Array.isArray(g.services))fail('Invalid services.');for(const s of g.services){exact(s,['id','logo','name','count'],'Service');addId(s.id,'Service');serviceCount++;str(s.name);if(!LOGO_IDS.has(s.logo))fail(`Unknown logo: ${s.logo}.`);if(!Number.isInteger(s.count)||s.count<1||s.count>99)fail('Service count must be 1–99.');}}}
  if(serviceCount>LIMITS.services||groupCount>LIMITS.groups)fail('Project contains too many services or groups.');
  const endpointIds=new Set([...p.networks,...p.devices].map(x=>x.id));for(const c of p.connections){exact(c,['id','from','to','label'],'Connection');addId(c.id,'Connection');str(c.label);if(!endpointIds.has(c.from)||!endpointIds.has(c.to)||c.from===c.to)fail('Connection has an invalid endpoint.');}
  return true;
}
export function removeDevice(project,id){project.devices=project.devices.filter(x=>x.id!==id);project.connections=project.connections.filter(x=>x.from!==id&&x.to!==id);}
export function removeNetwork(project,id){project.networks=project.networks.filter(x=>x.id!==id);project.connections=project.connections.filter(x=>x.from!==id&&x.to!==id);}

export function layoutProject(p) {
  const compact=p.density==='compact', margin=56,gap=24,cardW=compact?310:350,headH=42;
  const cards=p.devices.map(d=>{const serviceRows=d.groups.reduce((n,g)=>n+Math.ceil(g.services.length/4),0),h=120+d.hardware.length*20+d.groups.length*34+serviceRows*(compact?60:72);return {id:d.id,w:cardW,h:Math.max(210,h)}});
  const cols=Math.min(p.columns,Math.max(1,cards.length)), contentW=cols*cardW+(cols-1)*gap;let y=210,rowH=0;
  cards.forEach((c,i)=>{if(i%cols===0){y+=rowH+(i?gap:0);rowH=0;}c.x=margin+(i%cols)*(cardW+gap);c.y=y;rowH=Math.max(rowH,c.h);});
  const relationRows=Math.ceil(p.connections.length/3),height=Math.max(520,y+rowH+72+relationRows*18),width=Math.max(760,contentW+margin*2,p.networks.length*168+margin*2,p.vlans.length*106+margin*2);
  return {width,height,margin,gap,cardW,headH,cards};
}
export function renderProject(p) {
  validateProject(p);const l=layoutProject(p),t=palettes[p.theme],compact=p.density==='compact',font=compact?12:13;
  const nodes=p.networks.map((n,i)=>{const w=150,x=l.margin+i*(w+18);return `<g><rect x="${x}" y="92" width="${w}" height="54" rx="14" fill="${t.panel}" stroke="${escapeXml(n.accent)}"/><text x="${x+14}" y="114" class="tiny">${escapeXml(n.kind)}</text><text x="${x+14}" y="134" class="label">${escapeXml(n.name)}</text></g>`}).join('');
  const chips=p.vlans.map((v,i)=>`<g><rect x="${l.width-l.margin-94-i*106}" y="154" width="94" height="28" rx="14" fill="${escapeXml(v.color)}" fill-opacity=".18" stroke="${escapeXml(v.color)}"/><text x="${l.width-l.margin-47-i*106}" y="173" text-anchor="middle" class="chip">${escapeXml(v.name)}</text></g>`).join('');
  const cards=l.cards.map(c=>renderCard(p.devices.find(d=>d.id===c.id),c,t,compact)).join('');
  const rel=p.connections.map((c,i)=>{const names=new Map([...p.networks,...p.devices].map(x=>[x.id,x.name])),col=i%3,row=Math.floor(i/3),cw=(l.width-l.margin*2)/3;return `<text x="${l.margin+col*cw}" y="${l.height-30-(Math.ceil(p.connections.length/3)-1-row)*18}" class="tiny">${escapeXml(short(names.get(c.from),18))} → ${escapeXml(short(names.get(c.to),18))}${c.label?` · ${escapeXml(short(c.label,15))}`:''}</text>`}).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${l.width}" height="${l.height}" viewBox="0 0 ${l.width} ${l.height}" role="img" aria-label="${escapeXml(p.title)}"><defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${t.line}" opacity=".24"/></pattern><style>text{font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;fill:${t.text}}.title{font-size:28px;font-weight:750}.sub{font-size:13px;fill:${t.muted}}.label{font-size:14px;font-weight:650}.tiny{font-size:11px;fill:${t.muted}}.chip{font-size:11px;font-weight:650}.app{font-size:${font}px;font-weight:550}</style></defs><rect width="100%" height="100%" fill="${t.bg}"/><rect width="100%" height="100%" fill="url(#dots)"/><text x="${l.margin}" y="48" class="title">${escapeXml(p.title)}</text><text x="${l.margin}" y="70" class="sub">${escapeXml(p.subtitle)}</text>${nodes}${chips}${cards}<g>${rel}</g></svg>`;
}
function renderCard(d,c,t,compact){let y=c.y+74;const hw=d.hardware.map(h=>`<text x="${c.x+20}" y="${y+=18}" class="tiny">• ${escapeXml(h)}</text>`).join('');y+=16;const groups=d.groups.map(g=>{const gy=y;y+=27;const apps=g.services.map((s,i)=>{const col=i%4,row=Math.floor(i/4),x=c.x+18+col*((c.w-36)/4),ay=y+row*(compact?60:72),w=(c.w-48)/4;return `<g><rect x="${x}" y="${ay}" width="${w}" height="${compact?52:64}" rx="9" fill="${t.panel}" stroke="${t.line}" stroke-opacity=".55"/><image href="${logoDataUri(s.logo)}" x="${x+7}" y="${ay+7}" width="24" height="24"/><text x="${x+7}" y="${ay+(compact?44:52)}" class="app">${escapeXml(short(s.name,11))}${s.count>1?` ×${s.count}`:''}</text></g>`}).join('');y+=Math.ceil(g.services.length/4)*(compact?60:72);return `<text x="${c.x+20}" y="${gy+14}" class="label">${escapeXml(g.name)}</text>${apps}`}).join('');return `<g data-device="${d.id}"><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="18" fill="${t.card}" stroke="${escapeXml(d.accent)}" stroke-width="1.5"/><rect x="${c.x}" y="${c.y}" width="6" height="${c.h}" rx="3" fill="${escapeXml(d.accent)}"/><image href="${logoDataUri(d.icon)}" x="${c.x+20}" y="${c.y+18}" width="38" height="38"/><text x="${c.x+70}" y="${c.y+36}" class="label">${escapeXml(short(d.name,28))}</text><text x="${c.x+70}" y="${c.y+53}" class="tiny">${escapeXml(short(d.role,38))} · ${escapeXml(short(d.network,18))}</text>${hw}${groups}</g>`}
const short=(s,n)=>s.length>n?`${s.slice(0,n-1)}…`:s;
