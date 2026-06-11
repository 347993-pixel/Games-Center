const canvas = document.getElementById("subwayCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("coinScore");
const restartBtn = document.getElementById("restartBtn");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const jumpBtn = document.getElementById("jumpBtn");

const W = canvas.width;
const H = canvas.height;
const lanes = [W * 0.28, W * 0.5, W * 0.72];
const keys = new Set();
const state = {
  status: "playing",
  score: 0,
  time: 0,
  speed: 4.8,
  spawnTimer: 0,
  coinTimer: 0,
  roadOffset: 0,
  message: "",
};

const player = {
  lane: 1,
  x: lanes[1],
  y: H - 178,
  w: 56,
  h: 112,
  jump: 0,
  jumpVelocity: 0,
};

let obstacles = [];
let coins = [];

function resetGame() {
  state.status = "playing";
  state.score = 0;
  state.time = 0;
  state.speed = 4.8;
  state.spawnTimer = 22;
  state.coinTimer = 10;
  state.roadOffset = 0;
  state.message = "";
  player.lane = 1;
  player.x = lanes[1];
  player.jump = 0;
  player.jumpVelocity = 0;
  obstacles = [];
  coins = [];
  scoreEl.textContent = "0";
}

function laneFromX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) / rect.width * W;
  let closest = 0;
  let best = Infinity;
  lanes.forEach((laneX, index) => {
    const dist = Math.abs(x - laneX);
    if (dist < best) {
      best = dist;
      closest = index;
    }
  });
  player.lane = closest;
}

function jump() {
  if (state.status !== "playing") return;
  if (player.jump <= 0.5) {
    player.jumpVelocity = 16;
  }
}

function spawnObstacle() {
  const lane = Math.floor(Math.random() * lanes.length);
  const isTrain = Math.random() > 0.42;
  obstacles.push({
    lane,
    x: lanes[lane],
    y: -180,
    w: isTrain ? 108 : 86,
    h: isTrain ? 178 : 128,
    type: isTrain ? "train" : "building",
    passed: false,
  });
}

function spawnCoin() {
  const lane = Math.floor(Math.random() * lanes.length);
  coins.push({
    lane,
    x: lanes[lane],
    y: -44,
    r: 19,
    pulse: Math.random() * 10,
  });
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getPlayerRect() {
  return {
    x: player.x - player.w / 2 + 8,
    y: player.y - player.jump + 18,
    w: player.w - 16,
    h: player.h - 28,
  };
}

function update() {
  if (state.status !== "playing") return;

  state.time += 1;
  state.speed = Math.min(9.2, state.speed + 0.0025);
  state.roadOffset = (state.roadOffset + state.speed) % 80;

  if (keys.has("ArrowLeft")) player.lane = Math.max(0, player.lane - 0.08);
  if (keys.has("ArrowRight")) player.lane = Math.min(2, player.lane + 0.08);
  if (keys.has("ArrowUp") || keys.has(" ")) jump();
  player.x += (lanes[Math.round(player.lane)] - player.x) * 0.16;

  if (player.jumpVelocity || player.jump > 0) {
    player.jump += player.jumpVelocity;
    player.jumpVelocity -= 1.05;
    if (player.jump < 0) {
      player.jump = 0;
      player.jumpVelocity = 0;
    }
  }

  state.spawnTimer -= 1;
  if (state.spawnTimer <= 0) {
    spawnObstacle();
    state.spawnTimer = Math.max(42, 82 - state.speed * 3 + Math.random() * 30);
  }

  state.coinTimer -= 1;
  if (state.coinTimer <= 0) {
    spawnCoin();
    state.coinTimer = 28 + Math.random() * 34;
  }

  obstacles.forEach((obstacle) => {
    obstacle.y += state.speed;
  });
  coins.forEach((coin) => {
    coin.y += state.speed;
    coin.pulse += 0.18;
  });

  const runner = getPlayerRect();
  obstacles.forEach((obstacle) => {
    const frontZone = {
      x: obstacle.x - obstacle.w / 2 + 8,
      y: obstacle.y + obstacle.h * 0.56,
      w: obstacle.w - 16,
      h: obstacle.h * 0.38,
    };
    const obstacleIsInFront = obstacle.y + obstacle.h > runner.y + runner.h * 0.4 && obstacle.y < runner.y + runner.h;
    if (obstacleIsInFront && player.jump < 44 && rectsOverlap(runner, frontZone)) {
      endGame("Crash! Try the lane change earlier.");
    }
  });

  coins = coins.filter((coin) => {
    const coinBox = { x: coin.x - coin.r, y: coin.y - coin.r, w: coin.r * 2, h: coin.r * 2 };
    if (rectsOverlap(runner, coinBox)) {
      state.score += 1;
      scoreEl.textContent = state.score;
      if (state.score >= 20) endGame("You win! 20 coins collected.");
      return false;
    }
    return coin.y < H + 80;
  });

  obstacles = obstacles.filter((obstacle) => obstacle.y < H + 220);
}

function endGame(message) {
  state.status = "ended";
  state.message = message;
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#29c7ff");
  sky.addColorStop(0.46, "#ff86ca");
  sky.addColorStop(1, "#ffe75b");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 9; i++) {
    const x = i * 95 - 40;
    const h = 140 + (i % 4) * 48;
    ctx.fillStyle = ["#7657ff", "#20d7ff", "#ff4fa3", "#58e875"][i % 4];
    ctx.fillRect(x, 140 - h * 0.25, 70, h);
    ctx.fillStyle = "#fff8a8";
    for (let y = 80; y < 230; y += 30) {
      ctx.fillRect(x + 14, y, 12, 12);
      ctx.fillRect(x + 42, y, 12, 12);
    }
  }
}

