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
    let skillLevel = 0;
    let lastWhiteScore = null;

    stockfish.onmessage = function(event) {
        const message = event.data;

        // Log Stockfish messages for debugging
        console.log("Stockfish response:", message);

        // Only handle Stockfish's final 'bestmove' response for Black's turn
        if (message.startsWith("bestmove")) {
            const bestMove = message.split(" ")[1];
            if (bestMove && bestMove !== "(none)" && game.turn() === 'b') {
                console.log("Stockfish (Black) moves:", bestMove);
                const move = game.move({ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4) });
                if (move !== null) {
                    addMoveToHistory();
                    board.position(game.fen());
                }
            }
        }

        // Process only position feedback for White's turn
        if (message.includes("score cp") && game.turn() === 'w') {
            const scoreMatch = message.match(/score cp (-?\d+)/);
            if (scoreMatch) {
                let currentScore = parseInt(scoreMatch[1]);
                console.log("White position feedback:", currentScore);
                providePositionFeedback(currentScore, true);
                lastWhiteScore = currentScore;
            }
        }
    };

    stockfish.postMessage("uci");

    $('#difficulty').on('change', function() {
        skillLevel = parseInt($(this).val());
        stockfish.postMessage(`setoption name Skill Level value ${skillLevel}`);
    });

    stockfish.postMessage(`setoption name Skill Level value ${skillLevel}`);

    $('#chess-board').on('click', '.square-55d63', function() {
        const square = $(this).attr('data-square');
        if (!square) return;

        const piece = game.get(square);

        // White's move handling
        if (selectedSquare) {
            const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
            if (move !== null) {
                board.position(game.fen());
                clearHighlights();
                highlightSquare(square, 'target');
                selectedSquare = null;
                addMoveToHistory();

                // Trigger Stockfish only for Black’s turn after White's move
                if (game.turn() === 'b') {
                    console.log("White moved, now Stockfish (Black) will move.");
                    stockfish.postMessage(`position fen ${game.fen()}`);
                    stockfish.postMessage("go depth 10");
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

    // Provide feedback for White's position based on score
    function providePositionFeedback(score, isWhite) {
        let feedback;
        if (score > 300) feedback = "Very strong position!";
        else if (score > 150) feedback = "Clear advantage.";
        else if (score > 50) feedback = "Slight advantage.";
        else if (score > -50) feedback = "Balanced position.";
        else if (score > -150) feedback = "Slight disadvantage.";
        else if (score > -300) feedback = "Clear disadvantage.";
        else feedback = "Very weak position!";
        
        const feedbackId = isWhite ? '#white-position-feedback' : '#black-position-feedback';
        console.log(`Updating White position feedback:`, feedback);
        $(feedbackId).text(feedback);
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
        $('#white-position-feedback').text('White Position Feedback');
        clearHighlights();
        selectedSquare = null;
        lastWhiteScore = null;
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
});
