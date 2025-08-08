const jwt = require('jsonwebtoken');
const User = require("../models/User"); // Import the User model
const JWT_SECRET = process.env.NEXTAUTH_SECRET;

const authenticateAdmin = async (req, res, next) => {
  // Remove domain check
  // const domains = ["codedesign.app", "codedesign.ai", "voxa.ai"];

  try {
    const token = req.cookies.authToken;

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Find the user by ID from the token
    const user = await User.findById(decoded.userId);

    console.log(user, "admin user");
    // Check if user exists and has isAdmin flag set to true
    if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Unauthorized: Admin privileges required" });
    }

    // Remove domain check logic
    // const emailDomain = decoded.email.split("@")[1];
    // if (!domains.includes(emailDomain)) {
    //     return res.status(401).json({ error: "Unauthorized" });
    // }

    req.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    // Keep 401 for token errors, 403 is for authorization failure
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: "Invalid authentication token" });
    } 
    // For other errors during user lookup etc.
    return res.status(500).json({ error: "Internal server error during authentication" });
  }
};

module.exports = authenticateAdmin;
