import express from 'express';
import {
    followUserController,
    getDraftsController,
    getHomeTimelineController,
    getTweetContextController, getTweetNewController,
    postTweetController, pullMentionsController,
    searchTweetsController,
    unfollowUserController,
} from "../controllers/twitter/twitterController";

const router = express.Router();

// Register the methods, and appoint them to the appropriate controller middleware

router.get('/', (req,res) => {
    res.status(200).json({success: true, message: "twitter router is working..."})
})


router.get('/get_home_timeline', getHomeTimelineController)
router.post('/post_tweet', postTweetController)
router.get('/search_tweets', searchTweetsController)
router.get('/get_drafts', getDraftsController)
router.get('/get_tweet', getTweetContextController)
router.post('/follow_user', followUserController)
router.post('/unfollow_user', unfollowUserController)
router.get('/pull_mentions', pullMentionsController)

router.get('/test', getTweetNewController)

export default router;
