const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const coinCount = document.getElementById("coinCount");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const restartButton = document.getElementById("restartButton");

const W = canvas.width;
const H = canvas.height;
const lanes = [W * 0.28, W * 0.5, W * 0.72];
const goalCoins = 20;
const playerBaseY = H - 86;
const mouseLaneThreshold = 160;

let state = "ready";
let lastTime = 0;
let spawnTimer = 0;
let coinTimer = 0;
let sceneryOffset = 0;
let mouseAnchorX = null;
let elapsedTime = 0;
let lane = 1;
let targetLane = 1;
let coins = 0;
let speed = 150;
let player = {
  x: lanes[lane],
  y: playerBaseY,
  w: 42,
  h: 56,
  jump: 0,
  jumpVelocity: 0
};
let obstacles = [];
let pickups = [];

function resetGame() {
  state = "playing";
  lastTime = performance.now();
  spawnTimer = 0.9;
  coinTimer = 0.18;
  sceneryOffset = 0;
  mouseAnchorX = null;
  elapsedTime = 0;
  lane = 1;
  targetLane = 1;
  coins = 0;
  speed = 150;
  obstacles = [];
  pickups = [];
  player = {
    x: lanes[lane],
    y: playerBaseY,
    w: 42,
    h: 56,
    jump: 0,
    jumpVelocity: 0
  };
  updateScore();
  hideOverlay();
  requestAnimationFrame(loop);
}

