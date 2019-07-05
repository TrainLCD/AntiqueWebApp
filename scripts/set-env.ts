const { writeFileSync } = require('fs');
const path = require('path');
const { argv } = require('yargs');

require('dotenv').config();

const environment = argv.environment;
const isProd = environment === 'prod';

const targetPathProd = path.join(
  __dirname,
  '../src/environments/environment.prod.ts'
);
const targetPath = path.join(__dirname, '../src/environments/environment.ts');
const envConfigFile = `export const environment = {
  production: ${isProd},
  gooAppID: '${process.env.GOO_APP_ID ? process.env.GOO_APP_ID : ''}'
};
`;
writeFileSync(targetPathProd, envConfigFile, { encoding: 'utf8', flag: 'w' });
writeFileSync(targetPath, envConfigFile, { encoding: 'utf8', flag: 'w' });
