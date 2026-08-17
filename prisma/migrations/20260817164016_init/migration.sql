-- CreateEnum
CREATE TYPE "ArtistType" AS ENUM ('SOLO', 'GROUP');

-- CreateEnum
CREATE TYPE "ArtistOrigin" AS ENUM ('KPOP', 'JPOP', 'OTHER');

-- CreateEnum
CREATE TYPE "BiasCategory" AS ENUM ('VOCAL', 'DANCE', 'VISUAL', 'RAP', 'OVERALL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ArtistType" NOT NULL,
    "origin" "ArtistOrigin" NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFavoriteArtist" (
    "userId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "UserFavoriteArtist_pkey" PRIMARY KEY ("userId","artistId")
);

-- CreateTable
CREATE TABLE "UserTopSong" (
    "userId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "UserTopSong_pkey" PRIMARY KEY ("userId","songId")
);

-- CreateTable
CREATE TABLE "UserMemberRanking" (
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "UserMemberRanking_pkey" PRIMARY KEY ("userId","groupId","memberId")
);

-- CreateTable
CREATE TABLE "UserBias" (
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "category" "BiasCategory" NOT NULL,

    CONSTRAINT "UserBias_pkey" PRIMARY KEY ("userId","groupId","category")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Artist_name_idx" ON "Artist"("name");

-- CreateIndex
CREATE INDEX "Song_artistId_idx" ON "Song"("artistId");

-- CreateIndex
CREATE INDEX "GroupMember_artistId_idx" ON "GroupMember"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFavoriteArtist_userId_rank_key" ON "UserFavoriteArtist"("userId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "UserTopSong_userId_rank_key" ON "UserTopSong"("userId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "UserMemberRanking_userId_groupId_rank_key" ON "UserMemberRanking"("userId", "groupId", "rank");

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteArtist" ADD CONSTRAINT "UserFavoriteArtist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteArtist" ADD CONSTRAINT "UserFavoriteArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTopSong" ADD CONSTRAINT "UserTopSong_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTopSong" ADD CONSTRAINT "UserTopSong_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMemberRanking" ADD CONSTRAINT "UserMemberRanking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMemberRanking" ADD CONSTRAINT "UserMemberRanking_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMemberRanking" ADD CONSTRAINT "UserMemberRanking_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "GroupMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBias" ADD CONSTRAINT "UserBias_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBias" ADD CONSTRAINT "UserBias_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBias" ADD CONSTRAINT "UserBias_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "GroupMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
