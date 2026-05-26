import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Prisma } from "@prisma/client";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  isDefaultAdminIdentifier,
  upsertAdminUser,
} from "@/prisma/admin-user";

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

class DatabaseUnavailableError extends CredentialsSignin {
  code = "database_unavailable";
}

function isDatabaseUnavailableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return (
      error.code === "P1001" ||
      error.message.includes("Can't reach database server")
    );
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return error.message.includes("Can't reach database server");
  }

  return error instanceof Error
    ? error.message.includes("Can't reach database server")
    : false;
}

function getCredentialValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmailIdentifier(identifier: string) {
  return identifier.includes("@") ? identifier.toLowerCase() : identifier;
}

async function getCredentialUsers(identifier: string) {
  const normalizedIdentifier = identifier.trim();

  if (normalizedIdentifier.includes("@")) {
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizeEmailIdentifier(normalizedIdentifier),
          mode: "insensitive",
        },
      },
    });

    return user ? [user] : [];
  }

  return prisma.user.findMany({
    where: {
      name: {
        equals: normalizedIdentifier,
        mode: "insensitive",
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

async function getMatchingUserFromCandidates(
  candidates: Awaited<ReturnType<typeof getCredentialUsers>>,
  password: string
) {
  for (const candidate of candidates) {
    if (!candidate.password) {
      continue;
    }

    const isValid = await bcrypt.compare(password, candidate.password);

    if (isValid) {
      return candidate;
    }
  }

  return null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
        name: "credentials",
        credentials: {
          identifier: { label: "Email or name", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        portal: { label: "Portal", type: "text" },
      },
      async authorize(credentials) {
        const identifier = getCredentialValue(
          credentials?.identifier ?? credentials?.email
        );
        const password = getCredentialValue(credentials?.password);
        const isAdminPortal = getCredentialValue(credentials?.portal) === "admin";
        const isDefaultAdminLogin = isDefaultAdminIdentifier(identifier);

        if (!identifier || !password) {
          throw new InvalidCredentialsError();
        }

        let userCandidates;

        try {
          if (isDefaultAdminLogin) {
            userCandidates = [await upsertAdminUser(prisma)];
          } else {
            userCandidates = await getCredentialUsers(identifier);
          }
        } catch (error) {
          if (isDatabaseUnavailableError(error)) {
            throw new DatabaseUnavailableError();
          }

          throw error;
        }

        const user = await getMatchingUserFromCandidates(userCandidates, password);

        if (!user) {
          throw new InvalidCredentialsError();
        }

        if (isAdminPortal && user.role !== "ADMIN") {
          throw new InvalidCredentialsError();
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
      }

      if (!token.id && typeof token.sub === "string") {
        token.id = token.sub;
      }

      if (!token.role) {
        token.role = "USER";
      }

      if (trigger === "update" && session) {
        const nextUser = (
          session as {
            user?: { name?: string | null; image?: string | null };
          }
        ).user;

        if (typeof nextUser?.name === "string") {
          token.name = nextUser.name;
        }

        if (typeof nextUser?.image === "string" || nextUser?.image === null) {
          token.picture = nextUser.image;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id ?? token.sub) as string;
        session.user.role = token.role as string;
        session.user.name = token.name ?? null;
        session.user.image = token.picture ?? null;

        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
      }
      return session;
    },
  },
});
