// CRUD company using Prisma Client
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();
// Create a new company
const addCompany = async (req: Request, res: Response) => {
  const { name, employees, description } = req.body;
  try {
    const company = await prisma.company.create({
      data: {
        name,
        employees,
        description,
        ownerId: req.body.address,
      },
    });
    res.status(201).json(company);
  } catch (e) {
    console.log("Error: ", e);
    return res.status(500).json({ message: "Internal server error." });
  }
};
// Get Company
const getCompany = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const company = await prisma.company.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        transactions: true,
        employees: true,
      },
    });

    // Handle  404
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    if (company.ownerId !== req.body.address) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    res.status(200).json(company);
  } catch (e) {
    console.log("Error: ", e);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Get companies owned by user
const getAllCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      where: {
        ownerId: req.body.address,
      },
    });
    res.status(200).json(companies);
  } catch (e) {
    console.log("Error: ", e);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// update company
const updateCompany = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const company = await prisma.company.update({
    where: { id: Number(id) },
    data: {
      name,
      description,
    },
    include: {
      employees: true,
    },
  });
  res.status(200).json(company);
};

// Delete Company
const deleteCompany = async (req: Request, res: Response) => {
  const { id } = req.params;
  const company = await prisma.company.delete({
    where: {
      id: Number(id),
    },
  });
  res.status(200).json(company);
};

//insert new employees
const addEmployees = async (req: Request, res: Response) => {
  const { id } = req.params;
  const employeesData = req.body;

  try {
    const employeesToCreate = employeesData.map(
      (employee: { name: string; walletAddress: string }) => ({
        name: employee.name,
        walletAddress: employee.walletAddress,
        companyId: Number(id), // company ID
      })
    );

    const createdEmployees = await prisma.employee.createMany({
      data: employeesToCreate,
    });

    res.status(201).json(createdEmployees);
  } catch (error) {
    console.error("Error adding employees:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//update Employee
const updateEmployee = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, walletAddress } = req.body;
  try {
    console.log("well well well");
    const employee = await prisma.employee.update({
      where: { id: Number(id) },
      data: {
        name: name,
        walletAddress: walletAddress,
      },
    });
    res.status(200).json(employee);
  } catch (error) {
    console.log("Error updating", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//delete employees
const deleteEmployee = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const employee = await prisma.employee.delete({
      where: { id: Number(id) },
    });
    console.log(employee);
    res.status(200).json(employee);
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export {
  addCompany,
  updateCompany,
  deleteCompany,
  getCompany,
  getAllCompanies,
  updateEmployee,
  deleteEmployee,
  addEmployees,
};