function showOverlay(title, text, buttonText = "Restart") {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  restartButton.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function updateScore() {
  coinCount.textContent = `${coins} / ${goalCoins}`;
}

function jump() {
  if (state !== "playing" || player.jump > 2) return;
  player.jumpVelocity = 720;
}

function moveToLane(nextLane) {
  targetLane = Math.max(0, Math.min(2, nextLane));
}

function spawnObstacle() {
  spawnObstacleInLane(Math.floor(Math.random() * lanes.length));
}

function spawnObstacleInLane(obstacleLane) {
  const isTrain = Math.random() > 0.38;
  obstacles.push({
    lane: obstacleLane,
    x: lanes[obstacleLane],
    y: -90,
    w: isTrain ? 76 : 58,
    h: isTrain ? 104 : 70,
    type: isTrain ? "train" : "building",
    canJump: !isTrain
  });
}

function spawnHazardWave() {
  const firstLane = Math.floor(Math.random() * lanes.length);
  spawnObstacleInLane(firstLane);

  if (coins < 8 || Math.random() > 0.18) return;
  const openLane = Math.floor(Math.random() * lanes.length);
  const secondLane = [0, 1, 2].find((item) => item !== firstLane && item !== openLane);
  if (secondLane !== undefined) {
    spawnObstacleInLane(secondLane);
  }
}

function spawnCoin() {
  const coinLane = Math.floor(Math.random() * lanes.length);
  pickups.push({
    lane: coinLane,
    x: lanes[coinLane],
    y: -28,
    r: 13,
    spin: Math.random() * Math.PI
  });
}

function loop(time) {
  if (state !== "playing") return;
  const dt = Math.min((time - lastTime) / 1000, 0.033);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  elapsedTime += dt;
  if (elapsedTime < 30) {
    speed = 150 + elapsedTime * 3.2;
  } else {
    speed += dt * 22;
  }
  sceneryOffset = (sceneryOffset + speed * dt * 0.58) % 120;

  const targetX = lanes[targetLane];
  player.x += (targetX - player.x) * Math.min(1, dt * 8);
  lane = targetLane;

  if (player.jumpVelocity > 0 || player.jump > 0) {
    player.jump += player.jumpVelocity * dt;
    player.jumpVelocity -= 1850 * dt;
    if (player.jump <= 0) {
      player.jump = 0;
      player.jumpVelocity = 0;
    }
  }

  spawnTimer -= dt;
  coinTimer -= dt;
  if (spawnTimer <= 0) {
    spawnHazardWave();
    spawnTimer = Math.max(0.58, 1.12 - coins * 0.006 - speed * 0.00055);
  }
  if (coinTimer <= 0) {
    spawnCoin();
    coinTimer = 0.58;
  }

  obstacles.forEach((item) => {
    item.y += speed * dt;
  });
  pickups.forEach((coin) => {
    coin.y += speed * dt;
    coin.spin += dt * 8;
  });

  obstacles = obstacles.filter((item) => item.y < H + 120);
  pickups = pickups.filter((coin) => coin.y < H + 40 && !coin.collected);

  checkCollisions();
}

function checkCollisions() {
  const bodyLeft = player.x - player.w * 0.28;
  const bodyRight = player.x + player.w * 0.28;
  const dangerLine = player.y - player.jump - 12;

  for (const item of obstacles) {
    const obstacleLeft = item.x - item.w / 2;
    const obstacleRight = item.x + item.w / 2;
    const frontEdge = item.y + item.h;
    const laneBlocked = bodyLeft < obstacleRight && bodyRight > obstacleLeft;
    const frontIsDangerous = frontEdge >= dangerLine - 18 && frontEdge <= dangerLine + 26;
    const jumpedOver = item.canJump && player.jump > 54;
    if (laneBlocked && frontIsDangerous && !jumpedOver) {
      endGame(false);
      return;
    }
  }

  for (const coin of pickups) {
    const dx = player.x - coin.x;
    const dy = player.y - player.jump - 32 - coin.y;
    if (Math.hypot(dx, dy) < 42) {
      coin.collected = true;
      coins += 1;
      updateScore();
      if (coins >= goalCoins) {
        endGame(true);
      }
    }
  }
}

function endGame(won) {
  state = won ? "won" : "lost";
  showOverlay(
    won ? "You win!" : "You crashed!",
    won
      ? "You collected 20 coins and made it through the subway rush."
      : "A subway or building got in the way. Restart and try for 20 coins.",
    "Restart"
  );
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawCity();
  drawTracks();
  pickups.forEach(drawCoin);
  obstacles.forEach(drawObstacle);
  drawPlayer();
}

function drawCity() {
  const sky = ctx.createLinearGradient(0, 0, W, 220);
  sky.addColorStop(0, "#62d7ff");
  sky.addColorStop(0.45, "#ffdf63");
  sky.addColorStop(1, "#ff82a0");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#fff2a8";
  ctx.beginPath();
  ctx.arc(94, 64, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  for (let i = 0; i < 5; i++) {
    const x = 170 + i * 155;
    ctx.beginPath();
    ctx.ellipse(x, 56 + (i % 2) * 26, 42, 15, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 35, 57 + (i % 2) * 26, 31, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawStar(720, 52, 14, "#ffffff");
  drawStar(812, 114, 10, "#ffe66d");
  drawHeart(132, 132, 12, "#ff5da8");
  drawHeart(624, 104, 10, "#ff6b6b");

  for (let i = 0; i < 9; i++) {
    const x = i * 110 - 32;
    const height = 104 + (i % 4) * 30;
    const colors = ["#8758ff", "#20bf8f", "#ff5f6d", "#3190ff", "#ffa62b"];
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x, 108 - height * 0.18, 72, height);
    ctx.fillStyle = "rgba(255,255,255,0.68)";
    for (let y = 34; y < height - 10; y += 22) {
      ctx.fillRect(x + 14, 118 - height * 0.18 + y, 12, 9);
      ctx.fillRect(x + 43, 118 - height * 0.18 + y, 12, 9);
    }

    ctx.fillStyle = i % 2 ? "#ffe66d" : "#58fcec";
    ctx.fillRect(x + 8, 126, 56, 14);
  }

  ctx.fillStyle = "#69d6c5";
  ctx.fillRect(0, 178, W, 52);
  ctx.fillStyle = "#ffcf5b";
  ctx.fillRect(0, 224, W, 18);
}

function drawTracks() {
  const ground = ctx.createLinearGradient(0, 230, W, H);
  ground.addColorStop(0, "#43d9b8");
  ground.addColorStop(0.5, "#7f7cff");
  ground.addColorStop(1, "#ff7ab6");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 230, W, H - 230);

  ctx.fillStyle = "#4f5ce8";
  ctx.beginPath();
  ctx.moveTo(W * 0.2, 230);
  ctx.lineTo(W * 0.08, H);
  ctx.lineTo(W * 0.92, H);
  ctx.lineTo(W * 0.8, 230);
  ctx.closePath();
  ctx.fill();

  const roadGlow = ctx.createLinearGradient(W * 0.1, 230, W * 0.9, H);
  roadGlow.addColorStop(0, "rgba(90, 245, 218, 0.55)");
  roadGlow.addColorStop(0.5, "rgba(255, 224, 101, 0.38)");
  roadGlow.addColorStop(1, "rgba(255, 107, 165, 0.55)");
  ctx.fillStyle = roadGlow;
  ctx.beginPath();
  ctx.moveTo(W * 0.24, 238);
  ctx.lineTo(W * 0.14, H);
  ctx.lineTo(W * 0.86, H);
  ctx.lineTo(W * 0.76, 238);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255, 218, 88, 0.95)";
  ctx.beginPath();
  ctx.moveTo(W * 0.09, H);
  ctx.lineTo(W * 0.18, 230);
  ctx.lineTo(W * 0.22, 230);
  ctx.lineTo(W * 0.13, H);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255, 114, 163, 0.95)";
  ctx.beginPath();
  ctx.moveTo(W * 0.87, H);
  ctx.lineTo(W * 0.78, 230);
  ctx.lineTo(W * 0.82, 230);
  ctx.lineTo(W * 0.91, H);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#f7f1ce";
  ctx.lineWidth = 5;
  ctx.setLineDash([28, 28]);
  ctx.beginPath();
  ctx.moveTo(W * 0.4, 238);
  ctx.lineTo(W * 0.34, H);
  ctx.moveTo(W * 0.6, 238);
  ctx.lineTo(W * 0.66, H);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "#d8eef4";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(W * 0.2, 230);
  ctx.lineTo(W * 0.08, H);
  ctx.moveTo(W * 0.8, 230);
  ctx.lineTo(W * 0.92, H);
  ctx.stroke();

  drawStar(58, 312, 11, "#ffe66d");
  drawStar(832, 338, 12, "#58fcec");
  drawHeart(86, 444, 12, "#ff8ab3");
  drawHeart(802, 474, 13, "#ffcf5b");
}

