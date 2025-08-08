const express = require('express');
const router = express.Router();
const { handleStripeWebhook } = require('../lib/stripeHandlers');

// @desc    Handle incoming Stripe webhooks
// @route   POST /api/webhooks/stripe
// @access  Public
// IMPORTANT: Stripe requires the raw body for signature verification.
// Ensure you have middleware configured *before* this route in your main app
// to make the raw body available (e.g., using express.raw({type: 'application/json'}))
router.post('/stripe', handleStripeWebhook);

module.exports = router; 