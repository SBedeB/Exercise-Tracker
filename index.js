// Import required libraries
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

// Load environment variables from the .env file
require('dotenv').config();

// Connect to MongoDB using the provided URI
mongoose.connect(process.env.MONGO_URI);

// Define Mongoose schemas and models for User and Exercise
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Middleware: Enable CORS and parse JSON and URL-encoded data
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve static files from the 'public' directory and handle the root route
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Middleware: Custom logging for Exercise Tracker
app.use((req, res, next) => {
  const method = req.method;
  const path = req.path;
  const ip = req.ip;

  // Include project URL in the log for POST requests
  const url = method === 'POST' ? `${process.env.PROJECT_URL}${path}` : path;

  console.log(`${method} ${url} - ${ip}`);
  next();
});

// Test 2: Create a new user
app.post('/api/users', async (req, res) => {
  const { username } = req.body;

  try {
    // Create a new user in the database
    const newUser = await User.create({ username });
    // Respond with the created user's details
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (error) {
    // Handle the case where the username is already taken
    res.json({ error: 'Username already taken' });
  }
});

// Test 3 and 4: Get a list of all users
app.get('/api/users', async (req, res) => {
  try {
    // Retrieve a list of all users (only include _id and username)
    const users = await User.find({}, '_id username');
    // Respond with the list of users
    res.json(users);
  } catch (error) {
    // Handle errors while fetching users
    res.json({ error: 'Error fetching users' });
  }
});

// Test 7 and 8: Log exercises for a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    // If user not found, respond with an error
    if (!user) {
      return res.json({ error: 'User not found' });
    }

    // Create a new exercise for the user
    const exercise = await Exercise.create({ userId, description, duration, date });

    // Respond with the user's details and the logged exercise details
    res.json({
      _id: user._id,
      username: user.username,
      date: exercise.date.toDateString(),
      duration: exercise.duration,
      description: exercise.description,
    });
  } catch (error) {
    // Handle errors while logging exercises
    res.json({ error: 'Error logging exercise' });
  }
});

// Test 9 to 16: Retrieve exercise logs for a user
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  try {
    // Find the user by ID
    const user = await User.findById(userId);
    const query = { userId };

    // If 'from' or 'to' parameters are provided, filter logs by date range
    if (from || to) {
      query.date = {};

      if (from) {
        query.date.$gte = new Date(from);
      }

      if (to) {
        query.date.$lte = new Date(to);
      }
    }

    // Retrieve exercise logs, sort by date, and limit the number of logs if 'limit' is provided
    let logs = await Exercise.find(query)
      .sort('-date')
      .limit(limit ? parseInt(limit) : undefined);

    // Format log entries and respond with user details, log count, and log entries
    logs = logs.map(log => ({
      description: log.description,
      duration: log.duration,
      date: log.date.toDateString(),
    }));

    res.json({
      username: user.username,
      _id: user._id,
      count: logs.length,
      log: logs,
    });
  } catch (error) {
    // Handle errors while retrieving exercise logs
    res.json({ error: 'Error retrieving exercise logs' });
  }
});

// Start the server on the specified port or default to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
