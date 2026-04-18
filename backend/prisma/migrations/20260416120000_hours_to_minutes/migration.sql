-- Convert hoursWorked from hours to minutes (multiply existing values by 60)
UPDATE "Claim" SET "hoursWorked" = "hoursWorked" * 60;
