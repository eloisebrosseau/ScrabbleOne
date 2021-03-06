import { ExchangeNotifier } from '@app/classes/goal/notifiers/exchange-notifier';
import { SkipNotifier } from '@app/classes/goal/notifiers/skip-notifier';
import { PlacementNotifier } from '@app/classes/goal/notifiers/placement-notifier';
import { GoalDescription } from '@app/classes/goal/goal-description';
import { GoalData, GoalStatus } from '@common';
import { StatsNotifier } from '@app/classes/goal/notifiers/stats-notifier';

export type Goal = BaseGoal & (ExchangeNotifier | SkipNotifier | PlacementNotifier | StatsNotifier);

export abstract class BaseGoal {
    protected successId: string;
    protected constructor(readonly data: GoalDescription, protected readonly ownerId: string) {
        this.successId = '';
    }

    shouldBeDisplayed(id: string) {
        return this.isOwner(id) || this.isCompleted;
    }

    getGoalData(id: string): GoalData {
        return {
            id: this.data.id,
            name: this.data.name,
            score: this.data.score,
            scoreDescription: this.data.scoreDescription,
            isGlobal: this.ownerId === '',
            status: this.getStatus(id),
        };
    }

    protected guard(id: string) {
        return !this.isOwner(id) || this.isCompleted;
    }

    private get isCompleted(): boolean {
        return this.successId !== '';
    }

    private getStatus(id: string): GoalStatus {
        if (!this.isCompleted) {
            return GoalStatus.Pending;
        }

        return id === this.successId ? GoalStatus.Succeeded : GoalStatus.Failed;
    }

    private isOwner(id: string) {
        return this.ownerId === '' || this.ownerId === id;
    }
}
