import FS from "fs";
import { getDb, getSecrets, parseMd } from "./helpers";
import Axios from "axios";

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

  // const tags = await http.post('https://api.hashnode.com/', {
  //   query: 'query{ tagCategories{ _id slug name tags{ _id slug name } } }',
  //   variables: {},
  // }, {
  //   headers
  // }).then(res => res.data.data.tagCategories)

  // console.log(tags);

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
          // tags: md_metadata.tags,
          tags: [],
          coverImageURL: md_metadata.devto_image,
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
          // tags: md_metadata.tags,
          tags: [],
          coverImageURL: md_metadata.devto_image,
        },
      },
    }, {
      headers
    }).then(res => res.data.data.updateStory.post)
    
  }
}