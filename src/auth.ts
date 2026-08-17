import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          image: user.image ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.uid = user.id;
      }
      // Triggered by the client calling useSession().update({...}) after a
      // profile edit (username/email/image), so the session reflects the
      // change immediately instead of waiting for the next sign-in.
      if (trigger === "update" && session) {
        if (typeof session.name === "string") token.name = session.name;
        if (typeof session.email === "string") token.email = session.email;
        if (typeof session.image === "string") token.picture = session.image;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.uid) {
        (session.user as typeof session.user & { id: string }).id =
          token.uid as string;
      }
      // Assign unconditionally (not gated on truthiness) so clearing the
      // profile picture to "" actually propagates instead of getting stuck
      // on the old value — every consumer already treats "" as "no image".
      if (session.user) {
        if (token.name !== undefined) session.user.name = token.name as string;
        if (token.email !== undefined) session.user.email = token.email as string;
        if (token.picture !== undefined) session.user.image = token.picture as string;
      }
      return session;
    },
  },
});
