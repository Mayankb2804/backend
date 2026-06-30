import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    const matchStage = {
        isPublish: true
    };

    if (userId) 
        matchStage.owner = new mongoose.Types.ObjectId(userId);


    if (query) {
        matchStage.$or = [
            {
                title: {
                    $regex: query,
                    $options: "i"
                }
            },
            {
                description: {
                    $regex: query,
                    $options: "i"
                }
            }
        ];
    }
    const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "views",
    "title",
    "duration"
    ];

    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const sortOrder = sortType === "asc" ? 1 : -1;

    const sortStage = {
        [sortField]: sortOrder
    };

    const video = await Video.aggregate([
        {
            $match: matchStage
        },
        {
            $sort: sortStage
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
        }, 
        {
            $project: {
                title: 1,
                description: 1,
                thumbnail: 1,
                views: 1,
                duration: 1,
                createdAt: 1,

                owner: {
                    _id: "$owner._id",
                    username: "$owner.username",
                    avatar: "$owner.avatar",
                    fullName: "$owner.fullName"
                }
            }
        }
    ])
    return res.status(200).json(new ApiResponse(200, video, "Get Video"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    if(!description || !title)
        throw new ApiError(404, "All Fields are required")
    const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailFileLocalPath = req.files?.thumbnail?.[0]?.path;

    if(!videoFileLocalPath )
        throw new ApiError(400, "Video File is required")
    if(!thumbnailFileLocalPath)
        throw new ApiError(400, "Thumbnail File is required")

    const [videoPath, thumbPath] = await Promise.all([
        uploadOnCloudinary(videoFileLocalPath, "video"),
        uploadOnCloudinary(thumbnailFileLocalPath)
    ])

    if (!videoPath) 
        throw new ApiError(500, "Failed to upload video");
    if(!thumbPath)
        throw new ApiError(500, "Failed to upload thumbnail");

    const video = await Video.create({
        videoFile: videoPath?.url,
        videoPublicId: videoPath?.public_id,
        thumbnail: thumbPath?.url,
        thumbnailPublicId: thumbPath?.public_id, 
        title,
        description,
        duration: videoPath?.duration || 0,
        owner: req.user._id
    })

    return res.status(201).json(
    new ApiResponse(
        201,
        video,
        "Video published successfully"
    )
);
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    const video = await Video.findById(videoId).populate("owner", "username fullname avatar");

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    return res.status(200).json(
        new ApiResponse(200, video, "Video fetched successfully")
    );
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailFileLocalPath = req.files?.thumbnail?.[0]?.path;
    if (!title && !description && !thumbnailFileLocalPath) {
        throw new ApiError(
            400,
            "At least one field is required for update"
        );
    }

    const updateFields = {};
    if (title) updateFields.title = title;
    if (description) updateFields.description = description;
    if (thumbnailFileLocalPath) {
        const thumbPath = await uploadOnCloudinary(
            thumbnailFileLocalPath
        );
        updateFields.thumbnail = thumbPath.url;
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: updateFields
        },
        {
            returnDocument: "after"
        }
    );

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    return res.status(200).json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    const video = await Video.findById(videoId);

    if (!video) 
        throw new ApiError(404, "Video not found");

    await deleteFromCloudinary(
        video.videoPublicId,
        "video"
    );

    await deleteFromCloudinary(
        video.thumbnailPublicId,
        "image"
    );

    await Video.findByIdAndDelete(videoId);

    return res.status(200).json(new ApiResponse(200, {}, "Video is deleted Successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const video = await Video.findById(videoId)
    
    if(!video)
        throw new ApiError(404, "Video not found")

    video.isPublish = !video.isPublish
    await video.save({ validateBeforeSave: false })

    return res.status(200).json(
        new ApiResponse(
            200,
            video,
            "Publish status toggled successfully"
        )
    );
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}