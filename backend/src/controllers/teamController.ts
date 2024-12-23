import { Prisma, /*PrismaClient,*/ User } from "@prisma/client";
import { Request, Response } from "express";
import { isAddress } from "ethers";
import { errorResponse } from "../utils/utils";
import { addNotification, prisma } from "../utils";
import exp from "constants";

//const prisma = new PrismaClient();
// Create a new team
const addTeam = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const { name, members, description } = req.body;
  const callerAddress = (req as any).address;
  try {
    // Validate all members' wallet addresses
    for (const member of members) {
      if (!isAddress(member.address)) {
        throw new Error(`Invalid wallet address for member: ${member.name}`);
      }
    }

    // Find the owner (user) by their address
    const owner = await prisma.user.findUnique({
      where: {
        address: String(callerAddress),
      },
    });

    if (!owner) {
      return errorResponse(404, "Owner not found", res);
    }

    // Ensure the owner's wallet address is in the members list
    if (!members.some((member: User) => member.address === callerAddress)) {
      members.push({
        name: owner.name || "User",
        address: owner.address,
      });
    }

    // Create the team with the members connected
    const team = await prisma.team.create({
      data: {
        name,
        description,
        ownerAddress: String(callerAddress),
        members: {
          connect: members.map((member: User) => ({
            address: member.address,
          })),
        },
      },
      include: {
        members: {
          select: {
            address: true,
            name: true,
          },
        },
      },
    });

    addNotification(
      members.map((member: User) => member.address),
      {
        message: `You have been added to a new team: ${name} by ${owner.name}`,
        subject: "Team Invitation",
        author: owner.address?.toString() || "",
        resource: `teams/${team.id}`,
      }
    );
    res.status(201).json(team);
  } catch (error: any) {
    return errorResponse(500, error.message, res);
  }
};
// Get Team
const getTeam = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const { id } = req.params;
  const callerAddress = (req as any).address;
  try {
    let team = await prisma.team.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        members: {
          select: {
            address: true,
            name: true,
          },
        },
        teamContracts: true,
      },
    });

    if (!isUserPartOfTheTeam(team?.members ?? [], callerAddress)) {
      return errorResponse(403, "Unauthorized", res);
    }

    // Handle 404
    if (!team) {
      return errorResponse(404, "Team not found", res);
    }

    if (!req.query) {
      res.status(200).json({ team, success: true });
    }

    const filterQuery = buildFilterMember(req.query);
    team = await prisma.team.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        members: {
          where: filterQuery,
          select: {
            address: true,
            name: true,
            memberTeamsData: {
              select: {
                expenseAccountData: true,
                expenseAccountSignature: true
              }
            }
          },
        },
        teamContracts: true,
      },
    });
    res.status(200).json(team);
  } catch (error: any) {
    return errorResponse(500, error.message, res);
  }
};

// Get teams owned by user
const getAllTeams = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const callerAddress = String((req as any).address);
  try {
    // Get teams owned by the user

    // Get teams where the user is a member
    const memberTeams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            address: callerAddress,
          },
        },
      },
      // include: {
      //   members: {
      //     select: {
      //       address: true,
      //       name: true,
      //     },
      //   },
      // },
    });

    // Combine owned and member teams

    res.status(200).json(memberTeams);
  } catch (error: any) {
    return errorResponse(500, error.message, res);
  }
};

