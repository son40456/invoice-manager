-- CreateTable
CREATE TABLE "ZaloLog" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error_code" TEXT,
    "error_msg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZaloLog_pkey" PRIMARY KEY ("id")
);
