import FS from 'fs'
import { JsonDB, Config } from 'node-json-db';

export async function getSecrets() {
  const secrets = await FS.promises.readFile('./.secrets.json', 'utf8')
  return JSON.parse(secrets)
}

export function getDb() {
  const db = new JsonDB(new Config('db', true, false, '/'));
  return db
}

export const REPO_URL = 'https://github.com';