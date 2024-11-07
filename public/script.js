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

    // Initialize Stockfish
    console.log("Initializing Stockfish...");
    const stockfish = new Worker("js/stockfish.js");
    stockfish.postMessage("uci"); // Initialize Stockfish in UCI mode

    // Function to handle piece drop and move validation
    function onDrop(source, target) {
        // Check if the move is legal
        const move = game.move({
            from: source,
            to: target,
            promotion: 'q'
        });

        // If the move is illegal, snap back
        if (move === null) return 'snapback';

        // Update the board position with the new move
        board.position(game.fen());

        // Send position to Stockfish
        console.log(`Player move: ${source}-${target}`);
        stockfish.postMessage(`position fen ${game.fen()}`);
        stockfish.postMessage("go depth 15");
    }

    // Listen for Stockfish's best move
    stockfish.onmessage = function(event) {
        console.log("Stockfish message:", event.data);

        const message = event.data;
        if (message.startsWith("bestmove")) {
            const bestMove = message.split(" ")[1];
            if (bestMove && bestMove !== "(none)") {
                console.log(`Stockfish move: ${bestMove}`);
                game.move(bestMove);
                board.position(game.fen());
            }
        }
    };

    // Reset the game
    $('#reset-button').on('click', function() {
        console.log("Resetting game...");
        game.reset();
        board.start();
        stockfish.postMessage("position startpos");
    });
});
