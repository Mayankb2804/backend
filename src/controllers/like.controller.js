import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!isValidObjectId(videoId))
        throw new ApiError(400, "Valid Id is required")

    const existingLike = await Like.findOne({
        video : videoId,
        likedBy: req.user._id
    })

    if(existingLike){
        await Like.findByIdAndDelete(existingLike._id);

        return res.status(200).json(
            new ApiResponse(
                200,
                { liked: false },
                "Video unliked successfully"
            )
        );
    }

    await Like.create({
        video: videoId,
        likedBy: req.user._id
    })
    
    return res.status(200).json(
            new ApiResponse(
                200,
                { liked: true },
                "Video liked successfully"
            )
        );
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!isValidObjectId(commentId))
        throw new ApiError(400, "Valid Id is required")

    const existingLike = await Like.findOne({
        comment : commentId,
        likedBy: req.user._id
    })

    if(existingLike){
        await Like.findByIdAndDelete(existingLike._id);

        return res.status(200).json(
            new ApiResponse(
                200,
                { liked: false },
                "Comment unliked successfully"
            )
        );
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user._id
    })
    
    return res.status(200).json(
            new ApiResponse(
                200,
                { liked: true },
                "Comment liked successfully"
            )
        );
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id)
            }
        }, 
        {
            $lookup:{
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        {
            $unwind: "$videoDetails"
        },
        {
            $project: {
                _id: 0,
                videoId: "$videoDetails._id",
                title: "$videoDetails.title",
                description: "$videoDetails.description",
                thumbnail: "$videoDetails.thumbnail",
                views: "$videoDetails.views",
                createdAt: "$videoDetails.createdAt",
                duration: "$videoDetails.duration"
            }
        }  
    ])
    return res.status(200).json(
        new ApiResponse(
            200,
            likedVideos,
            "Liked Videos fetched Successfully"
        )
    );
})

const getVideoLikeCount = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId))
        throw new ApiError(400, "Valid Id is required")

    const likeCount = await Like.countDocuments({ video: videoId })

    let isLiked = false
    if (req.user?._id) {
        const existingLike = await Like.findOne({
            video: videoId,
            likedBy: req.user._id
        })
        isLiked = !!existingLike
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            { likeCount, isLiked },
            "Like count fetched successfully"
        )
    );
})

export {
    toggleCommentLike,
    toggleVideoLike,
    getLikedVideos,
    getVideoLikeCount
}