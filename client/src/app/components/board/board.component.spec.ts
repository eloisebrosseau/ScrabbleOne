/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-classes-per-file */
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHandler } from '@angular/common/http';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/compiler';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { cleanStyles } from '@app/classes/helpers/cleanup.helper';
import { PlayerType } from '@app/classes/player/player-type';
import { Constants } from '@app/constants/global.constants';
import { AppMaterialModule } from '@app/modules/material.module';
import { BoardService } from '@app/services/board/board.service';
import { GameService } from '@app/services/game/game.service';
import { GridService } from '@app/services/grid/grid.service';
import { PlaceLetterService } from '@app/services/place-letter/place-letter.service';
import { RackService } from '@app/services/rack/rack.service';
import { BoardData, Vec2 } from '@common';
import { BehaviorSubject, Observable } from 'rxjs';
import { BoardComponent } from './board.component';

class GridServiceStub {
    letterFontFace = { font: 'red', size: 0 };

    isDrawGridCalled = false;
    isDrawSquareCalled = false;
    isResetCanvasCalled = false;
    cleanInsideSquareCalled: boolean;
    drawDirectionArrowCalled: boolean;
    drawBonusOfPositionCalled: boolean;
    drawSymbolCalled: boolean;

    // eslint-disable-next-line no-unused-vars -- Its a stub, implemented to do nothing
    drawGrid(canvas: CanvasRenderingContext2D): void {
        this.isDrawGridCalled = true;
    }

    // eslint-disable-next-line no-unused-vars -- Its a stub, implemented to do nothing
    drawSquares(canvas: CanvasRenderingContext2D): void {
        this.isDrawSquareCalled = true;
    }

    // eslint-disable-next-line no-unused-vars -- Its a stub, implemented to do nothing
    resetCanvas(canvas: CanvasRenderingContext2D): void {
        this.isResetCanvasCalled = true;
    }

    // eslint-disable-next-line no-unused-vars -- Its a stub, implemented to do nothing
    drawSelectionSquare(tempContext: CanvasRenderingContext2D, position: Vec2) {
        return true;
    }

    // eslint-disable-next-line no-unused-vars -- Its a stub, implemented to do nothing
    cleanInsideSquare(tempContext: CanvasRenderingContext2D, position: Vec2): void {
        this.cleanInsideSquareCalled = true;
    }
    // eslint-disable-next-line no-unused-vars -- Its a stub, implemented to do nothing
    drawDirectionArrow(tempContext: CanvasRenderingContext2D, position: Vec2, direction: boolean): void {
        this.drawDirectionArrowCalled = true;
    }

    // eslint-disable-next-line no-unused-vars -- Its a stub, implemented to do nothing
    drawBonusOfPosition(squareContext: CanvasRenderingContext2D, position: Vec2): void {
        this.drawBonusOfPositionCalled = true;
    }

    // eslint-disable-next-line no-unused-vars -- Its a stub, implemented to do nothing
    drawSymbol(letter: string, gridPosition: Vec2, context: CanvasRenderingContext2D) {
        this.drawSymbolCalled = true;
    }
}

class BoardServiceMock {
    readonly boardSubject: BehaviorSubject<BoardData> = new BehaviorSubject<BoardData>({} as BoardData);

    isPositionAvailable() {
        return true;
    }

    getLetter() {
        return 'a';
    }

    get boardUpdated(): Observable<BoardData> {
        return this.boardSubject.asObservable();
    }
}

