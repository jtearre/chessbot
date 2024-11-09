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

    stockfish.onmessage = function(event) {
        const message = event.data;
        console.log("Stockfish response:", message);

        // Execute Black's move
        if (message.startsWith("bestmove") && game.turn() === 'b') {
            const bestMove = message.split(" ")[1];
            if (bestMove && bestMove !== "(none)") {
                const move = game.move({ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4) });
                if (move !== null) {
                    addMoveToHistory();
                    board.position(game.fen());

                    // Trigger White's analysis after Black's move is made
                    stockfish.postMessage(`position fen ${game.fen()}`);
                    stockfish.postMessage("go depth 10");  // Analyze for White’s best move without executing it
                }
            }
        }
    
    
            // Capture and display the best move for White after Black's move
//        if (message.includes(" pv ")) {
//            const bestMoveForWhite = message.split(" pv ")[1].split(" ")[0];
//            console.log("Suggested move for White:", bestMoveForWhite);
//            $('#suggested-move').text(`Suggested move for White: ${bestMoveForWhite}`);
//        }

        // Collect move suggestions for White with scores
        if (message.includes("score cp") && message.includes(" pv ") && game.turn() === 'w') {
            console.log("Getting Move Sugg");
		const scoreMatch = message.match(/score cp (-?\d+)/);
            const moveSuggestionMatch = message.match(/ pv ([a-h][1-8][a-h][1-8])/);

            if (scoreMatch && moveSuggestionMatch) {
		  console.log("Storing Sugg");
		    
		    const score = parseInt(scoreMatch[1]);
                const move = moveSuggestionMatch[1];
                
                // Store the move and score for sorting
                whiteSuggestions.push({ move, score });
            }
        }

        // After Stockfish finishes evaluating White’s suggestions, display the top 3 moves for White
        if (message.startsWith("bestmove") && game.turn() === 'w') {

		  console.log("Displaying best 3");
		
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
	    
	    
        if (message.includes("score cp")) {
            const scoreMatch = message.match(/score cp (-?\d+)/);
            if (scoreMatch) {
                lastScore = parseInt(scoreMatch[1]);
		adjustScore = lastScore * .01;
                console.log("White Position Score:", adjustScore);
                $('#white-position-score').text(`White Position Score: ${adjustScore}`);
            }
        }

    
    };

    stockfish.postMessage("uci");

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

                // Trigger Stockfish to play as Black after White's move
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
        $('#suggested-move').text('Suggested move for White: None');
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
