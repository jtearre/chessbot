$(document).ready(function() {
    // Initialize the chessboard
    var board = Chessboard('chess-board', {
        position: 'start',
        draggable: true,
        pieceTheme: 'https://raw.githubusercontent.com/ornicar/lila/master/public/piece/alpha/{piece}.svg',
        onDrop: onDrop // Triggered when a piece is dropped
    });

    // Initialize Chess.js to manage game state
    let game = new Chess();

    // Initialize Stockfish using the CDN link you provided
    console.log("Creating Stockfish worker...");
const stockfish = new Worker("js/stockfish.js");

    // Test if Stockfish responds to an initial command
    stockfish.onmessage = function(event) {
        console.log("Stockfish message received:", event.data);

        // Process Stockfish's best move
        const message = event.data;
        if (message.startsWith("bestmove")) {
            const bestMove = message.split(" ")[1];
            if (bestMove && bestMove !== "(none)") {
                console.log(`Stockfish move: ${bestMove}`);
                game.move(bestMove); // Update the game state with Stockfish's move
                board.position(game.fen()); // Update the board to reflect Stockfish's move
            }
        }
    };

    // Send initial command to Stockfish to verify it loads correctly
    stockfish.postMessage("uci");

    // Function to handle piece drop and move validation
    function onDrop(source, target) {
        // Check if the move is legal
        const move = game.move({
            from: source,
            to: target,
            promotion: 'q' // Auto-promote pawns to queen
        });

        // If the move is illegal, snap back
        if (move === null) return 'snapback';

        // Update the board position with the new move
        board.position(game.fen());

        // Send the updated position to Stockfish for analysis
        console.log(`Player move: ${source}-${target}`);
        stockfish.postMessage(`position fen ${game.fen()}`);
        stockfish.postMessage("go depth 15"); // Set analysis depth for Stockfish
    }

    // Reset the game when the reset button is clicked
    $('#reset-button').on('click', function() {
        console.log("Resetting game...");
        game.reset();
        board.start();
        stockfish.postMessage("position startpos");
    });
});
