import {TweetV2, UserV2} from "twitter-api-v2";
import {
    NoteTweetV2,
    ReferencedTweetV2,
    TweetAttachmentV2,
    TweetContextAnnotationV2,
    TweetEntitiesV2,
    TweetGeoV2,
    TweetNonPublicMetricsV2,
    TweetOrganicMetricsV2,
    TweetPromotedMetricsV2,
    TweetPublicMetricsV2,
    TweetWithheldInfoV2
} from "twitter-api-v2/dist/esm/types/v2/tweet.definition.v2";

export interface XResponse {
    data?: any;
    includes?: {
        users?: UserV2[];
        tweets?: TweetV2[];
        media?: Media[];
    };
}

export interface TweetV2Modified {
    id: string;
    text: string;
    edit_history_tweet_ids: string[];
    created_at?: string;
    author_id?: string;
    conversation_id?: string;
    in_reply_to_user_id?: string;
    referenced_tweets?: ReferencedTweetV2[];
    attachments?: TweetAttachmentV2;
    geo?: TweetGeoV2;
    context_annotations?: TweetContextAnnotationV2[];
    entities?: TweetEntitiesV2;
    withheld?: TweetWithheldInfoV2;
    public_metrics?: TweetPublicMetricsV2;
    non_public_metrics?: TweetNonPublicMetricsV2;
    organic_metrics?: TweetOrganicMetricsV2;
    promoted_metrics?: TweetPromotedMetricsV2;
    possibly_sensitive?: boolean;
    lang?: string;
    reply_settings?: 'everyone' | 'mentionedUsers' | 'following';
    source?: string;
    note_tweet?: NoteTweetV2;
    author: UserV2;
    media: any[]
}

export interface Media {
    media_key: string;
    data: any;
}

export interface ThreadStructure {
    requested_tweet: TweetV2Modified;
    root_tweet: TweetV2Modified;
    ancestor_chain: TweetV2Modified[];
    sibling_tweets: TweetV2Modified[];
    children_tweets: TweetV2Modified[];
}