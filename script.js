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
                if (game.turn() === 'b') score = -score;
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

    // Handle click-to-move using jQuery
    $('#chess-board').on('click', '.square-55d63', function() {
        const square = $(this).attr('data-square');  // Retrieve the square using attr
        console.log("Square clicked:", square);

        if (!square) return; // Ensure we have a valid square

        if (selectedSquare) {
            console.log("Trying to move from", selectedSquare, "to", square);

            const move = game.move({
                from: selectedSquare,
                to: square,
                promotion: 'q'
            });

            if (move !== null) {
                console.log("Move successful:", move);
                board.position(game.fen());
                selectedSquare = null;  // Reset selected square after move
                stockfish.postMessage(`position fen ${game.fen()}`);
                stockfish.postMessage("go depth 10");
            } else {
                console.log("Invalid move, deselecting square");
                selectedSquare = null;
            }
        } else {
            const piece = game.get(square);
            if (piece && piece.color === game.turn()) {
                selectedSquare = square;
                console.log("Selected square:", selectedSquare);
            } else {
                console.log("No piece selected or wrong color");
            }
        }
    });

    $('#reset-button').on('click', function() {
        game.reset();
        board.start();
        stockfish.postMessage("position startpos");
        $('#feedback').text('');
        selectedSquare = null;  // Reset selection on reset
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
