import FS from 'fs'
import { JsonDB, Config } from 'node-json-db';
import { parse, stringify } from 'yaml'
import { IArticleMetadata } from "./types";

export async function getSecrets() {
  const secrets = await FS.promises.readFile('./.secrets.json', 'utf8')
  return JSON.parse(secrets)
}

export function getDb() {
  const db = new JsonDB(new Config('db', true, false, '/'));
  return db
}

export const REPO_RAW_URL = 'https://raw.githubusercontent.com/bytesbay/articles/main';

export async function parseMd(path: string) {
  const md_metadata: IArticleMetadata = parse(FS.readFileSync(path, 'utf8').split('---')[1]);
  const md_content: string = FS.readFileSync(path, 'utf8')
    .replace(/---((?!---).|\n|\r\n)*---/, '')
    .replace(/^\n/, '') // remove first newline
    .replace(/!\[.*\]\((.*)\)/g, `![image](${REPO_RAW_URL}$1)`);

  return { md_metadata, md_content }
}