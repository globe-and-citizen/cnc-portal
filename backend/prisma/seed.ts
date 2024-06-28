// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// async function main() {
//   const users = [
//     {
//       address: "0xc542BdA5EC1aC9b86fF470c04062D6a181e67928",
//       name: "Dasarath",
//       nonce: "4bdf5a",
//     },
//     {
//       address: "0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E",
//       name: "Main User",
//       nonce: "3cfa9e",
//     },
//     {
//       address: "0x4b6Bf5cD91446408290725879F5666dcd9785F62",
//       name: "Alice Johnson",
//       nonce: "7ea2b3",
//     },
//     {
//       address: "0x4D5e6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U",
//       name: "Bob Williams",
//       nonce: "9d7c6e",
//     },
//   ];

//   const teams = [
//     {
//       id: 1,
//       ownerId: "0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E",
//       description: "Team 1 description",
//       name: "Team 1",
//     },
//     {
//       id: 2,
//       ownerId: "0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E",
//       description: "Team 2 description",
//       name: "Team 2",
//     },
//     {
//       id: 3,
//       ownerId: "0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E",
//       description: "Team 3 description",
//       name: "Team 3",
//     },
//     {
//       id: 4,
//       ownerId: "0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E",
//       description: "Team 4 description",
//       name: "Team 4",
//     },
//   ];

//   const members = [
//     {
//       id: 1,
//       name: "Member 1",
//       walletAddress: "0xc542BdA5EC1aC9b86fF470c04062D6a181e67928",
//       teamId: 1,
//     },
//     {
//       id: 2,
//       name: "Member 2",
//       walletAddress: "0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E",
//       teamId: 1,
//     },
//     // Add more members here
//   ];

//   for (const user of users) {
//     await prisma.user.create({ data: user });
//   }

//   for (const team of teams) {
//     await prisma.team.create({ data: team });
//   }

//   for (const member of members) {
//     await prisma.member.create({ data: member });
//   }
// }

// main()
//   .then(async () => {
//     await prisma.$disconnect();
//   })
//   .catch(async (e) => {
//     console.error(e);
//     await prisma.$disconnect();
//     process.exit(1);
//   });
