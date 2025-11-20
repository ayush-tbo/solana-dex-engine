-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ROUTING', 'BUILDING', 'SUBMITTED', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "DexType" AS ENUM ('RAYDIUM', 'METEORA');

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_id" VARCHAR(255) NOT NULL,
    "user_wallet" VARCHAR(255) NOT NULL,
    "token_in" VARCHAR(255) NOT NULL,
    "token_out" VARCHAR(255) NOT NULL,
    "amount_in" BIGINT NOT NULL,
    "amount_out" BIGINT,
    "status" "OrderStatus" NOT NULL,
    "selected_dex" "DexType",
    "executed_price" DECIMAL(20,8),
    "tx_hash" VARCHAR(255),
    "slippage" DECIMAL(5,4) NOT NULL,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_history" (
    "id" UUID NOT NULL,
    "order_id" VARCHAR(255) NOT NULL,
    "dex" "DexType" NOT NULL,
    "input_amount" BIGINT NOT NULL,
    "output_amount" BIGINT NOT NULL,
    "price" DECIMAL(20,8) NOT NULL,
    "fee" DECIMAL(20,8),
    "pool_id" VARCHAR(255),
    "was_selected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_id_key" ON "orders"("order_id");

-- CreateIndex
CREATE INDEX "orders_order_id_idx" ON "orders"("order_id");

-- CreateIndex
CREATE INDEX "orders_user_wallet_idx" ON "orders"("user_wallet");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_tx_hash_idx" ON "orders"("tx_hash");

-- CreateIndex
CREATE INDEX "quote_history_order_id_idx" ON "quote_history"("order_id");

-- CreateIndex
CREATE INDEX "quote_history_created_at_idx" ON "quote_history"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "quote_history" ADD CONSTRAINT "quote_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE CASCADE ON UPDATE CASCADE;
