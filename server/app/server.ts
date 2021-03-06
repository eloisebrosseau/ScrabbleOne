import { Application } from '@app/app';
import { RoomController } from '@app/controllers/room/room.controller';
import { AdminPersistence } from '@app/services/admin/admin-persistence';
import { DatabaseService } from '@app/services/database/database.service';
import { DictionaryService } from '@app/services/dictionary/dictionary.service';
import { ScoreService } from '@app/services/score/score.service';
import { SocketService } from '@app/services/socket/socket-service';
import * as http from 'http';
import { Service } from 'typedi';
import logger from 'winston';

@Service()
export class Server {
    private static readonly appPort: string | number | boolean = Server.normalizePort(process.env.PORT || '3000');
    private server: http.Server;

    constructor(
        private readonly application: Application,
        private readonly socketService: SocketService,
        private readonly roomController: RoomController,
        private readonly databaseService: DatabaseService,
        private readonly dictionnaryService: DictionaryService,
        private readonly adminPersistance: AdminPersistence,
        private readonly scoreService: ScoreService,
    ) {}

    private static normalizePort(val: number | string): number | string | boolean {
        const port = +val;
        if (isNaN(port)) {
            return val;
        }
        if (port >= 0) {
            return port;
        }
        return false;
    }

    private static onError(error: NodeJS.ErrnoException): void {
        if (error.syscall !== 'listen') {
            throw error;
        }

        const bind: string = typeof Server.appPort === 'string' ? 'Pipe ' + Server.appPort : 'Port ' + Server.appPort;
        switch (error.code) {
            case 'EACCES':
                logger.error(`${bind} requires elevated privileges`);
                process.exit(1);
                break;
            case 'EADDRINUSE':
                logger.error(`${bind} is already in use`);
                process.exit(1);
                break;
            default:
                throw error;
        }
    }

    async init(): Promise<void> {
        this.application.app.set('port', Server.appPort);

        try {
            await this.databaseService.run();
            logger.info('Successful connection to database');
        } catch (e) {
            logger.error('Failed connection to database', e);
            process.exit(1);
        }

        await this.scoreService.init();
        await this.dictionnaryService.init();
        await this.adminPersistance.init();

        this.server = http.createServer(this.application.app);

        this.socketService.init(this.server);
        this.roomController.handleSockets();

        this.server.listen(Server.appPort);
        this.server.on('error', (error: NodeJS.ErrnoException) => Server.onError(error));
        this.server.on('listening', () => this.onListening());
    }

    private onListening(): void {
        const address = this.server.address();
        const bind: string = typeof address === 'string' ? `pipe ${address}` : `port ${address?.port}`;

        logger.info(`Listening on ${bind}`);
    }
}
