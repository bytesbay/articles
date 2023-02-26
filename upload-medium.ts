import FS from "fs";
import { REPO_URL, getDb, getSecrets } from "./helpers";
import Axios from "axios";
import { parse, stringify } from 'yaml'
import { IArticleMetadata } from "./types";

const http = Axios.create({
  xsrfCookieName: 'xsrf',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

async function init() {

  // get command line arguments
  const args = process.argv.slice(2);

  const article_key = args[0];

  // article file path
  const path = `./posts/${article_key}.md`;

  // get metadata of markdown file from 'path' using FS
  const metadata: IArticleMetadata = parse(FS.readFileSync(path, 'utf8').split('---')[1]);
  const md_content: string = FS.readFileSync(path, 'utf8').split('---\n')[2]
    // replace image paths with REPO_URL
    .replace(/!\[.*\]\((.*)\)/g, `![image](${REPO_URL}$1)`);

  const db = getDb();
  const secrets = await getSecrets();

  const { key } = secrets['medium-creds'];

  const headers = {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Charset': 'utf-8',
  }

  const { id } = await http.get('https://api.medium.com/v1/me', {
    headers,
  }).then(res => res.data.data);

  const current_article_id = await db.getData(`/${article_key}/medium`).catch(() => null);

  if(!current_article_id) {

    const { id: article_id } = await http.post('https://api.medium.com/v1/users/' + id + '/posts', {
      title: metadata.title,
      contentFormat: "markdown",
      content: md_content,
      tags: metadata.tags,
      publishStatus: "draft"
    }, {
      headers
    }).then(res => res.data.data);

    await db.push(`/${article_key}/medium`, article_id, true);
  } else {
    
    const post = await http.put('https://api.medium.com/v1/users/' + id + '/posts/' + current_article_id, {
      title: metadata.title,
      contentFormat: "markdown",
      content: md_content,
      tags: metadata.tags,
      publishStatus: "draft"
    }, {
      headers
    }).then(res => res.data.data);
    
  }
}

init();