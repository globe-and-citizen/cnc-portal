import { exec } from 'child_process'

const generateDocs = () => {
  exec(
    'redocly build-docs -o src/utils/backend_specs.html src/utils/backend_specs.yaml',
    (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        console.log(`error: ${error.message}`)
        return
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`)
        return
      }
      console.log(`stdout: ${stdout}`)
    }
  )
}
generateDocs()
