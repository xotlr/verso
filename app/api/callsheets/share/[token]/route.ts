import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { CallsheetData, CrewMember } from "@/types/callsheet"

// Helper to filter callsheet data by department or person
function filterCallsheetData(
  data: CallsheetData | null,
  filterType: string,
  filterValue: string | null
): CallsheetData | null {
  if (!data || filterType === "all" || !filterValue) {
    return data
  }

  const normalizedFilter = filterValue.toLowerCase().trim()

  if (filterType === "department") {
    // Filter crew by department
    return {
      ...data,
      crew: data.crew?.filter(
        (member: CrewMember) =>
          member.department.toLowerCase() === normalizedFilter
      ) || [],
    }
  }

  if (filterType === "person") {
    // Filter to show only specific person's info
    return {
      ...data,
      crew: data.crew?.filter(
        (member: CrewMember) =>
          member.name.toLowerCase().includes(normalizedFilter)
      ) || [],
      // Keep other essential info but don't filter cast (they might need their scenes)
    }
  }

  return data
}

// GET /api/callsheets/share/[token] - Public: fetch callsheet
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const shareLink = await prisma.callsheetShareLink.findUnique({
      where: { token },
      include: {
        callsheet: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    // Token not found
    if (!shareLink) {
      return NextResponse.json(
        { error: "Callsheet share link not found" },
        { status: 404 }
      )
    }

    // Link is deactivated
    if (!shareLink.isActive) {
      return NextResponse.json(
        { error: "This share link has been revoked" },
        { status: 410 }
      )
    }

    // Link has expired
    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 410 }
      )
    }

    const { callsheet } = shareLink

    // Filter the callsheet data based on filter settings
    const filteredData = filterCallsheetData(
      callsheet.data as CallsheetData | null,
      shareLink.filterType,
      shareLink.filterValue
    )

    return NextResponse.json({
      callsheet: {
        id: callsheet.id,
        title: callsheet.title,
        shootDate: callsheet.shootDate,
        callTime: callsheet.callTime,
        wrapTime: callsheet.wrapTime,
        status: callsheet.status,
        primaryLocation: callsheet.primaryLocation,
        weatherForecast: callsheet.weatherForecast,
        weatherTemp: callsheet.weatherTemp,
        data: filteredData,
        project: callsheet.project,
      },
      filterType: shareLink.filterType,
      filterValue: shareLink.filterValue,
      expiresAt: shareLink.expiresAt,
      createdBy: shareLink.user.name,
    })
  } catch (error) {
    console.error("[CALLSHEET_SHARE_TOKEN_GET]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/callsheets/share/[token] - Revoke a share link (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { token } = await params

    const shareLink = await prisma.callsheetShareLink.findUnique({
      where: { token },
    })

    if (!shareLink) {
      return NextResponse.json(
        { error: "Share link not found" },
        { status: 404 }
      )
    }

    // Only the creator can revoke
    if (shareLink.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    // Soft delete by deactivating
    await prisma.callsheetShareLink.update({
      where: { token },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CALLSHEET_SHARE_TOKEN_DELETE]", error)
    return NextResponse.json(
      { error: "Failed to revoke share link" },
      { status: 500 }
    )
  }
}
