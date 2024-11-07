$(document).ready(function() {
    var board = Chessboard('chess-board', {
        position: 'start',
        draggable: true,  // Enable dragging for drag-to-move
        pieceTheme: 'https://raw.githubusercontent.com/ornicar/lila/master/public/piece/alpha/{piece}.svg',
        onDrop: onDrop  // Function to handle drag moves
    });

    let game = new Chess();
    const stockfish = new Worker("js/stockfish.js");

    let selectedSquare = null; // Store the square of the selected piece

    stockfish.onmessage = function(event) {
        const message = event.data;
        
        if (message.startsWith("bestmove")) {
            const bestMove = message.split(" ")[1];
            if (bestMove && bestMove !== "(none)") {
                const move = game.move({ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4) });
                if (move !== null) board.position(game.fen());
            }
        }
    };

    stockfish.postMessage("uci");

    // Click-to-move with persistent highlighting
    $('#chess-board').on('click', '.square-55d63', function() {
        const square = $(this).attr('data-square');
        if (!square) return;

        if (selectedSquare) {
            // If a square is already selected, attempt a move
            const move = game.move({
                from: selectedSquare,
                to: square,
                promotion: 'q'
            });

            if (move !== null) {
                // Move was valid; update board and clear previous highlights
                board.position(game.fen());
                clearHighlights();
                stockfish.postMessage(`position fen ${game.fen()}`);
                stockfish.postMessage("go depth 10");
                selectedSquare = null;  // Reset selected square
            } else {
                // If invalid move, only clear the target highlight
                clearHighlights('target');
            }
        } else {
            // No square is selected; highlight this square if it contains a piece
            const piece = game.get(square);
            if (piece && piece.color === game.turn()) {
                selectedSquare = square;
                highlightSquare(square); // Highlight selected square
            } else {
                clearHighlights(); // Clear any accidental highlights
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
        clearHighlights(); // Clear any highlights after dragging
        stockfish.postMessage(`position fen ${game.fen()}`);
        stockfish.postMessage("go depth 10");
    }

    $('#reset-button').on('click', function() {
        game.reset();
        board.start();
        stockfish.postMessage("position startpos");
        $('#feedback').text('');
        clearHighlights();  // Clear highlight on reset
        selectedSquare = null;
    });

    // Function to apply highlight to a single square
    function highlightSquare(square) {
        clearHighlights(); // Remove any existing highlight
        $(`[data-square='${square}']`).addClass('highlighted'); // Highlight the selected or target square
    }

    // Function to clear all highlights
    function clearHighlights() {
        $('.square-55d63').removeClass('highlighted');
    }
});
