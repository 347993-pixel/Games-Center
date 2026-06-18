const canvas = document.getElementById("ticCanvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("ticStatus");
const restartBtn = document.getElementById("ticRestart");
const startBtn = document.getElementById("ticStart");
const startOverlay = document.getElementById("ticStartOverlay");
const musicToggleBtn = document.getElementById("musicToggle");
const chooseBlackBtn = document.getElementById("chooseX");
const chooseWhiteBtn = document.getElementById("chooseO");
const gameBackgroundImage = new Image();
gameBackgroundImage.src = "assets/gomoku-game-bg.png";

const BOARD_SIZE = 15;
const WIN_LENGTH = 5;
const BOARD_MARGIN = 36;
const GRID_SIZE = canvas.width - BOARD_MARGIN * 2;
const CELL_SIZE = GRID_SIZE / (BOARD_SIZE - 1);
const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

let board;
let currentPlayer;
let playerStone = "black";
let computerStone = "white";
let status;
let winningLine;
let audioContext;
let masterGain;
let musicTimer;
let musicOn = false;
let noteIndex = 0;

const MELODY = [
  392, 440, 494, 587,
  494, 440, 392, 330,
  349, 392, 440, 523,
  494, 440, 392, 330,
];

function setupRound(nextStatus = "ready") {
  board = Array(BOARD_SIZE * BOARD_SIZE).fill("");
  currentPlayer = "black";
  status = nextStatus;
  winningLine = null;
  updateStatus();
  startOverlay.classList.toggle("hidden", status === "playing");
  if (status === "playing" && currentPlayer === computerStone) {
    window.setTimeout(playComputerTurn, 320);
  }
}

function startGame() {
  setupRound("playing");
  if (!musicOn) toggleMusic();
}

function reset() {
  setupRound("ready");
}

function labelStone(stone) {
  return stone === "black" ? "Black" : "White";
}

function updateStatus() {
  if (status === "ready") statusEl.textContent = `${labelStone(playerStone)} chosen`;
  if (status === "playing") statusEl.textContent = `${labelStone(currentPlayer)} turn`;
  if (status === "Black wins!") statusEl.textContent = "Black wins";
  if (status === "White wins!") statusEl.textContent = "White wins";
  if (status === "Draw!") statusEl.textContent = "Draw";
}

function setPlayerStone(stone) {
  if (status === "playing") return;
  playerStone = stone;
  computerStone = stone === "black" ? "white" : "black";
  chooseBlackBtn.classList.toggle("active", playerStone === "black");
  chooseWhiteBtn.classList.toggle("active", playerStone === "white");
  updateStatus();
}

function setupAudio() {
  if (audioContext) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audioContext = new AudioContext();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.12;
  masterGain.connect(audioContext.destination);
}

function playTone(frequency, duration = 0.22, volume = 0.32) {
  setupAudio();
  if (!audioContext || !masterGain) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;

  oscillator.type = "triangle";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function playMusicStep() {
  if (!musicOn) return;
  playTone(MELODY[noteIndex], 0.24, 0.22);
  noteIndex = (noteIndex + 1) % MELODY.length;
  musicTimer = window.setTimeout(playMusicStep, 360);
}

function updateMusicButton() {
  musicToggleBtn.textContent = musicOn ? "Music On" : "Music Off";
  musicToggleBtn.setAttribute("aria-pressed", musicOn ? "true" : "false");
}

function toggleMusic() {
  setupAudio();
  if (!audioContext) return;
  if (audioContext.state === "suspended") audioContext.resume();
  musicOn = !musicOn;
  window.clearTimeout(musicTimer);
  if (musicOn) playMusicStep();
  updateMusicButton();
}

function playStoneSound() {
  if (!musicOn) return;
  playTone(660, 0.12, 0.36);
}

function indexAt(col, row) {
  return row * BOARD_SIZE + col;
}

function isInside(col, row) {
  return col >= 0 && col < BOARD_SIZE && row >= 0 && row < BOARD_SIZE;
}

function findWinner() {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const stone = board[indexAt(col, row)];
      if (!stone) continue;
      for (const [dx, dy] of DIRECTIONS) {
        const line = [];
        for (let step = 0; step < WIN_LENGTH; step += 1) {
          const nextCol = col + dx * step;
          const nextRow = row + dy * step;
          if (!isInside(nextCol, nextRow) || board[indexAt(nextCol, nextRow)] !== stone) break;
          line.push(indexAt(nextCol, nextRow));
        }
        if (line.length === WIN_LENGTH) return line;
      }
    }
  }
  return null;
}

function finishTurn() {
  winningLine = findWinner();
  if (winningLine) {
    status = `${labelStone(board[winningLine[0]])} wins!`;
  } else if (board.every(Boolean)) {
    status = "Draw!";
  } else {
    currentPlayer = currentPlayer === "black" ? "white" : "black";
  }
  updateStatus();
}

function lineScore(col, row, stone, dx, dy) {
  let total = 1;
  for (const direction of [-1, 1]) {
    let nextCol = col + dx * direction;
    let nextRow = row + dy * direction;
    while (isInside(nextCol, nextRow) && board[indexAt(nextCol, nextRow)] === stone) {
      total += 1;
      nextCol += dx * direction;
      nextRow += dy * direction;
    }
  }
  return total;
}

