<script>
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const startBtn = document.getElementById('startBtn');
const title = document.getElementById('title');
const scoreDOM = document.getElementById('score');
const livesDOM = document.getElementById('lives');
const levelDOM = document.getElementById('level');

const controls = {
  left: document.getElementById('btnLeft'),
  right: document.getElementById('btnRight'),
  jump: document.getElementById('btnJump'),
  fire: document.getElementById('btnFire')
};

// game state
let running = false;
let levelIndex = 0;
let activated = new Set();

// input
const input = { left:false, right:false, jump:false, shoot:false };

// constants
const GRAVITY = 0.6;
const PLAYER_SPEED = 4;
const PLAYER_JUMP = 12;

// player
const player = { x:80, y:H*0.7, w:40, h:60, vx:0, vy:0, onGround:true, facing:'right', shootCooldown:0 };

// bullets
let bullets = [], enemyBullets = [], enemies = [], particles = [];
let score = 0, lives = 3;

// levels
const levels = [
  {
    width:4000,
    playerStartX:80,
    enemies:[
      {id:1,x:600,patrol:160,type:'grunt',hp:2,shootRange:240,trigger:520},
      {id:2,x:1200,patrol:120,type:'grunt',hp:2,shootRange:220,trigger:1140},
      {id:3,x:1800,patrol:200,type:'jumper',hp:3,shootRange:220,trigger:1760},
      {id:4,x:2600,patrol:220,type:'sniper',hp:2,shootRange:380,trigger:2560},
      {id:5,x:3400,patrol:220,type:'grunt',hp:2,shootRange:240,trigger:3340}
    ],
    levelEndX:3800
  },
  {
    width:5200,
    playerStartX:80,
    enemies:[
      {id:1,x:500,patrol:120,type:'grunt',hp:2,shootRange:220,trigger:440},
      {id:2,x:1000,patrol:160,type:'grunt',hp:2,shootRange:220,trigger:940},
      {id:3,x:1700,patrol:200,type:'jumper',hp:3,shootRange:220,trigger:1660},
      {id:4,x:2400,patrol:260,type:'sniper',hp:2,shootRange:420,trigger:2340},
      {id:5,x:3800,patrol:300,type:'mini',hp:12,shootRange:320,trigger:3740}
    ],
    levelEndX:4800
  }
];

let levelData = levels[levelIndex];
let levelWidth = levelData.width;

// camera
let cameraX = 0;

// images
const playerImg = new Image();
playerImg.src = "Player.PNG";
const enemyImg = new Image();
enemyImg.src = "Enemy.PNG";
const bgImg = new Image();
bgImg.src = "Background.png";

// utils
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function rects(a,b){ return !(a.x+a.w < b.x || a.x > b.x+b.w || a.y+a.h < b.y || a.y > b.y+b.h); }
function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

// input handling
window.addEventListener('keydown', e=>{
  if(e.key==='ArrowLeft'){ input.left=true; player.facing='left'; }
  if(e.key==='ArrowRight'){ input.right=true; player.facing='right'; }
  if(e.key===' '|| e.key==='ArrowUp') input.jump=true;
  if(e.key.toLowerCase()==='z') input.shoot=true;
});
window.addEventListener('keyup', e=>{
  if(e.key==='ArrowLeft') input.left=false;
  if(e.key==='ArrowRight') input.right=false;
  if(e.key===' '|| e.key==='ArrowUp') input.jump=false;
  if(e.key.toLowerCase()==='z') input.shoot=false;
});

// touch wiring
function wire(el, prop){
  el.addEventListener('touchstart', ev=>{ ev.preventDefault(); input[prop]=true;},{passive:false});
  el.addEventListener('touchend', ev=>{ ev.preventDefault(); input[prop]=false;},{passive:false});
  el.addEventListener('mousedown', ()=> input[prop]=true);
  el.addEventListener('mouseup', ()=> input[prop]=false);
  el.addEventListener('mouseleave', ()=> input[prop]=false);
}
wire(controls.left,'left'); wire(controls.right,'right'); wire(controls.jump,'jump'); wire(controls.fire,'shoot');

// spawn enemy
function spawnFrom(cfg){
  const e = {
    id:cfg.id, type:cfg.type, x:cfg.x, y:H*0.7, w:44, h:48,
    vx:(Math.random()<0.5?-1:1)*(0.6 + Math.random()*1.2),
    minX: cfg.x - cfg.patrol/2, maxX: cfg.x + cfg.patrol/2,
    hp: cfg.hp, shootRange: cfg.shootRange, shootCooldown:rand(40,120), onGround:true
  };
  e.minX = Math.max(40,e.minX); e.maxX = Math.min(levelWidth-80,e.maxX);
  enemies.push(e);
}

// player hurt
function hurtPlayer(){
  lives = Math.max(0,lives-1);
  spawnExplosion(player.x,player.y);
  player.x = Math.max(80,player.x - 140);
  player.vx = player.vy = 0;
  if(lives===0){ running=false; setTimeout(()=> alert('Game Over! Score: '+score),40); resetAndShowTitle(); }
}

// explosion particles
function spawnExplosion(x,y){
  for(let i=0;i<12;i++){
    particles.push({ x:x+rand(-8,8), y:y+rand(-8,8), vx:(Math.random()-0.5)*6, vy:(Math.random()-0.5)*6-1, life:20+rand(0,30), col:['#ff9a6b','#ff6b6b','#ffd24d'][rand(0,2)] });
  }
}

