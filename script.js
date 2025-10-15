const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const titleScreen = document.getElementById('title-screen');
const controls = document.getElementById('controls');

let keys = {};
let gameRunning = false;
let cameraX = 0;

// --- Load images ---
const playerImg = new Image();
playerImg.src = "assets/player/Player.PNG";

const enemyImg = new Image();
enemyImg.src = "assets/enemies/Enemy.PNG";

const bgImg = new Image();
bgImg.src = "assets/background/Background.png";

// --- Player object ---
const player = {
  x: 100, y: 400,
  width: 50, height: 70,
  speed: 5,
  velY: 0,
  jumping: false,
  facing: 'right'
};

// --- Enemy object ---
const enemy = { x: 700, y: 400, width: 50, height: 70, dir: 1 };

// --- Physics ---
const gravity = 0.6;

// --- Event listeners ---
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

document.getElementById('leftBtn').addEventListener('touchstart', () => keys['ArrowLeft'] = true);
document.getElementById('leftBtn').addEventListener('touchend', () => keys['ArrowLeft'] = false);
document.getElementById('rightBtn').addEventListener('touchstart', () => keys['ArrowRight'] = true);
document.getElementById('rightBtn').addEventListener('touchend', () => keys['ArrowRight'] = false);
document.getElementById('jumpBtn').addEventListener('touchstart', jump);
document.getElementById('fireBtn').addEventListener('touchstart', shoot);

// --- Start game ---
startBtn.onclick = () => {
  titleScreen.style.display = 'none';
  canvas.style.display = 'block';
  controls.style.display = 'flex';
  gameRunning = true;
  update();
};

function jump() {
  if (!player.jumping) {
    player.velY = -12;
    player.jumping = true;
  }
}

let bullets = [];
function shoot() {
  bullets.push({
    x: player.x + (player.facing === 'right' ? player.width : 0),
    y: player.y + player.height / 2,
    dir: player.facing === 'right' ? 1 : -1
  });
}

// --- Game loop ---
function update() {
  if (!gameRunning) return;
  requestAnimationFrame(update);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, -cameraX, 0, canvas.width * 2, canvas.height);

  // Movement
  if (keys['ArrowRight']) { player.x += player.speed; player.facing = 'right'; }
  if (keys['ArrowLeft']) { player.x -= player.speed; player.facing = 'left'; }

  // Gravity
  player.velY += gravity;
  player.y += player.velY;
  if (player.y + player.height >= 470) {
    player.y = 470 - player.height;
    player.jumping = false;
    player.velY = 0;
  }

  // Camera
  cameraX = player.x - 400;

  // Draw player
  ctx.save();
  if (player.facing === 'left') {
    ctx.scale(-1, 1);
    ctx.drawImage(playerImg, -player.x - player.width + cameraX, player.y, player.width, player.height);
  } else {
    ctx.drawImage(playerImg, player.x - cameraX, player.y, player.width, player.height);
  }
  ctx.restore();

  // Enemy patrol
  enemy.x += 2 * enemy.dir;
  if (enemy.x > 900 || enemy.x < 600) enemy.dir *= -1;

  ctx.drawImage(enemyImg, enemy.x - cameraX, enemy.y, enemy.width, enemy.height);

  // Bullets
  for (let i = 0; i < bullets.length; i++) {
    let b = bullets[i];
    b.x += 10 * b.dir;
    ctx.fillStyle = 'yellow';
    ctx.fillRect(b.x - cameraX, b.y, 10, 4);

    // collision with enemy
    if (b.x > enemy.x && b.x < enemy.x + enemy.width && b.y > enemy.y && b.y < enemy.y + enemy.height) {
      enemy.x = 2000; // remove enemy
      bullets.splice(i, 1);
    }
  }
}
