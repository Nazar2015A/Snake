import React, { useEffect, useState } from "react";
import { randomIntFromInterval, useInterval } from "../../utils/utils";

import "./Board.css";

class LinkedListNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class LinkedList {
  constructor(value) {
    const node = new LinkedListNode(value);
    this.head = node;
    this.tail = node;
  }
}

const Direction = {
  UP: "UP",
  RIGHT: "RIGHT",
  DOWN: "DOWN",
  LEFT: "LEFT",
};

const BOARD_SIZE = 20;

const getStartingSnakeLLValue = (board) => {
  const rowSize = board.length;
  const colSize = board[0].length;
  const startingRow = Math.round(rowSize / 3);
  const startingCol = Math.round(colSize / 3);
  const startingCell = board[startingRow][startingCol];
  return {
    row: startingRow,
    col: startingCol,
    cell: startingCell,
  };
};

const Board = () => {
  const [begin, setBegin] = useState(false);
  const [score, setScore] = useState(0);
  const [name, setName] = useState("");
  const [pause, setPause] = useState(false);
  const [chance, setChance] = useState(0.8);
  const [board, setBoard] = useState(createBoard(BOARD_SIZE));
  const [snake, setSnake] = useState(
    new LinkedList(getStartingSnakeLLValue(board))
  );
  const [snakeCells, setSnakeCells] = useState(
    new Set([snake.head.value.cell])
  );
  const [foodCell, setFoodCell] = useState(snake.head.value.cell + 5);
  const [direction, setDirection] = useState(Direction.RIGHT);
  const [speed, setSpeed] = useState(150);
  const [menu, setMenu] = useState(false);
  const [speedIncreases, setSpeedIncreases] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
    fetchLeaderBoard();
  }, []);

  async function fetchLeaderBoard() {
    const response = await fetch("https://backend-test-ednt.onrender.com/adduser");
    if (response.ok) {
      const data = await response.json();
      setLeaderboard(data);
    } else {
      console.error("Error fetching leaderboard data");
    }
  }
  useEffect(() => {
    window.addEventListener("keydown", (e) => {
      if (!menu) {
        handleKeydown(e);
      }
    });
  }, []);
  useEffect(() => {
    if (score >= 50 * (speedIncreases + 1)) {
      setSpeedIncreases((prev) => prev + 1);
      setSpeed((prev) => {
        if (prev > 50) {
          return prev - 20;
        }
      });
    }
    if (score == 0) {
      setSpeed(150);
      setSpeedIncreases(0);
    }
  }, [score, speedIncreases]);
  useInterval(() => {
    if (!menu) {
      moveSnake();
    }
  }, speed);
  useEffect(() => {
    window.addEventListener("keydown", pauseKeydown);
    return () => {
      window.removeEventListener("keydown", pauseKeydown);
    };
  }, [begin, menu]);

  const pauseKeydown = (e) => {
    if (e.key === "p" && begin && !menu) {
      setPause((prev) => !prev);
    }
  };

  const handleKeydown = (e) => {
    const newDirection = getDirectionFromKey(e.key);
    const isValidDirection = newDirection !== "";
    if (!isValidDirection) return;
    const snakeWillRunIntoItself =
      getOppositeDirection(newDirection) === direction && snakeCells.size > 1;

    if (snakeWillRunIntoItself) return;
    setDirection(newDirection);
  };

  const moveSnake = () => {
    if (begin && !pause) {

        const currentHeadCoords = {
          row: snake.head.value.row,
          col: snake.head.value.col,
        };

        const nextHeadCoords = getCoordsInDirection(
          currentHeadCoords,
          direction
        );
        if (isOutOfBounds(nextHeadCoords, board)) {
          handleGameOver();
          return;
        }
        const nextHeadCell = board[nextHeadCoords.row][nextHeadCoords.col];
        if (snakeCells.has(nextHeadCell)) {
          handleGameOver();
          return;
        }

        const newHead = new LinkedListNode({
          row: nextHeadCoords.row,
          col: nextHeadCoords.col,
          cell: nextHeadCell,
        });
        const currentHead = snake.head;
        snake.head = newHead;
        currentHead.next = newHead;

        const newSnakeCells = new Set(snakeCells);
        newSnakeCells.delete(snake.tail.value.cell);
        newSnakeCells.add(nextHeadCell);

        snake.tail = snake.tail.next;
        if (snake.tail === null) snake.tail = snake.head;

        const foodConsumed = nextHeadCell === foodCell;
        if (foodConsumed) {
          growSnake(newSnakeCells);
          handleFoodConsumption(newSnakeCells);
        }

        setSnakeCells(newSnakeCells);
    }
  };

  const growSnake = (newSnakeCells) => {
    const growthNodeCoords = getGrowthNodeCoords(snake.tail, direction);
    if (isOutOfBounds(growthNodeCoords, board)) {
      return;
    }
    const newTailCell = board[growthNodeCoords.row][growthNodeCoords.col];
    const newTail = new LinkedListNode({
      row: growthNodeCoords.row,
      col: growthNodeCoords.col,
      cell: newTailCell,
    });
    const currentTail = snake.tail;
    snake.tail = newTail;
    snake.tail.next = currentTail;

    newSnakeCells.add(newTailCell);
  };

  const handleFoodConsumption = (newSnakeCells) => {
    const maxPossibleCellValue = BOARD_SIZE * BOARD_SIZE;
    let nextFoodCell;

    while (true) {
      nextFoodCell = randomIntFromInterval(1, maxPossibleCellValue);
      if (newSnakeCells.has(nextFoodCell) || foodCell === nextFoodCell)
        continue;
      break;
    }

    setFoodCell(nextFoodCell);
    setChance(Math.random());
    if (chance > 0.05 && chance < 0.2) {
      setScore(score + 5);
    } else if (chance < 0.05) {
      setScore(score + 10);
    } else {
      setScore(score + 1);
    }
  };

  const handleGameOver = async () => {
    setMenu(true);
    await sendResult();
    await fetchLeaderBoard();
  };

  const sendResult = async () => {
    const playerData = {
      player_name: name,
      score: score,
    };
    const response = await fetch("https://backend-test-ednt.onrender.com/adduser", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(playerData),
    });
    if (!response.ok) {
      console.error("Error sending data");
    }
  };


  const resumeGame = () => {
    setMenu(false);
    setScore(0);
    const snakeLLStartingValue = getStartingSnakeLLValue(board);
    setSnake(new LinkedList(snakeLLStartingValue));
    setFoodCell(snakeLLStartingValue.cell + 5);
    setSnakeCells(new Set([snakeLLStartingValue.cell]));
    setDirection(Direction.RIGHT);
  };
  const beginGame = () => {
    if (name === "" || name.length > 10) {
      setTimeout(() => {
        alert("Please enter your name (max char(10))");
      }, 310);
    } else {
      setBegin(true);
    }
  };
  const pauseValid = () => {
    if (begin && !menu) {
      setPause(true);
    }
  };

  return (
    <>
      <h1>Score: {score}</h1>
      <button className="btn-pause" onClick={pauseValid}>{`Pause (P)`}</button>
      <div className="container">
        <div className="board">
          <div className="board-game">
            {board.map((row, rowIdx) => (
              <div key={rowIdx} className="row">
                {row.map((cellValue, cellIdx) => {
                  const className = getCellClassName(
                    cellValue,
                    foodCell,
                    snakeCells,
                    score,
                    chance
                  );
                  return <div key={cellIdx} className={className}></div>;
                })}
              </div>
            ))}
            {!begin && (
              <div className="begin-menu">
                <div className="begin-menu-score">
                  <input
                    placeholder="Enter your name"
                    onChange={(e) => setName(e.target.value)}
                  />
                  <button className="begin-menu-score-btn" onClick={beginGame}>
                    Start game
                  </button>
                </div>
              </div>
            )}
          </div>
          {menu && (
            <div className="board-menu">
              <div className="board-menu-score">
                <div className="board-menu-score-heading">
                  <h1 className="board-menu-score-title">{name}</h1>
                  <h1 className="board-menu-score-title">
                    Your Result: {score}
                  </h1>
                </div>
                <button className="board-menu-score-btn" onClick={resumeGame}>
                  Try again
                </button>
              </div>
            </div>
          )}
          {!menu && begin && pause && (
            <div className="pause-menu">
              <div className="pause-menu-score">
                <div>
                  <h1 className="pause-menu-score-title">Game is Paused</h1>
                </div>
                <button className="btn-pause" onClick={() => setPause(false)}>
                  {`Resume Game (P)`}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="leaderboard">
          <div className="leaderboar-top">
            <h1 className="leaderboar-top-title">Leaderboard</h1>
          </div>
          <div className="leaderboar-bottom">
            <div className="leaderboard-bottom-item orange">
              <div className="leaderboard-item-gap">
                <p>Rank</p>
                <h3>Name</h3>
              </div>
              <p>Score</p>
            </div>
            {leaderboard.map((item, index) => (
              <div key={item.id} className={`leaderboard-bottom-item ${index % 2 !== 0 ? 'blue' : ''}`}>
                <div className="leaderboard-item-gap">
                  <p>{index + 1}</p>
                  <h3>{item.player_name}</h3>
                </div>
                <p>{item.score}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const createBoard = (BOARD_SIZE) => {
  let counter = 1;
  const board = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    const currentRow = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      currentRow.push(counter++);
    }
    board.push(currentRow);
  }
  return board;
};

const getCoordsInDirection = (coords, direction) => {
  if (direction === Direction.UP) {
    return {
      row: coords.row - 1,
      col: coords.col,
    };
  }
  if (direction === Direction.RIGHT) {
    return {
      row: coords.row,
      col: coords.col + 1,
    };
  }
  if (direction === Direction.DOWN) {
    return {
      row: coords.row + 1,
      col: coords.col,
    };
  }
  if (direction === Direction.LEFT) {
    return {
      row: coords.row,
      col: coords.col - 1,
    };
  }
};

const isOutOfBounds = (coords, board) => {
  const { row, col } = coords;
  if (row < 0 || col < 0) return true;
  if (row >= board.length || col >= board[0].length) return true;
  return false;
};

const getDirectionFromKey = (key) => {
  if (key === "ArrowUp") return Direction.UP;
  if (key === "ArrowRight") return Direction.RIGHT;
  if (key === "ArrowDown") return Direction.DOWN;
  if (key === "ArrowLeft") return Direction.LEFT;
  return "";
};

const getNextNodeDirection = (node, currentDirection) => {
  if (node.next === null) return currentDirection;
  const { row: currentRow, col: currentCol } = node.value;
  const { row: nextRow, col: nextCol } = node.next.value;
  if (nextRow === currentRow && nextCol === currentCol + 1) {
    return Direction.RIGHT;
  }
  if (nextRow === currentRow && nextCol === currentCol - 1) {
    return Direction.LEFT;
  }
  if (nextCol === currentCol && nextRow === currentRow + 1) {
    return Direction.DOWN;
  }
  if (nextCol === currentCol && nextRow === currentRow - 1) {
    return Direction.UP;
  }
  return "";
};

const getGrowthNodeCoords = (snakeTail, currentDirection) => {
  const tailNextNodeDirection = getNextNodeDirection(
    snakeTail,
    currentDirection
  );
  const growthDirection = getOppositeDirection(tailNextNodeDirection);
  const currentTailCoords = {
    row: snakeTail.value.row,
    col: snakeTail.value.col,
  };
  const growthNodeCoords = getCoordsInDirection(
    currentTailCoords,
    growthDirection
  );
  return growthNodeCoords;
};

const getOppositeDirection = (direction) => {
  if (direction === Direction.UP) return Direction.DOWN;
  if (direction === Direction.RIGHT) return Direction.LEFT;
  if (direction === Direction.DOWN) return Direction.UP;
  if (direction === Direction.LEFT) return Direction.RIGHT;
};

const getCellClassName = (cellValue, foodCell, snakeCells, score, chance) => {
  let className = "cell";
  if (cellValue === foodCell) {
    if (chance > 0.05 && chance < 0.2) {
      className = "cell cell-purple";
    } else if (chance < 0.05) {
      className = "cell cell-blue";
    } else {
      className = "cell cell-red";
    }
  }
  if (snakeCells.has(cellValue)) className = "cell cell-green";

  return className;
};

export default Board;
