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
    playersList.innerHTML = '<h2>Joueurs Connectés :</h2>';
    for (const [id, color] of Object.entries(players)) {
        const playerItem = document.createElement('div');
        playerItem.classList.add('player-item');
        playerItem.dataset.playerId = id; // Add data attribute for player ID
        playerItem.textContent = `Joueur ${id}`;
        playerItem.style.backgroundColor = color; // Set the text color to the player's color
        playerItem.style.color = "white"; // Set the text color to white for better visibility
        playersList.appendChild(playerItem);
    }
});

// Update player scores and disable unaffordable power-ups
socket.on('updateScores', (scores) => {
    const playersList = document.getElementById('players-list');
    for (const [playerId, score] of Object.entries(scores)) {
        const playerItem = playersList.querySelector(`[data-player-id="${playerId}"]`);
        if (playerItem) {
            const scoreSpan = playerItem.querySelector('.player-score');
            if (scoreSpan) {
                scoreSpan.textContent = `Score: ${score}`;
            } else {
                const newScoreSpan = document.createElement('span');
                newScoreSpan.className = 'player-score';
                newScoreSpan.textContent = `Score: ${score}`;
                playerItem.appendChild(newScoreSpan);
            }
        }

        // Disable unaffordable power-ups for the current player
        if (socket.id === playerId) {
            const powerUpButtons = document.querySelectorAll('.power-up-button');
            powerUpButtons.forEach((button) => {
                const powerUpId = button.dataset.powerUp;
                const cost = powerUpId === 'spin' ? 1 : powerUpId === 'addrow' ? 3 : 0;
                if (score < cost) {
                    button.disabled = true;
                    button.classList.add('disabled');
                } else {
                    button.disabled = false;
                    button.classList.remove('disabled');
                }
            });
        }
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
        playerInfo.classList.remove('waiting');
        playerInfo.classList.add('your-turn');
    } else {
        playerInfo.textContent = `En attente du joueur ${playerId}`;
        playerInfo.classList.add('waiting');
        playerInfo.classList.remove('your-turn');
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

    // Clear the "C'est votre tour" message when the game starts
    const playerInfo = document.getElementById('player-info');
    playerInfo.textContent = '';

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

socket.on('updateBoard', ({ board: newBoard, rows, cols }) => {
    if (!newBoard || !rows || !cols) {
        console.error('Erreur : Données du plateau manquantes ou invalides');
        return;
    }

    board = newBoard;
    ROWCOUNT = rows;
    COLCOUNT = cols;

    // Re-render the board with the new dimensions
    gameBoard.innerHTML = '';
    for (let row = 0; row < ROWCOUNT; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.style.display = 'flex';
        for (let col = 0; col < COLCOUNT; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.style.backgroundColor = board[row][col] || 'white';
            rowDiv.appendChild(cell);
        }
        gameBoard.appendChild(rowDiv);
    }
    initializeBoard();
});

socket.on('gameOver', ({ winner, color }) => {
    alert(`Le joueur ${winner} avec la couleur ${color} a gagné la partie !`);
});

// Power-up system
const powerUpManager = {
    addPowerUp(id, name, icon, action) {
        const container = document.getElementById('power-ups-container');
        const item = document.createElement('li');
        item.className = 'power-up-item';

        const button = document.createElement('button');
        button.className = 'power-up-button';
        button.dataset.powerUp = id;

        const img = document.createElement('img');
        img.src = icon;
        img.alt = name;
        img.className = 'power-up-icon';

        const span = document.createElement('span');
        span.className = 'power-up-name';
        span.textContent = name;

        button.appendChild(img);
        button.appendChild(span);
        button.addEventListener('click', () => {
            const powerUpId = button.dataset.powerUp;
            action(powerUpId);
        });

        item.appendChild(button);
        container.appendChild(item);
    }
};

// Add a generic event listener for all power-ups
const powerUpsContainer = document.getElementById('power-ups-container');
if (powerUpsContainer) {
    powerUpsContainer.replaceWith(powerUpsContainer.cloneNode(true)); // Remove existing listeners
    powerUpsContainer.addEventListener('click', (event) => {
        const button = event.target.closest('.power-up-button');
        if (button) {
            const powerUpId = button.dataset.powerUp;
            console.log(`Power-up clicked: ${powerUpId}`);
            socket.emit('powerUpUsed', powerUpId);
        }
    });
} else {
    console.error('Power-ups container not found!');
}

// Example usage
powerUpManager.addPowerUp('spin', 'Spin Board', 'images/power-up-spin.png', (id) => {
    console.log(`Power-up clicked: ${id}`);
    socket.emit('powerUpUsed', id);
});

// Add the 'addrow' power-up
powerUpManager.addPowerUp('addrow', 'Add Row', 'images/power-up-addrow.png', (id) => {
    console.log(`Power-up clicked: ${id}`);
    socket.emit('powerUpUsed', id);
});