// Update team
const updateTeam = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const { id } = req.params;
  const {
    name,
    description,
    bankAddress,
    votingAddress,
    boardOfDirectorsAddress,
    expenseAccountAddress,
    expenseAccountEip712Address,
    officerAddress,
    teamContract,
    cashRemunerationEip712Address,
    investorsAddress
  } = req.body;
  const callerAddress = (req as any).address;
  try {
    const team = await prisma.team.findUnique({
      where: {
        id: Number(id),
      },
    });
    if (!team) {
      return errorResponse(404, "Team not found", res);
    }
    if (team.ownerAddress !== callerAddress) {
      return errorResponse(403, "Unauthorized", res);
    }

    if (teamContract) {
      if (!isAddress(teamContract.address)) {
        return errorResponse(400, "Invalid contract address", res);
      }

      const existingContract= await prisma.teamContract.findUnique({
        where:{
          address:teamContract.address
        }
      });

      if(existingContract){
        //update the existing contract if found
        await prisma.teamContract.update({
          where: {address: teamContract.address},
          data:{
            type: teamContract.type,
            deployer: teamContract.deployer,
            admins:teamContract.admins,
          },
        });
      }else{
        await prisma.teamContract.create({
          data: {
            address: teamContract.address,
            type: teamContract.type,
            deployer: teamContract.deployer,
            admins: teamContract.admins,
            teamId: team.id,
          },
        });
      }
      
    }

    const teamU = await prisma.team.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        bankAddress,
        votingAddress,
        boardOfDirectorsAddress,
        expenseAccountAddress,
        officerAddress,
        expenseAccountEip712Address,
        cashRemunerationEip712Address,
        investorsAddress
      },
      include: {
        members: {
          select: {
            address: true,
            name: true,
          },
        },
        teamContracts:true
      },
    });
    res.status(200).json(teamU);
  } catch (error: any) {
    return errorResponse(500, error.message, res);
  }
};

// Delete Team
const deleteTeam = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Teams']
  */
  const { id } = req.params;
  const callerAddress = (req as any).address;
  try {
    const team = await prisma.team.findUnique({
      where: {
        id: Number(id),
      },
    });
    if (!team) {
      return errorResponse(404, "Team not found", res);
    }
    if (team.ownerAddress !== callerAddress) {
      return errorResponse(403, "Unauthorized", res);
    }
    await prisma.boardOfDirectorActions.deleteMany({
      where: { teamId: Number(id) }
    })

    //delete claims
    // Step 1: Find all MemberTeamsData IDs associated with the Team
    const memberTeamsDataIds = await prisma.memberTeamsData.findMany({
      where: {
        teamId: Number(id),
      },
      select: {
        id: true,
      },
    });

    const idsToDelete = memberTeamsDataIds.map((record) => record.id);

    // Step 2: Delete related Claim records
    if (idsToDelete.length > 0) {
      await prisma.claim.deleteMany({
        where: {
          memberTeamsDataId: {
            in: idsToDelete,
          },
        },
      });
    }

    await prisma.memberTeamsData.deleteMany({
      where: { teamId: Number(id) }
    })
    await prisma.teamContract.deleteMany({
      where: { teamId: Number(id) }
    })
    const teamD = await prisma.team.delete({
      where: {
        id: Number(id),
      },
    });

    res.status(200).json({ team: teamD, success: true });
  } catch (error: any) {
    return errorResponse(500, error.message, res);
  }
};

const deleteMember = async (req: Request, res: Response) => {
  const { id } = req.params;
  const memberAddress = req.headers.memberaddress;
  const callerAddress = (req as any).address;
  try {
    // Find the team
    const team = await prisma.team.findUnique({
      where: { id: Number(id) },
      include: { members: true },
    });

    // Check if the team exists
    if (!team) {
      throw new Error("Team not found");
    }
    if (team.ownerAddress !== callerAddress) {
      return errorResponse(403, "Unauthorized", res);
    }
    if (team.ownerAddress === memberAddress) {
      return errorResponse(401, "Owner cannot be removed", res);
    }

    // Find the index of the member in the team
    const memberIndex = team.members.findIndex(
      (member) => member.address === memberAddress
    );

    // If member not found in the team, throw an error
    if (memberIndex === -1) {
      throw new Error("Member not found in the team");
    }

    // Update the team to disconnect the specified member
    const name = team.name;
    const description = team.description;

    await prisma.memberTeamsData.delete({
      where: {
        userAddress_teamId: {
          userAddress: String(memberAddress),
          teamId: Number(id)
        }
      }
    })

    const updatedTeam = await prisma.team.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        members: {
          disconnect: { address: String(memberAddress) },
        },
      },
      include: {
        members: {
          select: {
            address: true,
            name: true,
          },
        },
      },
    });
    res.status(200).json({ success: true, team: updatedTeam });
  } catch (error: any) {
    // Handle errors
    return errorResponse(500, error.message || "Internal Server Error", res);
  }
};
const addMembers = async (req: Request, res: Response) => {
  const { id } = req.params;
  const membersData = req.body.data;
  try {
    // Fetch the team and its current members
    const team = await prisma.team.findUnique({
      where: { id: Number(id) },
      include: { members: true },
    });

    if (!team) {
      throw new Error("Team not found");
    }

    await prisma.team.update({
      where: { id: Number(id) },
      data: {
        members: {
          connect: membersData.map((member: User) => ({
            address: member.address,
          })),
        },
      },
    });

    // Fetch all members of the team after addition
    const updatedTeam = await prisma.team.findUnique({
      where: { id: Number(id) },
      include: { members: true },
    });

    // Return the updated members list
    return res
      .status(201)
      .json({ members: updatedTeam?.members, success: true });
  } catch (error: any) {
    return errorResponse(500, error.message || "Internal Server Error", res);
  }
};

