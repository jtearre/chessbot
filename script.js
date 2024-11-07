$(document).ready(function() {
    // Initialize the chessboard
    var board = Chessboard('chess-board', {
        position: 'start',
        draggable: true,
        pieceTheme: 'https://raw.githubusercontent.com/ornicar/lila/master/public/piece/alpha/{piece}.svg',
        onDrop: onDrop
    });

    // Initialize Chess.js to manage game state
    let game = new Chess();

    // Function to handle piece drop and move validation
    function onDrop(source, target) {
        // Check if the move is legal
        const move = game.move({
            from: source,
            to: target,
            promotion: 'q' // Automatically promote to queen
        });

        // If the move is illegal, snap the piece back
        if (move === null) return 'snapback';

        // Update the board with the new position
        board.position(game.fen());
    }

    // Reset the game when the reset button is clicked
    $('#reset-button').on('click', function() {
        game.reset();
        board.start();
    });
});
