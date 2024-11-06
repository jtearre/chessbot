const board = Chessboard('chess-board', {
    draggable: true,
    position: 'start'
});

// Reset button functionality
document.getElementById('reset-button').addEventListener('click', () => {
    board.start(); // Resets the board to the starting position
});
