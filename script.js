$(document).ready(function() {
    var board = Chessboard('chess-board', {
        position: 'start',
        draggable: false,  // Disable dragging for click-to-move only
        pieceTheme: 'https://raw.githubusercontent.com/ornicar/lila/master/public/piece/alpha/{piece}.svg'
    });

    let game = new Chess();
    const stockfish = new Worker("js/stockfish.js");

    let selectedSquare = null; // Store the currently selected square for moving

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

    // Click-to-move logic with highlighting
    $('#chess-board').on('click', '.square-55d63', function() {
        const square = $(this).attr('data-square');
        if (!square) return;

        if (selectedSquare) {
            // Attempt to move from selectedSquare to the clicked square
            const move = game.move({
                from: selectedSquare,
                to: square,
                promotion: 'q'
            });

            if (move !== null) {
                // Move was valid; update the board and apply green highlight to the destination
                board.position(game.fen());
                clearHighlights();
                highlightSquare(square, 'target'); // Highlight target square green
                selectedSquare = null; // Reset selected square for the next turn
                stockfish.postMessage(`position fen ${game.fen()}`);
                stockfish.postMessage("go depth 10");
            } else {
                // If the move was invalid, keep the yellow highlight on the selected square
                clearHighlights('target'); // Clear only target highlights, not selected
                highlightSquare(selectedSquare, 'selected'); // Keep selected highlight
            }
        } else {
            // First click: select the square if it contains a piece of the current player's color
            const piece = game.get(square);
            if (piece && piece.color === game.turn()) {
                selectedSquare = square;
                clearHighlights(); // Clear any previous highlights
                highlightSquare(square, 'selected'); // Highlight selected square yellow
            } else {
                clearHighlights(); // Clear any accidental highlights if clicked on empty or invalid square
            }
        }
    });

    // Reset the board and clear all highlights when resetting the game
    $('#reset-button').on('click', function() {
        game.reset();
        board.start();
        stockfish.postMessage("position startpos");
        $('#feedback').text('');
        clearHighlights();  // Clear all highlights on reset
        selectedSquare = null;
    });

    // Function to apply highlight to either selected or target squares
    function highlightSquare(square, type) {
        if (type === 'selected') {
            $(`[data-square='${square}']`).addClass('highlighted-selected'); // Highlight yellow
        } else if (type === 'target') {
            $(`[data-square='${square}']`).addClass('highlighted-target'); // Highlight green
        }
    }

    // Function to clear specific or all highlights
    function clearHighlights(type) {
        if (type === 'selected') {
            $('.square-55d63').removeClass('highlighted-selected');
        } else if (type === 'target') {
            $('.square-55d63').removeClass('highlighted-target');
        } else {
            $('.square-55d63').removeClass('highlighted-selected highlighted-target');
        }
    }
});
