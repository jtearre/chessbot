$(document).ready(function() {
    var board = Chessboard('chess-board', {
        position: 'start',
        draggable: false,  // Disable dragging for click-to-move only
        pieceTheme: 'https://raw.githubusercontent.com/ornicar/lila/master/public/piece/alpha/{piece}.svg'
    });

    let game = new Chess();
    const stockfish = new Worker("js/stockfish.js");

    let selectedSquare = null; // Store the currently selected square for moving
    let moveHistory = []; // Array to store the history of moves
    let currentMoveIndex = 0; // Tracks current position in history
    let skillLevel = 0; // Default skill level for Stockfish (easy)

    stockfish.onmessage = function(event) {
        const message = event.data;

        // Handle Stockfish move response
        if (message.startsWith("bestmove")) {
            const bestMove = message.split(" ")[1];
            if (bestMove && bestMove !== "(none)") {
                const move = game.move({ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4) });
                if (move !== null) {
                    addMoveToHistory();
                    board.position(game.fen());
                }
            }
        }
    };

    stockfish.postMessage("uci");

    // Update Stockfish skill level based on dropdown selection
    $('#difficulty').on('change', function() {
        skillLevel = parseInt($(this).val());
        stockfish.postMessage(`setoption name Skill Level value ${skillLevel}`);
    });

    // Initialize the skill level at startup
    stockfish.postMessage(`setoption name Skill Level value ${skillLevel}`);

    // Click-to-move with persistent highlighting
    $('#chess-board').on('click', '.square-55d63', function() {
        const square = $(this).attr('data-square');
        if (!square) return;

        const piece = game.get(square);

        if (selectedSquare) {
            // If a piece is selected, attempt a move
            const move = game.move({
                from: selectedSquare,
                to: square,
                promotion: 'q'
            });

            if (move !== null) {
                // Move was valid; update board, apply green highlight to target, reset selection, and save move
                board.position(game.fen());
                clearHighlights();
                highlightSquare(square, 'target'); // Highlight target square green
                selectedSquare = null; // Reset selected square
                addMoveToHistory(); // Add the move to history and update index
                stockfish.postMessage(`position fen ${game.fen()}`);
                stockfish.postMessage("go depth 10");
            } else if (piece && piece.color === game.turn()) {
                // If clicked on another of player's pieces, switch selected piece
                selectedSquare = square;
                clearHighlights();
                highlightSquare(square, 'selected'); // Highlight the new selected square yellow
            } else {
                // Invalid move; keep the original selected piece highlighted
                clearHighlights('target');
                highlightSquare(selectedSquare, 'selected');
            }
        } else {
            // First click to select a piece
            if (piece && piece.color === game.turn()) {
                selectedSquare = square;
                clearHighlights();
                highlightSquare(square, 'selected'); // Highlight selected square yellow
            } else {
                clearHighlights(); // Clear accidental highlights on invalid click
            }
        }
    });

    // Add move to history and truncate future moves if branching
    function addMoveToHistory() {
        // Remove any moves after the current index if we're branching
        if (currentMoveIndex < moveHistory.length - 1) {
            moveHistory = moveHistory.slice(0, currentMoveIndex + 1);
        }
        moveHistory.push(game.fen());
        currentMoveIndex = moveHistory.length - 1;
    }

    // Navigate backward through move history
    $('#back-button').on('click', function() {
        if (currentMoveIndex > 0) {
            currentMoveIndex--;
            game.load(moveHistory[currentMoveIndex]);
            board.position(game.fen());
            clearHighlights();
        }
    });

    // Navigate forward through move history
    $('#forward-button').on('click', function() {
        if (currentMoveIndex < moveHistory.length - 1) {
            currentMoveIndex++;
            game.load(moveHistory[currentMoveIndex]);
            board.position(game.fen());
            clearHighlights();
        }
    });

    $('#reset-button').on('click', function() {
        game.reset();
        board.start();
        moveHistory = [game.fen()];
        currentMoveIndex = 0;
        stockfish.postMessage("position startpos");
        $('#feedback').text('');
        clearHighlights();  // Clear all highlights on reset
        selectedSquare = null;
    });

    // Function to highlight selected or target squares
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

    // Provide general feedback based on Stockfish evaluation
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
