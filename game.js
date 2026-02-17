const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Device detection
const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
const mobileControls = document.getElementById('mobileControls');
const pcHint = document.getElementById('pcHint');

if (isMobile) {
  mobileControls.style.display = 'block';
  pcHint.style.display = 'none';
} else {
  mobileControls.style.display = 'none';
  pcHint.style.display = 'block';
}

// Player
const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 30,
  minRadius: 15,
  maxRadius: 120,
  speed: 3
};

let input = { x: 0, y: 0 };

// Keyboard controls
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key] = true;
});
window.addEventListener('keyup', e => {
  keys[e.key] = false;
});

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

function getTouchPos(touch) {
  const rect = joystickBase.getBoundingClientRect();
  return {
    x: touch.clientX - (rect.left + rect.width / 2),
    y: touch.clientY - (rect.top + rect.height / 2)
  };
}

if (isMobile) {
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
}

// Game loop
function update() {
  if (!isMobile) {
    updateKeyboardInput();
  }

  const moving = input.x !== 0 || input.y !== 0;

  if (moving) {
    player.x += input.x * player.speed;
    player.y += input.y * player.speed;

    // Shrink slightly while moving
    player.radius -= 0.05;
    if (player.radius < player.minRadius) player.radius = player.minRadius;
  } else {
    // Grow while still
    player.radius += 0.08;
    if (player.radius > player.maxRadius) player.radius = player.maxRadius;
  }

  // Keep inside screen
  if (player.x - player.radius < 0) player.x = player.radius;
  if (player.x + player.radius > canvas.width) player.x = canvas.width - player.radius;
  if (player.y - player.radius < 0) player.y = player.radius;
  if (player.y + player.radius > canvas.height) player.y = canvas.height - player.radius;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background grid (optional)
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  const step = 50;
  for (let x = 0; x < canvas.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Player
  ctx.beginPath();
  ctx.fillStyle = '#4caf50';
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  // Text
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Radius: ${player.radius.toFixed(1)}`, 10, canvas.height - 10);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
