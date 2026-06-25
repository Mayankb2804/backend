import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    //TODO: create playlist
    if(!name || !description)
        throw new ApiError(400, "All fields are required")

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user._id
    })

    if(!playlist)
        throw new ApiError(500, "Error while creating Playlist")

    return res.status(201).json(
        new ApiResponse(
            201, 
            playlist, 
            "Playlist Created!"
        )
    );
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    //TODO: get user playlists
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Valid user ID is required");
    }

    const playlists = await Playlist.find({
        owner: userId
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            playlists,
            "Playlists fetched successfully"
        )
    );
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Valid playlist ID is required");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
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
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: {
                    _id: "$owner._id",
                    username: "$owner.username",
                    fullname: "$owner.fullname",
                    avatar: "$owner.avatar"
                },
                videos: 1
            }
        }
    ]);

    if (!playlist.length) {
        throw new ApiError(404, "Playlist not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            playlist[0],
            "Playlist fetched successfully"
        )
    );
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId))
        throw new ApiError(400, "ValidIds are required")

    const playlist = await Playlist.findById(playlistId)

    if(!playlist)
        throw new ApiError(404, "Playlist Not Found")

    if(playist.videos.includes(videoId)) 
        throw new ApiError(400, "Video is already exists in playlist")

    playlist.videos.push(videoId)
    await playlist.save()

    return res.status(200).json(
        new ApiResponse(
            200,
            playlist,
            "Video added to playlist successfully"
        )
    );
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId))
        throw new ApiError(400, "ValidIds are required")

     const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: videoId
            }
        },
        {
            returnDocument: "after"
        }
    );

    if(!playlist)
        throw new ApiError(404, "Playlist Not Found")

    return res.status(200).json(
        new ApiResponse(
            200,
            playlist,
            "Video Deleted Successfully"
        )
    );
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if(!isValidObjectId(playlistId))
        throw new ApiError(400, "ValidId is required")

    const playlist = await Playlist.findByIdAndDelete(playlistId)

    if(!playlist)
        throw new ApiError(404, "Playlist Not Found")

    res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Playlist Deleted Successfully"
        )
    );
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if(!isValidObjectId(playlistId))
        throw new ApiError(400, "ValidId is required")

    if(!name && !description)
        throw new ApiError(400, "One field is required")

    const updateFields = {};

    if (name) updateFields.name = name;
    if (description) updateFields.description = description;

    const playlist = await Playlist.findByIdAndUpdate(
        {
            _id: playlistId,
            owner: req.user._id
        },
        {
            $set: updateFields
        },
        {
            returnDocument: "after"
        }
    )

    if(!playlist)
        throw new ApiError(404, "Playlist Not Found")

    res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Playlist Updated Successfully"
        )
    );
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}