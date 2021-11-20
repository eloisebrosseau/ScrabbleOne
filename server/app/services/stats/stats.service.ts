import { Player } from '@app/classes/player/player';
import { Score } from '@app/classes/score';
import { PlayerHandler } from '@app/handlers/player-handler/player-handler';
import { ScoreService } from '@app/services/score/score.service';
import { Service } from 'typedi';

@Service()
export class StatsService {
    constructor(readonly scoreService: ScoreService) {}

    async updateScoreboards(playerHandler: PlayerHandler, collectionName: string): Promise<void> {
        const winnerId = playerHandler.winner;
        const playerWinner: Player = playerHandler.players[0].id === winnerId ? playerHandler.players[0] : playerHandler.players[1];

        // check if human player
        if (!playerWinner.playerInfo.isHuman) {
            return;
        }

        // check if already in board and if score in board greater than current score; if not, treat it as if it were a whole new player
        if (!(await this.isNewScoreGreater(playerWinner, collectionName))) {
            return;
        }

        const playersNewBestScore: Score = { name: [playerWinner.playerInfo.name], scoreValue: playerWinner.stats.points };

        // check if same score as another player TO DO: Not sure abt this structure... maybe separating the check from the update would be best? idk
        if (await this.scoreService.updateNamesWithSameScore(playersNewBestScore, collectionName)) {
            return;
        }

        // if score unique, update the whole score board
        this.scoreService.updateScoreboard(playersNewBestScore, collectionName);
    }

    private async isNewScoreGreater(playerWinner: Player, collectionName: string): Promise<boolean> {
        const isInScoreboard = await this.scoreService.isPlayerInScoreboard(playerWinner.playerInfo.name, collectionName);

        if (isInScoreboard) {
            const playerScoreInBoard = await this.scoreService.getPlayerScore(playerWinner.playerInfo.name, collectionName);
            if (playerScoreInBoard > playerWinner.stats.points) {
                return false;
            }
        }
        return true;
    }

    async getScoreboardClassic(): Promise<Score[]> {
        return this.scoreService.getScoreboardClassic();
    }

    async getScoreBoardLog(): Promise<Score[]> {
        return this.scoreService.getScoreboardLog();
    }
}
