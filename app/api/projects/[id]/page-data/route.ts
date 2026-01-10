import { NextResponse } from "next/server"
import { createApiHandler, NotFoundError } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const GET = createApiHandler({
  auth: "required",
  handler: async ({ user, params }) => {
    const { id: projectId } = params

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        coverImage: true,
        banner: true,
        logo: true,
        status: true,
        budget: true,
        isPublic: true,
        publishedAt: true,
        userId: true,
        teamId: true,
        createdAt: true,
        updatedAt: true,
        team: {
          select: {
            id: true,
            name: true,
            members: {
              where: { userId: user.id },
              select: { userId: true },
            },
          },
        },
        screenplays: {
          select: {
            id: true,
            title: true,
            logline: true,
            synopsis: true,
            wordCount: true,
            genre: true,
            isFavorite: true,
            type: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        },
        notes: {
          select: {
            id: true,
            title: true,
            category: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        },
        schedules: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        budgets: {
          select: {
            id: true,
            title: true,
            total: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        roles: {
          select: {
            id: true,
            role: true,
            name: true,
            userId: true,
            user: { select: { id: true, name: true, image: true } },
          },
          orderBy: { role: "asc" },
        },
        _count: {
          select: { screenplays: true, notes: true, schedules: true, budgets: true },
        },
      },
    })

    if (!project) {
      throw new NotFoundError("Project")
    }

    const isOwner = project.userId === user.id
    const isTeamMember = project.team?.members && project.team.members.length > 0

    if (!isOwner && !isTeamMember) {
      throw new NotFoundError("Project")
    }

    const [links, callsheets] = await Promise.all([
      prisma.externalLink.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.callsheet.findMany({
        where: { projectId },
        orderBy: { shootDate: "asc" },
        select: {
          id: true,
          title: true,
          shootDate: true,
          callTime: true,
          wrapTime: true,
          status: true,
          primaryLocation: true,
          weatherForecast: true,
          weatherTemp: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ])

    const { team, ...projectData } = project
    const cleanProject = {
      ...projectData,
      team: team ? { id: team.id, name: team.name } : null,
    }

    const response = NextResponse.json({
      project: cleanProject,
      links,
      callsheets,
    })

    response.headers.set("Cache-Control", "private, max-age=30")
    return response
  },
})
