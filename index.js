`use strict`

const config = require('./.env.json');

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

const fs = require('fs').promises;

async function fetchAndUpdateLastRun() {
  const filename = './lastrun'
  const lastRunUnixSeconds = await fs.readFile(filename).then(s=>''+s).catch(() => 0);
  const now = '' + Math.floor(new Date().getTime()/ 1000);
  await fs.writeFile(filename, now);
  console.log(`Update 'lastrun' from ${lastRunUnixSeconds} to ${now}`);
  return lastRunUnixSeconds;
}

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

const getPocketItems = since => new Promise((fullfill, reject) => { // [{pocket_id, url}]
  pocket.get({
    since,
    state: 'all',
    search: 'https://twitter.com',
  }, (err, res) => {
    if (err) {
      reject(err);
      return;
    }
    const items = Object.keys(res.list).map(key => ({ pocket_id: '' + res.list[key].item_id, url: res.list[key].resolved_url }));
    fullfill(items);
  });
});

const deletePocketItems = item_ids => new Promise((fullfill, reject) => { // [bool]
  const actions = item_ids.map(item_id => ({action: "delete", item_id}));
  pocket.send({actions}, (err, res) => {
    if (err) {
      reject(err);
      return;
    }
    if (res?.action_results === undefined) {
      reject(new Error("res?.action_results is undefined"));
      return;
    }
    fullfill(res.action_results);
  });
});

const retweetOrUndefined = item => {
  const tweetId = item.url.split("/").pop();
  return retweet(tweetId).then( () => {
    console.log(`Retweeted: ${tweetId}`);
    return item;
  }).catch(e => {
    console.log(`Failed to retweet: ${tweetId}, error: ${e}`);
    return undefined;
  });
};

const followOrUndefined = item => {
  const userId = item.url.split("/").pop();
  return follow(userId).then(() => {
    console.log(`Followed: ${userId}`);
    return item;
  }).catch(e => {
    console.log(`Failed to follow: ${userId}, error: ${e}`);
    return undefined;
  });
};

async function main() {
  const lastRunUnixSeconds = await fetchAndUpdateLastRun();
  const items = await getPocketItems('' + lastRunUnixSeconds);
  await fs.writeFile('dump.json', JSON.stringify(items));

  const userItems = items.filter(i => /^https:\/\/twitter.com\/[a-zA-Z0-9_]+$/.test(i.url));
  const tweetItems = items.filter(i => /^https:\/\/twitter.com\/[a-zA-Z0-9_]+\/status\/[0-9]+$/.test(i.url));

  const itemsOrUndefineds = await Promise.all([...userItems.map(followOrUndefined), ...tweetItems.map(retweetOrUndefined)]);
  const pocketIdsWillDelete = itemsOrUndefineds.filter(i => i).map(i => i.pocket_id);

  const results = await deletePocketItems(pocketIdsWillDelete);
  results.forEach((isSuccess, i) => console.log((isSuccess ? "Deleted" : "Failed to delete") + " Pocket item: " + pocketIdsWillDelete[i]));
}

main().catch(e => console.error(e));
