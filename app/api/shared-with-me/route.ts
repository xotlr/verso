import { createApiHandler } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user }) => {
    const [screenplays, projects, series] = await Promise.all([
      prisma.screenplayShare.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          role: true,
          createdAt: true,
          sharer: { select: { id: true, name: true, image: true } },
          screenplay: {
            select: {
              id: true,
              title: true,
              logline: true,
              genre: true,
              updatedAt: true,
              type: true,
              user: { select: { id: true, name: true, image: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.projectShare.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          role: true,
          createdAt: true,
          sharer: { select: { id: true, name: true, image: true } },
          project: {
            select: {
              id: true,
              name: true,
              description: true,
              type: true,
              status: true,
              updatedAt: true,
              user: { select: { id: true, name: true, image: true } },
              _count: { select: { screenplays: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.seriesShare.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          role: true,
          createdAt: true,
          sharer: { select: { id: true, name: true, image: true } },
          series: {
            select: {
              id: true,
              title: true,
              logline: true,
              genre: true,
              format: true,
              updatedAt: true,
              user: { select: { id: true, name: true, image: true } },
              _count: { select: { seasons: true, episodes: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ])

    return {
      screenplays: screenplays.map((s) => ({
        ...s.screenplay,
        shareId: s.id,
        shareRole: s.role,
        sharedAt: s.createdAt,
        sharedBy: s.sharer,
        type: "screenplay" as const,
      })),
      projects: projects.map((p) => ({
        ...p.project,
        shareId: p.id,
        shareRole: p.role,
        sharedAt: p.createdAt,
        sharedBy: p.sharer,
        type: "project" as const,
      })),
      series: series.map((s) => ({
        ...s.series,
        shareId: s.id,
        shareRole: s.role,
        sharedAt: s.createdAt,
        sharedBy: s.sharer,
        type: "series" as const,
      })),
    }
  },
})
