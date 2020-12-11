`use strict`

const config = require('./.env.json');

const RssParser = require('rss-parser');
const rssParser = new RssParser();

const Twitter = require('twitter');
const twitter = new Twitter({
  consumer_key: config.twitter_consumer_key,
  consumer_secret: config.twitter_consumer_secret,
  access_token_key: config.twitter_access_token_key,
  access_token_secret: config.twitter_access_token_secret,
});

const retweet = (tweetId) => new Promise((fulfill, reject) => {
  twitter.post('statuses/retweet/' + tweetId, (error, tweet, response) => {
    if (error) {
      reject(error);
      return;
    }
    fulfill(tweet);
  });
});

async function main() {
  const feed = await rssParser.parseURL(config.pocket_feed_url);

  const users = feed.items.filter(i => /^https:\/\/twitter.com\/[a-zA-Z0-9_]+$/.test(i.link));
  const tweets = feed.items.filter(i => /^https:\/\/twitter.com\/[a-zA-Z0-9_]+\/status\/[0-9]+$/.test(i.link));
  const tweetIds = tweets.map( t => t.link.split("/").pop());

  console.log(tweetIds);
  console.log(await Promise.all(tweetIds.map(id => retweet(id))));
}

main().catch(e => console.error(e));
