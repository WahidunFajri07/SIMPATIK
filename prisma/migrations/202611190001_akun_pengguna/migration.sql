-- CreateTable
CREATE TABLE "pengguna" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "sandi" TEXT NOT NULL,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubah_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengguna_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pengguna_email_key" ON "pengguna"("email");