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
    let lastScore = null; // Track the last position score

    stockfish.onmessage = function(event) {
        const message = event.data;
        console.log("Stockfish response:", message);

        // Handle best move to trigger Stockfish move for Black and display score
        if (message.startsWith("bestmove")) {
            const bestMove = message.split(" ")[1];
            if (bestMove && bestMove !== "(none)" && game.turn() === 'b') {
                const move = game.move({ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4) });
                if (move !== null) {
                    addMoveToHistory();
                    board.position(game.fen());
                }
            }
            
            // Display Black perspective score if lastScore was recorded
            if (lastScore !== null) {
                displayPositionScore(lastScore);  // Display score transformed to Black's perspective
                lastScore = null;  // Reset for next turn
            }
        }

        // Capture the score from the last evaluation before the best move
        if (message.includes("score cp") && game.turn() === 'w') {
            const scoreMatch = message.match(/score cp (-?\d+)/);
            if (scoreMatch) {
                lastScore = parseInt(scoreMatch[1]);
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

    // Display the score from Black's perspective
    function displayPositionScore(score) {
        // Transform score to Black's perspective
        const blackScore = score * -0.1;

        let interpretedScore;
        if (blackScore >= 3) interpretedScore = "Black is in a very strong position";
        else if (blackScore >= 1) interpretedScore = "Black has a moderate advantage";
        else if (blackScore > -1) interpretedScore = "The position is balanced";
        else if (blackScore > -3) interpretedScore = "White has a moderate advantage";
        else interpretedScore = "White is in a very strong position";

        console.log(`Transformed Score (Black's perspective): ${blackScore} (Interpreted: ${interpretedScore})`);
        $('#white-position-score').text(`Black Position Score: ${blackScore.toFixed(1)} (${interpretedScore})`);
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
        $('#white-position-score').text('Black Position Score: 0');
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
});
