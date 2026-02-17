const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', () => {
  resize();
  updateLayout();
});
resize();

// Responsive layout
function isMobileScreen() {
  return window.innerWidth < 900;
}

const mobileControls = document.getElementById('mobileControls');
const pcHint = document.getElementById('pcHint');

function updateLayout() {
  if (isMobileScreen()) {
    mobileControls.style.display = 'block';
    pcHint.style.display = 'none';
  } else {
    mobileControls.style.display = 'none';
    pcHint.style.display = 'block';
  }
}
window.onload = updateLayout;

// MENU
let gameStarted = false;
document.getElementById('startBtn').onclick = () => {
  document.getElementById('menu').style.display = 'none';
  gameStarted = true;
};

// WORLD
const world = {
  width: 4000,
  height: 4000
};

// PLAYER
const player = {
  x: world.width / 2,
  y: world.height / 2,
  radius: 30,
  minRadius: 15,
  maxRadius: 200,
  speed: 3
};

let input = { x: 0, y: 0 };

// Keyboard
const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

function updateKeyboardInput() {
  let x = 0, y = 0;
  if (keys['w'] || keys['ArrowUp']) y -= 1;
  if (keys['s'] || keys['ArrowDown']) y += 1;
  if (keys['a'] || keys['ArrowLeft']) x -= 1;
  if (keys['d'] || keys['ArrowRight']) x += 1;

  const len = Math.hypot(x, y);
  if (len > 0) {
    input.x = x / len;
    input.y = y / len;
  } else {
    input.x = 0;
    input.y = 0;
  }
}

// Mobile joystick
const joystickBase = document.getElementById('joystickBase');
const joystickStick = document.getElementById('joystickStick');
let joystickActive = false;
let joystickCenter = { x: 0, y: 0 };

joystickBase.addEventListener('touchstart', e => {
  e.preventDefault();
  joystickActive = true;
  const rect = joystickBase.getBoundingClientRect();
  joystickCenter = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
});

joystickBase.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!joystickActive) return;

  const touch = e.touches[0];
  const dx = touch.clientX - joystickCenter.x;
  const dy = touch.clientY - joystickCenter.y;

  const maxDist = 40;
  let dist = Math.hypot(dx, dy);

  let nx = dx, ny = dy;
  if (dist > maxDist) {
    nx = dx * maxDist / dist;
    ny = dy * maxDist / dist;
    dist = maxDist;
  }

  joystickStick.style.transform = `translate(${nx}px, ${ny}px)`;

  if (dist > 5) {
    input.x = dx / dist;
    input.y = dy / dist;
  } else {
    input.x = 0;
    input.y = 0;
  }
});

joystickBase.addEventListener('touchend', e => {
  e.preventDefault();
  joystickActive = false;
  joystickStick.style.transform = 'translate(0px, 0px)';
  input.x = 0;
  input.y = 0;
});

// CAMERA + ZOOM
function getZoom() {
  return 35 / player.radius;
}

function update() {
  if (!gameStarted) return;

  if (!isMobileScreen()) updateKeyboardInput();

  const moving = input.x !== 0 || input.y !== 0;

  if (moving) {
    player.x += input.x * player.speed;
    player.y += input.y * player.speed;

    player.radius -= 0.05;
    if (player.radius < player.minRadius) player.radius = player.minRadius;
  } else {
    player.radius += 0.08;
    if (player.radius > player.maxRadius) player.radius = player.maxRadius;
  }

  // Keep inside world
  player.x = Math.max(player.radius, Math.min(world.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(world.height - player.radius, player.y));
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gameStarted) return;

  const zoom = getZoom();

  ctx.save();
  ctx.scale(zoom, zoom);

  const camX = player.x - canvas.width / (2 * zoom);
  const camY = player.y - canvas.height / (2 * zoom);

  ctx.translate(-camX, -camY);

  // WORLD GRID
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  const step = 100;
  for (let x = 0; x < world.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }
  for (let y = 0; y < world.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }

  // PLAYER
  ctx.beginPath();
  ctx.fillStyle = '#4caf50';
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
