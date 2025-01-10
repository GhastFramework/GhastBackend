const { TwitterApi } = require("twitter-api-v2");

const twitterApi = new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY,
    appSecret: process.env.TWITTER_APP_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const bearer = new TwitterApi(process.env.TWITTER_BEARER);


export const twitterClient = twitterApi.readWrite;
export const twitterBearer = bearer.readOnly;
