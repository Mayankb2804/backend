import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!mongoose.isValidObjectId(videoId))
        throw new ApiError(400, "ValidId is required")

    const comments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $unwind: "$ownerDetails"
        },
        {
            $project: {
                _id: 1,
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: {
                    _id: "$ownerDetails._id",
                    username: "$ownerDetails.username",
                    fullname: "$ownerDetails.fullname",
                    avatar: "$ownerDetails.avatar",
                }
            }
        },
        {
            $skip: (Number(page) - 1) * Number(limit)
        },
        {
            $limit: Number(limit)
        }
    ])
    return res.status(200).json(
        new ApiResponse(
            200,
            comments,
            "Comments fetched successfully"
        )
    );
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params;
    const { content } = req.body;

    if (!mongoose.isValidObjectId(videoId)) 
        throw new ApiError(400, "Valid video ID is required");

    if (!content?.trim()) 
        throw new ApiError(400, "Comment content is required");
    
    const comment = Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    });

    if(!comment)
        throw new ApiError(500, "Failed to add comment");

    return res.status(201).json(
        new ApiResponse(
            201,
            comment,
            "Comment added successfully"
        )
    );
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params;
    const { content } = req.body;

    if(!mongoose.isValidObjectId(commentId))
        throw new ApiError(400, "Valid comment ID is required");

    if (!content?.trim()) 
        throw new ApiError(400, "Comment content is required");

    const comment = await Comment.findOneUpdate(
        {
            commentId,
            owner: req.user._id
        },
        {
            $set: {content}
        },
        {
            returnDocument: "after"
        }
    )

    if(!comment)
        throw new ApiError(404, "Comment Not Found")

    return res.status(200).json(
        new ApiResponse(
            200,
            comment,
            "Comment Updated Successfully"
        )
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
     const { commentId } = req.params;

    if(!mongoose.isValidObjectId(commentId))
        throw new ApiError(400, "Valid comment ID is required");

    await Comment.findByIdAndDelete({
        _id: commentId,
        owner: req.user_id
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Comment deleted Successfully"
        )
    );
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }