const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool, initializeDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
let currentQuestion = 'Question 1';
let currentQuestionId = 1;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Get all registered users (for database viewer page)
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, house_key, question, registered_at FROM users ORDER BY registered_at ASC'
    );
    res.json({ success: true, users: result.rows, total: result.rows.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a user by ID
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, name', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: `User "${result.rows[0].name}" deleted from database` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reset the classroom data, including users and their hand-raise records.
async function resetDatabase(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE hand_raises, users, question_history RESTART IDENTITY CASCADE');
    await client.query("INSERT INTO question_history (question) VALUES ('Question 1')");
    await client.query('COMMIT');
    currentQuestion = 'Question 1';
    res.json({ success: true, message: 'All database records were reset.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
}

app.post('/api/reset', resetDatabase);
app.delete('/api/users', resetDatabase);

// Get the faculty queue in the order students raised their hands
app.get('/api/hand-raises', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT hand_raises.id, hand_raises.user_id, users.name, users.house_key,
        hand_raises.question, hand_raises.raised_at
      FROM hand_raises
      JOIN users ON users.id = hand_raises.user_id
      WHERE hand_raises.question = $1
      ORDER BY hand_raises.raised_at ASC, hand_raises.id ASC
    `, [currentQuestion]);
    res.json({ success: true, question: currentQuestion, raises: result.rows, total: result.rows.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Record one hand raise per student
app.post('/api/hand-raises', async (req, res) => {
  const { userId } = req.body;

  if (!Number.isInteger(Number(userId))) {
    return res.status(400).json({ success: false, message: 'A valid student is required.' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO hand_raises (user_id, question)
      SELECT id, $2 FROM users WHERE id = $1
      ON CONFLICT (question) DO NOTHING
      RETURNING id, user_id, question, raised_at
    `, [Number(userId), currentQuestion]);

    if (result.rows.length === 0) {
      return res.status(409).json({ success: false, message: 'The first student has already raised a hand for this question.' });
    }

    res.status(201).json({ success: true, raise: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Unable to raise hand: ' + err.message });
  }
});

// Move to the next classroom question while preserving previous question records.
app.post('/api/next-question', async (req, res) => {
  const question = typeof req.body.question === 'string' ? req.body.question.trim() : '';
  if (!question) {
    return res.status(400).json({ success: false, message: 'A question is required.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO question_history (question) VALUES ($1) ON CONFLICT (question) DO UPDATE SET question = EXCLUDED.question RETURNING id, question',
      [question]
    );
    currentQuestionId = result.rows[0].id;
    await pool.query('UPDATE users SET question = $1', [question]);
    currentQuestion = question;
    res.json({ success: true, question: currentQuestion, questionId: currentQuestionId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/previous-question', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, question FROM question_history WHERE id < $1 ORDER BY id DESC LIMIT 1',
      [currentQuestionId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'This is the first question.' });
    }

    currentQuestionId = result.rows[0].id;
    currentQuestion = result.rows[0].question;
    await pool.query('UPDATE users SET question = $1', [currentQuestion]);
    res.json({ success: true, question: currentQuestion, questionId: currentQuestionId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health / Database Status Check
app.get('/api/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, COUNT(*) as total_users FROM users');
    res.json({
      status: 'online',
      database: 'PostgreSQL Connected',
      totalUsers: parseInt(result.rows[0].total_users, 10),
      timestamp: result.rows[0].current_time
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database: 'PostgreSQL Connection Error',
      error: err.message
    });
  }
});

// Register User Endpoint
app.post('/api/register', async (req, res) => {
  const { name, email, password, houseKey } = req.body;

  if (!name || !email || !password || !houseKey) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    // Check if email already exists
    const existing = await pool.query('SELECT id, email FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered. Please sign in!'
      });
    }

    // Insert user into PostgreSQL
    const insertQuery = `
      INSERT INTO users (name, email, password, house_key, question, registered_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, name, email, house_key, question, registered_at;
    `;
    const result = await pool.query(insertQuery, [name.trim(), cleanEmail, password, houseKey, currentQuestion]);
    const newUser = result.rows[0];

    return res.status(201).json({
      success: true,
      message: 'Candidate registered successfully in PostgreSQL database!',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        houseKey: newUser.house_key,
        registeredAt: newUser.registered_at
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      message: 'Database error occurred during registration: ' + err.message
    });
  }
});

// Login User Endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const userResult = await pool.query(
      'SELECT id, name, email, password, house_key, registered_at FROM users WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email. Please register!'
      });
    }

    const user = userResult.rows[0];

    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again.'
      });
    }

    return res.json({
      success: true,
      message: 'Login successful!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        houseKey: user.house_key,
        registeredAt: user.registered_at
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Database error occurred during login: ' + err.message
    });
  }
});

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

async function initializeServer() {
  await initializeDatabase();
  const questionResult = await pool.query(
    `SELECT question_history.id, question_history.question
     FROM question_history
     JOIN (SELECT question FROM users ORDER BY id DESC LIMIT 1) active
       ON active.question = question_history.question`
  );
  const latestQuestionResult = await pool.query('SELECT id, question FROM question_history ORDER BY id DESC LIMIT 1');
  const activeQuestion = questionResult.rows[0] || latestQuestionResult.rows[0];
  if (activeQuestion) {
    currentQuestionId = activeQuestion.id;
    currentQuestion = activeQuestion.question;
  }
}

app.initializeServer = initializeServer;
module.exports = app;

// Start the local server after DB initialization
if (require.main === module) {
  initializeServer().then(() => {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`  PANCHA TATVA Portal running on http://localhost:${PORT}`);
    console.log(`  PostgreSQL Database integration active`);
    console.log(`=================================================`);
  });
  }).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
}
