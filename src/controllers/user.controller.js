import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})

        return {accessToken, refreshToken}
    }
    catch(error){
        console.log(error)
        throw new ApiError(500, "Something went wrong while genertaing web tokens")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details
    // validation
    // check if already exist username, email
    // avatar coverimage -> upload to cloudinary
    // create user object - create entry in DB
    // remove password and refresh token from response
    // check for user creation -> return response 
    
    
    
    const {fullname, username, email, password} = req.body
    if(
        [fullname, username, email, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All Fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser)
        throw new ApiError(409, "User with username or emil already exist")

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if(!avatarLocalPath)
        throw new ApiError(400, "Avatar is required")

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar)
        throw new ApiError(400, "Avatar is required")

    const user =  await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering User");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully"));
})

const loginUser = asyncHandler( async (req, res) => {
    //req body -> data
    //check user or email exist
    //check password
    // tokens
    // send cookie

    const {email, username, password} = req.body
    if(!username && !email) 
        throw new ApiError(400, "username or password is required")

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user)
        throw new ApiError(404,"User doesn`t exist")

    const isPasswordValid = await user.isPasswordCorrect(password)
    
    if(!isPasswordValid)
        throw new ApiError(401, "Password Incoorect")

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {
            user: loggedInUser,
            refreshToken, accessToken
        },
        "User Logged in Successfully"
        )
    )
})

const logOutUser = asyncHandler( async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            returnDocument: "after"
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, {} ,"user logged out successfully"))
})

const refreshAccessToken = asyncHandler( async(req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    
        if(!incomingRefreshToken)
            throw new ApiError(401 , "Unauthorized Request")
    
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = User.findById(decodedToken?._id)
    
        if(!user)
            throw new ApiError(401, "Invalid Refresh Token")
    
        if(incomingRefreshToken !== user?.refreshToken)
            throw new ApiError(401, "Refresh Token is expired")
    
        const options = {
            httpOnly: true,
            secure: true
        }
        const {accessToken, newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newrefreshToken, options)
        .json(new ApiResponse(200, {
            accessToken,
            refreshToken : newrefreshToken
        },
        "Access Token refreshed"))
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }
})

const changeCurrentPassword = asyncHandler( async(req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isUserPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isUserPasswordCorrect)
        throw new ApiError(400, "Invalid Password")

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    res.status(200).json(new ApiResponse(200, {}, "Password Changed"))
})

const getCurrentUser = asyncHandler( async(req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "Current User fetch successfully"))
})

const updateAccountDetails = asyncHandler( async(req, res) => {    
    const {fullname, email} = req.body
    if(!fullname || !email)
        throw new ApiError(400, "All fields are Required")

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email,
            }
        },
        {returnDocument: "after"}
    ).select("-password")

    return res.status(200).json(
    new ApiResponse(200, user, "Account Details Updated")
);
})

const updateUserAvatar = asyncHandler( async(req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath)
        throw new ApiError(400, "Avatar file is missing")

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url)
        throw new ApiError(400, "Error while uploading avatar on cloudinary ")

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar : avatar.url
            }
        },
        {
            returnDocument: "after",
        }
    ).select("-password")

    res.status(200).json(new ApiResponse(200, {user}, "Avatar Changed"))
})

const updateUserCoverImage = asyncHandler( async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath)
        throw new ApiError(400, "Avatar file is missing")

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url)
        throw new ApiError(400, "Error while uploading coverImage on cloudinary ")

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage : coverImage.url
            }
        },
        {
            returnDocument: "after",
        }
    ).select("-password")
    res.status(200).json(new ApiResponse(200, {user}, "coverImage Changed"))
})

const getUserChannelProfile = asyncHandler( async(req, res) => {
    const {username} = req.params;
    
    if(!username?.trim())
        throw new ApiError(400, "Username is Missing")

    const channel = await User.aggregate([
        {
            $match: {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
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
    if(!channel?.length)
        throw new ApiError(404, "Channel doesnot exist")

    return res.status(200).json(new ApiResponse(200, channel[0], "User channel fetched Successully"))
})

const getWatchHistory = asyncHandler( async(req, res) => {
    const owner = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
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
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first : "$owner"
                            }
                        }

                    }
                ]
            }
        }
    ])
    return res.status(200).json(new ApiResponse(200, owner[0].watchHistory, "Watch history fetched Successfully"))
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
    getWatchHistory
}