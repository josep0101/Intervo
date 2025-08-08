const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `https://${process.env.BASE_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find or create user logic
        let user = await User.findOne({ 'authProviders.google.id': profile.id });
        
        if (!user) {
          // Get email from profile and convert to lowercase
          const email = profile.emails[0].value.toLowerCase();
          
          // Check if a user with this email already exists (with different auth method)
          const existingUser = await User.findOne({ email });
          
          if (existingUser) {
            // Update existing user with Google auth provider
            existingUser.authProviders.google = { id: profile.id };
            
            // Add Google as an auth method if not already present
            if (!existingUser.authMethods) {
              existingUser.authMethods = [];
            }
            
            if (!existingUser.authMethods.some(method => method.type === 'google')) {
              existingUser.authMethods.push({
                type: 'google',
                timestamp: new Date()
              });
            }
            
            // --- Update Profile Info for Existing User ---
            let updated = false;
            if (!existingUser.firstName && profile.name && profile.name.givenName) {
              existingUser.firstName = profile.name.givenName;
              updated = true;
            }
            if (!existingUser.lastName && profile.name && profile.name.familyName) {
              existingUser.lastName = profile.name.familyName;
              updated = true;
            }
            if (updated && existingUser.firstName && existingUser.lastName && (!existingUser.displayName || existingUser.displayName === existingUser.email?.split('@')[0])) {
              existingUser.displayName = `${existingUser.firstName} ${existingUser.lastName}`;
            }
            // --- End Update ---
            
            await existingUser.save();
            user = existingUser;
          } else {
            // Create new user
            user = await new User({
              authProviders: {
                google: { id: profile.id },
              },
              displayName: profile.displayName,
              firstName: profile.name ? profile.name.givenName : undefined,
              lastName: profile.name ? profile.name.familyName : undefined,
              email: email,
              authMethods: [{
                type: 'google',
                timestamp: new Date()
              }]
            }).save();
          }
        } else {
          // --- Update Profile Info for Returning User ---
          let updated = false;
          if (!user.firstName && profile.name && profile.name.givenName) {
            user.firstName = profile.name.givenName;
            updated = true;
          }
          if (!user.lastName && profile.name && profile.name.familyName) {
            user.lastName = profile.name.familyName;
            updated = true;
          }
          if (updated && user.firstName && user.lastName && (!user.displayName || user.displayName === user.email?.split('@')[0])) {
            user.displayName = `${user.firstName} ${user.lastName}`;
          }

          if (updated) {
            await user.save(); // Save only if changes were made
          }
          // --- End Update ---
        }
        
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => done(null, user))
    .catch((err) => done(err, null));
});

module.exports = passport;
