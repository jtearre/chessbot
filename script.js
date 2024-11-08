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
    let isEvaluating = false;  // Track if we're waiting for a final evaluation

    stockfish.onmessage = function(event) {
        const message = event.data;

        // Check if Stockfish is sending its final 'bestmove' response
        if (message.startsWith("bestmove")) {
            isEvaluating = false;  // Reset evaluation flag for next turn
            const bestMove = message.split(" ")[1];

            if (bestMove && bestMove !== "(none)") {
                const move = game.move({ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4) });
                if (move !== null) {
                    addMoveToHistory();
                    board.position(game.fen());

                    if (game.turn() === 'w') {
                        stockfish.postMessage(`position fen ${game.fen()}`);
                        stockfish.postMessage("go depth 10");
                    }
                }
            }
        }

        // Only process score feedback if Stockfish is in evaluation mode and it's White's turn
        if (message.includes("score cp") && game.turn() === 'w' && isEvaluating) {
            const scoreMatch = message.match(/score cp (-?\d+)/);
            if (scoreMatch) {
                let currentScore = parseInt(scoreMatch[1]);

                if (lastWhiteScore !== null) {
                    const scoreDiff = currentScore - lastWhiteScore;
                    console.log("White move feedback:", scoreDiff);
                    provideMoveFeedback(scoreDiff, true);  // Update White move feedback
                }
                console.log("White position feedback:", currentScore);
                providePositionFeedback(currentScore, true);  // Update White position feedback
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

        if (selectedSquare) {
            const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
            if (move !== null) {
                board.position(game.fen());
                clearHighlights();
                highlightSquare(square, 'target');
                selectedSquare = null;
                addMoveToHistory();

                // Trigger Stockfish evaluation for Black's move
                if (game.turn() === 'b') {
                    isEvaluating = true;  // Set evaluation flag
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

    // Provide White's move feedback based on score difference
    function provideMoveFeedback(scoreDiff, isWhite) {
        let feedback;
        if (scoreDiff > 30) feedback = "Good move!";
        else if (scoreDiff >= -30 && scoreDiff <= 30) feedback = "Fine move.";
        else feedback = "Bad move!";
        
        const feedbackId = isWhite ? '#white-move-feedback' : '#black-move-feedback';
        console.log(`Updating White move feedback:`, feedback);
        $(feedbackId).text(feedback);
    }

    // Provide White's position feedback
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
        $('#white-move-feedback').text('White Move Feedback');
        clearHighlights();
        selectedSquare = null;
        lastWhiteScore = null;
        isEvaluating = false;  // Reset evaluation flag
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
