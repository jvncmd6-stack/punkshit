import { Router } from 'express';
import { userRouter } from './userRoutes.js';
import { actionRouter } from './actionRoutes.js';
import { gameRouter } from './gameRoutes.js';
import { socialRouter } from './socialRoutes.js';
import { marketRouter } from './marketRoutes.js';

export const apiRouter = Router();

apiRouter.use(userRouter);
apiRouter.use(actionRouter);
apiRouter.use(gameRouter);
apiRouter.use(socialRouter);
apiRouter.use(marketRouter);

export default apiRouter;
