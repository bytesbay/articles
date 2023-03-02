import FS from "fs";
import { getDb, getSecrets, parseMd } from "./helpers";
import Axios from "axios";
import querystring from 'querystring';

export async function uploadHashnode(article_key: string) {

  const http = Axios.create({

  });

  const path = `./posts/${article_key}.md`;

  const { md_content, md_metadata } = await parseMd(path, 'hashnode');

  const db = getDb();
  const secrets = await getSecrets();

  const { key, pub_id } = secrets['hashnode-creds'];

  const headers = {
    'Authorization': `${key}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Charset': 'utf-8',
  }

  const current_article_id = await db.getData(`/${article_key}/hashnode`).catch(() => null);

  const tags: any[] = [];

  for (const n of md_metadata.tags) {

    const found_tags = await http.post('https://amerdmzm12-dsn.algolia.net/1/indexes/nodes_prod/query?x-algolia-agent=Algolia%20for%20JavaScript%20(4.9.1)%3B%20Browser', JSON.stringify({
      "query": n,
      "filters": "isActive=1",
      "hitsPerPage": 5
    }), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-algolia-api-key": "295b17c8b7be099e43e2b2b2b63a7589",
        "x-algolia-application-id": "AMERDMZM12",
      }
    }).then(res => res.data.hits)

    tags.push({
      name: found_tags[0].name,
      slug: found_tags[0].slug,
      _id: found_tags[0].objectID,
    });
  }

  if(!current_article_id) {

    const post = await http.post('https://api.hashnode.com/', {
      query: 'mutation createPublicationStory($publicationId: String!, $input: CreateStoryInput!){ createPublicationStory(publicationId: $publicationId, input: $input){ code success message post { _id } } }',
      variables: {
        publicationId: pub_id,
        input: {
          isPartOfPublication: {
            publicationId: pub_id,
          },
          title: md_metadata.title,
          contentMarkdown: md_content,
          subtitle: md_metadata.subtitle,
          tags: tags,
          coverImageURL: md_metadata.cover_image,
          // isAnonymous: false,
        },
      },
    }, {
      headers
    }).then(res => res.data.data.createPublicationStory.post).catch(err => {
      console.log(err.response.data);
      throw err.response.data;
    });
    
    await db.push(`/${article_key}/hashnode`, post._id, true);
  } else {
    
    const post = await http.post('https://api.hashnode.com/', {
      query: 'mutation updateStory($postId: String!, $input: UpdateStoryInput!){ updateStory(postId: $postId, input: $input){ code success message post { _id } } }',
      variables: {
        postId: current_article_id,
        input: {
          isPartOfPublication: {
            publicationId: pub_id,
          },
          title: md_metadata.title,
          contentMarkdown: md_content,
          subtitle: md_metadata.subtitle,
          tags: tags,
          coverImageURL: md_metadata.cover_image,
        },
      },
    }, {
      headers
    }).then(res => res.data.data.updateStory.post)
    
  }
}