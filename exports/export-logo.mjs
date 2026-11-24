import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const out=resolve('exports');
const profile=join(out,'.chrome-logo-'+Date.now());
await mkdir(profile,{recursive:true});
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;
try {
let port;
for(let i=0;i<100;i++){try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break}catch{} await new Promise(r=>setTimeout(r,100));}
const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}});
const cmd=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))});
await cmd('Page.enable');
await cmd('Emulation.setDeviceMetricsOverride',{width:220,height:90,deviceScaleFactor:6,mobile:false});
await cmd('Emulation.setDefaultBackgroundColorOverride',{color:{r:0,g:0,b:0,a:0}});
const css=(await readFile('src/kumo/header.css','utf8')).split('@media')[0];
const html=`<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;800&display=swap" rel="stylesheet"><style>html,body{margin:0;background:transparent;--accent:#ef4939}*{box-sizing:border-box}a{text-decoration:none;color:inherit}${css}body{width:220px;height:90px;display:flex;align-items:center;justify-content:center;color:white}.market-logo{color:white}</style><a class="market-logo"><span class="market-mark">雲</span><span>kumo<small>JAPAN, A LITTLE CLOSER.</small></span></a>`;
await cmd('Page.setDocumentContent',{frameId:(await cmd('Page.getFrameTree')).frameTree.frame.id,html});
await cmd('Runtime.evaluate',{expression:'document.fonts.ready',awaitPromise:true});
await new Promise(r=>setTimeout(r,1500));
for(const [name,bg] of [['kumo-logo-transparent.png',null],['kumo-logo.png','#263343']]){
if(bg)await cmd('Runtime.evaluate',{expression:`document.body.style.background=${JSON.stringify(bg)}`});
const shot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
await writeFile(join(out,name),Buffer.from(shot.data,'base64'));
}
console.log('Exported logo PNGs (1320 × 540).');
} finally {ws?.close();chrome.kill();}