function roadXAt(y, laneX) {
  const horizon = H * 0.24;
  const scale = (y - horizon) / (H - horizon);
  return W / 2 + (laneX - W / 2) * (0.28 + scale * 0.92);
}

function drawRoad() {
  ctx.fillStyle = "#36364d";
  ctx.beginPath();
  ctx.moveTo(W * 0.42, H * 0.24);
  ctx.lineTo(W * 0.86, H);
  ctx.lineTo(W * 0.14, H);
  ctx.lineTo(W * 0.58, H * 0.24);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#22c7ff";
  ctx.beginPath();
  ctx.moveTo(W * 0.41, H * 0.24);
  ctx.lineTo(W * 0.22, H);
  ctx.lineTo(0, H);
  ctx.lineTo(0, H * 0.56);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#72ed7c";
  ctx.beginPath();
  ctx.moveTo(W * 0.59, H * 0.24);
  ctx.lineTo(W * 0.78, H);
  ctx.lineTo(W, H);
  ctx.lineTo(W, H * 0.56);
  ctx.closePath();
  ctx.fill();

  for (let y = H * 0.28 + state.roadOffset; y < H + 100; y += 80) {
    const scale = (y - H * 0.24) / (H * 0.76);
    ctx.fillStyle = scale > 0.54 ? "#ffd43b" : "#fff8e8";
    const dashW = 8 + scale * 16;
    const dashH = 24 + scale * 45;
    [W * 0.39, W * 0.61].forEach((baseX) => {
      const x = roadXAt(y, baseX);
      ctx.fillRect(x - dashW / 2, y, dashW, dashH);
    });
  }
}

