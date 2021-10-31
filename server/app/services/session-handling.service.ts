import { SessionHandler } from '@app/handlers/session-handler/session-handler';
import { Service } from 'typedi';

@Service()
export class SessionHandlingService {
    private readonly sessionHandlers: SessionHandler[];
    private readonly playerIds: Map<string, string>;

    constructor() {
        this.sessionHandlers = [];
        this.playerIds = new Map<string, string>();
    }

    addHandler(sessionHandler: SessionHandler): void {
        sessionHandler.players.forEach((p) => this.playerIds.set(p.playerInfo.id, sessionHandler.sessionInfo.id));
        this.sessionHandlers.push(sessionHandler);
    }

    removeHandler(id: string): SessionHandler | null {
        // Does not remove well
        const index = this.sessionHandlers.findIndex((e) => e.sessionInfo.id === id);
        if (index < 0) return null;

        const sessionHandler = this.sessionHandlers[index];

        sessionHandler.players.forEach((p) => this.playerIds.delete(p.playerInfo.id));
        sessionHandler.destroy();
        // Pourquoi allons nous chercher le premier index comme valeur de retour
        return this.sessionHandlers.slice(index, 1)[0];
    }

    getHandler(id: string): SessionHandler | null {
        // bug found while testing
        // const sessionId = this.playerIds.get(id);
        return this.sessionHandlers.find((e) => e.sessionInfo.id === id) ?? null;
    }
}
