const canvas = document.getElementById("ticCanvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("ticStatus");
const restartBtn = document.getElementById("ticRestart");
const startBtn = document.getElementById("ticStart");
const startOverlay = document.getElementById("ticStartOverlay");
const chooseXBtn = document.getElementById("chooseX");
const chooseOBtn = document.getElementById("chooseO");
const gameBackgroundImage = new Image();
gameBackgroundImage.src = "assets/tic-tac-toe-game-bg.png";

const BOARD_SIZE = 3;
const CELL_SIZE = canvas.width / BOARD_SIZE;
const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

let board;
let currentPlayer;
let playerMark = "X";
let computerMark = "O";
let status;
let winningLine;

function setupRound(nextStatus = "ready") {
  board = Array(9).fill("");
  currentPlayer = "X";
  status = nextStatus;
  winningLine = null;
  updateStatus();
  startOverlay.classList.toggle("hidden", status === "playing");
  if (status === "playing" && currentPlayer === computerMark) {
    window.setTimeout(playComputerTurn, 320);
  }
}

function startGame() {
  setupRound("playing");
}

function reset() {
  setupRound("ready");
}

function updateStatus() {
  if (status === "ready") statusEl.textContent = `${playerMark} chosen`;
  if (status === "playing") statusEl.textContent = `${currentPlayer} turn`;
  if (status === "X wins!") statusEl.textContent = "X wins";
  if (status === "O wins!") statusEl.textContent = "O wins";
  if (status === "Draw!") statusEl.textContent = "Draw";
}

function setPlayerMark(mark) {
  if (status === "playing") return;
  playerMark = mark;
  computerMark = mark === "X" ? "O" : "X";
  chooseXBtn.classList.toggle("active", playerMark === "X");
  chooseOBtn.classList.toggle("active", playerMark === "O");
  updateStatus();
}

function findWinner() {
  return WIN_LINES.find((line) => {
    const [a, b, c] = line;
    return board[a] && board[a] === board[b] && board[a] === board[c];
  });
}

function finishTurn() {
  winningLine = findWinner();
  if (winningLine) {
    status = `${board[winningLine[0]]} wins!`;
  } else if (board.every(Boolean)) {
    status = "Draw!";
  } else {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
  }
  updateStatus();
}

function chooseComputerMove() {
  const emptyIndexes = board.map((mark, index) => (mark ? null : index)).filter((index) => index !== null);
  const findLineMove = (mark) => {
    for (const line of WIN_LINES) {
      const marks = line.map((index) => board[index]);
      if (marks.filter((cell) => cell === mark).length === 2 && marks.includes("")) {
        return line[marks.indexOf("")];
      }
    }
    return null;
  };

  return findLineMove(computerMark)
    ?? findLineMove(playerMark)
    ?? (board[4] ? null : 4)
    ?? emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
}

function playComputerTurn() {
  if (status !== "playing" || currentPlayer !== computerMark) return;
  const move = chooseComputerMove();
  if (move === undefined || move === null) return;
  board[move] = computerMark;
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

function drawBoard() {
  ctx.fillStyle = "rgba(255, 248, 232, .88)";
  ctx.fillRect(34, 34, canvas.width - 68, canvas.height - 68);

  ctx.strokeStyle = "#211a52";
  ctx.lineWidth = 12;
  ctx.strokeRect(34, 34, canvas.width - 68, canvas.height - 68);

  ctx.lineWidth = 10;
  for (let i = 1; i < BOARD_SIZE; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * CELL_SIZE, 52);
    ctx.lineTo(i * CELL_SIZE, canvas.height - 52);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(52, i * CELL_SIZE);
    ctx.lineTo(canvas.width - 52, i * CELL_SIZE);
    ctx.stroke();
  }
}

function drawMarks() {
  board.forEach((mark, index) => {
    if (!mark) return;
    const col = index % BOARD_SIZE;
    const row = Math.floor(index / BOARD_SIZE);
    const centerX = col * CELL_SIZE + CELL_SIZE / 2;
    const centerY = row * CELL_SIZE + CELL_SIZE / 2;

    ctx.lineWidth = 16;
    ctx.lineCap = "square";
    if (mark === "X") {
      ctx.strokeStyle = "#ff4fa3";
      ctx.beginPath();
      ctx.moveTo(centerX - 58, centerY - 58);
      ctx.lineTo(centerX + 58, centerY + 58);
      ctx.moveTo(centerX + 58, centerY - 58);
      ctx.lineTo(centerX - 58, centerY + 58);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "#526bff";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 64, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function drawResult() {
  if (status === "playing" || status === "ready") return;
  if (winningLine) {
    const start = winningLine[0];
    const end = winningLine[2];
    const startX = (start % BOARD_SIZE) * CELL_SIZE + CELL_SIZE / 2;
    const startY = Math.floor(start / BOARD_SIZE) * CELL_SIZE + CELL_SIZE / 2;
    const endX = (end % BOARD_SIZE) * CELL_SIZE + CELL_SIZE / 2;
    const endY = Math.floor(end / BOARD_SIZE) * CELL_SIZE + CELL_SIZE / 2;
    ctx.strokeStyle = "#ffd43b";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
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
  if (status !== "playing" || currentPlayer !== playerMark) return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width * canvas.width;
  const y = (event.clientY - rect.top) / rect.height * canvas.height;
  const col = Math.floor(x / CELL_SIZE);
  const row = Math.floor(y / CELL_SIZE);
  if (col < 0 || col >= BOARD_SIZE || row < 0 || row >= BOARD_SIZE) return;
  const index = row * BOARD_SIZE + col;
  if (board[index]) return;
  board[index] = playerMark;
  finishTurn();
  window.setTimeout(playComputerTurn, 320);
});

restartBtn.addEventListener("click", reset);
startBtn.addEventListener("click", startGame);
chooseXBtn.addEventListener("click", () => setPlayerMark("X"));
chooseOBtn.addEventListener("click", () => setPlayerMark("O"));
setupRound("ready");
loop();
