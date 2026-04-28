// src/routes/index.js
const router = require("express").Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validate = require("../middlewares/validate");
const { signupSchema, loginSchema } = require("../validations/authValidation");

const authCtrl = require("../controllers/authController");
const miningCtrl = require("../controllers/miningController");
const withdrawCtrl = require("../controllers/withdrawController");
const adminCtrl = require("../controllers/adminController");
const paymentCtrl = require("../controllers/paymentController");
const profileCtrl = require("../controllers/profileController");
const transactionCtrl = require("../controllers/transactionController");
const configCtrl = require("../controllers/configController");
const referralCtrl = require("../controllers/referralController");
const paymentRoutes = require("./paymentRoutes");

const upload = require("../middleware/upload");

router.post("/signup", validate(signupSchema), authCtrl.signup);
router.post("/login", validate(loginSchema), authCtrl.login);
router.get("/profile", auth, profileCtrl.getProfile);
router.post("/update-password", auth, profileCtrl.updatePassword);
router.post("/update-profile-image", auth, upload.single("image"), profileCtrl.updateProfileImage);
router.get("/referrals", auth, referralCtrl.getReferrals);
router.get("/activity", auth, transactionCtrl.getTransactions);
router.get("/referral-stats", auth, authCtrl.getReferralStats);

router.post("/start-mining", auth, miningCtrl.startMining);
router.post("/claim-reward", auth, miningCtrl.claimReward);
router.get("/mining-status", auth, miningCtrl.getStatus);
router.get("/balance", auth, miningCtrl.getBalance);

router.post("/withdraw", auth, withdrawCtrl.request);
router.get("/withdrawals", auth, withdrawCtrl.myWithdrawals);

// Payments
router.get("/config", configCtrl.getConfig);
router.post("/verify-payment", auth, paymentCtrl.verifyPayment);
router.use("/payments", paymentRoutes);

// Admin
router.get("/admin/analytics", auth, admin, adminCtrl.getAnalytics);
router.get("/admin/queue-status", auth, admin, adminCtrl.getQueueStatus);
router.get("/admin/referrals", auth, admin, adminCtrl.getReferralInsights);
router.get("/admin/withdrawals", auth, admin, adminCtrl.getWithdrawals);
router.get("/admin/users", auth, admin, adminCtrl.getUsers);
router.post("/admin/withdraw/approve", auth, admin, adminCtrl.approve);
router.post("/admin/withdraw/reject", auth, admin, adminCtrl.reject);
router.post("/admin/config/update", auth, admin, configCtrl.updateConfig);
router.post("/admin/user/toggle-flag", auth, admin, adminCtrl.toggleFlagUser);

module.exports = router;