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

const GetPocket = require('node-getpocket');
const pocket = new GetPocket({
  consumer_key: config.pocket_consumer_key,
  access_token: config.pocket_access_token,
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

const follow = (userId) => new Promise((fullfill, reject) => {
  twitter.post(`friendships/create.json?screen_name=${userId}&,follow=true`, (err, user, res) => {
    if (err) {
      reject(err);
      return;
    }
    fullfill(user);
  });
});

const retweetAndIsSuccess = pocketItem => {
  const tweetId = pocketItem.url.split("/").pop();
  return retweet(tweetId).then( () => {
    console.log(`Retweeted: ${tweetId}`);
    return { pocketItem, isSuccess: true };
  }).catch(e => {
    console.log(`Failed to retweet: ${tweetId}, error: ${e}`);
    return { pocketItem, isSuccess: false };
  });
};

const followAndIsSuccess = pocketItem => {
  const userId = pocketItem.url.split("/").pop();
  return follow(userId).then(() => {
    console.log(`Followed: ${userId}`);
    return { pocketItem, isSuccess: true };
  }).catch(e => {
    console.log(`Failed to follow: ${userId}, error: ${e}`);
    return { pocketItem, isSuccess: false };
  });
};


const getPocketItem = url => new Promise((fullfill, reject) => {
  pocket.get({
    search: url
  }, (err, res) => {
    if (err) {
      reject(err);
      return;
    }
    const keys = Object.keys(res.list);
    if (keys?.length != 1) {
      reject(new Error("Object.keys(res.list).length is " + keys));
      return;
    }
    fullfill(res.list[keys[0]].item_id);
  });
});

const deletePocketItem = item_id => new Promise((fullfill, reject) => {
  pocket.send({actions:[{ action: "delete", item_id: `${item_id}` }]}, (err, res) => {
    if (err) {
      reject(err);
      return;
    }
    if (res?.action_results?.length != 1) {
      reject(new Error("res?.results?.length is " + res?.results?.length +", wants 1"));
      return;
    }
    fullfill(res.action_results[0]);
  });
});

async function main() {
  const feed = await rssParser.parseURL(config.pocket_feed_url);
  // TODO: fetch with pocket API, and memo fetched date if all task is successd.
  const userUrls = feed.items.filter(i => /^https:\/\/twitter.com\/[a-zA-Z0-9_]+$/.test(i.link)).map(u => u.link);
  const tweetUrls = feed.items.filter(i => /^https:\/\/twitter.com\/[a-zA-Z0-9_]+\/status\/[0-9]+$/.test(i.link)).map(t => t.link);

  const userPocketItems = userUrls.map(url => ({ url }));
  const tweetPocketItems = tweetUrls.map(url => ({ url }));

  const urlAndIsSuccesses = await Promise.all([...userPocketItems.map(followAndIsSuccess), ...tweetPocketItems.map(retweetAndIsSuccess)]);
  const pocketItemsWillDelete = urlAndIsSuccesses.filter(t => t.isSuccess).map(t => t.pocketItem);

  await Promise.all(pocketItemsWillDelete.map(async pocketItem => {
    pocketItem.id = await getPocketItem(pocketItem.url);
    await deletePocketItem(pocketItem.id);
    console.log(`Deleted item from Pocket: ${pocketItem.url}`);
  }));
}

main().catch(e => console.error(e));
