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

    stockfish.onmessage = function(event) {
        const message = event.data;
        
        // Log every Stockfish message for debugging
        console.log("Received from Stockfish:", message);

        // Check for best move to trigger Stockfish move for Black
        if (message.startsWith("bestmove")) {
            const bestMove = message.split(" ")[1];
            if (bestMove && bestMove !== "(none)" && game.turn() === 'b') {
                const move = game.move({ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4) });
                if (move !== null) {
                    addMoveToHistory();
                    board.position(game.fen());
                }
            }
        }

        // Look for position score after White's move
        if (message.includes("score cp")) {
            
		console.log("SCORE FOUND!");

		const scoreMatch = message.match(/score cp (-?\d+)/);
            if (scoreMatch) {
                const currentScore = parseInt(scoreMatch[1]);
                console.log("White Position Score:", currentScore);
                $('#white-position-score').text(`White Position Score: ${currentScore}`);
            } else {
                console.log("No score found in message.");
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
        $('#white-position-score').text('White Position Score: 0');
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
