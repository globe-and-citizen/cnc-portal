const { exec } = require("child_process");

const generateDocs = () => {
  exec(
    "redoc-cli bundle -o src/utils/backend_specs.html src/utils/backend_specs.yaml",
    (error: { message: any }, stdout: any, stderr: any) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
    }
  );
};
generateDocs();
