$(document).ready(function() {
    var board = Chessboard('chess-board', {
        position: 'start',
        draggable: false,
        pieceTheme: 'https://raw.githubusercontent.com/ornicar/lila/master/public/piece/alpha/{piece}.svg'
    });

    let game = new Chess();
    const stockfish = new Worker("js/stockfish.js");

    let selectedSquare = null;
    let moveHistory = [];
    let currentMoveIndex = 0;
    let whiteSuggestions = [];  // Store White's move suggestions

    stockfish.onmessage = function(event) {
        const message = event.data;
        console.log("Stockfish response:", message);

        // Collect move suggestions for White with scores
        if (message.includes("score cp") && message.includes(" pv ") && game.turn() === 'w') {
            const scoreMatch = message.match(/score cp (-?\d+)/);
            const moveSuggestionMatch = message.match(/ pv ([a-h][1-8][a-h][1-8])/);

            if (scoreMatch && moveSuggestionMatch) {
                const score = parseInt(scoreMatch[1]);
                const move = moveSuggestionMatch[1];
                
                // Store the move and score for sorting
                whiteSuggestions.push({ move, score });
            }
        }

        // After Stockfish finishes evaluating, find and display the top 3 moves for White
        if (message.startsWith("bestmove") && game.turn() === 'b') {
            // Sort the suggestions in descending order (best score first for White)
            whiteSuggestions.sort((a, b) => b.score - a.score);

            // Get the top 3 suggestions
            const topSuggestions = whiteSuggestions.slice(0, 3);

            // Display the top 3 suggested moves
            const suggestionsText = topSuggestions.map(
                (suggestion, index) => `Move ${index + 1}: ${suggestion.move} (Score: ${suggestion.score})`
            ).join("<br>");

            $('#suggested-moves').html(`Top 3 moves for White:<br>${suggestionsText}`);

            // Clear suggestions for the next round
            whiteSuggestions = [];
        }
    };

    function triggerBlackMove() {
        // Trigger Stockfish to play as Black after White's move
        stockfish.postMessage(`position fen ${game.fen()}`);
        stockfish.postMessage("go depth 10");
    }

    function triggerWhiteAnalysis() {
        // Trigger analysis for White’s best moves
        stockfish.postMessage(`position fen ${game.fen()}`);
        stockfish.postMessage("go depth 10");  // Analyze for White’s best moves without executing them
    }

    $('#chess-board').on('click', '.square-55d63', function() {
        const square = $(this).attr('data-square');
        if (!square) return;

        const piece = game.get(square);

        if (selectedSquare) {
            const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
            if (move !== null) {
                board.position(game.fen());
                clearHighlights();
                highlightSquare(square, 'target');
                selectedSquare = null;
                addMoveToHistory();

                if (game.turn() === 'b') {
                    triggerBlackMove();
                }
            } else if (piece && piece.color === game.turn()) {
                selectedSquare = square;
                clearHighlights();
                highlightSquare(square, 'selected');
            } else {
                clearHighlights('target');
                highlightSquare(selectedSquare, 'selected');
            }
        } else {
            if (piece && piece.color === game.turn()) {
                selectedSquare = square;
                clearHighlights();
                highlightSquare(square, 'selected');
            } else {
                clearHighlights();
            }
        }
    });

    function addMoveToHistory() {
        if (currentMoveIndex < moveHistory.length - 1) {
            moveHistory = moveHistory.slice(0, currentMoveIndex + 1);
        }
        moveHistory.push(game.fen());
        currentMoveIndex = moveHistory.length - 1;
    }

    $('#back-button').on('click', function() {
        if (currentMoveIndex > 0) {
            currentMoveIndex--;
            game.load(moveHistory[currentMoveIndex]);
            board.position(game.fen());
            clearHighlights();
        }
    });

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
        $('#suggested-moves').html('Top 3 moves for White: None');
        clearHighlights();
        selectedSquare = null;
    });

    function highlightSquare(square, type) {
        if (type === 'selected') {
            $(`[data-square='${square}']`).addClass('highlighted-selected');
        } else if (type === 'target') {
            $(`[data-square='${square}']`).addClass('highlighted-target');
        }
    }

    function clearHighlights(type) {
        if (type === 'selected') {
            $('.square-55d63').removeClass('highlighted-selected');
        } else if (type === 'target') {
            $('.square-55d63').removeClass('highlighted-target');
        } else {
            $('.square-55d63').removeClass('highlighted-selected highlighted-target');
        }
    }

    // Trigger White analysis right after the Black move
    stockfish.onmessage = function(event) {
        const message = event.data;
        console.log("Stockfish response:", message);

        if (message.startsWith("bestmove") && game.turn() === 'w') {
            triggerWhiteAnalysis();
        }
    };
});
