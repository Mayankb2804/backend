import { Router } from "express";
import {
  changeCurrentPassword,
  loginUser,
  logOutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  getCurrentUser,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),

    registerUser)
router.route("/login").post(loginUser)


//secured fields
router.route("/logout")
.post(verifyJWT, logOutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password")
.post(verifyJWT, changeCurrentPassword)


router.route("/c/:username")
.get(verifyJWT, getUserChannelProfile)
router.route("/current-user")
.get(verifyJWT, getCurrentUser)
router.route("/watch-history")
.get(verifyJWT, getWatchHistory)

router.route("/update-account-details")
.patch(verifyJWT, updateAccountDetails)
router.route("/avatar")
.patch(
    verifyJWT,
    upload.single("avatar"),
    updateUserAvatar
)
router.route("/cover-image")
.patch(
    verifyJWT,
    upload.single("coverImage"),
    updateUserCoverImage
)


export default router