function bestLineLength(col, row, stone) {
  return Math.max(...DIRECTIONS.map(([dx, dy]) => lineScore(col, row, stone, dx, dy)));
}

function hasNeighbor(col, row) {
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (!dx && !dy) continue;
      const nextCol = col + dx;
      const nextRow = row + dy;
      if (isInside(nextCol, nextRow) && board[indexAt(nextCol, nextRow)]) return true;
    }
  }
  return false;
}

function chooseComputerMove() {
  const candidates = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const index = indexAt(col, row);
      if (board[index]) continue;
      if (board.some(Boolean) && !hasNeighbor(col, row)) continue;
      const attack = bestLineLength(col, row, computerStone);
      const block = bestLineLength(col, row, playerStone);
      const centerPull = BOARD_SIZE - Math.abs(col - 7) - Math.abs(row - 7);
      candidates.push({ index, score: attack * 14 + block * 12 + centerPull });
    }
  }
  if (!candidates.length) return indexAt(7, 7);
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].index;
}

function playComputerTurn() {
  if (status !== "playing" || currentPlayer !== computerStone) return;
  const move = chooseComputerMove();
  if (move === undefined || move === null) return;
  board[move] = computerStone;
  playStoneSound();
  finishTurn();
}

function drawPixelBackground() {
  if (gameBackgroundImage.complete && gameBackgroundImage.naturalWidth) {
    ctx.drawImage(gameBackgroundImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#ffe7c4";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function pointFor(col, row) {
  return {
    x: BOARD_MARGIN + col * CELL_SIZE,
    y: BOARD_MARGIN + row * CELL_SIZE,
  };
}

function drawBoard() {
  ctx.fillStyle = "rgba(255, 248, 232, .78)";
  ctx.fillRect(28, 28, canvas.width - 56, canvas.height - 56);

  ctx.strokeStyle = "#211a52";
  ctx.lineWidth = 10;
  ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

  ctx.lineWidth = 4;
  for (let i = 0; i < BOARD_SIZE; i += 1) {
    const startRow = pointFor(0, i);
    const endRow = pointFor(BOARD_SIZE - 1, i);
    ctx.beginPath();
    ctx.moveTo(startRow.x, startRow.y);
    ctx.lineTo(endRow.x, endRow.y);
    ctx.stroke();

    const startCol = pointFor(i, 0);
    const endCol = pointFor(i, BOARD_SIZE - 1);
    ctx.beginPath();
    ctx.moveTo(startCol.x, startCol.y);
    ctx.lineTo(endCol.x, endCol.y);
    ctx.stroke();
  }
}

function drawMarks() {
  board.forEach((stone, index) => {
    if (!stone) return;
    const col = index % BOARD_SIZE;
    const row = Math.floor(index / BOARD_SIZE);
    const { x, y } = pointFor(col, row);
    const radius = CELL_SIZE * 0.38;

    ctx.fillStyle = stone === "black" ? "#211a52" : "#fff8e8";
    ctx.strokeStyle = stone === "black" ? "#fff8e8" : "#211a52";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

function drawResult() {
  if (status === "playing" || status === "ready") return;
  if (winningLine) {
    const first = winningLine[0];
    const last = winningLine[winningLine.length - 1];
    const start = pointFor(first % BOARD_SIZE, Math.floor(first / BOARD_SIZE));
    const end = pointFor(last % BOARD_SIZE, Math.floor(last / BOARD_SIZE));
    ctx.strokeStyle = "#ff4fa3";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(27, 23, 52, .74)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff8e8";
  ctx.textAlign = "center";
  ctx.font = "900 52px Trebuchet MS";
  ctx.fillText(status, canvas.width / 2, canvas.height / 2);
  ctx.font = "900 26px Trebuchet MS";
  ctx.fillText("Press Restart", canvas.width / 2, canvas.height / 2 + 46);
  ctx.textAlign = "left";
}

function draw() {
  drawPixelBackground();
  drawBoard();
  drawMarks();
  drawResult();
}

function loop() {
  draw();
  requestAnimationFrame(loop);
}

canvas.addEventListener("click", (event) => {
  if (status !== "playing" || currentPlayer !== playerStone) return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width * canvas.width;
  const y = (event.clientY - rect.top) / rect.height * canvas.height;
  const col = Math.round((x - BOARD_MARGIN) / CELL_SIZE);
  const row = Math.round((y - BOARD_MARGIN) / CELL_SIZE);
  if (!isInside(col, row)) return;
  const index = indexAt(col, row);
  if (board[index]) return;
  board[index] = playerStone;
  playStoneSound();
  finishTurn();
  window.setTimeout(playComputerTurn, 320);
});

restartBtn.addEventListener("click", reset);
startBtn.addEventListener("click", startGame);
musicToggleBtn.addEventListener("click", toggleMusic);
chooseBlackBtn.addEventListener("click", () => setPlayerStone("black"));
chooseWhiteBtn.addEventListener("click", () => setPlayerStone("white"));
updateMusicButton();
setupRound("ready");
loop();
