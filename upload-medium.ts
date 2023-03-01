import FS from "fs";
import { getDb, getSecrets, parseMd } from "./helpers";
import Axios from "axios";
import { parse, stringify } from 'yaml'
import { IArticleMetadata } from "./types";
import fetch from 'node-fetch';
import { createMarkdownArrayTableSync } from "parse-markdown-table";
import Table from 'easy-table'

export async function uploadMedium(article_key: string) {

  const http = Axios.create({

  });

  // article file path
  const path = `./posts/${article_key}.md`;

  let { md_content, md_metadata } = await parseMd(path, 'medium');

  // select tables from md_content
  const tables: (string[])[] = [];
  let is_cursor_on_table = false;
  let current_cursor = 0;
  md_content.split('\n').forEach(n => {
    
    if(n.startsWith('|')) {
      is_cursor_on_table = true;
      if(!tables[current_cursor]) {
        tables.push([]);
      }
      tables[current_cursor].push(n);
    } else {
      if(is_cursor_on_table) {
        current_cursor++;
      }
      is_cursor_on_table = false;
    }

  })

  const parsed_tables = tables.map(n => {
    
    const md_table = createMarkdownArrayTableSync(n.join('\n'))

    const t = new Table();

    for (const col of md_table.rows) {
      for (const header in md_table.headers) {
        t.cell(md_table.headers[header], col[header]);
      }
      t.newRow();
    }

    return t.toString();
  });

  tables.forEach((n, i) => {
    
    md_content = md_content.replace(n.join('\n'), "```\n" + parsed_tables[i] + "\n```");

  })

  md_content = 
`
# ${md_metadata.title}

${md_metadata.subtitle}

![${md_metadata.title}](${md_metadata.devto_image})

${md_content}
`;

  const db = getDb();
  const secrets = await getSecrets();

  const { key } = secrets['medium-creds'];

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Charset': 'utf-8',
  }

  const cookeis = "_ga=GA1.2.282041433.1640041852; amp_ae2494=Z9CewawS7MW7Xi3kq4EUh2...1fu3uqrff.1fu3ur37f.5.0.5; __stripe_mid=7608e0db-72cf-4dbb-b4af-aececb7b76d4b6daac; uid=3d0cf25ff2fa; sid=1:qA78B6x2UPJVtSSK8VOXQcNwiTg4cFX6CBBM5OibSKEFi5w8mcYO72M0EZM6UAKX; _gid=GA1.2.415169170.1677425973; lightstep_guid/medium-web=239759f00ccef968; lightstep_session_id=cb1d37c75821d53f; pr=2; tz=-120; sz=1512; __cfruid=b2e976be9a76a82e7ae6f59fba96bc65142ea24b-1677492938; _dd_s=rum=0&expire=1677495171119";

  const res = await fetch("https://medium.com/@bytesbay/you-dont-need-jwt-anymore-974aa6196976", {
    "headers": {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      "pragma": "no-cache",
      "sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Google Chrome\";v=\"110\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"macOS\"",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      "cookie": cookeis,
    },
    "method": "GET",
  });

  // get xrsf token from response headers
  const xsrf = res.headers.get('set-cookie')?.split(';')?.find((cookie) => cookie.includes('xsrf'))?.split('=')[1];

  if(!xsrf) {
    throw new Error('xsrf token not found');
  }

  const { id } = await http.get('https://api.medium.com/v1/me', {
    headers,
    withCredentials: true,
  }).then(res => res.data.data);

  const current_article_id = await db.getData(`/${article_key}/medium`).catch(() => null);

  if(!current_article_id) {

    const { id: article_id } = await http.post('https://api.medium.com/v1/users/' + id + '/posts', {
      title: md_metadata.title,
      contentFormat: "markdown",
      content: md_content,
      tags: md_metadata.medium_tags,
      publishStatus: "public",
      notifyFollowers: true,
    }, {
      headers,
      withCredentials: true,
    }).then(res => res.data.data);

    await db.push(`/${article_key}/medium`, article_id, true);
  } else {
    
    
    
  }
}