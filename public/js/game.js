const socket = io();
console.log('Connected to server');

// Constants for the game board size
let ROWCOUNT = 6;
let COLCOUNT = 15;

// Display the player's assigned color
socket.on('playerColor', (color) => {
    const playerInfo = document.getElementById('player-info');
    playerInfo.textContent = `Vous jouez avec la couleur : ${color}`;
});

// Update the list of connected players
socket.on('updatePlayers', (players) => {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '<h2>Connected Players:</h2>';
    for (const [id, color] of Object.entries(players)) {
        const playerItem = document.createElement('div');
        playerItem.textContent = `Player ${id}: ${color}`;
        playersList.appendChild(playerItem);
    }
});

// Add a 'startGame' event listener
const startButton = document.getElementById('start-game');
const gameBoard = document.getElementById('game-board');

startButton.addEventListener('click', () => {
    const rows = parseInt(prompt('Entrez le nombre de lignes :', '6'));
    const cols = parseInt(prompt('Entrez le nombre de colonnes :', '7'));
    socket.emit('startGame', { rows, cols });
});

// Initialize the game board state
let board = Array(ROWCOUNT).fill(null).map(() => Array(COLCOUNT).fill(null));
let currentPlayer = null;

// Listen for turn updates
socket.on('playerTurn', (playerId) => {
    currentPlayer = playerId;
    const playerInfo = document.getElementById('player-info');
    if (socket.id === playerId) {
        playerInfo.textContent = 'C\'est votre tour !';
    } else {
        playerInfo.textContent = `En attente du joueur ${playerId}`;
    }
});

// Add click event listeners to each cell
function initializeBoard() {
    const cells = document.querySelectorAll('#game-board div div');
    cells.forEach((cell, index) => {
        const col = index % COLCOUNT; // Ensure column calculation is dynamic
        cell.addEventListener('click', () => {
            if (socket.id === currentPlayer) {
                console.log(`Column clicked: ${col}`); // Debugging log
                socket.emit('playMove', col);
            } else {
                alert('Not your turn!');
            }
        });
    });
}

// Update the game board visually
function renderBoard(board) {
    const cells = document.querySelectorAll('#game-board div div');
    cells.forEach((cell, index) => {
        const row = Math.floor(index / COLCOUNT);
        const col = index % COLCOUNT;
        if (board[row] && board[row][col] !== undefined) {
            if (board[row][col] && cell.style.backgroundColor !== board[row][col]) {
                cell.classList.add('falling'); // Add the falling animation class only for non-empty cells
                setTimeout(() => {
                    cell.classList.remove('falling'); // Remove the class after animation
                }, 500);
            }
            cell.style.backgroundColor = board[row][col] || 'white';
        }
    });
}

// Display the game board when the game starts
socket.on('displayBoard', ({ rows, cols }) => {
    ROWCOUNT = rows;
    COLCOUNT = cols;
    board = Array(ROWCOUNT).fill(null).map(() => Array(COLCOUNT).fill(null));

    gameBoard.style.display = 'block';
    gameBoard.innerHTML = '';
    for (let row = 0; row < ROWCOUNT; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.style.display = 'flex';
        for (let col = 0; col < COLCOUNT; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            rowDiv.appendChild(cell);
        }
        gameBoard.appendChild(rowDiv);
    }
    initializeBoard();
});

socket.on('updateBoard', (newBoard) => {
    board = newBoard;
    renderBoard(board);
});

socket.on('gameOver', ({ winner, color }) => {
    alert(`Le joueur ${winner} avec la couleur ${color} a gagné la partie !`);
});