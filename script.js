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
            // Attempt a move from the selected square to the clicked square
            const move = game.move({
                from: selectedSquare,
                to: square,
                promotion: 'q'
            });

            if (move !== null) {
                // Move was valid; update the board and clear previous highlights
                board.position(game.fen());
                clearHighlights();
                stockfish.postMessage(`position fen ${game.fen()}`);
                stockfish.postMessage("go depth 10");
                selectedSquare = null;  // Reset selected square
            } else {
                // Invalid move; keep the highlight on the selected square
                highlightSquare(selectedSquare, 'selected');
            }
        } else {
            // No square is currently selected; select this square if it contains a piece
            const piece = game.get(square);
            if (piece && piece.color === game.turn()) {
                selectedSquare = square;
                highlightSquare(square, 'selected'); // Highlight the selected square
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
        clearHighlights(); // Clear all highlights after a successful drag move
        stockfish.postMessage(`position fen ${game.fen()}`);
        stockfish.postMessage("go depth 10");
    }

    $('#reset-button').on('click', function() {
        game.reset();
        board.start();
        stockfish.postMessage("position startpos");
        $('#feedback').text('');
        clearHighlights();  // Clear all highlights on reset
        selectedSquare = null;
    });

    // Function to highlight selected or target squares
    function highlightSquare(square, type) {
        if (type === 'selected') {
            clearHighlights('selected'); // Remove existing selected highlights
            $(`[data-square='${square}']`).addClass('highlighted-selected'); // Highlight the selected square
        } else if (type === 'target') {
            clearHighlights('target'); // Remove existing target highlights
            $(`[data-square='${square}']`).addClass('highlighted-target'); // Highlight the target square
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
