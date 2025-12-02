import { /*PrismaClient,*/ User } from '@prisma/client'
import { Response } from 'express'
import { isAddress } from 'viem'
import { errorResponse } from '../utils/utils'
import { addNotification, prisma } from '../utils'
import { AuthenticatedRequest } from '../types'

//const prisma = new PrismaClient();
// Create a new team
const addTeam = async (req: AuthenticatedRequest, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const { name, members, description, officerAddress } = req.body
  const callerAddress = req.address
  try {
    // Validate all members' wallet addresses
    for (const member of members) {
      if (!isAddress(member.address)) {
        return errorResponse(400, `Invalid wallet address for member: ${member.name}`, res)
      }
    }

    // Find the owner (user) by their address
    const owner = await prisma.user.findUnique({
      where: {
        address: String(callerAddress)
      }
    })

    if (!owner) {
      return errorResponse(404, 'Owner not found', res)
    }

    // Ensure the owner's wallet address is in the members list
    if (!members.some((member: User) => member.address === callerAddress)) {
      members.push({
        name: owner.name,
        address: owner.address
      })
    }

    // Create the team with the members connected
    const team = await prisma.team.create({
      data: {
        name,
        description,
        ownerAddress: String(callerAddress),
        members: {
          connect: members.map((member: User) => ({
            address: member.address
          }))
        },
        officerAddress: officerAddress
      },
      include: {
        members: {
          select: {
            address: true,
            name: true
          }
        }
      }
    })

    addNotification(
      members.map((member: User) => member.address),
      {
        message: `You have been added to a new team: ${name} by ${owner.name}`,
        subject: 'Team Invitation',
        author: owner.address?.toString() || '',
        resource: `teams/${team.id}`
      }
    )
    res.status(201).json(team)
  } catch (error) {
    const err = error as Error
    return errorResponse(500, err.message, res)
  }
}
// Get Team
const getTeam = async (req: AuthenticatedRequest, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const { id } = req.params
  const callerAddress = req.address
  try {
    const team = await prisma.team.findUnique({
      where: {
        id: Number(id)
      },
      include: {
        members: {
          select: {
            address: true,
            name: true,
            imageUrl: true
          }
        },
        teamContracts: true
      }
    })

    // Handle 404
    if (!team) {
      return errorResponse(404, 'Team not found', res)
    }

    if (!isUserPartOfTheTeam(team?.members ?? [], callerAddress || '')) {
      return errorResponse(403, 'Unauthorized', res)
    }

    res.status(200).json(team)
  } catch (error) {
    const err = error as Error
    return errorResponse(500, err.message, res)
  }
}

// Get teams owned by user
const getAllTeams = async (req: AuthenticatedRequest, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const callerAddress = String(req.address)
  try {
    // Get teams owned by the user

    // Get teams where the user is a member
    const memberTeams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            address: callerAddress
          }
        }
      },
      include: {
        _count: {
          select: {
            members: true
          }
        }
      }
    })

    // Combine owned and member teams

    res.status(200).json(memberTeams)
  } catch (error) {
    const err = error as Error
    return errorResponse(500, err.message, res)
  }
}

// Update team

const updateTeam = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const { name, description, officerAddress } = req.body
  const callerAddress = req.address
  try {
    const team = await prisma.team.findUnique({
      where: {
        id: Number(id)
      }
    })
    if (!team) {
      return errorResponse(404, 'Team not found', res)
    }
    if (team.ownerAddress !== callerAddress) {
      return errorResponse(403, 'Unauthorized', res)
    }

    const teamU = await prisma.team.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        officerAddress
      },
      include: {
        members: {
          select: {
            address: true,
            name: true
          }
        },
        teamContracts: true
      }
    })
    res.status(200).json(teamU)
  } catch (error) {
    const err = error as Error
    return errorResponse(500, err.message, res)
  }
}

// Delete Team
const deleteTeam = async (req: AuthenticatedRequest, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const { id } = req.params
  const callerAddress = req.address
  try {
    const team = await prisma.team.findUnique({ where: { id: Number(id) } })
    if (!team) {
      return errorResponse(404, 'Team not found', res)
    }
    if (team.ownerAddress !== callerAddress) {
      return errorResponse(403, 'Unauthorized', res)
    }
    await prisma.boardOfDirectorActions.deleteMany({
      where: { teamId: Number(id) }
    })

    await prisma.memberTeamsData.deleteMany({ where: { teamId: Number(id) } })

    await prisma.teamContract.deleteMany({ where: { teamId: Number(id) } })

    await prisma.claim.deleteMany({ where: { wage: { teamId: Number(id) } } })

    await prisma.wage.deleteMany({ where: { teamId: Number(id) } })

    await prisma.expense.deleteMany({ where: { teamId: Number(id) } })

    const teamD = await prisma.team.delete({ where: { id: Number(id) } })

    res.status(200).json({ team: teamD, success: true })
  } catch (error) {
    const err = error as Error
    return errorResponse(500, err.message, res)
  }
}

const isUserPartOfTheTeam = (
  members: { address: string; name?: string | null }[],
  callerAddress: string
) => {
  return members.some((member) => member.address === callerAddress)
}

// const buildFilterMember = (queryParams: Request["query"]) => {
//   const filterQuery: Prisma.UserWhereInput = {};
//   if (queryParams.query) {
//     filterQuery.OR = [
//       { name: { contains: String(queryParams.query), mode: "insensitive" } },
//       { address: { contains: String(queryParams.query), mode: "insensitive" } },
//     ];
//   }

//   // can add others filter

//   return filterQuery;
// };

export { addTeam, updateTeam, deleteTeam, getTeam, getAllTeams }
