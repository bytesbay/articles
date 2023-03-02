import FS from "fs";
import { getDb, getSecrets, parseMd } from "./helpers";
import Axios from "axios";

export async function uploadDevto(article_key: string) {

  const http = Axios.create({
    xsrfCookieName: 'xsrf',
    xsrfHeaderName: 'X-XSRF-TOKEN',
  });

  const path = `./posts/${article_key}.md`;

  const { md_content, md_metadata } = await parseMd(path, 'devto');

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
        title: md_metadata.title,
        body_markdown: md_content,
        tags: md_metadata.tags.slice(0, 4),
        published: true,
        main_image: md_metadata.cover_image,
      }
    }, {
      headers
    }).then(res => res.data);
    
    await db.push(`/${article_key}/devto`, post.id, true);
  } else {
    
    const post = await http.put('https://dev.to/api/articles/' + current_article_id, {
      article: {
        title: md_metadata.title,
        body_markdown: md_content,
        tags: md_metadata.tags.slice(0, 4),
        published: true,
        main_image: md_metadata.cover_image,
      }
    }, {
      headers
    }).then(res => res.data);
    
  }
}