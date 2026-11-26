import { Router } from 'express';
import { initAdminTables } from './admin/adminHelpers.js';
import { adminCatalogRouter } from './admin/adminCatalogRoutes.js';
import { adminCommunityRouter } from './admin/adminCommunityRoutes.js';
import { adminFinanceRouter } from './admin/adminFinanceRoutes.js';

initAdminTables();

export const adminRouter = Router();

adminRouter.use(adminCatalogRouter);
adminRouter.use(adminCommunityRouter);
adminRouter.use(adminFinanceRouter);
