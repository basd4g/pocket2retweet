# Pocket2Retweet

Retweet to [Twitter](https://twitter.com) from stocked tweets in [Pocket](https://getpocket.com/).

Need Twitter API key.

## Setup

```sh
git clone https://github.com/basd4g/pocket2retweet.git
cd pocket2retweet
cp .env.json.exmple .env.json
vim .env.json # Type your keys and secrets
npm i
```

## Get API keys and secrets

```.env.json.example
{
  "twitter_consumer_key": "xxxxxxxxxxx",                            // you can get on twitter developper web page
  "twitter_consumer_secret": "xxxxxxxxxxx",                         // you can get on twitter developper web page
  "twitter_access_token_key": "xxxxxxxxxxx",                        // you can get on twitter developper web page
  "twitter_access_token_secret": "xxxxxxxxxxx",                     // you can get on twitter developper web page
  "pocket_feed_url": "http://getpocket.com/users/xxxxxx/feed/all",  // you can get on pocket settings web page
  "pocket_consumer_key": "xxxxxxxxxxx",                             // you can get on pocket developper web page
  "pocket_access_token": "xxxxxxxxxxx"
}
```

Please be public your RSS feed of Pocket.


### Pocket access token

```sh
cd node_modules/node-getpocket
npm i
node ./authorize.js --help
node ./authorize.js -c "YOUR_POCKET_CONSUMER_KEY"
# Open 127.0.0.1:8080 on Web browser, login pocket, allow your application, and memo your access token.
```

## Run

```sh
npm start
```
