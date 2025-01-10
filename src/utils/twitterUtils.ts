import {ThreadStructure, TweetV2Modified, XResponse} from "../types/twitterTypes";
import {ReferencedTweetV2} from "twitter-api-v2/dist/esm/types/v2/tweet.definition.v2";
import {twitterClient} from "../managers/twitterManager";
import {TweetV2} from "twitter-api-v2";

export const userFields = [
    'created_at', 'description', 'entities', 'id', 'location',
    'most_recent_tweet_id', 'name', 'pinned_tweet_id', 'profile_image_url',
    'protected', 'public_metrics', 'url', 'username', 'verified',
    'verified_type', 'withheld'
]

export const expansions = [
    'author_id', 'referenced_tweets.id', 'referenced_tweets.id.author_id',
    'edit_history_tweet_ids', 'in_reply_to_user_id', 'attachments.media_keys',
    'attachments.poll_ids', 'geo.place_id', 'entities.mentions.username'
]

export const tweetFields = [
    'author_id', 'note_tweet', 'public_metrics', 'referenced_tweets',
    'conversation_id', 'created_at', 'attachments'
]

async function addTweetIfMissing(thread: TweetV2Modified[], tweet: TweetV2) {
    if (!thread.some(t => t.id === tweet.id)) {
        thread.push(<TweetV2Modified>tweet);
    }
    return thread;
}

export async function getTweet(tweetId: string): Promise<TweetV2Modified | null> {
    const requestedTweetRaw = await twitterClient.v2.readOnly.tweets(tweetId as string, {
        "tweet.fields": tweetFields,
        "user.fields": userFields,
        expansions: expansions,
    });

    const processedTweets = await processXResponse(requestedTweetRaw);
    if(processedTweets === null) {
        return null;
    }
    return processedTweets[0] || null;
}

export async function getConvoThread(tweetId: string): Promise<any | null> {
    if (!tweetId) {
        return null;
    }

    let requestedTweet = await getTweet(tweetId)

    if (!requestedTweet) {
        console.log(`No Requested Tweet`)
        return null;
    }


    let conversationId = requestedTweet.conversation_id;
    console.log(conversationId)
    if (!conversationId) {
        // If there's no conversation_id, return just the requested tweet
        return requestedTweet;
    }

    const rootTweet = await getTweet(conversationId);
    if(!rootTweet) {
        // If cannot get root tweet just return the requested tweet
        return requestedTweet;
    }

    const getTweetsConvo = await twitterClient.v2.get(`tweets/search/recent`, {
        query: `conversation_id:${conversationId}`,
        "tweet.fields": tweetFields,
        "user.fields": userFields,
        expansions: expansions,
        max_results: 100
    }, {});

    console.log(JSON.stringify(getTweetsConvo, null, 2))

    let thread = await processXResponse(getTweetsConvo);
    if(!thread){
        // if no thread just return requested tweet
        console.log(`Thread not found maybe too old`)
        return requestedTweet;
    }

    thread = await addTweetIfMissing(thread, requestedTweet);
    thread = await addTweetIfMissing(thread, rootTweet);

    // @ts-ignore
    thread.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return thread;
}

export async function getTweetWithThread(tweetId: string): Promise<ThreadStructure | null> {
    const thread = await getConvoThread(tweetId);

    if (!thread || thread.length === 0) {
        return null;
    }

    const requestedTweet = thread.find((tweet: TweetV2Modified) => tweet.id === tweetId);
    if (!requestedTweet) {
        return null;
    }

    const ancestorChain = buildAncestorChain(requestedTweet, thread);
    const siblingTweets = getSiblingTweets(requestedTweet, thread);
    const childrenTweets = getChildrenTweets(requestedTweet, thread);

    return {
        requested_tweet: requestedTweet,
        root_tweet: ancestorChain.length > 0 ? ancestorChain[0] : requestedTweet,
        ancestor_chain: ancestorChain,
        sibling_tweets: siblingTweets,
        children_tweets: childrenTweets
    };
}

export async function processXResponse(response: XResponse): Promise<TweetV2Modified[] | null> {
    if (!response || !response.data) {
        return null;
    }
    if (!response.includes) {
        return response.data;
    }
    // @ts-ignore
    console.log(`Process X Test v2 ${response.includes.tweets.length}`)
    const includes = response.includes;

    function processSingleTweet(tweet: TweetV2Modified): any | null {
        if (!tweet) {
            return null;
        }
        const processedTweet = {
            ...tweet
        };

        // Add author information
        if (includes.users) {
            const author = includes.users.find(user => user.id === tweet.author_id);
            if (author) {
                processedTweet.author = author;
            }
        }

        // Add referenced tweets
        if (includes.tweets && tweet.referenced_tweets) {
            processedTweet.referenced_tweets = tweet.referenced_tweets.map((ref: ReferencedTweetV2) => {
                const referencedTweet = includes.tweets?.find(t => t.id === ref.id);
                return referencedTweet ? {...ref, ...referencedTweet} : null;
            }).filter(Boolean) as ReferencedTweetV2[];
        }

        // Add media attachments
        if (includes.media && tweet.attachments?.media_keys) {
            processedTweet.media = includes.media
                .filter(m => tweet.attachments!.media_keys!.includes(m.media_key))
                .map(m => m.data);
        }
        return processedTweet;
    }

    // console.log(Array.isArray(response.data)
    //     ? response.data.map(processSingleTweet).filter(Boolean)
    //     : processSingleTweet(response.data))
    return Array.isArray(response.data)
        ? response.data.map(processSingleTweet).filter(Boolean)
        : processSingleTweet(response.data);
}

function getParentTweetId(tweet: TweetV2Modified): string | null {
    const repliedTo = tweet.referenced_tweets?.find(ref => ref.type === 'replied_to');
    return repliedTo ? repliedTo.id : null;
}

function buildAncestorChain(tweet: TweetV2Modified, thread: TweetV2Modified[]): TweetV2Modified[] {
    const chain: TweetV2Modified[] = [];
    let currentTweet = tweet;
    while (true) {
        const parentId = getParentTweetId(currentTweet);
        if (!parentId) break;
        const parentTweet = thread.find(t => t.id === parentId);
        if (!parentTweet) break;
        chain.unshift(parentTweet);
        currentTweet = parentTweet;
    }
    return chain;
}

function getSiblingTweets(tweet: TweetV2Modified, thread: TweetV2Modified[]): TweetV2Modified[] {
    const parentId = getParentTweetId(tweet);
    if (!parentId) return []; // No parent, so no siblings
    const siblings = thread.filter(t => getParentTweetId(t) === parentId && t.id !== tweet.id);
    // @ts-ignore
    return siblings.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function getChildrenTweets(tweet: TweetV2Modified, thread: TweetV2Modified[]): TweetV2Modified[] {
    const children = thread.filter(t => getParentTweetId(t) === tweet.id);
    // @ts-ignore
    return children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}