//Add Expense Account Data
export const addExpenseAccountData = async (req: Request, res: Response) => {
  const { id } = req.params
  const callerAddress = (req as any).address
  const expenseAccountData = req.body

  try {
    const team = await prisma.team.findUnique({
      where: { id: Number(id) }
    })
    const ownerAddress = team?.ownerAddress
    if (callerAddress !== ownerAddress) {
      return errorResponse(403, `Forbidden`, res)
    }
  
    //create expense account data
    await prisma.memberTeamsData.upsert({
      where: {
        userAddress_teamId: {
          userAddress: expenseAccountData.expenseAccountData.approvedAddress,
          teamId: Number(id)
        }
      },
      update: {
        expenseAccountData: JSON.stringify(expenseAccountData.expenseAccountData),
        expenseAccountSignature: expenseAccountData.signature
      },
      create: {
        userAddress: expenseAccountData.expenseAccountData.approvedAddress,
        teamId: Number(id),
        expenseAccountData: JSON.stringify(expenseAccountData.expenseAccountData),
        expenseAccountSignature: expenseAccountData.signature
      }
    })

    res.status(201)
      .json({
        success: true
      })
  } catch (error) {
    return errorResponse(500, error, res)
  }
}

export const getExpenseAccountData = async (req: Request, res: Response) => {
  const { id } = req.params
  const memberAddress = req.headers.memberaddress;

  try {
    if (memberAddress) { 
      const memberTeamsData = await prisma.memberTeamsData.findUnique({
        where: {
          userAddress_teamId: {
            userAddress: String(memberAddress),
            teamId: Number(id)
          }
        }
      })

      res.status(201)
        .json({
          data: memberTeamsData?.expenseAccountData,
          signature: memberTeamsData?.expenseAccountSignature
        })
    } else {
      let memberTeamsData = await prisma.memberTeamsData.findMany({
        where: {
          teamId: Number(id)
        }
      })
      let expenseAccountData = memberTeamsData.map(item => {
        if (item.expenseAccountData)
          return {
            ...JSON.parse(item.expenseAccountData), 
            signature: item.expenseAccountSignature
          }
      })

      res.status(201)
        .json(expenseAccountData)
    }
  } catch (error) {
    return errorResponse(500, error, res)
  } finally {
    await prisma.$disconnect()
  }
}

export const addEmployeeWage = async (req: Request, res: Response) => {
  const { id } = req.params
  const callerAddress = (req as any).address
  const memberAddress = req.headers.memberaddress;
  const wageData = req.body

  try {
    const team = await prisma.team.findUnique({
      where: { id: Number(id) }
    })
    const ownerAddress = team?.ownerAddress
    if (callerAddress !== ownerAddress) {
      return errorResponse(403, `Forbidden`, res)
    }
    if (typeof memberAddress !== 'string') {
      return errorResponse(400, 'Bad Request', res)
    }
    //create or update wage data
    await prisma.memberTeamsData.upsert({
      where: {
        userAddress_teamId: {
          userAddress: memberAddress,
          teamId: Number(id)
        }
      },
      update: {
        hourlyRate: wageData.hourlyRate,
        maxHoursPerWeek: wageData.maxHoursPerWeek
      },
      create: {
        userAddress: memberAddress,
        teamId: Number(id),
        hourlyRate: wageData.hourlyRate,
        maxHoursPerWeek: wageData.maxHoursPerWeek
      }
    })

    res.status(201)
      .json({
        success: true
      })

  } catch (error) {
    return errorResponse(500, error, res)
  } finally {
    await prisma.$disconnect()
  }
}

