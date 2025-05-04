const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Game state
const players = {};
const colors = ['red', 'yellow', 'blue', 'green', 'purple', 'orange'];
let board = [];
let ROWCOUNT = 6;
let COLCOUNT = 7;
let currentPlayerIndex = 0;
const playerOrder = [];

function checkWin(board, playerColor) {
    const rows = board.length;
    const cols = board[0].length;

    // Check horizontal
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col <= cols - 4; col++) {
            if (
                board[row][col] === playerColor &&
                board[row][col + 1] === playerColor &&
                board[row][col + 2] === playerColor &&
                board[row][col + 3] === playerColor
            ) {
                return true;
            }
        }
    }

    // Check vertical
    for (let col = 0; col < cols; col++) {
        for (let row = 0; row <= rows - 4; row++) {
            if (
                board[row][col] === playerColor &&
                board[row + 1][col] === playerColor &&
                board[row + 2][col] === playerColor &&
                board[row + 3][col] === playerColor
            ) {
                return true;
            }
        }
    }

    // Check diagonal (top-left to bottom-right)
    for (let row = 0; row <= rows - 4; row++) {
        for (let col = 0; col <= cols - 4; col++) {
            if (
                board[row][col] === playerColor &&
                board[row + 1][col + 1] === playerColor &&
                board[row + 2][col + 2] === playerColor &&
                board[row + 3][col + 3] === playerColor
            ) {
                return true;
            }
        }
    }

    // Check diagonal (bottom-left to top-right)
    for (let row = 3; row < rows; row++) {
        for (let col = 0; col <= cols - 4; col++) {
            if (
                board[row][col] === playerColor &&
                board[row - 1][col + 1] === playerColor &&
                board[row - 2][col + 2] === playerColor &&
                board[row - 3][col + 3] === playerColor
            ) {
                return true;
            }
        }
    }

    return false;
}

// Handle socket connections
io.on('connection', (socket) => {
    console.log('Un utilisateur s\'est connecté :', socket.id);

    // Assign a color to the new player
    const color = colors.shift();
    players[socket.id] = color;
    console.log(`Le joueur ${socket.id} a reçu la couleur ${color}`);

    // Notify the player of their color
    socket.emit('playerColor', color);

    // Add the player to the turn order
    playerOrder.push(socket.id);

    // Notify all players whose turn it is
    io.emit('playerTurn', playerOrder[currentPlayerIndex]);

    // Broadcast the updated player list
    io.emit('updatePlayers', players);

    // Handle game start
    socket.on('startGame', ({ rows, cols }) => {
        if (!rows || !cols) {
            socket.emit('errorMessage', 'Invalid board dimensions!');
            return;
        }

        ROWCOUNT = rows;
        COLCOUNT = cols;
        board = Array(ROWCOUNT).fill(null).map(() => Array(COLCOUNT).fill(null));

        // Notify all players to display the reset board with new dimensions
        io.emit('displayBoard', { rows: ROWCOUNT, cols: COLCOUNT });

        // Reset the turn to the first player
        currentPlayerIndex = 0;
        io.emit('playerTurn', playerOrder[currentPlayerIndex]);
    });

    // Handle player moves
    socket.on('playMove', (col) => {
        if (socket.id !== playerOrder[currentPlayerIndex]) {
            socket.emit('errorMessage', 'Not your turn!');
            return;
        }

        // Debugging log to verify the column received
        console.log(`Colonne reçue du client : ${col}`);

        // Ensure the column is within bounds
        if (col < 0 || col >= board[0].length) {
            socket.emit('errorMessage', 'Invalid column!');
            return;
        }

        // Find the lowest empty row in the column
        let playedRow = -1;
        for (let row = board.length - 1; row >= 0; row--) {
            if (!board[row][col]) {
                board[row][col] = players[socket.id]; // Assign the player's color
                playedRow = row;
                break;
            }
        }

        if (playedRow === -1) {
            socket.emit('errorMessage', 'Column is full!');
            return;
        }

        // Debugging log to verify the board state after the move
        console.log('État du plateau après le coup :', board);

        // Broadcast the updated board to all players
        io.emit('updateBoard', board);

        // Check for a win
        if (checkWin(board, players[socket.id])) {
            io.emit('gameOver', { winner: socket.id, color: players[socket.id] });
            return;
        }

        // Move to the next player's turn
        currentPlayerIndex = (currentPlayerIndex + 1) % playerOrder.length;
        io.emit('playerTurn', playerOrder[currentPlayerIndex]);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Un utilisateur s\'est déconnecté :', socket.id);
        colors.push(players[socket.id]); // Recycle the color
        delete players[socket.id];
        io.emit('updatePlayers', players);

        // Remove the player from the turn order
        const index = playerOrder.indexOf(socket.id);
        if (index !== -1) {
            playerOrder.splice(index, 1);
            if (currentPlayerIndex >= playerOrder.length) {
                currentPlayerIndex = 0;
            }
        }

        // Notify all players whose turn it is
        io.emit('playerTurn', playerOrder[currentPlayerIndex]);
    });
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});