// update function
function update(){
  // player movement
  player.vx = 0;
  if(input.left){ player.vx=-PLAYER_SPEED; player.facing='left'; }
  if(input.right){ player.vx=PLAYER_SPEED; player.facing='right'; }
  player.x += player.vx;
  player.x = clamp(player.x, 12, levelWidth - player.w -12);

  if(input.jump && player.onGround){ player.vy=-PLAYER_JUMP; player.onGround=false; }
  player.vy += GRAVITY;
  player.y += player.vy;
  if(player.y + player.h >= H*0.7){ player.y=H*0.7 - player.h; player.vy=0; player.onGround=true; }

  // camera
  const viewCenter = W*0.38;
  cameraX = clamp(player.x - viewCenter, 0, levelWidth-W);

  // shooting
  if(input.shoot && player.shootCooldown<=0){
    const dir = player.facing==='right'?1:-1;
    bullets.push({ x:player.x + (dir===1?player.w:-12), y:player.y + player.h*0.45, vx:12*dir, w:10, h:5, life:200 });
    player.shootCooldown=12;
  }
  if(player.shootCooldown>0) player.shootCooldown--;

  // spawn enemies
  for(const cfg of levelData.enemies){
    if(activated.has(cfg.id)) continue;
    if(player.x >= cfg.trigger - 80 && enemies.length<3){ spawnFrom(cfg); activated.add(cfg.id); }
  }

  // update enemies
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    e.x += e.vx;
    if(e.x < e.minX){ e.x=e.minX; e.vx=Math.abs(e.vx); }
    if(e.x + e.w > e.maxX){ e.x=e.maxX - e.w; e.vx=-Math.abs(e.vx); }

    if(e.type==='jumper' && Math.random()<0.006 && e.onGround!==false){ e.vy=-9-Math.random()*4; e.onGround=false; }
    if(e.vy!==undefined){ e.vy += GRAVITY; e.y += e.vy; if(e.y + e.h >= H*0.7){ e.y=H*0.7 - e.h; e.vy=0; e.onGround=true; } }

    const dx = player.x - e.x;
    if(Math.abs(dx)<=e.shootRange && e.shootCooldown<=0){
      const dir = dx>=0?1:-1;
      enemyBullets.push({ x:e.x + e.w/2, y:e.y + e.h/2, vx:5*dir, vy:0, w:8, h:6, life:300 });
      e.shootCooldown=60+Math.floor(Math.random()*80);
    }
    e.shootCooldown--;
    if(e.hp<=0){ enemies.splice(i,1); score +=5; }
  }

  // update bullets
  bullets.forEach((b,i)=>{ b.x+=b.vx; b.life--; if(b.life<=0) bullets.splice(i,1); });
  enemyBullets.forEach((b,i)=>{ b.x+=b.vx; b.life--; if(b.life<=0) enemyBullets.splice(i,1); });

  // collisions
  bullets.forEach((b,bi)=>{
    enemies.forEach((e,ei)=>{
      if(rects(b,e)){ e.hp--; bullets.splice(bi,1); }
    });
  });
  enemyBullets.forEach((b,bi)=>{
    if(rects(b,player)){ hurtPlayer(); enemyBullets.splice(bi,1); }
  });

  // particles
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.25; p.life--;
    if(p.life<=0) particles.splice(i,1);
  }

  // HUD
  scoreDOM.textContent = 'Score: '+score;
  livesDOM.textContent = 'Lives: '+lives;
  levelDOM.textContent = 'Level: '+(levelIndex+1);
}

// render
function render(){
  ctx.clearRect(0,0,W,H);
  // background
  ctx.drawImage(bgImg,-cameraX*0.2,0,levelWidth,H);

  // player
  ctx.save();
  if(player.facing==='left'){
    ctx.translate(player.x+player.w-cameraX,player.y);
    ctx.scale(-1,1);
    ctx.drawImage(playerImg,0,0,player.w,player.h);
  }else ctx.drawImage(playerImg,player.x-cameraX,player.y,player.w,player.h);
  ctx.restore();

  // enemies
  enemies.forEach(e=>{
    ctx.save();
    ctx.drawImage(enemyImg,e.x-cameraX,e.y,e.w,e.h);
    ctx.restore();
  });

  // bullets
  bullets.forEach(b=>{ ctx.fillStyle='#0ff'; ctx.fillRect(b.x-cameraX,b.y,b.w,b.h); });
  enemyBullets.forEach(b=>{ ctx.fillStyle='#f00'; ctx.fillRect(b.x-cameraX,b.y,b.w,b.h); });

  // particles
  particles.forEach(p=>{
    ctx.fillStyle=p.col; ctx.fillRect(p.x-cameraX,p.y,3,3);
  });
}

// main loop
function loop(){
  if(!running) return;
  update();
  render();
  requestAnimationFrame(loop);
}

// start game
startBtn.addEventListener('click',()=>{
  title.style.display='none';
  running=true;
  player.x = levelData.playerStartX;
  player.y = H*0.7 - player.h;
  enemies = []; activated.clear();
  bullets = []; enemyBullets = []; particles=[];
  score = 0; lives = 3;
  cameraX=0;
  loop();
});

// reset
function resetAndShowTitle(){
  running=false;
  title.style.display='flex';
}
</script>
