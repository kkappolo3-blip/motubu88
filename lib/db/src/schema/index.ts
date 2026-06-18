import { pgTable, serial, text, numeric, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  variant: text("variant"),
  supplier_name: text("supplier_name"),
  image_url: text("image_url"),
  cost_price: numeric("cost_price", { precision: 15, scale: 2 }).notNull(),
  selling_price: numeric("selling_price", { precision: 15, scale: 2 }).notNull(),
  stock_qty: integer("stock_qty").notNull().default(0),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, created_at: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;

export const simulationOrdersTable = pgTable("simulation_orders", {
  id: serial("id").primaryKey(),
  supplier_name: text("supplier_name").notNull(),
  total_cost: numeric("total_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  items: jsonb("items").notNull().default([]),
  adjustments: jsonb("adjustments").notNull().default([]),
  status: text("status").notNull().default("draft"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertSimulationSchema = createInsertSchema(simulationOrdersTable).omit({ id: true, created_at: true });
export type InsertSimulation = z.infer<typeof insertSimulationSchema>;
export type Simulation = typeof simulationOrdersTable.$inferSelect;

export const bankDebtsTable = pgTable("bank_debts", {
  id: serial("id").primaryKey(),
  bank_name: text("bank_name").notNull(),
  principal_amount: numeric("principal_amount", { precision: 15, scale: 2 }).notNull(),
  interest_amount: numeric("interest_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  paid_amount: numeric("paid_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("active"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertBankDebtSchema = createInsertSchema(bankDebtsTable).omit({ id: true, created_at: true });
export type InsertBankDebt = z.infer<typeof insertBankDebtSchema>;
export type BankDebt = typeof bankDebtsTable.$inferSelect;

export const ownerDrawingsTable = pgTable("owner_drawings", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  date: text("date").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertOwnerDrawingSchema = createInsertSchema(ownerDrawingsTable).omit({ id: true, created_at: true });
export type InsertOwnerDrawing = z.infer<typeof insertOwnerDrawingSchema>;
export type OwnerDrawing = typeof ownerDrawingsTable.$inferSelect;

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, created_at: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
