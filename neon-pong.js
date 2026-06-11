const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("pongScore");
const restartBtn = document.getElementById("pongRestart");
const startBtn = document.getElementById("pongStart");
const startOverlay = document.getElementById("pongStartOverlay");
const keys = new Set();
let paddle;
let ball;
let score;
let status;

function setupRound(nextStatus = "ready") {
  paddle = { x: canvas.width / 2, y: 650, w: 132, h: 18 };
  ball = { x: canvas.width / 2, y: 360, vx: 4.5, vy: -5, r: 15 };
  score = 0;
  status = nextStatus;
  scoreEl.textContent = "0";
  startOverlay.classList.toggle("hidden", status === "playing");
}

function startGame() {
  setupRound("playing");
}

function reset() {
  setupRound("ready");
}

function update() {
  if (status !== "playing") return;
  if (keys.has("ArrowLeft")) paddle.x -= 10;
  if (keys.has("ArrowRight")) paddle.x += 10;
  paddle.x = Math.max(paddle.w / 2, Math.min(canvas.width - paddle.w / 2, paddle.x));
  ball.x += ball.vx;
  ball.y += ball.vy;
  if (ball.x < ball.r || ball.x > canvas.width - ball.r) ball.vx *= -1;
  if (ball.y < ball.r) ball.vy *= -1;
  if (ball.y + ball.r > paddle.y && ball.y - ball.r < paddle.y + paddle.h && Math.abs(ball.x - paddle.x) < paddle.w / 2) {
    ball.vy = -Math.abs(ball.vy) - 0.18;
    ball.vx += (ball.x - paddle.x) * 0.035;
    score += 1;
    scoreEl.textContent = score;
    if (score >= 7) status = "You win!";
  }
  if (ball.y > canvas.height + 40) status = "Missed!";
}

function draw() {
  ctx.fillStyle = "#211a52";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#20d7ff";
  ctx.lineWidth = 4;
  for (let y = 0; y < canvas.height; y += 42) {
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, y);
    ctx.lineTo(canvas.width / 2, y + 22);
    ctx.stroke();
  }
  ctx.fillStyle = "#ff4fa3";
  ctx.fillRect(paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h);
  ctx.fillStyle = "#ffd43b";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  if (status !== "playing" && status !== "ready") {
    ctx.fillStyle = "rgba(255,255,255,.16)";
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
  paddle.x = (event.clientX - rect.left) / rect.width * canvas.width;
});
restartBtn.addEventListener("click", reset);
startBtn.addEventListener("click", startGame);
setupRound("ready");
loop();
