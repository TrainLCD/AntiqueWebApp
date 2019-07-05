const { writeFile } = require('fs');
const { argv } = require('yargs');

// This is good for local dev environments, when it's better to
// store a projects environment variables in a .gitignore'd file
require('dotenv').config();

// Would be passed to script like this:
// `ts-node set-env.ts --environment=dev`
// we get it from yargs's argv object
const environment = argv.environment;
const isProd = environment === 'prod';

const targetPath = isProd
  ? './src/environments/environment.prod.ts'
  : './src/environments/environment.ts';
const envConfigFile = `export const environment = {
  production: ${isProd},
  gooAppID: '${process.env.GOO_APP_ID ? process.env.GOO_APP_ID : ''}'
};
`;
writeFile(targetPath, envConfigFile, err => {
  if (err) {
    console.log(err);
  }

  console.log(`Output generated at ${targetPath}`);
});
