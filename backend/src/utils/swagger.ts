const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  failOnErrors: true, // Whether or not to throw when parsing errors. Defaults to false.
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Hello World",
      version: "1.0.0",
    },
  },
  apis: ["./src/index.ts"],
};

export const generateDocs = () => {
  const openapiSpecification = swaggerJsdoc(options);
  console.log(openapiSpecification);
};
