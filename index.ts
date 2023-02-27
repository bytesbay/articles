import { uploadDevto } from "./upload-devto";
import { uploadHashnode } from "./upload-hashnode";

const [ flags, article_key ] = process.argv.slice(2);

async function init() {
  
  if(flags.includes('d')) {
    console.log('Uploading to dev.to');
    
    await uploadDevto(article_key);
  }

  if(flags.includes('h')) {
    console.log('Uploading to hashnode');

    await uploadHashnode(article_key);
  }

}

init();