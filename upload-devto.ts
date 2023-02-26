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
    .replace(/^\n/, '') // remove first newline
    // replace image paths with REPO_URL
    .replace(/!\[.*\]\((.*)\)/g, `![image](${REPO_URL}$1)`);  

  const db = getDb();
  const secrets = await getSecrets();

  const { key } = secrets['devto-creds'];

  const headers = {
    'api-key': `${key}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Charset': 'utf-8',
  }

  const current_article_id = await db.getData(`/${article_key}/devto`).catch(() => null);

  if(!current_article_id) {

    const post = await http.post('https://dev.to/api/articles', {
      article: {
        title: metadata.title,
        body_markdown: md_content,
        tags: metadata.tags.slice(0, 4),
        published: true,
        main_image: metadata.devto_image,
      }
    }, {
      headers
    }).then(res => res.data);
    
    await db.push(`/${article_key}/devto`, post.id, true);
  } else {
    
    const post = await http.put('https://dev.to/api/articles/' + current_article_id, {
      article: {
        title: metadata.title,
        body_markdown: md_content,
        tags: metadata.tags.slice(0, 4),
        published: true,
        main_image: metadata.devto_image,
      }
    }, {
      headers
    }).then(res => res.data);
    
  }
}

init();