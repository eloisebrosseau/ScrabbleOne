import { BoardMergeError } from '@app/errors/board-merge-error';
import { BoardOverflowError } from '@app/errors/board-overflow-error';
import { BoardData, Bonus, BonusInfos, Direction, Placement, Square, Vec2 } from '@common';

export interface ImmutableBoard {
    readonly size: number;

    getSquare(position: Vec2): Square;

    getRelative(position: Vec2, direction: Direction): Square | null;

    clone(): Board;

    get center(): Vec2;

    get positions(): Vec2[];

    get boardData(): BoardData;
}

export class Board implements ImmutableBoard {
    readonly size: number;
    private board: Square[][];
    private filledPositions: Vec2[];

    constructor(size: number, bonuses: BonusInfos[] = []) {
        this.size = size;
        this.board = new Array<Square[]>();
        this.filledPositions = [];

        for (let x = 0; x < size; x++) {
            const column: Square[] = new Array<Square>();

            for (let y = 0; y < size; y++) {
                column.push({ letter: '', bonus: Bonus.None, position: { x, y } });
            }

            this.board.push(column);
        }

        for (const bonusInfo of bonuses) {
            const bonus = bonusInfo.bonus;
            const position = bonusInfo.position;
            this.board[position.x][position.y] = { letter: '', bonus, position };
        }
    }

    getSquare(position: Vec2): Square {
        this.positionGuard(position);
        return this.board[position.x][position.y];
    }

    merge(letters: Placement[]): void {
        for (const { letter, position } of letters) {
            this.positionGuard(position);

            if (this.board[position.x][position.y].letter === '') {
                this.setLetter(letter, position);
                continue;
            }

            throw new BoardMergeError(`Letter is already set at position (${position.x},${position.y})`);
        }
    }

    getRelative(position: Vec2, direction: Direction): Square | null {
        this.positionGuard(position);

        let row = position.y;
        let column = position.x;

        switch (direction) {
            case Direction.Down:
                row += 1;
                break;
            case Direction.Up:
                row -= 1;
                break;
            case Direction.Right:
                column += 1;
                break;
            case Direction.Left:
                column -= 1;
                break;
            default:
                break;
        }

        const isOverflow = row < 0 || column < 0 || row > this.size - 1 || column > this.size - 1;
        return isOverflow ? null : this.board[column][row];
    }

    clone(): Board {
        const clonedBoard = new Board(this.size);

        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                clonedBoard.board[x][y] = this.board[x][y];
            }
        }

        this.filledPositions.forEach((p) => clonedBoard.filledPositions.push(p));

        return clonedBoard;
    }

    get center(): Vec2 {
        const x = Math.floor(this.board.length / 2);
        const y = Math.floor(this.board[0].length / 2);
        return { x, y };
    }

    get positions(): Vec2[] {
        return Array.from(this.filledPositions);
    }

    get boardData(): BoardData {
        const clonedBoard = this.clone();
        return {
            board: clonedBoard.board,
            filledPositions: clonedBoard.filledPositions,
        };
    }

    private setLetter(letter: string, position: Vec2): void {
        const replacedSquare = this.getSquare(position);
        this.board[position.x][position.y] = { letter, bonus: replacedSquare.bonus, position };
        this.filledPositions.push(position);
    }

    private positionGuard(position: Vec2) {
        const boardCapacityExceeded = position.x + 1 > this.board.length || position.y + 1 > this.board[0].length;
        if (boardCapacityExceeded) {
            throw new BoardOverflowError('Board capacity exceeded');
        }
        if (position.x < 0 || position.y < 0) {
            throw new BoardOverflowError('Position must not be negative');
        }
    }
}
