$(document).ready(function() {
    var board = Chessboard('chess-board', {
        position: 'start',
        draggable: false,  // Disable dragging to enable click-to-move
        pieceTheme: 'https://raw.githubusercontent.com/ornicar/lila/master/public/piece/alpha/{piece}.svg'
    });

    let game = new Chess();
    const stockfish = new Worker("js/stockfish.js");

    let selectedSquare = null;
    let evaluationReady = false;

    stockfish.onmessage = function(event) {
        const message = event.data;
        
        if (evaluationReady && message.includes("score cp")) {
            const scoreMatch = message.match(/score cp (-?\d+)/);
            if (scoreMatch) {
                let score = parseInt(scoreMatch[1]);
                if (game.turn() === 'b') score = -score; // Adjust score for White's perspective
                provideFeedback(score);
                evaluationReady = false;
            }
        }

        if (message.startsWith("bestmove")) {
            const bestMove = message.split(" ")[1];
            if (bestMove && bestMove !== "(none)") {
                const move = game.move({ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4) });
                if (move !== null) board.position(game.fen());
                evaluationReady = true;
            }
        }
    };

    stockfish.postMessage("uci");

    // Handle click-to-move logic
    board.on('click', function(event) {
        const square = event.target.getAttribute('data-square');
        if (!square) return;

        if (selectedSquare) {
            // Try to move piece to the clicked square
            const move = game.move({
                from: selectedSquare,
                to: square,
                promotion: 'q'
            });

            if (move !== null) {
                board.position(game.fen());
                selectedSquare = null;
                stockfish.postMessage(`position fen ${game.fen()}`);
                stockfish.postMessage("go depth 10");
            } else {
                // Invalid move, deselect the square
                selectedSquare = null;
            }
        } else {
            // Select a square if it has a piece of the current player's color
            const piece = game.get(square);
            if (piece && piece.color === game.turn()) {
                selectedSquare = square;
            }
        }
    });

    $('#reset-button').on('click', function() {
        game.reset();
        board.start();
        stockfish.postMessage("position startpos");
        $('#feedback').text('');
    });

    function provideFeedback(score) {
        let feedback;
        if (score > 300) feedback = "You're in a very strong position!";
        else if (score > 150) feedback = "You have a clear advantage.";
        else if (score > 50) feedback = "You have a slight advantage.";
        else if (score > -50) feedback = "The position is balanced.";
        else if (score > -150) feedback = "You're at a slight disadvantage.";
        else if (score > -300) feedback = "You're at a clear disadvantage.";
        else feedback = "You're in a very weak position!";
        
        $('#feedback').text(feedback);
    }
});
