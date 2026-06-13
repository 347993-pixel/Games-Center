const canvas = document.getElementById("catchCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("catchScore");
const restartBtn = document.getElementById("catchRestart");
const startBtn = document.getElementById("catchStart");
const startOverlay = document.getElementById("catchStartOverlay");
const colors = ["#ff4fa3", "#20d7ff", "#ffd43b"];
const WIN_SCORE = 10;
const MISS_LIMIT = 5;
const DROP_RADIUS = 24;
const DROP_LANES = [72, 168, 264, 360, 456, 552, 648];
const MAX_DROPS = 3;
const backgroundImage = new Image();
backgroundImage.src = "assets/color-catch-background.png";
let bucket;
let drops;
let score;
let misses;
let status;
let spawnTimer;
let keys = new Set();

function setupRound(nextStatus = "ready") {
  bucket = { x: canvas.width / 2, y: 640, w: 116, h: 42, color: colors[0] };
  drops = [];
  score = 0;
  misses = 0;
  status = nextStatus;
  spawnTimer = 0;
  scoreEl.textContent = "0";
  startOverlay.classList.toggle("hidden", status === "playing");
}

function startGame() {
  setupRound("playing");
}

function reset() {
  setupRound("ready");
}

function spawnDrop() {
  const shuffledLanes = [...DROP_LANES].sort(() => Math.random() - 0.5);
  const x = shuffledLanes.find((laneX) => {
    return drops.every((drop) => {
      const nearTop = drop.y < 150;
      const tooCloseHorizontally = Math.abs(drop.x - laneX) < DROP_RADIUS * 3.2;
      return !(nearTop && tooCloseHorizontally);
    });
  }) ?? shuffledLanes[0];

  drops.push({
    x,
    y: -30,
    r: DROP_RADIUS,
    color: colors[Math.floor(Math.random() * colors.length)],
    speed: 2.15 + Math.random() * 1.65,
  });
}

function end(message) {
  status = message;
}

function update() {
  if (status !== "playing") return;
  if (keys.has("ArrowLeft")) bucket.x -= 8;
  if (keys.has("ArrowRight")) bucket.x += 8;
  bucket.x = Math.max(bucket.w / 2, Math.min(canvas.width - bucket.w / 2, bucket.x));
  spawnTimer -= 1;
  if (spawnTimer <= 0) {
    if (drops.length < MAX_DROPS) {
      spawnDrop();
    }
    spawnTimer = 82;
  }
  drops.forEach((drop) => drop.y += drop.speed);
  drops = drops.filter((drop) => {
    const caught = drop.y + drop.r > bucket.y && Math.abs(drop.x - bucket.x) < bucket.w / 2;
    if (caught) {
      if (drop.color === bucket.color) {
        score += 1;
        scoreEl.textContent = score;
        bucket.color = colors[score % colors.length];
        if (score >= WIN_SCORE) end("You win!");
      } else {
        misses += 1;
        if (misses >= MISS_LIMIT) end("Too many misses.");
      }
      return false;
    }
    if (drop.y > canvas.height + 40) {
      if (drop.color === bucket.color) misses += 1;
      if (misses >= MISS_LIMIT) end("Too many misses.");
      return false;
    }
    return true;
  });
}

function draw() {
  if (backgroundImage.complete && backgroundImage.naturalWidth) {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  } else {
    const fallback = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    fallback.addColorStop(0, "#ffd5f6");
    fallback.addColorStop(0.36, "#cfeeff");
    fallback.addColorStop(0.68, "#ffe9a8");
    fallback.addColorStop(1, "#f6b4e9");
    ctx.fillStyle = fallback;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = "#211a52";
  ctx.font = "900 24px Trebuchet MS";
  ctx.fillText(`Misses: ${misses}/${MISS_LIMIT}`, 24, 42);
  drops.forEach((drop) => {
    ctx.fillStyle = drop.color;
    ctx.beginPath();
    ctx.arc(drop.x, drop.y, drop.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#211a52";
    ctx.stroke();
  });
  ctx.fillStyle = bucket.color;
  ctx.fillRect(bucket.x - bucket.w / 2, bucket.y, bucket.w, bucket.h);
  ctx.strokeStyle = "#211a52";
  ctx.lineWidth = 6;
  ctx.strokeRect(bucket.x - bucket.w / 2, bucket.y, bucket.w, bucket.h);
  if (status !== "playing" && status !== "ready") {
    ctx.fillStyle = "rgba(27, 23, 52, .78)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff8e8";
    ctx.textAlign = "center";
    ctx.font = "900 52px Trebuchet MS";
    ctx.fillText(status, canvas.width / 2, canvas.height / 2);
    ctx.font = "900 26px Trebuchet MS";
    ctx.fillText("Press Restart", canvas.width / 2, canvas.height / 2 + 46);
    ctx.textAlign = "left";
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => keys.add(event.key));
window.addEventListener("keyup", (event) => keys.delete(event.key));
canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  bucket.x = (event.clientX - rect.left) / rect.width * canvas.width;
});
restartBtn.addEventListener("click", reset);
startBtn.addEventListener("click", startGame);
setupRound("ready");
loop();
