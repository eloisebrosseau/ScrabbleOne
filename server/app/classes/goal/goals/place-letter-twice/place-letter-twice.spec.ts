/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable dot-notation */
import { BaseGoal, Goal } from '@app/classes/goal/base-goal';
import { PlaceLetterTwice } from '@app/classes/goal/goals/place-letter-twice/place-letter-twice';
import { ValidationFailed, ValidationResponse } from '@app/classes/validation/validation-response';
import { expect } from 'chai';

describe('PlaceLetterTwice', () => {
    let goal: Goal;
    beforeEach(() => {
        goal = PlaceLetterTwice.generate('id');
    });

    it('should be created', () => {
        expect(goal).to.be.ok;
    });

    it('should set successId if the goal is met', () => {
        const id = 'id';
        const validationResponse: ValidationResponse = {
            placements: [{ position: { x: 7, y: 7 }, letter: 'A' }],
            score: 50,
            isSuccess: true,
            words: [
                {
                    score: 5,
                    letters: [
                        { placement: { letter: 'A', position: { x: 8, y: 8 } }, isNew: true },
                        { placement: { letter: 'A', position: { x: 8, y: 8 } }, isNew: true },
                    ],
                },
            ],
        };
        (goal as PlaceLetterTwice).notifyPlacement(validationResponse, id);
        expect((goal as BaseGoal)['successId']).to.equal(id);
    });

    it('should not set successId if the same letter is not there twice', () => {
        const id = 'id';
        const validationResponse: ValidationResponse = {
            placements: [{ position: { x: 7, y: 7 }, letter: 'A' }],
            score: 50,
            isSuccess: true,
            words: [
                {
                    score: 5,
                    letters: [
                        { placement: { letter: 'A', position: { x: 8, y: 8 } }, isNew: true },
                        { placement: { letter: 'B', position: { x: 8, y: 8 } }, isNew: true },
                    ],
                },
            ],
        };
        (goal as PlaceLetterTwice).notifyPlacement(validationResponse, id);
        expect((goal as BaseGoal)['successId']).to.equal('');
    });

    it('should not set successId if it receives a validation failed answer', () => {
        const id = 'id';
        const validationResponse: ValidationFailed = {
            isSuccess: false,
            description: '',
        };
        (goal as PlaceLetterTwice).notifyPlacement(validationResponse, id);
        expect((goal as BaseGoal)['successId']).to.equal('');
    });
});