export const addClaim = async (req: Request, res: Response) => {
  const { id } = req.params
  const callerAddress = (req as any).address
  //const hoursWorked = req.headers.hoursworked
  const { hoursWorked } = req.body

  try {
    if (isNaN(Number(hoursWorked)) || !hoursWorked) 
      return errorResponse(400, 'Bad Request', res)
    const memberTeamsData = await prisma.memberTeamsData.findUnique({
      where: {
        userAddress_teamId: {
          userAddress: callerAddress,
          teamId: Number(id)
        }
      }
    })
    if (!memberTeamsData) {
      return errorResponse(404, 'Record Not Found', res)
    }
    await prisma.claim.create({
      data: {
        hoursWorked: Number(hoursWorked),
        status: 'pending',
        memberTeamsDataId: memberTeamsData?.id
      }
    })
    res.status(201)
      .json({
        success: true
      })
  } catch (error) {
    return errorResponse(500, error, res)
  } finally {
    await prisma.$disconnect()
  }
}

export const updateClaim = async (req: Request, res: Response) => {
  const { callerRole } = req.params

  if (callerRole === "employee") {
    await updateClaimEmployee(req, res)
  } else if (callerRole === "employer") {
    await updateClaimEmployer(req, res)
  } else {
    return errorResponse(404, 'Resource Not Found', res)
  }
}

export const updateClaimEmployee = async (req: Request, res: Response) => {
  const { id } = req.params
  const callerAddress = (req as any).address
  const { 
    claimid: claimId, 
    hoursworked: hoursWorked 
  } = req.headers
  
  try {
    const memberTeamsData = await prisma.memberTeamsData.findUnique({
      where: {
        userAddress_teamId: {
          userAddress: callerAddress,
          teamId: Number(id)
        }
      }
    })

    const claim = await prisma.claim.findUnique({
      where: { id: Number(claimId) }
    })

    if (claim?.status !== `pending`) 
      return errorResponse(403, `Forbidden`, res)

    if (claim?.memberTeamsDataId !== memberTeamsData?.id)
      return errorResponse(403, `Forbidden`, res)
    
    await prisma.claim.update({
      where: { id: Number(id) },
      data: { hoursWorked: Number(hoursWorked) }
    })
    
    res.status(201)
      .json({ success: true })
  } catch (error) {
    return errorResponse(500, error, res)
  } finally {
    await prisma.$disconnect()
  }
}

export const deleteClaim = async (req: Request, res: Response) => {
  const { id } = req.params
  const callerAddress = (req as any).address
  const claimId = req.headers.claimid
  
  try {
    const memberTeamsData = await prisma.memberTeamsData.findUnique({
      where: {
        userAddress_teamId: {
          userAddress: callerAddress,
          teamId: Number(id)
        }
      }
    })

    const claim = await prisma.claim.findUnique({
      where: { id: Number(claimId) }
    })

    if (claim?.memberTeamsDataId !== memberTeamsData?.id)
      return errorResponse(403, `Forbidden`, res)

    if (claim?.status !== `pending`) 
      return errorResponse(403, `Forbidden`, res)

    await prisma.claim.delete({
      where: { id: Number(id) }
    })

    res.status(201)
      .json({ success: true })
  } catch (error) {
    return errorResponse(500, error, res)
  } finally {
    await prisma.$disconnect()
  }
}

export const updateClaimEmployer = async (req: Request, res: Response) => {
  const { id } = req.params
  const callerAddress = (req as any).address
  const approvalData = req.body

  try {
    const team = await prisma.team.findUnique({
      where: { id: Number(id) }
    })
    if (team?.ownerAddress !== callerAddress) 
      return errorResponse(403, `Forbidden`, res)
    const claim = await prisma.claim.findUnique({
      where: { id: Number(approvalData.id) }
    })
    if (claim?.status !== 'pending')
      return errorResponse(403, 'Forbidden', res)
    const memberTeamsData = await prisma.memberTeamsData.findUnique({
      where: { id: claim?.memberTeamsDataId }
    })
    if (memberTeamsData?.teamId !== team?.id) 
      return errorResponse(403, `Forbidden`, res)
    if (typeof approvalData.signature !== 'string')
      return errorResponse(400, 'Bad Request', res)

    await prisma.claim.update({
      where: { id: claim?.id },
      data: { cashRemunerationSignature: approvalData.signature, status: 'approved' }
    })
    if (memberTeamsData?.userAddress)
      addNotification(
        [memberTeamsData?.userAddress],
        {
          message: `Your wage claim for ${ (new Date(claim.createdAt)).toLocaleString() } has been approved.`,
          subject: "Wage Claim Approval",
          author: team?.ownerAddress || "",
          resource: `wage-claim/${claim.id}`,
        }
      );

    res.status(201)
      .json({ success: true })
  } catch (error) {
    return errorResponse(500, error, res)
  } finally {
    await prisma.$disconnect()
  }
}

