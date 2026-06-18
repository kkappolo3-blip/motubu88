import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import simulationsRouter from "./simulations";
import bankDebtsRouter from "./bank-debts";
import ownerDrawingsRouter from "./owner-drawings";
import transactionsRouter from "./transactions";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(simulationsRouter);
router.use(bankDebtsRouter);
router.use(ownerDrawingsRouter);
router.use(transactionsRouter);
router.use(dashboardRouter);

export default router;