describe('BoardComponent', () => {
    const playerType = PlayerType.Local;
    let component: BoardComponent;
    let fixture: ComponentFixture<BoardComponent>;
    let gridServiceStub: GridServiceStub;
    let gameServiceSpy: jasmine.SpyObj<GameService>;
    let rackServiceSpy: jasmine.SpyObj<RackService>;
    let placeLetter: jasmine.SpyObj<PlaceLetterService>;

    beforeEach(async () => {
        rackServiceSpy = jasmine.createSpyObj('RackService', ['indexOf']);
        gameServiceSpy = jasmine.createSpyObj('GameService', [], { currentTurn: playerType });
        placeLetter = jasmine.createSpyObj('PlaceLetterService', [
            'enterOperation',
            'inGrid',
            'isPositionInit',
            'backSpaceEnable',
            'escapeOperation',
            'isSameSquare',
            'backSpaceOperation',
            'nextAvailableSquare',
            'placeLetters',
        ]);

        placeLetter.inGrid.and.returnValue(true);
        placeLetter.isPositionInit.and.returnValue(true);
        placeLetter.tempRack = ['e', 's', 't'];
        placeLetter.isLastSquare = false;
        placeLetter.myRack = [];
        placeLetter.positionInit = { x: 7, y: 8 };
        placeLetter.isHorizontal = true;
        rackServiceSpy.rack = ['e', 's', 't', '*', 'a', 'b', 'c'];

        await TestBed.configureTestingModule({
            declarations: [BoardComponent],
            providers: [
                { provide: GridService, useClass: GridServiceStub },
                { provide: BoardService, useClass: BoardServiceMock },
                { provide: GameService, useValue: gameServiceSpy },
                { provide: PlaceLetterService, useValue: placeLetter },
                { provide: RackService, useValue: rackServiceSpy },
                { provide: HttpClient, useClass: HttpClient },

                HttpHandler,
            ],
            imports: [AppMaterialModule, CommonModule, BrowserAnimationsModule],
            schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(BoardComponent);
        gridServiceStub = TestBed.inject(GridService) as unknown as GridServiceStub;
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should return correct width', () => {
        expect(component.canvasDrawSize).toEqual(Constants.GRID.CANVAS_SIZE.x);
    });

    it('should return correct height', () => {
        const SCALE_FACTOR = 0.6;
        expect(component.canvasDisplaySize).toEqual(Math.floor(Math.min(window.innerWidth * SCALE_FACTOR, window.innerHeight * SCALE_FACTOR)));
    });

    it('should update font size if size provided', () => {
        const NEW_SIZE = 17;
        component.updateFontSize(NEW_SIZE);

        expect(gridServiceStub.letterFontFace.size).toEqual(NEW_SIZE);
        expect(gridServiceStub.isDrawSquareCalled).toBeTrue();
        expect(gridServiceStub.isDrawGridCalled).toBeTrue();
    });

    it('should resetCanvas and enterOperation when play', () => {
        const spyReset = spyOn(gridServiceStub, 'resetCanvas');
        component.play();

        expect(spyReset).toHaveBeenCalled();
    });

    it('should resetCanvas when canClick in mouseDown is false', () => {
        component.placeLetterService.myRack = ['a'];
        const spyReset = spyOn(gridServiceStub, 'resetCanvas');
        const mouseEvent = new MouseEvent('mousedown');
        component.isMouseOnBoard = false;
        component.onMouseDown(mouseEvent);

        expect(spyReset).toHaveBeenCalled();
    });

    it('gridPosition is undefined in onMouseDown', () => {
        const spy = spyOn(gridServiceStub, 'resetCanvas');
        const mouseEvent = new MouseEvent('mousedown');
        component.isMouseOnBoard = true;
        component.onMouseDown(mouseEvent);

        expect(spy).toHaveBeenCalled();
    });

    it('squareValid in onMouseDown', () => {
        const spy = spyOn(gridServiceStub, 'drawSelectionSquare');
        const mouseEvent = new MouseEvent('mousedown');
        component.isMouseOnBoard = true;
        component.onMouseDown(mouseEvent);

        expect(spy).toHaveBeenCalled();
    });

    it('squareValid is false in onMouseDown', () => {
        component.placeLetterService.gridPosition = { x: 17, y: 9 };
        placeLetter.inGrid.and.returnValue(false);
        const spy = spyOn(gridServiceStub, 'cleanInsideSquare');
        const mouseEvent = new MouseEvent('mousedown');
        component.isMouseOnBoard = true;
        component.onMouseDown(mouseEvent);

        expect(spy).not.toHaveBeenCalled();
    });

    it('squareValid and lastSquare in onMouseDown', () => {
        component.placeLetterService.gridPosition = { x: 15, y: 9 };
        const spy = spyOn(gridServiceStub, 'drawSelectionSquare');
        const mouseEvent = new MouseEvent('mousedown');
        component.isMouseOnBoard = true;
        component.onMouseDown(mouseEvent);

        expect(spy).toHaveBeenCalled();
    });

    it('squareValid and lastSquare in onMouseDown', () => {
        component.placeLetterService.isHorizontal = false;
        component.placeLetterService.gridPosition = { x: 10, y: 15 };
        const spy = spyOn(gridServiceStub, 'drawSelectionSquare');
        const mouseEvent = new MouseEvent('mousedown');
        component.isMouseOnBoard = true;
        component.onMouseDown(mouseEvent);

        expect(spy).toHaveBeenCalled();
    });

    it('backSpaceValid called backSpaceOperation in onKeyDown', () => {
        placeLetter.isPositionInit.and.returnValue(false);
        placeLetter.backSpaceEnable.and.returnValue(true);
        component.placeLetterService.gridPosition = { x: 15, y: 9 };
        const spy = spyOn(gridServiceStub, 'drawBonusOfPosition');
        const keyBoardEvent = new KeyboardEvent('backspace');
        component.onKeyDown(keyBoardEvent);

        expect(spy).toHaveBeenCalled();
    });

    it('escape called escapeOperation in onKeyDown', () => {
        const LETTER = 'Escape';
        component.placeLetterService.gridPosition = { x: 15, y: 9 };
        const spy = spyOn(gridServiceStub, 'drawSquares');
        component.onKeyDown(new KeyboardEvent('keydown', { key: LETTER }));

        expect(spy).toHaveBeenCalled();
    });

    it('enter called enterOperation in onKeyDown', () => {
        const LETTER = 'Enter';
        component.placeLetterService.tempRack = ['e', 's', 't', 'a'];
        component.placeLetterService.gridPosition = { x: 15, y: 9 };
        component.onKeyDown(new KeyboardEvent('keydown', { key: LETTER }));

        expect(placeLetter.placeLetters).toHaveBeenCalled();
    });

    it('put a in myRack when onKeyDown', () => {
        const LETTER = 'a';
        const spy = spyOn<any>(gridServiceStub, 'drawSymbol');
        component.squareSelected = true;
        component.placeLetterService.positionInit = { x: 8, y: 9 };
        component.placeLetterService.gridPosition = { x: 8, y: 9 };
        component.isLetter = true;
        component.placeLetterService.isLastSquare = false;
        component.onKeyDown(new KeyboardEvent('keydown', { key: LETTER }));

        expect(spy).toHaveBeenCalled();
    });

    it('put shift in myRack is disable when onKeyDown', () => {
        component.squareSelected = true;
        component.placeLetterService.positionInit = { x: 8, y: 9 };
        component.placeLetterService.gridPosition = { x: 8, y: 9 };
        component.isLetter = true;
        component.placeLetterService.isLastSquare = false;
        const LETTER = 'Shift';
        component.onKeyDown(new KeyboardEvent('keydown', { key: LETTER }));

        expect(component.isLetter).toBeFalse();
    });

    it('put d is disable in myRack when onKeyDown', () => {
        const LETTER = 'd';
        component.squareSelected = true;
        component.placeLetterService.positionInit = { x: 8, y: 9 };
        component.placeLetterService.gridPosition = { x: 8, y: 9 };
        component.isLetter = true;
        component.placeLetterService.isLastSquare = false;
        component.onKeyDown(new KeyboardEvent('keydown', { key: LETTER }));

        expect(component.isLetter).toBeFalse();
    });

    it('put A put * in myRack when onKeyDown', () => {
        const LETTER = 'A';
        const spy = spyOn<any>(gridServiceStub, 'drawSymbol');
        component.squareSelected = true;
        component.placeLetterService.positionInit = { x: 8, y: 9 };
        component.placeLetterService.gridPosition = { x: 8, y: 9 };
        component.isLetter = true;
        component.placeLetterService.isLastSquare = false;
        component.onKeyDown(new KeyboardEvent('keydown', { key: LETTER }));

        expect(spy).toHaveBeenCalled();
    });

    it('put A is disable in myRack when onKeyDown', () => {
        const LETTER = 'A';
        rackServiceSpy.rack = ['e', 's', 't', 'q', 'a', 'b', 'c'];
        component.squareSelected = true;
        component.placeLetterService.positionInit = { x: 8, y: 9 };
        component.placeLetterService.gridPosition = { x: 8, y: 9 };
        component.isLetter = true;
        component.placeLetterService.isLastSquare = false;
        component.onKeyDown(new KeyboardEvent('keydown', { key: LETTER }));

        expect(component.isLetter).toBeFalse();
    });

    it('put "??" is disable in myRack when onKeyDown', () => {
        const LETTER = '??';
        const spy = spyOn<any>(gridServiceStub, 'drawSelectionSquare');
        component.squareSelected = true;
        component.placeLetterService.positionInit = { x: 8, y: 9 };
        component.placeLetterService.gridPosition = { x: 14, y: 9 };
        component.isLetter = true;
        component.placeLetterService.isLastSquare = false;
        component.onKeyDown(new KeyboardEvent('keydown', { key: LETTER }));

        expect(spy).toHaveBeenCalled();
        expect(component.placeLetterService.isLastSquare).toBeTrue();
    });

    it('put ?? is disable in myRack when onKeyDown', () => {
        const LETTER = '??';
        component.squareSelected = true;
        component.placeLetterService.positionInit = { x: 8, y: 9 };
        component.placeLetterService.gridPosition = { x: 8, y: 9 };
        component.isLetter = true;
        component.placeLetterService.isLastSquare = false;
        component.onKeyDown(new KeyboardEvent('keydown', { key: LETTER }));
        expect(component.isLetter).toBeFalse();
    });

    it('put ?? is disable in myRack when onKeyDown', () => {
        const LETTER = '??';
        const spy = spyOn<any>(component, 'handleKeyDown');
        component.squareSelected = true;
        component.placeLetterService.positionInit = { x: 8, y: 9 };
        component.placeLetterService.gridPosition = { x: 8, y: 9 };
        component.isLetter = true;
        component.placeLetterService.isLastSquare = false;
        component.onKeyDown(new KeyboardEvent('keydown', { key: LETTER }));

        expect(spy).toHaveBeenCalled();
    });

    it('put ?? is disable in myRack when onKeyDown', () => {
        const LETTER = '??';
        rackServiceSpy.rack = ['e', 's', 't', 'q', 'a', 'b', 'c'];
        component.squareSelected = true;
        component.placeLetterService.positionInit = { x: 8, y: 9 };
        component.placeLetterService.gridPosition = { x: 8, y: 9 };
        component.isLetter = true;
        component.placeLetterService.isLastSquare = false;
        component.onKeyDown(new KeyboardEvent('keydown', { key: LETTER }));

        expect(component.isLetter).toBeFalse();
    });

    it('put a return nothing if gridposition undefined  onKeyDown', () => {
        const LETTER = 'a';
        component.squareSelected = true;
        component.onKeyDown(new KeyboardEvent('keydown', { key: LETTER }));

        expect(component.placeLetterService.backSpaceEnable).not.toHaveBeenCalled();
    });

    it('put a return nothing if gridposition undefined  onKeyDown', () => {
        const spy = spyOn<any>(component, 'resetPlaceSelection');
        component.isMouseOnBoard = true;
        component.lostFocus();

        expect(spy).not.toHaveBeenCalled();
    });

    it('put a return nothing if gridposition undefined  onKeyDown', () => {
        const spy = spyOn<any>(component, 'resetPlaceSelection');
        component.isMouseOnBoard = false;
        component.lostFocus();

        expect(spy).toHaveBeenCalled();
    });

    afterAll(() => cleanStyles());
});
