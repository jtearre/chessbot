$(document).ready(function() {
    var board = Chessboard('chess-board', {
        position: 'start',
        draggable: true,
        pieceTheme: 'https://raw.githubusercontent.com/ornicar/lila/master/public/piece/alpha/{piece}.svg',
        onDrop: onDrop // Triggered when a piece is dropped
    });

    let game = new Chess();
    const stockfish = new Worker("js/stockfish.js");

    stockfish.onmessage = function(event) {
        console.log("Stockfish message received:", event.data);

        const message = event.data;

        // Capture Stockfish's evaluation
        if (message.startsWith("info depth")) {
            const scoreMatch = message.match(/score cp (-?\d+)/);
            if (scoreMatch) {
                const score = parseInt(scoreMatch[1]);
                provideFeedback(score);
            }
        }

        // Capture Stockfish's best move and apply it
        if (message.startsWith("bestmove")) {
            const bestMove = message.split(" ")[1];
            if (bestMove && bestMove !== "(none)") {
                console.log(`Stockfish move: ${bestMove}`);
                
                const move = game.move({ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4) });
                if (move !== null) {
                    board.position(game.fen());
                }
            }
        }
    };

    stockfish.postMessage("uci");

    function onDrop(source, target) {
        const move = game.move({
            from: source,
            to: target,
            promotion: 'q'
        });

        if (move === null) return 'snapback';

        board.position(game.fen());

        console.log(`Player move: ${source}-${target}`);
        stockfish.postMessage(`position fen ${game.fen()}`);
        stockfish.postMessage("go depth 10"); // Requesting an evaluation at depth 10
    }

    $('#reset-button').on('click', function() {
        console.log("Resetting game...");
        game.reset();
        board.start();
        stockfish.postMessage("position startpos");
    });

    // Function to interpret Stockfish's score and provide feedback
    function provideFeedback(score) {
        let feedback;
        if (score > 300) {
            feedback = "You're in a very strong position!";
        } else if (score > 150) {
            feedback = "You have a clear advantage.";
        } else if (score > 50) {
            feedback = "You have a slight advantage.";
        } else if (score > -50) {
            feedback = "The position is balanced.";
        } else if (score > -150) {
            feedback = "You're at a slight disadvantage.";
        } else if (score > -300) {
            feedback = "You're at a clear disadvantage.";
        } else {
            feedback = "You're in a very weak position!";
        }
        console.log("Feedback:", feedback);
        alert(feedback); // Display feedback in an alert
    }
});
