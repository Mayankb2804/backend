import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Playlist } from "../models/playlist.model.js";
import { Subscription } from "../models/subscription.model.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    }
    catch (error) {
        console.error(`[Auth] ❌ Token generation failed for user ${userId}: ${error.message}`)
        throw new ApiError(500, "Something went wrong while generating tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullname, username, email, password } = req.body

    if ([fullname, username, email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({ $or: [{ username }, { email }] })
    if (existedUser)
        throw new ApiError(409, "User with this username or email already exists")

    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path

    if (!avatarLocalPath)
        throw new ApiError(400, "Avatar is required")

    const [avatar, coverImage] = await Promise.all([
        uploadOnCloudinary(avatarLocalPath),
        uploadOnCloudinary(coverImageLocalPath)
    ])

    if (!avatar)
        throw new ApiError(400, "Avatar upload failed")

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser)
        throw new ApiError(500, "Something went wrong while registering user")

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    }

    console.log(`[Auth] ✅ New user registered and logged in: ${username}`)
    return res.status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(201, { user: createdUser, accessToken, refreshToken }, "User registered successfully"))
})

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body

    if (!username && !email)
        throw new ApiError(400, "Username or email is required")

    let user
    if (username) {
        user = await User.findOne({ username: username.toLowerCase() })
    } else {
        user = await User.findOne({ email })
    }

    if (!user)
        throw new ApiError(404, "User does not exist")

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid)
        throw new ApiError(401, "Incorrect password")

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    }

    console.log(`[Auth] ✅ User logged in: ${loggedInUser.username}`)
    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully"))
})

const logOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } },
        { returnDocument: "after" }
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    }

    console.log(`[Auth] ✅ User logged out: ${req.user.username}`)
    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken)
        throw new ApiError(401, "Unauthorized request — no refresh token provided")

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)
    if (!user)
        throw new ApiError(401, "Invalid refresh token — user not found")

    if (incomingRefreshToken !== user?.refreshToken)
        throw new ApiError(401, "Refresh token is expired or already used")

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

    console.log(`[Auth] ✅ Access token refreshed for user: ${user.username}`)
    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed"))
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect)
        throw new ApiError(400, "Incorrect old password")

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    console.log(`[Auth] ✅ Password changed for user: ${req.user.username}`)
    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email, username } = req.body

    if (!fullname || !email || !username)
        throw new ApiError(400, "Fullname or email or username are required")

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { fullname, email, username } },
        { returnDocument: "after" }
    ).select("-password")

    console.log(`[User] ✅ Account details updated for: ${req.user.username}`)
    return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath)
        throw new ApiError(400, "Avatar file is missing")

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url)
        throw new ApiError(400, "Avatar upload to Cloudinary failed")

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { avatar: avatar.url } },
        { returnDocument: "after" }
    ).select("-password")

    console.log(`[User] ✅ Avatar updated for: ${req.user.username}`)
    return res.status(200).json(new ApiResponse(200, { user }, "Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath)
        throw new ApiError(400, "Cover image file is missing")

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage.url)
        throw new ApiError(400, "Cover image upload to Cloudinary failed")

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { coverImage: coverImage.url } },
        { returnDocument: "after" }
    ).select("-password")

    console.log(`[User] ✅ Cover image updated for: ${req.user.username}`)
    return res.status(200).json(new ApiResponse(200, { user }, "Cover image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim())
        throw new ApiError(400, "Username is missing")

    const channel = await User.aggregate([
        { $match: { username: username?.toLowerCase() } },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                channelsSubscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            }
        }
    ])

    if (!channel?.length)
        throw new ApiError(404, "Channel does not exist")

    return res.status(200).json(new ApiResponse(200, channel[0], "Channel profile fetched successfully"))
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const owner = await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.user?._id) } },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                { $project: { fullname: 1, username: 1, avatar: 1 } }
                            ]
                        }
                    },
                    { $addFields: { owner: { $first: "$owner" } } }
                ]
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, owner[0].watchHistory, "Watch history fetched successfully"))
})

const addToWatchHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!mongoose.isValidObjectId(videoId))
        throw new ApiError(400, "Valid video ID is required")

    await User.findByIdAndUpdate(
        req.user._id,
        { $pull: { watchHistory: new mongoose.Types.ObjectId(videoId) } }
    )

    await User.findByIdAndUpdate(
        req.user._id,
        { $push: { watchHistory: { $each: [new mongoose.Types.ObjectId(videoId)], $position: 0 } } }
    )

    return res.status(200).json(
        new ApiResponse(200, {}, "Added to watch history")
    )
})

const clearWatchHistory = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $set: { watchHistory: [] } }
    )

    return res.status(200).json(
        new ApiResponse(200, {}, "Watch history cleared")
    )
})

const clearVideoFromWatchHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(! mongoose.isValidObjectId(videoId))
        throw new ApiError(400, "ValidId is required")

    const newWatchHistory = await User.findByIdAndUpdate(req.user._id, 
        {
            $pull: {watchHistory : videoId}
        },
        {
            returnDocument: "after"
        }
    )
    return res.status(200).json(
        new ApiResponse(200, newWatchHistory, "Removed video From watch history")
    )
})

const deleteAccount = asyncHandler(async (req, res) => {
    const userId = req.user._id
    const username = req.user.username

    // 1. Get all user's videos to delete their files from Cloudinary
    const videos = await Video.find({ owner: userId })
    await Promise.all(
        videos.map(async (video) => {
            if (video.videoPublicId) await deleteFromCloudinary(video.videoPublicId, "video")
            if (video.thumbnailPublicId) await deleteFromCloudinary(video.thumbnailPublicId, "image")
        })
    )

    // 2. Delete avatar and cover image from Cloudinary
    const user = await User.findById(userId)
    if (user.avatar) {
        const avatarPublicId = user.avatar.split("/").pop().split(".")[0]
        await deleteFromCloudinary(avatarPublicId, "image")
    }
    if (user.coverImage) {
        const coverPublicId = user.coverImage.split("/").pop().split(".")[0]
        await deleteFromCloudinary(coverPublicId, "image")
    }

    // 3. Delete all related data from MongoDB in parallel
    await Promise.all([
        Video.deleteMany({ owner: userId }),
        Comment.deleteMany({ owner: userId }),
        Like.deleteMany({ likedBy: userId }),
        Playlist.deleteMany({ owner: userId }),
        Subscription.deleteMany({ $or: [{ subscriber: userId }, { channel: userId }] }),
        User.findByIdAndDelete(userId)
    ])

    const options = { httpOnly: true, secure: false }

    console.log(`[Auth] ✅ Account and all data deleted: ${username}`)
    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "Account deleted successfully"))
})

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    addToWatchHistory,
    clearWatchHistory,
    clearVideoFromWatchHistory,
    deleteAccount
}
