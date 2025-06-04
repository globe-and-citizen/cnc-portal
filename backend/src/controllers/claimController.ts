import { Request, Response } from "express";
import { errorResponse } from "../utils/utils";
import { prisma } from "../utils";
import { Prisma, Claim } from "@prisma/client";
import { isUserMemberOfTeam } from "./wageController";

type claimBodyRequest = Pick<Claim, "hoursWorked"> & {
  memo: string;
  teamId: string;
};
export const addClaim = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;

  const body = req.body as claimBodyRequest;
  const hoursWorked = Number(body.hoursWorked);
  const memo = body.memo as string;
  const teamId = Number(body.teamId);

  // Validating the claim data
  // Checking required data
  let parametersError: string[] = [];
  if (!body.teamId) parametersError.push("Missing teamId");
  if (!body.hoursWorked) parametersError.push("Missing hoursWorked");
  if (!body.memo) parametersError.push("Missing memo");
  if (isNaN(hoursWorked)) parametersError.push("Invalid hoursWorked");
  if (memo && memo.trim().length === 0) {
    parametersError.push("Invalid memo");
  }
  if (memo && memo.trim().split(/\s+/).length > 200) {
    parametersError.push("memo is too long, max 200 words");
  }
  if (isNaN(teamId)) parametersError.push("Invalid teamId");
  if (hoursWorked <= 0)
    parametersError.push(
      "Invalid hoursWorked, hoursWorked must be greater than 0"
    );
  if (parametersError.length > 0) {
    return errorResponse(400, parametersError.join(", "), res);
  }

  try {
    // Get user current
    const wage = await prisma.wage.findFirst({
      where: { userAddress: callerAddress, nextWageId: null, teamId: teamId },
    });

    if (!wage) {
      return errorResponse(400, "No wage found for the user", res);
    }
    const claim = await prisma.claim.create({
      data: {
        hoursWorked,
        memo,
        wageId: wage.id,
        status: "pending",
      },
    });

    return res.status(201).json(claim);
  } catch (error) {
    return errorResponse(500, "Internal Server Error", res);
  } finally {
    await prisma.$disconnect();
  }
};

export const getClaims = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;
  const teamId = Number(req.query.teamId);
  const status = req.query.status as string;

  try {
    // Validate teamId
    if (isNaN(teamId)) {
      return errorResponse(400, "Invalid or missing teamId", res);
    }

    // Check if the user is a member of the provided team
    if (!(await isUserMemberOfTeam(callerAddress, teamId))) {
      return errorResponse(403, "Caller is not a member of the team", res);
    }

    let statusFilter: Prisma.ClaimWhereInput = {};
    if (status) {
      statusFilter = { status };
    }
    // Request all claims based on status, that have a wage where the teamId is the provided teamId
    const claims = await prisma.claim.findMany({
      where: {
        wage: {
          teamId: teamId,
        },
        ...statusFilter,
      },
      include: {
        wage: {
          include: {
            user: {
              select: {
                address: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });
    return res.status(200).json(claims);
  } catch (error) {
    return errorResponse(500, "Internal server error", res);
  } finally {
    await prisma.$disconnect();
  }
};

export const updateClaim = async (req: Request, res: Response) => {
  const callerAddress = (req as any).address;
  const claimId = Number(req.params.claimId);

  // Action is only able to have this values: sign, withdraw, disable, enable, reject
  const action = req.query.action as string;
  const validActions = ["sign", "withdraw", "disable", "enable", "reject"];
  if (!validActions.includes(action)) {
    return errorResponse(
      400,
      `Invalid action. Allowed actions are: ${validActions.join(", ")}`,
      res
    );
  }

  // Prepare the data according to the action
  let data: Prisma.ClaimUpdateInput = {};
  switch (action) {
    case "sign":
      const signature = req.body.signature as Claim["signature"];

      // validate the signature
      if (!signature) {
        return errorResponse(400, "Missing signature", res);
      }
      // TODO: validate the signature (in the blockchain)
      data.status = "signed";
      data.signature = req.body.signature;
      break;
    case "withdraw":
      // TODO: check if the signature is used to withdraw the claim
      data.status = "withdrawn";
      break;
    case "disable":
      // TODO: Check if the signature is disabled in the blockchain
      data.status = "disabled";
      break;
    case "enable":
      data.status = "signed";
      break;
    case "reject":
      data.status = "rejected";
      break;
  }

  try {
    // Fetch the claim including the required data
    const claim = await prisma.claim.findFirst({
      where: {
        id: claimId,
      },
      include: {
        wage: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!claim) {
      return errorResponse(404, "Claim not found", res);
    }

    // sign, disable, enable, reject actions are only able to be done by the owner of the team
    if (["sign", "disable", "enable", "reject"].includes(action)) {
      if (claim.wage.team.ownerAddress !== callerAddress) {
        return errorResponse(403, "Caller is not the owner of the team", res);
      }
    }

    // withdraw action is only able to be done by the user that created the claim
    if (action === "withdraw") {
      if (claim.wage.userAddress !== callerAddress) {
        return errorResponse(403, "Caller is not the owner of the claim", res);
      }
    }

    // special check on the claim according to the action

    switch (action) {
      case "sign":
        //  sine only if the claim is pending, or rejected
        if (claim.status !== "pending" && claim.status !== "rejected") {
          return errorResponse(
            403,
            "Can't signe: Claim is not pending or rejected",
            res
          );
        }
        break;
      case "withdraw":
        // withdraw only if the claim is signed
        if (claim.status !== "signed") {
          return errorResponse(403, "Can't withdraw: Claim is not signed", res);
        }
        break;
      case "disable":
        // disable only if the claim is signed
        if (claim.status !== "signed") {
          return errorResponse(403, "Can't disable: Claim is not signed", res);
        }
        break;
      case "enable":
        // enable only if the claim is disabled
        if (claim.status !== "disabled") {
          return errorResponse(403, "Can't enable: Claim is not disabled", res);
        }
        break;
      case "reject":
        // reject only if the claim is pending
        if (claim.status !== "pending") {
          return errorResponse(403, "Can't reject: Claim is not pending", res);
        }
        break;
    }

    // Update the claim status
    const updatedClaim = await prisma.claim.update({
      where: {
        id: claimId,
      },
      data,
    });
    return res.status(200).json(updatedClaim);
  } catch (error) {
    console.log("Error: ", error);
    return errorResponse(500, "Internal server error", res);
  } finally {
    await prisma.$disconnect();
  }
};