export const getClaim = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const claim = await prisma.claim.findUnique({
      where: { id: Number(id) }
    })

    if (!claim)
      return errorResponse(404, 'Resource Not Found', res)

    const memberTeamsData = await prisma.memberTeamsData.findUnique({
      where: { id: claim.memberTeamsDataId }
    })

    res.status(201)
      .json({ 
        ...claim, 
        hourlyRate: memberTeamsData?.hourlyRate, 
        teamId: memberTeamsData?.teamId 
      })
  } catch (error) {
    return errorResponse(500, error, res)
  } finally {
    await prisma.$disconnect()
  }
}

export const getClaims = async (req: Request, res: Response) => {
  const { id, status } = req.params
  const callerAddress = (req as any).address

  try {
    const team = await prisma.team.findUnique({
      where: { id: Number(id) }
    })

    if (!team)
      return errorResponse(404, 'Resource Not Found', res)

    if (team.ownerAddress === callerAddress) {
      const claims = await prisma.memberTeamsData.findMany({
        where: {
          teamId: team.id,
          claims: {
            some: {
              status,
            },
          },
        },
        select: {
          user: {
            select: {
              name: true,
            },
          },
          userAddress: true,
          claims: {
            where: {
              status,
            },
            select: {
              id: true,
              hoursWorked: true,
              createdAt: true,
            },
          },
          hourlyRate: true,
        },
      })

      const flattenedClaims = claims.flatMap(item =>
        item.claims.map((claim) => ({
          id: claim.id,
          name: item.user.name,
          address: item.userAddress,
          hourlyRate: item.hourlyRate,
          hoursWorked: claim.hoursWorked,
          createdAt: claim.createdAt,
        }))
      )

      res.status(201)
        .json(flattenedClaims)
    } else {
      const claims = await prisma.memberTeamsData.findMany({
        where: {
          teamId: team.id,
          userAddress: callerAddress,
          claims: {
            some: {
              status,
            },
          },
        },
        select: {
          user: {
            select: {
              name: true,
            },
          },
          userAddress: true,
          claims: {
            where: {
              status,
            },
            select: {
              id: true,
              hoursWorked: true,
              createdAt: true,
            },
          },
          hourlyRate: true,
        },
      })

      const flattenedClaims = claims.flatMap(item =>
        item.claims.map((claim) => ({
          id: claim.id,
          name: item.user.name,
          address: item.userAddress,
          hourlyRate: item.hourlyRate,
          hoursWorked: claim.hoursWorked,
          createdAt: claim.createdAt,
        }))
      )

      res.status(201)
        .json(flattenedClaims)
    }
  } catch (error) {
    return errorResponse(500, error, res)
  } finally {
    await prisma.$disconnect()
  }
}

const isUserPartOfTheTeam = async (
  members: { address: string; name?: string | null }[],
  callerAddress: string
) => {
  return members.some((member) => member.address === callerAddress);
};

const buildFilterMember = (queryParams: Request["query"]) => {
  const filterQuery: Prisma.UserWhereInput = {};
  if (queryParams.query) {
    filterQuery.OR = [
      {
        name: {
          contains: String(queryParams.query),
          mode: "insensitive",
        },
      },
      {
        address: {
          contains: String(queryParams.query),
          mode: "insensitive",
        },
      },
    ];
  }

  // can add others filter

  return filterQuery;
};

export {
  addTeam,
  updateTeam,
  deleteTeam,
  getTeam,
  getAllTeams,
  deleteMember,
  addMembers,
};
