import {Request, Response} from "express";
import {prisma} from "../../managers/dbManager";
import {twitterBearer, twitterClient} from "../../managers/twitterManager";
import axios from "axios";
import {TweetV2, UserV2} from "twitter-api-v2";
import {
    expansions,
    getConvoThread,
    getTweetWithThread,
    processXResponse,
    tweetFields,
    userFields
} from "../../utils/twitterUtils";

async function getFullThread(tweetId: string): Promise<TweetV2[]> {

    const convoLookup = await twitterBearer.v2.tweets(tweetId, {
        "tweet.fields": tweetFields,
        "user.fields": userFields,
        expansions: expansions,
    });

    const convoId = convoLookup.data[0].conversation_id;

    const tweets = await twitterClient.v2.get(`tweets/search/recent`, {
        query: `conversation_id:${convoId} from:${convoLookup.data[0].author_id} to:${convoLookup.data[0].author_id}`,
        "tweet.fields": tweetFields,
        "user.fields": userFields,
        max_results: 99
    }, {});

    return tweets.data;
}

export async function pullMentionsController(req: Request, res: Response) {
    try {
        // Fetch mentions
        const mentions = await twitterClient.v2.userMentionTimeline("1847860383006027776", {
            "tweet.fields": tweetFields,
            "user.fields": userFields,
            expansions: expansions,
            max_results: 100 // Adjust as needed
        });

        // Format mentions
        if(mentions.data.meta.result_count === 0) {
            return res.status(200).json({
                success: true,
                message: "Mentions fetched successfully",
                mentions: [],
            });
        }
        const formattedMentions = mentions.data.data.map((tweet: { author_id: any; }) => {
            const author = mentions.includes?.users?.find((user: { id: any; }) => user.id === tweet.author_id);
            return {
                ...tweet,
                author: author ? { username: author.username } : undefined
            };
        });


        res.status(200).json({
            success: true,
            message: "Mentions fetched successfully",
            mentions: formattedMentions,
        });
    } catch (error) {
        console.error("Error fetching mentions:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch mentions",
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

export async function unfollowUserController(req: Request, res: Response) {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({
                success: false,
                message: "Username is required",
            });
        }

        const userLookup = await twitterClient.v2.userByUsername(username);

        if (!userLookup.data) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const userId = userLookup.data.id;

        // Now, unfollow the user
        const unfollowResponse = await twitterClient.v2.unfollow("1847860383006027776", userId);

        if (!unfollowResponse.data.following) {
            res.status(200).json({
                success: true,
                message: `Successfully unfollowed user @${username}`,
                data: unfollowResponse.data,
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Failed to unfollow user",
                data: unfollowResponse.data,
            });
        }
    } catch (error) {
        console.error("Error unfollowing user:", error);
        res.status(500).json({
            success: false,
            message: "Failed to unfollow user",
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

export async function followUserController(req: Request, res: Response) {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({
                success: false,
                message: "Username is required",
            });
        }

        // First, we need to get the user ID from the username#
        console.log(`Searching by username`)
        const userLookup = await twitterClient.v2.userByUsername(username);

        if (!userLookup.data) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const userId = userLookup.data.id;

        // Now, follow the user
        const followResponse = await twitterClient.v2.follow("1847860383006027776", userId);

        if (followResponse.data.following) {
            res.status(200).json({
                success: true,
                message: `Successfully followed user @${username}`,
                data: followResponse.data,
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Failed to follow user",
                data: followResponse.data,
            });
        }
    } catch (error) {
        console.error("Error following user:", error);
        res.status(500).json({
            success: false,
            message: "Failed to follow user",
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

export async function getTweetContextController(req: Request, res: Response): Promise<void> {
    // try {
        const tweet_id = req.query.tweet_id as string | undefined;
        if (!tweet_id) {
            res.status(400).json({
                success: false,
                message: "Tweet ID is required",
            });
            return;
        }

        const data = await getTweetWithThread(tweet_id);

        if(!data) {
            console.log(`No data`)
            res.status(400).json({
                success: false,
                message: "Failed",
            })
            return;
        }

        res.status(200).json(data)
}
export async function getDraftsController(req: Request, res: Response) {
    try {
        // Verify API key (you should implement this middleware)
        const apiKey = req.headers.authorization?.split(' ')[1];
        if (!apiKey /* || !isValidApiKey(apiKey) */) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Fetch drafts from the database
        const drafts = await prisma.draft.findMany({
            select: {
                id: true,
                content: true,
                content_cleaned: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 15, // Limit to 15 drafts
        });

        // Format the drafts
        const formattedDrafts = drafts.map((draft: { id: any; content: any; content_cleaned: any; }) => ({
            id: draft.id,
            fields: {
                content: draft.content,
                content_cleaned: draft.content_cleaned || draft.content,
            },
        }));

        res.status(200).json({
            success: true,
            message: "Drafts fetched successfully",
            drafts: formattedDrafts,
        });
    } catch (error) {
        console.error("Error fetching drafts:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch drafts",
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

export async function searchTweetsController(req: Request, res: Response) {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: "Search query is required",
            });
        }

        // Search for tweets
        const searchResult = await twitterBearer.v2.search(query as string, {
            "tweet.fields": ["created_at", "public_metrics", "author_id", "note_tweet"],
            "user.fields": ["username"],
            expansions: ["author_id"],
            max_results: 10, // Adjust as needed
        });

        console.log(JSON.stringify(searchResult))

        // Extract tweets and users from the response
        const tweets = searchResult.data.data || [];
        const users = searchResult.data.includes?.users || [];

        // Create a map for users for easy lookup
        const userMap = new Map(users.map((user: { id: any; }) => [user.id, user]));

        // Format the tweets to match the expected structure
        const formattedTweets = tweets.map((tweet: { id: any; text: any; note_tweet: any; public_metrics: any; author_id: unknown; }) => ({
            id: tweet.id,
            text: tweet.text,
            note_tweet: tweet.note_tweet,
            public_metrics: tweet.public_metrics,
            author: userMap.get(tweet.author_id),
        }));

        res.status(200).json({
            success: true,
            message: "Tweets fetched successfully",
            tweets: formattedTweets,
        });
    } catch (error) {
        console.error("Error searching tweets:", error);
        res.status(500).json({
            success: false,
            message: "Failed to search tweets",
        });
    }
}

export async function postTweetController(req: Request, res: Response) {
    try {
        const { text, in_reply_to_tweet_id, media_url } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                message: "Tweet text is required",
            });
        }

        let mediaIds = [];

        // If media_url is provided, download and upload the media
        if (media_url) {
            try {
                const mediaResponse = await axios.get(media_url, { responseType: 'arraybuffer' });
                const mediaBuffer = Buffer.from(mediaResponse.data, 'binary');

                const mediaType = media_url.endsWith('.png') ? 'image/png' :
                    media_url.endsWith('.jpg') || media_url.endsWith('.jpeg') ? 'image/jpeg' :
                        media_url.endsWith('.gif') ? 'image/gif' : 'image/jpeg';

                const mediaUpload = await twitterClient.v1.uploadMedia(mediaBuffer, { mimeType: mediaType });
                mediaIds.push(mediaUpload);
            } catch (error) {
                console.error("Error uploading media:", error);
                return res.status(400).json({
                    success: false,
                    message: "Failed to upload media",
                });
            }
        }

        // Prepare tweet options
        const tweetOptions = {
            text: text,
            ...(in_reply_to_tweet_id && { reply: { in_reply_to_tweet_id } }),
            ...(mediaIds.length > 0 && { media: { media_ids: mediaIds } }),
        };

        // Post the tweet
        const tweet = await twitterClient.v2.tweet(tweetOptions);

        res.status(200).json({
            success: true,
            message: "Tweet posted successfully",
            tweet: tweet.data,
            tweet_id: tweet.data.id
        });
    } catch (error) {
        console.error("Error posting tweet:", error);
        res.status(500).json({
            success: false,
            message: "Failed to post tweet, maybe its too long! Try shorting it.",
        });
    }
}

export async function getHomeTimelineController(req: Request, res: Response) {
    try {
        // Fetch the home timeline
        const homeTimeline = await twitterClient.v2.homeTimeline({
            max_results: 20, // Adjust as needed
            "tweet.fields": ["created_at", "public_metrics", "author_id", "note_tweet"],
            expansions: ["author_id"],
            "user.fields": ["username"],
        });

        // Extract tweets and users from the response
        const tweets = homeTimeline.data.data;
        const users = homeTimeline.data.includes?.users || [];

        // Create a map of user IDs to user objects for easy lookup
        const userMap = new Map(users.map((user: { id: any; }) => [user.id, user]));

        // Format the tweets with user information
        const formattedTweets = tweets.map((tweet: { id: any; text: any; note_tweet: any; public_metrics: any; author_id: unknown; }) => ({
            id: tweet.id,
            text: tweet.text,
            note_tweet: tweet.note_tweet,
            public_metrics: tweet.public_metrics,
            author: userMap.get(tweet.author_id),
        }));

        res.status(200).json({
            success: true,
            message: "Home timeline fetched successfully",
            tweets: formattedTweets,
        });
    } catch (error) {
        console.error("Error fetching home timeline:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch home timeline",
        });
    }
}

export async function getTweetNewController(req: Request, res: Response) {
    if(!req.query.tweet_id) return;
    console.log(await getConvoThread(req.query.tweet_id as string))
    res.status(200).json({})
}