function drawObstacle(item) {
  if (item.type === "train") {
    ctx.fillStyle = "#2b63d9";
    roundRect(item.x - item.w / 2, item.y, item.w, item.h, 8);
    ctx.fill();
    ctx.fillStyle = "#9ef2ff";
    ctx.fillRect(item.x - 24, item.y + 16, 18, 22);
    ctx.fillRect(item.x + 6, item.y + 16, 18, 22);
    ctx.fillStyle = "#f0f4f6";
    ctx.fillRect(item.x - 30, item.y + item.h - 20, 60, 8);
    ctx.fillStyle = "#f4cf39";
    ctx.beginPath();
    ctx.arc(item.x - 24, item.y + item.h - 34, 6, 0, Math.PI * 2);
    ctx.arc(item.x + 24, item.y + item.h - 34, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#ff5f6d";
    roundRect(item.x - item.w / 2, item.y + 12, item.w, item.h - 12, 6);
    ctx.fill();
    ctx.fillStyle = "#f4d8a2";
    ctx.fillRect(item.x - 18, item.y + 26, 14, 12);
    ctx.fillRect(item.x + 7, item.y + 26, 14, 12);
    ctx.fillRect(item.x - 18, item.y + 48, 14, 12);
    ctx.fillRect(item.x + 7, item.y + 48, 14, 12);
  }
}

function drawCoin(coin) {
  const scale = 0.68 + Math.abs(Math.sin(coin.spin)) * 0.32;
  ctx.save();
  ctx.translate(coin.x, coin.y);
  ctx.scale(scale, 1);
  ctx.fillStyle = "#f5c51b";
  ctx.beginPath();
  ctx.arc(0, 0, coin.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f8e07a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, coin.r - 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPlayer() {
  const y = player.y - player.jump;
  const runCycle = Math.sin(elapsedTime * 12);
  const oppositeRunCycle = Math.sin(elapsedTime * 12 + Math.PI);
  const armSwing = runCycle * 8;
  const leftLegLift = Math.max(0, runCycle) * 10;
  const rightLegLift = Math.max(0, oppositeRunCycle) * 10;
  const leftStep = runCycle * 2;
  const rightStep = oppositeRunCycle * 2;
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 7, 27, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#f0b07d";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(player.x - 13, y - 38);
  ctx.lineTo(player.x - 27 - armSwing * 0.35, y - 22 + armSwing * 0.28);
  ctx.moveTo(player.x + 13, y - 38);
  ctx.lineTo(player.x + 25 + armSwing * 0.35, y - 21 - armSwing * 0.28);
  ctx.stroke();

  ctx.fillStyle = "#ff5da8";
  ctx.beginPath();
  ctx.moveTo(player.x, y - 51);
  ctx.lineTo(player.x - 24, y - 9);
  ctx.lineTo(player.x + 24, y - 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffd1e5";
  roundRect(player.x - 14, y - 48, 28, 24, 8);
  ctx.fill();

  ctx.fillStyle = "#f0b07d";
  ctx.beginPath();
  ctx.ellipse(player.x + 3, y - 56, 14, 16, -0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5f3424";
  ctx.beginPath();
  ctx.ellipse(player.x - 2, y - 60, 19, 18, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7a452f";
  ctx.beginPath();
  ctx.arc(player.x - 17, y - 54, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#7a452f";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(player.x - 10, y - 46);
  ctx.quadraticCurveTo(player.x - 20, y - 34, player.x - 13, y - 22);
  ctx.stroke();

  ctx.fillStyle = "#f0b07d";
  ctx.beginPath();
  ctx.ellipse(player.x + 15, y - 55, 4, 6, 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#f2bf8f";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(player.x - 8, y - 9);
  ctx.lineTo(player.x - 14 + leftStep, y + 17 - leftLegLift);
  ctx.moveTo(player.x + 8, y - 9);
  ctx.lineTo(player.x + 16 + rightStep, y + 16 - rightLegLift);
  ctx.stroke();

  ctx.strokeStyle = "#f2bf8f";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(player.x - 10, y - 8);
  ctx.lineTo(player.x - 16 + leftStep, y + 18 - leftLegLift);
  ctx.moveTo(player.x + 10, y - 8);
  ctx.lineTo(player.x + 18 + rightStep, y + 17 - rightLegLift);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  drawShoe(player.x - 15 + leftStep, y + 18 - leftLegLift, -1);
  drawShoe(player.x + 18 + rightStep, y + 17 - rightLegLift, 1);
}

function drawShoe(x, y, direction) {
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(x, y, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2a7c5";
  ctx.beginPath();
  ctx.arc(x + direction * 5, y + 1, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d6dfe6";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - direction * 5, y - 2);
  ctx.lineTo(x + direction * 1, y - 2);
  ctx.stroke();
}

function drawStar(x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const pointRadius = i % 2 === 0 ? radius : radius * 0.45;
    const px = x + Math.cos(angle) * pointRadius;
    const py = y + Math.sin(angle) * pointRadius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.45);
  ctx.bezierCurveTo(x - size * 1.2, y - size * 0.25, x - size * 0.62, y - size, x, y - size * 0.35);
  ctx.bezierCurveTo(x + size * 0.62, y - size, x + size * 1.2, y - size * 0.25, x, y + size * 0.45);
  ctx.fill();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") moveToLane(targetLane - 1);
  if (event.key === "ArrowRight") moveToLane(targetLane + 1);
  if (event.key === "ArrowUp" || event.key === " " || event.key === "Spacebar") jump();
  if ((state === "won" || state === "lost") && event.key === "Enter") resetGame();
});

canvas.addEventListener("mousemove", (event) => {
  if (state !== "playing") return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  if (mouseAnchorX === null) {
    mouseAnchorX = x;
    return;
  }

  const delta = x - mouseAnchorX;
  if (Math.abs(delta) >= mouseLaneThreshold) {
    moveToLane(targetLane + Math.sign(delta));
    mouseAnchorX = x;
  }
});

canvas.addEventListener("mouseleave", () => {
  mouseAnchorX = null;
});

canvas.addEventListener("click", jump);
canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  const touch = event.touches[0];
  const rect = canvas.getBoundingClientRect();
  moveToLane(Math.floor(((touch.clientX - rect.left) / rect.width) * lanes.length));
  jump();
}, { passive: false });

restartButton.addEventListener("click", resetGame);

draw();
showOverlay(
  "Ready to run?",
  "Arrow keys move lanes. Move the mouse left or right with a deliberate swipe to steer. Click or tap to jump over low buildings. Collect 20 coins to win.",
  "Start Game"
);
