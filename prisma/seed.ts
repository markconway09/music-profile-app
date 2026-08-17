import { PrismaClient, ArtistType, ArtistOrigin } from "@prisma/client";

const prisma = new PrismaClient();

const artists: {
  name: string;
  type: ArtistType;
  origin: ArtistOrigin;
  members: string[];
  songs: string[];
}[] = [
  {
    name: "NEBULA",
    type: ArtistType.GROUP,
    origin: ArtistOrigin.KPOP,
    members: ["Yuna", "Riko", "Haeun", "Mina", "Soju"],
    songs: ["Skyline", "Glass Heart", "Nocturne", "Runaway"],
  },
  {
    name: "TIDE7",
    type: ArtistType.GROUP,
    origin: ArtistOrigin.KPOP,
    members: ["Doyoung", "Kaito", "Junho", "Ren", "Sunwoo", "Aki", "Minjae"],
    songs: ["Overdrive", "Paper Planes", "Echo"],
  },
  {
    name: "Hikari Prism",
    type: ArtistType.GROUP,
    origin: ArtistOrigin.JPOP,
    members: ["Sakura", "Nanami", "Yui", "Kokoro"],
    songs: ["Kirameki", "Starlight Diary", "Sayonara Again"],
  },
  {
    name: "Aoi Ren",
    type: ArtistType.SOLO,
    origin: ArtistOrigin.JPOP,
    members: [],
    songs: ["Blue Signal", "Midnight Train", "Reset"],
  },
  {
    name: "Dahlia",
    type: ArtistType.SOLO,
    origin: ArtistOrigin.KPOP,
    members: [],
    songs: ["Firelight", "Mirror Mirror"],
  },
];

async function main() {
  for (const a of artists) {
    const existing = await prisma.artist.findFirst({ where: { name: a.name } });
    if (existing) {
      console.log(`Skipping "${a.name}" — already seeded.`);
      continue;
    }

    const artist = await prisma.artist.create({
      data: { name: a.name, type: a.type, origin: a.origin },
    });

    if (a.members.length) {
      await prisma.groupMember.createMany({
        data: a.members.map((name) => ({ name, artistId: artist.id })),
      });
    }
    if (a.songs.length) {
      await prisma.song.createMany({
        data: a.songs.map((title) => ({ title, artistId: artist.id })),
      });
    }
    console.log(`Seeded "${a.name}".`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
