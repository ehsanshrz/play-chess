"use strict";

(() => {
  const PIECES = {
    K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
    k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟"
  };
  const VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
  const translations = {
    en: {
      eyebrow: "A little friendly competition", title: "Your move.", localGame: "Local game",
      opponent: "Chess Bot", opponentCaption: "Ready for a game", you: "You", yourTurn: "Your turn",
      game: "THE GAME", playChess: "Play chess", playAs: "Play as", white: "White", black: "Black",
      newGame: "New game", undo: "Undo", notation: "NOTATION", moves: "Move history",
      movesEmpty: "Your moves will appear here.", note: "A thoughtful opponent, right in your browser.",
      footer: "Take your time. The board isn't going anywhere.", promote: "Choose a piece",
      statusYour: "Your turn — make a move.", statusBot: "The bot is thinking…",
      statusBotTurn: "The bot is to move.", statusCheck: "Check! Your turn.",
      statusBotCheck: "Check! The bot is to move.", statusYouWin: "Checkmate — you win!",
      statusBotWins: "Checkmate — the bot wins.", statusDraw: "Stalemate — it's a draw.",
      captionBot: "Thinking…", captionCheck: "You are in check", captionBotCheck: "Bot is in check",
      captionWon: "You won", captionLost: "Game over", captionDraw: "Draw",
      undoDisabled: "No moves to undo", undoEnabled: "Undo last turn",
      langLabel: "Change language", boardLabel: "Chess board", starts: "New game started"
    },
    fa: {
      eyebrow: "یک رقابت دوستانه", title: "نوبت شماست.", localGame: "بازی محلی",
      opponent: "ربات شطرنج", opponentCaption: "برای بازی آماده‌ام", you: "شما", yourTurn: "نوبت شماست",
      game: "بازی", playChess: "شطرنج بازی کنید", playAs: "بازی با مهره‌های", white: "سفید", black: "سیاه",
      newGame: "بازی جدید", undo: "بازگشت", notation: "حرکت‌ها", moves: "تاریخچهٔ بازی",
      movesEmpty: "حرکت‌های شما اینجا نمایش داده می‌شود.", note: "حریف باهوش، همین‌جا در مرورگر شما.",
      footer: "با آرامش بازی کنید؛ صفحه منتظر شماست.", promote: "مهرهٔ خود را انتخاب کنید",
      statusYour: "نوبت شماست — حرکت کنید.", statusBot: "ربات در حال فکر کردن است…",
      statusBotTurn: "نوبت ربات است.", statusCheck: "کیش! نوبت شماست.",
      statusBotCheck: "کیش! نوبت ربات است.", statusYouWin: "کیش و مات — شما برنده شدید!",
      statusBotWins: "کیش و مات — ربات برنده شد.", statusDraw: "پات — بازی مساوی شد.",
      captionBot: "در حال فکر کردن…", captionCheck: "شاه شما در کیش است",
      captionBotCheck: "شاه ربات در کیش است", captionWon: "شما برنده شدید", captionLost: "بازی تمام شد",
      captionDraw: "مساوی", undoDisabled: "حرکتی برای بازگشت نیست", undoEnabled: "بازگشت به حرکت قبل",
      langLabel: "تغییر زبان", boardLabel: "صفحهٔ شطرنج", starts: "بازی جدید آغاز شد"
    }
  };
  const files = "abcdefgh";
  const boardElement = document.getElementById("board");
  const statusElement = document.getElementById("status");
  const movesElement = document.getElementById("moves");
  const moveCountElement = document.getElementById("move-count");
  const playerCaption = document.getElementById("player-caption");
  const indicator = document.getElementById("turn-indicator");
  const undoButton = document.getElementById("undo");
  const sideSelect = document.getElementById("side");
  const promotionLayer = document.getElementById("promotion");
  const promotionChoices = document.getElementById("promotion-choices");
  let language = "en";
  let humanSide = "w";
  let game = newGame();
  let selected = null;
  let legalFromSelected = [];
  let thinking = false;
  let finished = false;
  let history = [];
  let moveLog = [];
  let lastMove = null;

  function newGame() {
    return {
      board: [
        ["r", "n", "b", "q", "k", "b", "n", "r"],
        Array(8).fill("p"),
        ...Array.from({ length: 4 }, () => Array(8).fill(null)),
        Array(8).fill("P"),
        ["R", "N", "B", "Q", "K", "B", "N", "R"]
      ],
      turn: "w", castle: { wK: true, wQ: true, bK: true, bQ: true },
      ep: null, halfmove: 0, fullmove: 1
    };
  }

  function cloneState(state) {
    return {
      board: state.board.map(row => row.slice()), turn: state.turn,
      castle: { ...state.castle }, ep: state.ep && [...state.ep],
      halfmove: state.halfmove, fullmove: state.fullmove
    };
  }

  function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
  function colorOf(piece) { return piece === piece.toUpperCase() ? "w" : "b"; }
  function enemy(color) { return color === "w" ? "b" : "w"; }
  function squareName([r, c]) { return `${files[c]}${8 - r}`; }

  function locateKing(state, color) {
    const king = color === "w" ? "K" : "k";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) if (state.board[r][c] === king) return [r, c];
    }
    return null;
  }

  function isAttacked(state, r, c, byColor) {
    const b = state.board;
    const pawnRow = r + (byColor === "w" ? 1 : -1);
    for (const dc of [-1, 1]) {
      const pc = c + dc;
      if (inBounds(pawnRow, pc) && b[pawnRow][pc] === (byColor === "w" ? "P" : "p")) return true;
    }
    for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && b[nr][nc] === (byColor === "w" ? "N" : "n")) return true;
    }
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      let nr = r + dr, nc = c + dc, distance = 1;
      while (inBounds(nr, nc)) {
        const piece = b[nr][nc];
        if (piece) {
          if (colorOf(piece) === byColor) {
            const type = piece.toLowerCase();
            if (type === "q" || (type === "r" && (dr === 0 || dc === 0)) ||
                (type === "b" && dr !== 0 && dc !== 0) || (type === "k" && distance === 1)) return true;
          }
          break;
        }
        nr += dr; nc += dc; distance++;
      }
    }
    return false;
  }

  function inCheck(state, color) {
    const king = locateKing(state, color);
    return !king || isAttacked(state, king[0], king[1], enemy(color));
  }

  function pseudoMoves(state, r, c) {
    const piece = state.board[r][c];
    if (!piece || colorOf(piece) !== state.turn) return [];
    const color = state.turn, type = piece.toLowerCase(), moves = [];
    const add = (nr, nc, extra = {}) => {
      if (!inBounds(nr, nc)) return false;
      const target = state.board[nr][nc];
      if (target && colorOf(target) === color) return false;
      if (target && target.toLowerCase() === "k") return false;
      moves.push({ from: [r, c], to: [nr, nc], ...extra });
      return !target;
    };
    if (type === "p") {
      const direction = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;
      const promotionRow = color === "w" ? 0 : 7;
      const one = r + direction;
      if (inBounds(one, c) && !state.board[one][c]) {
        moves.push({ from: [r, c], to: [one, c], ...(one === promotionRow ? { promotion: true } : {}) });
        const two = r + direction * 2;
        if (r === startRow && !state.board[two][c]) moves.push({ from: [r, c], to: [two, c], double: true });
      }
      for (const dc of [-1, 1]) {
        const nr = r + direction, nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        if (state.board[nr][nc] && colorOf(state.board[nr][nc]) !== color && state.board[nr][nc].toLowerCase() !== "k") {
          moves.push({ from: [r, c], to: [nr, nc], ...(nr === promotionRow ? { promotion: true } : {}) });
        } else if (state.ep && state.ep[0] === nr && state.ep[1] === nc) {
          moves.push({ from: [r, c], to: [nr, nc], enPassant: true });
        }
      }
    } else if (type === "n") {
      for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) add(r + dr, c + dc);
    } else if (type === "k") {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) add(r + dr, c + dc);
      const homeRow = color === "w" ? 7 : 0, enemyColor = enemy(color);
      if (r === homeRow && c === 4 && !inCheck(state, color)) {
        const kingRight = color === "w" ? "wK" : "bK";
        const queenRight = color === "w" ? "wQ" : "bQ";
        const rook = color === "w" ? "R" : "r";
        if (state.castle[kingRight] && state.board[homeRow][7] === rook &&
            !state.board[homeRow][5] && !state.board[homeRow][6] &&
            !isAttacked(state, homeRow, 5, enemyColor) && !isAttacked(state, homeRow, 6, enemyColor)) {
          moves.push({ from: [r, c], to: [homeRow, 6], castle: "king" });
        }
        if (state.castle[queenRight] && state.board[homeRow][0] === rook &&
            !state.board[homeRow][1] && !state.board[homeRow][2] && !state.board[homeRow][3] &&
            !isAttacked(state, homeRow, 3, enemyColor) && !isAttacked(state, homeRow, 2, enemyColor)) {
          moves.push({ from: [r, c], to: [homeRow, 2], castle: "queen" });
        }
      }
    } else {
      const directions = type === "r" ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
        : type === "b" ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
          : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (const [dr, dc] of directions) {
        let nr = r + dr, nc = c + dc;
        while (inBounds(nr, nc)) {
          const canContinue = add(nr, nc);
          if (!canContinue) break;
          nr += dr; nc += dc;
        }
      }
    }
    return moves;
  }

  function applyMove(state, move) {
    const next = cloneState(state);
    const [r, c] = move.from, [nr, nc] = move.to;
    const piece = next.board[r][c], captured = move.enPassant ? next.board[r][nc] : next.board[nr][nc];
    next.board[r][c] = null;
    if (move.enPassant) next.board[r][nc] = null;
    if (move.castle === "king") {
      next.board[nr][5] = next.board[nr][7]; next.board[nr][7] = null;
    } else if (move.castle === "queen") {
      next.board[nr][3] = next.board[nr][0]; next.board[nr][0] = null;
    }
    next.board[nr][nc] = move.promotion
      ? (state.turn === "w" ? move.promoteTo || "Q" : (move.promoteTo || "Q").toLowerCase())
      : piece;
    if (piece.toLowerCase() === "k") {
      next.castle[state.turn + "K"] = false; next.castle[state.turn + "Q"] = false;
    }
    if (piece.toLowerCase() === "r") {
      if (r === 7 && c === 0) next.castle.wQ = false;
      if (r === 7 && c === 7) next.castle.wK = false;
      if (r === 0 && c === 0) next.castle.bQ = false;
      if (r === 0 && c === 7) next.castle.bK = false;
    }
    if (captured && captured.toLowerCase() === "r") {
      if (nr === 7 && nc === 0) next.castle.wQ = false;
      if (nr === 7 && nc === 7) next.castle.wK = false;
      if (nr === 0 && nc === 0) next.castle.bQ = false;
      if (nr === 0 && nc === 7) next.castle.bK = false;
    }
    next.ep = piece.toLowerCase() === "p" && Math.abs(nr - r) === 2 ? [(nr + r) / 2, c] : null;
    next.halfmove = piece.toLowerCase() === "p" || captured ? 0 : next.halfmove + 1;
    if (state.turn === "b") next.fullmove++;
    next.turn = enemy(state.turn);
    return next;
  }

  function legalMoves(state, r, c) {
    return pseudoMoves(state, r, c).filter(move => !inCheck(applyMove(state, move), state.turn));
  }

  function allLegalMoves(state) {
    const moves = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (state.board[r][c] && colorOf(state.board[r][c]) === state.turn) moves.push(...legalMoves(state, r, c));
    }
    return moves;
  }

  function evaluate(state, botSide) {
    let score = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece) continue;
      const color = colorOf(piece), type = piece.toLowerCase();
      let value = VALUES[type];
      if (type === "p") value += (color === "w" ? 6 - r : r - 1) * 6;
      if (type === "n" || type === "b") value += 10 - (Math.abs(3.5 - r) + Math.abs(3.5 - c)) * 4;
      score += (color === botSide ? 1 : -1) * value;
    }
    return score;
  }

  function search(state, depth, alpha, beta, botSide) {
    const moves = allLegalMoves(state);
    if (!moves.length) return inCheck(state, state.turn)
      ? (state.turn === botSide ? -100000 - depth : 100000 + depth)
      : 0;
    if (depth === 0) return evaluate(state, botSide);
    const maximizing = state.turn === botSide;
    moves.sort((a, b) => {
      const scoreMove = move => {
        const target = state.board[move.to[0]][move.to[1]];
        return (target ? VALUES[target.toLowerCase()] : 0) + (move.promotion ? 800 : 0);
      };
      return scoreMove(b) - scoreMove(a);
    });
    let best = maximizing ? -Infinity : Infinity;
    for (const move of moves) {
      const score = search(applyMove(state, move), depth - 1, alpha, beta, botSide);
      if (maximizing) { best = Math.max(best, score); alpha = Math.max(alpha, best); }
      else { best = Math.min(best, score); beta = Math.min(beta, best); }
      if (beta <= alpha) break;
    }
    return best;
  }

  function chooseBotMove(state) {
    const moves = allLegalMoves(state), botSide = state.turn;
    if (!moves.length) return null;
    moves.sort((a, b) => {
      const captureValue = move => {
        const target = state.board[move.to[0]][move.to[1]];
        return (target ? VALUES[target.toLowerCase()] : 0) + (move.promotion ? 800 : 0);
      };
      return captureValue(b) - captureValue(a);
    });
    let bestScore = -Infinity, bestMoves = [];
    for (const move of moves) {
      const score = search(applyMove(state, move), 2, -Infinity, Infinity, botSide);
      if (score > bestScore) { bestScore = score; bestMoves = [move]; }
      else if (score === bestScore) bestMoves.push(move);
    }
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  function notation(move, stateBefore) {
    if (move.castle) return move.castle === "king" ? "O-O" : "O-O-O";
    const piece = stateBefore.board[move.from[0]][move.from[1]];
    const capture = stateBefore.board[move.to[0]][move.to[1]] || move.enPassant;
    return `${piece.toLowerCase() === "p" ? (capture ? files[move.from[1]] : "") : piece.toUpperCase()}${capture ? "×" : "–"}${squareName(move.to)}${move.promotion ? "=Q" : ""}`;
  }

  function getOutcome(state) {
    const moves = allLegalMoves(state);
    if (moves.length) return null;
    if (!inCheck(state, state.turn)) return "draw";
    return state.turn === humanSide ? "bot" : "human";
  }

  function recordMove(move) {
    const before = cloneState(game);
    const text = notation(move, before);
    history.push({ game: before, log: moveLog.slice(), lastMove: lastMove && { ...lastMove } });
    game = applyMove(game, move);
    moveLog.push(text);
    lastMove = { from: move.from, to: move.to };
    selected = null; legalFromSelected = [];
    render();
    const outcome = getOutcome(game);
    if (outcome) { finished = true; renderStatus(outcome); return; }
    if (game.turn !== humanSide) {
      thinking = true; renderStatus(); renderBoard();
      window.setTimeout(() => {
        const botMove = chooseBotMove(game);
        thinking = false;
        if (botMove) recordMove(botMove);
        else { finished = true; render(); }
      }, 180);
    }
  }

  function onSquareClick(r, c) {
    if (finished || thinking || game.turn !== humanSide) return;
    const piece = game.board[r][c];
    if (selected) {
      const move = legalFromSelected.find(candidate => candidate.to[0] === r && candidate.to[1] === c);
      if (move) {
        if (move.promotion) { showPromotion(move); return; }
        recordMove(move); return;
      }
    }
    if (piece && colorOf(piece) === humanSide) {
      selected = [r, c]; legalFromSelected = legalMoves(game, r, c);
    } else {
      selected = null; legalFromSelected = [];
    }
    renderBoard();
  }

  function showPromotion(move) {
    promotionChoices.replaceChildren();
    for (const type of ["Q", "R", "B", "N"]) {
      const button = document.createElement("button");
      const piece = game.turn === "w" ? type : type.toLowerCase();
      button.type = "button"; button.textContent = PIECES[piece];
      button.setAttribute("aria-label", type);
      button.addEventListener("click", () => {
        promotionLayer.hidden = true;
        recordMove({ ...move, promoteTo: type });
      });
      promotionChoices.append(button);
    }
    promotionLayer.hidden = false;
    promotionChoices.querySelector("button").focus();
  }

  function renderBoard() {
    boardElement.replaceChildren();
    const flipped = humanSide === "b";
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const r = flipped ? 7 - row : row, c = flipped ? 7 - col : col;
      const square = document.createElement("button");
      const piece = game.board[r][c];
      const selectedSquare = selected && selected[0] === r && selected[1] === c;
      const moveHere = legalFromSelected.find(move => move.to[0] === r && move.to[1] === c);
      square.type = "button";
      square.className = `square ${(r + c) % 2 === 0 ? "light" : "dark"}${selectedSquare ? " selected" : ""}`;
      if (lastMove && (sameSquare(lastMove.from, [r, c]) || sameSquare(lastMove.to, [r, c]))) square.classList.add("last-move");
      square.setAttribute("role", "gridcell");
      square.setAttribute("aria-label", `${squareName([r, c])}${piece ? ` ${pieceName(piece)}` : ""}${moveHere ? `, ${language === "fa" ? "حرکت مجاز" : "legal move"}` : ""}`);
      if (piece) {
        const glyph = document.createElement("span");
        glyph.textContent = PIECES[piece];
        glyph.className = colorOf(piece) === "w" ? "piece-white" : "piece-black";
        square.append(glyph);
      }
      if (moveHere) {
        const hint = document.createElement("span");
        hint.className = game.board[r][c] ? "capture-ring" : "legal-dot";
        square.append(hint);
      }
      if ((flipped ? row === 7 : row === 7) && col === 0) {
        const rank = document.createElement("span");
        rank.className = "coordinate"; rank.textContent = String(8 - r); square.append(rank);
      }
      if (row === 7) {
        const file = document.createElement("span");
        file.className = "coordinate"; file.style.left = "auto"; file.style.right = "4px";
        file.textContent = files[c]; square.append(file);
      }
      square.addEventListener("click", () => onSquareClick(r, c));
      boardElement.append(square);
    }
  }

  function sameSquare(a, b) { return a[0] === b[0] && a[1] === b[1]; }
  function pieceName(piece) {
    const names = language === "fa"
      ? { k: "شاه", q: "وزیر", r: "رخ", b: "فیل", n: "اسب", p: "پیاده" }
      : { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };
    return names[piece.toLowerCase()];
  }

  function renderMoves() {
    movesElement.replaceChildren();
    moveCountElement.textContent = String(Math.ceil(moveLog.length / 2));
    if (!moveLog.length) {
      const empty = document.createElement("p");
      empty.className = "empty-moves"; empty.textContent = translations[language].movesEmpty;
      movesElement.append(empty); return;
    }
    for (let i = 0; i < moveLog.length; i += 2) {
      const entry = document.createElement("div");
      entry.className = "move-entry";
      const number = document.createElement("span");
      number.className = "move-number"; number.textContent = `${Math.floor(i / 2) + 1}.`;
      const white = document.createElement("span");
      white.className = "move-white"; white.textContent = moveLog[i];
      entry.append(number, white);
      if (moveLog[i + 1]) {
        const black = document.createElement("span");
        black.className = "move-black"; black.textContent = moveLog[i + 1]; entry.append(black);
      }
      movesElement.append(entry);
    }
    movesElement.scrollTop = movesElement.scrollHeight;
  }

  function renderStatus(outcome = null) {
    const t = translations[language];
    const check = inCheck(game, game.turn);
    let key;
    if (outcome === "human") key = "statusYouWin";
    else if (outcome === "bot") key = "statusBotWins";
    else if (outcome === "draw") key = "statusDraw";
    else if (thinking) key = "statusBot";
    else if (game.turn !== humanSide) key = check ? "statusBotCheck" : "statusBotTurn";
    else key = check ? "statusCheck" : "statusYour";
    statusElement.textContent = t[key];
    statusElement.classList.toggle("game-over", !!outcome);
    const captionKey = outcome === "human" ? "captionWon" : outcome === "bot" ? "captionLost"
      : outcome === "draw" ? "captionDraw" : thinking ? "captionBot"
        : check ? (game.turn === humanSide ? "captionCheck" : "captionBotCheck") : "yourTurn";
    playerCaption.textContent = t[captionKey];
    indicator.textContent = game.turn === "w" ? "♔" : "♚";
    indicator.className = `turn-indicator ${game.turn === "w" ? "white-piece" : "black-piece"}`;
    const botColor = humanSide === "w" ? "b" : "w";
    const humanColor = humanSide;
    const botBadge = document.getElementById("bot-color");
    const humanBadge = document.getElementById("human-color");
    botBadge.textContent = botColor === "w" ? "♔" : "♚";
    botBadge.className = `piece-color ${botColor === "w" ? "white-piece" : "black-piece"}`;
    botBadge.setAttribute("aria-label", t[botColor === "w" ? "white" : "black"]);
    humanBadge.textContent = humanColor === "w" ? "♔" : "♚";
    humanBadge.className = `piece-color ${humanColor === "w" ? "white-piece" : "black-piece"}`;
    humanBadge.setAttribute("aria-label", t[humanColor === "w" ? "white" : "black"]);
  }

  function render() {
    renderBoard(); renderMoves(); renderStatus(finished ? getOutcome(game) : null);
    undoButton.disabled = history.length === 0;
    undoButton.setAttribute("aria-label", translations[language][history.length ? "undoEnabled" : "undoDisabled"]);
  }

  function setLanguage(next) {
    language = next;
    document.documentElement.lang = next;
    document.documentElement.dir = next === "fa" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach(element => {
      const value = translations[next][element.dataset.i18n];
      if (value) element.textContent = value;
    });
    document.getElementById("language").textContent = next === "en" ? "فارسی" : "English";
    document.getElementById("language").setAttribute("aria-label", translations[next].langLabel);
    boardElement.setAttribute("aria-label", translations[next].boardLabel);
    document.title = next === "fa" ? "کیش و مات — شطرنج" : "Checkmate — Chess";
    render();
  }

  document.getElementById("language").addEventListener("click", () => setLanguage(language === "en" ? "fa" : "en"));
  document.getElementById("new-game").addEventListener("click", () => {
    game = newGame(); history = []; moveLog = []; lastMove = null; selected = null;
    legalFromSelected = []; thinking = false; finished = false; promotionLayer.hidden = true;
    render();
  });
  sideSelect.addEventListener("change", () => {
    humanSide = sideSelect.value;
    game = newGame(); history = []; moveLog = []; lastMove = null; selected = null;
    legalFromSelected = []; thinking = false; finished = false;
    render();
    if (humanSide === "b") {
      thinking = true; renderStatus();
      window.setTimeout(() => {
        const move = chooseBotMove(game); thinking = false;
        if (move) recordMove(move);
      }, 180);
    }
  });
  undoButton.addEventListener("click", () => {
    if (!history.length || thinking) return;
    const steps = game.turn === humanSide && history.length >= 2 ? 2 : 1;
    let saved;
    for (let i = 0; i < steps && history.length; i++) saved = history.pop();
    game = saved.game; moveLog = saved.log; lastMove = saved.lastMove;
    finished = false; selected = null; legalFromSelected = [];
    render();
  });
  promotionLayer.addEventListener("click", event => {
    if (event.target === promotionLayer) promotionLayer.hidden = true;
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") promotionLayer.hidden = true;
  });

  setLanguage("en");
})();
