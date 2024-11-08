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
    let lastScore = null;

    stockfish.onmessage = function(event) {
        const message = event.data;

        // Parse Stockfish's score for move-by-move feedback
        if (message.includes("score cp")) {
            const scoreMatch = message.match(/score cp (-?\d+)/);
            if (scoreMatch) {
                let currentScore = parseInt(scoreMatch[1]);
                if (game.turn() === 'b') currentScore = -currentScore;

                // Provide move feedback based on score difference
                if (lastScore !== null) {
                    const scoreDiff = currentScore - lastScore;
                    provideMoveFeedback(scoreDiff);
                }
                lastScore = currentScore; // Update last score
            }
        }

        // Stockfish move response handling
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
                stockfish.postMessage(`position fen ${game.fen()}`);
                stockfish.postMessage("go depth 10");
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

    // Provide move feedback based on score difference and update #move-feedback element
    function provideMoveFeedback(scoreDiff) {
        let feedback;
        if (scoreDiff > 30) feedback = "Good move!";
        else if (scoreDiff >= -30 && scoreDiff <= 30) feedback = "Fine move.";
        else feedback = "Bad move!";
        
        $('#move-feedback').text(feedback); // Update only move feedback
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
        $('#position-feedback').text(''); // Clear position feedback
        $('#move-feedback').text(''); // Clear move feedback
        clearHighlights();
        selectedSquare = null;
        lastScore = null;
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

    // Provide position feedback and update #position-feedback element
    function provideFeedback(score) {
        let feedback;
        if (score > 300) feedback = "You're in a very strong position!";
        else if (score > 150) feedback = "You have a clear advantage.";
        else if (score > 50) feedback = "You have a slight advantage.";
        else if (score > -50) feedback = "The position is balanced.";
        else if (score > -150) feedback = "You're at a slight disadvantage.";
        else if (score > -300) feedback = "You're at a clear disadvantage.";
        else feedback = "You're in a very weak position!";
        
        $('#position-feedback').text(feedback); // Update only position feedback
    }
});
