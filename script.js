$(document).ready(function() {
    var board = Chessboard('chess-board', {
        position: 'start',
        draggable: true,  // Enable dragging for drag-to-move
        pieceTheme: 'https://raw.githubusercontent.com/ornicar/lila/master/public/piece/alpha/{piece}.svg',
        onDrop: onDrop  // Function to handle moves
    });

    let game = new Chess();
    const stockfish = new Worker("js/stockfish.js");

    let selectedSquare = null; // Store the square of the selected piece
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

    // Click-to-move with square highlighting
    $('#chess-board').on('click', '.square-55d63', function() {
        const square = $(this).attr('data-square');
        if (!square) return;

        if (selectedSquare) {
            // Highlight the destination square temporarily
            highlightSquare(square, 'target'); 

            // Attempt to move from selectedSquare to the clicked square
            const move = game.move({
                from: selectedSquare,
                to: square,
                promotion: 'q'
            });

            if (move !== null) {
                // Move was valid; update board and clear highlights
                board.position(game.fen());
                clearHighlight();  
                selectedSquare = null;  // Clear selected square after move
                stockfish.postMessage(`position fen ${game.fen()}`);
                stockfish.postMessage("go depth 10");
            } else {
                // If invalid move, only clear the destination highlight
                clearHighlight('target');
            }
        } else {
            // If no square is selected, select this square if it has a piece
            const piece = game.get(square);
            if (piece && piece.color === game.turn()) {
                selectedSquare = square;
                highlightSquare(square, 'selected'); // Highlight selected square
            } else {
                clearHighlight(); // Clear any accidental highlights
            }
        }
    });

    // Drag-to-move handling
    function onDrop(source, target) {
        const move = game.move({
            from: source,
            to: target,
            promotion: 'q'
        });

        if (move === null) return 'snapback';

        board.position(game.fen());
        clearHighlight(); // Clear any highlights after dragging
        stockfish.postMessage(`position fen ${game.fen()}`);
        stockfish.postMessage("go depth 10");
    }

    $('#reset-button').on('click', function() {
        game.reset();
        board.start();
        stockfish.postMessage("position startpos");
        $('#feedback').text('');
        clearHighlight();  // Clear highlight on reset
        selectedSquare = null;
    });

    // Function to apply highlight
    function highlightSquare(square, type) {
        // Remove existing highlights before adding a new one
        if (type === 'selected') {
            clearHighlight('selected'); 
            $(`[data-square='${square}']`).addClass('highlighted-selected'); // Highlight for selected piece
        } else if (type === 'target') {
            clearHighlight('target');
            $(`[data-square='${square}']`).addClass('highlighted-target'); // Highlight for destination
        }
    }

    // Function to clear highlights from all or specific type
    function clearHighlight(type) {
        if (type === 'selected') {
            $('.square-55d63').removeClass('highlighted-selected');
        } else if (type === 'target') {
            $('.square-55d63').removeClass('highlighted-target');
        } else {
            $('.square-55d63').removeClass('highlighted-selected highlighted-target');
        }
    }

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
