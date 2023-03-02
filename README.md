# Publish to Medium, Dev.to and Hashnode at once 

One source of truth for Dev.to, Medium and Hashnode. A CLI tool for publishing articles to multiple platforms at once.

Instructions: 

Install dependencies:

```bash
$ npm i
```

Publish to Medium, Dev.to and Hashnode:

```bash
$ npm run p -- mdh 0

# or

$ npm run publish -- mdh 0
```

Each letter in `mdh` stands for a platform. `m` for Medium, `d` for Dev.to and `h` for Hashnode. The last argument is the key of the article in the `posts` folder.

Publish to Medium only:

```bash
$ npm run p -- m 0

# or

$ npm run publish -- m 0
```

Articles in Medium cannot be updated, so if you want to update an article, you need to go to Medium and update it manually. The rest of the platforms are available for article updates.