function drawCoin(coin) {
  const bob = Math.sin(coin.pulse) * 3;
  ctx.fillStyle = "#ffd43b";
  ctx.beginPath();
  ctx.arc(coin.x, coin.y + bob, coin.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#7c5615";
  ctx.stroke();
  ctx.fillStyle = "#fff8a8";
  ctx.fillRect(coin.x - 4, coin.y - 13 + bob, 8, 26);
}

function drawObstacle(obstacle) {
  const x = obstacle.x - obstacle.w / 2;
  const y = obstacle.y;
  if (obstacle.type === "train") {
    ctx.fillStyle = "#f4f7ff";
    ctx.fillRect(x, y, obstacle.w, obstacle.h);
    ctx.fillStyle = "#526bff";
    ctx.fillRect(x + 8, y + 10, obstacle.w - 16, 46);
    ctx.fillStyle = "#20d7ff";
    ctx.fillRect(x + 17, y + 21, 28, 22);
    ctx.fillRect(x + obstacle.w - 45, y + 21, 28, 22);
    ctx.fillStyle = "#ff4fa3";
    ctx.fillRect(x + 14, y + obstacle.h - 32, obstacle.w - 28, 18);
    ctx.fillStyle = "#1b1734";
    ctx.fillRect(x + 16, y + obstacle.h - 8, 24, 8);
    ctx.fillRect(x + obstacle.w - 40, y + obstacle.h - 8, 24, 8);
  } else {
    ctx.fillStyle = "#ff8d2b";
    ctx.fillRect(x, y, obstacle.w, obstacle.h);
    ctx.fillStyle = "#211a52";
    ctx.fillRect(x + 10, y + 16, obstacle.w - 20, 18);
    ctx.fillStyle = "#ffe75b";
    for (let row = y + 48; row < y + obstacle.h - 16; row += 28) {
      ctx.fillRect(x + 14, row, 18, 16);
      ctx.fillRect(x + obstacle.w - 32, row, 18, 16);
    }
  }
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#211a52";
  ctx.strokeRect(x, y, obstacle.w, obstacle.h);
}

function drawPlayer() {
  const x = player.x;
  const y = player.y - player.jump;
  const bounce = Math.sin(state.time * 0.25) * 3;

  ctx.fillStyle = "rgba(0,0,0,.22)";
  ctx.beginPath();
  ctx.ellipse(x, player.y + 106, 34, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff4fa3";
  ctx.fillRect(x - 25, y + 42 + bounce, 50, 44);
  ctx.fillStyle = "#ffd0aa";
  ctx.fillRect(x - 20, y + 18 + bounce, 40, 28);
  ctx.fillStyle = "#7b3f2f";
  ctx.fillRect(x - 23, y + 10 + bounce, 46, 20);
  ctx.fillRect(x - 18, y + 28 + bounce, 36, 18);

  ctx.fillStyle = "#3d52ff";
  ctx.fillRect(x - 22, y + 84 + bounce, 17, 38);
  ctx.fillRect(x + 5, y + 84 - bounce, 17, 38);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 25, y + 121 + bounce, 25, 10);
  ctx.fillRect(x + 3, y + 121 - bounce, 25, 10);
  ctx.fillStyle = "#211a52";
  ctx.fillRect(x - 27, y + 129 + bounce, 29, 6);
  ctx.fillRect(x + 1, y + 129 - bounce, 29, 6);

  ctx.fillStyle = "#ffd0aa";
  ctx.fillRect(x - 35, y + 48 + bounce, 11, 34);
  ctx.fillRect(x + 24, y + 48 + bounce, 11, 34);
}

function drawOverlay() {
  if (state.status === "playing") return;
  ctx.fillStyle = "rgba(27, 23, 52, .78)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff8e8";
  ctx.textAlign = "center";
  ctx.font = "900 54px Trebuchet MS";
  ctx.fillText(state.message.includes("win") ? "You Win!" : "Run Over", W / 2, H / 2 - 28);
  ctx.font = "900 28px Trebuchet MS";
  ctx.fillText(state.message, W / 2, H / 2 + 18);
  ctx.fillText("Press Restart to play again", W / 2, H / 2 + 62);
  ctx.textAlign = "left";
}

function draw() {
  drawBackground();
  drawRoad();
  coins.forEach(drawCoin);
  obstacles.forEach(drawObstacle);
  drawPlayer();
  drawOverlay();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  keys.add(event.key);
  if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(event.key)) event.preventDefault();
});

window.addEventListener("keyup", (event) => keys.delete(event.key));
canvas.addEventListener("mousemove", (event) => laneFromX(event.clientX));
canvas.addEventListener("click", jump);
canvas.addEventListener("pointerdown", (event) => {
  laneFromX(event.clientX);
  jump();
});
restartBtn.addEventListener("click", resetGame);
leftBtn.addEventListener("click", () => { player.lane = Math.max(0, Math.round(player.lane) - 1); });
rightBtn.addEventListener("click", () => { player.lane = Math.min(2, Math.round(player.lane) + 1); });
jumpBtn.addEventListener("click", jump);

resetGame();
loop();
