import { Hono } from "hono";
import healthRouter from "./health";
import productsRouter from "./products";
import simulationsRouter from "./simulations";
import bankDebtsRouter from "./bank-debts";
import ownerDrawingsRouter from "./owner-drawings";
import transactionsRouter from "./transactions";
import dashboardRouter from "./dashboard";
import kasirRouter from "./kasir";
import installmentsRouter from "./installments";

const router = new Hono();

router.route("/", healthRouter);
router.route("/", productsRouter);
router.route("/", simulationsRouter);
router.route("/", bankDebtsRouter);
router.route("/", ownerDrawingsRouter);
router.route("/", transactionsRouter);
router.route("/", dashboardRouter);
router.route("/", kasirRouter);
router.route("/", installmentsRouter);

export default router;
