const express = require('express');
const router = express.Router();
const Meeting = require('../Models/Meeting');
const { protect } = require('../middleware/auth');

// Create meeting
router.post('/create', protect, async (req, res) => {
  try {
    const { meetingId } = req.body;
    const meeting = await Meeting.create({
      meetingId: meetingId || Math.random().toString(36).substring(2, 10).toUpperCase(),
      hostId: req.user._id
    });
    res.status(201).json({ meeting });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get meeting info
router.get('/:meetingId', async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId }).populate('participants.userId', 'name email photoURL');
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }
    res.json({ meeting });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;