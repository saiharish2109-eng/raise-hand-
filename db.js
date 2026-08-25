const { Pool, Client } = require('pg');
require('dotenv').config();

const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    }
  : {
      user: process.env.PGUSER || 'postgres',
      host: process.env.PGHOST || 'localhost',
      password: process.env.PGPASSWORD || '1234',
      port: parseInt(process.env.PGPORT || '5432', 10),
      database: process.env.PGDATABASE || 'pancha_tatva_db',
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false
    };

// Function to initialize database and tables
async function initializeDatabase() {
  const pool = new Pool(dbConfig);

  if (dbConfig.connectionString) {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          house_key VARCHAR(50) NOT NULL,
          question TEXT NOT NULL DEFAULT 'Question 1',
          registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS hand_raises (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          question TEXT NOT NULL DEFAULT 'Question 1',
          raised_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS question_history (
          id SERIAL PRIMARY KEY,
          question TEXT UNIQUE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE users ADD COLUMN IF NOT EXISTS question TEXT NOT NULL DEFAULT 'Question 1';
        ALTER TABLE hand_raises ADD COLUMN IF NOT EXISTS question TEXT NOT NULL DEFAULT 'Question 1';
        ALTER TABLE hand_raises DROP CONSTRAINT IF EXISTS hand_raises_user_id_key;
        DELETE FROM hand_raises older
        USING hand_raises newer
        WHERE older.question = newer.question
          AND (older.raised_at, older.id) > (newer.raised_at, newer.id);
        ALTER TABLE hand_raises DROP CONSTRAINT IF EXISTS hand_raises_user_question_key;
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'hand_raises_question_key'
          ) THEN
            ALTER TABLE hand_raises ADD CONSTRAINT hand_raises_question_key UNIQUE (question);
          END IF;
        END $$;

        TRUNCATE TABLE question_history RESTART IDENTITY;
        INSERT INTO question_history (question)
        SELECT question FROM hand_raises GROUP BY question ORDER BY MIN(raised_at);
        INSERT INTO question_history (question)
        SELECT DISTINCT question FROM users
        WHERE question NOT IN (SELECT question FROM question_history);
        INSERT INTO question_history (question)
        SELECT 'Question 1'
        WHERE NOT EXISTS (SELECT 1 FROM question_history);
      `;
      await pool.query(createTableQuery);
      console.log('Neon PostgreSQL tables initialized and ready.');
    } catch (err) {
      console.error('Error creating Neon tables:', err.message);
    }

    return pool;
  }

  // Step 1: Connect to default 'postgres' db to ensure database exists for local Postgres
  const rootClient = new Client({
    user: dbConfig.user,
    host: dbConfig.host,
    password: dbConfig.password,
    port: dbConfig.port,
    database: 'postgres'
  });

  try {
    await rootClient.connect();
    const res = await rootClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbConfig.database]
    );

    if (res.rowCount === 0) {
      console.log(`Creating database ${dbConfig.database}...`);
      await rootClient.query(`CREATE DATABASE "${dbConfig.database}"`);
      console.log(`Database ${dbConfig.database} created successfully.`);
    } else {
      console.log(`Database ${dbConfig.database} already exists.`);
    }
  } catch (err) {
    console.error('Error verifying database existence:', err.message);
  } finally {
    await rootClient.end();
  }

  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        house_key VARCHAR(50) NOT NULL,
        question TEXT NOT NULL DEFAULT 'Question 1',
        registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS hand_raises (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        question TEXT NOT NULL DEFAULT 'Question 1',
        raised_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS question_history (
        id SERIAL PRIMARY KEY,
        question TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS question TEXT NOT NULL DEFAULT 'Question 1';
      ALTER TABLE hand_raises ADD COLUMN IF NOT EXISTS question TEXT NOT NULL DEFAULT 'Question 1';
      ALTER TABLE hand_raises DROP CONSTRAINT IF EXISTS hand_raises_user_id_key;
      DELETE FROM hand_raises older
      USING hand_raises newer
      WHERE older.question = newer.question
        AND (older.raised_at, older.id) > (newer.raised_at, newer.id);
      ALTER TABLE hand_raises DROP CONSTRAINT IF EXISTS hand_raises_user_question_key;
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'hand_raises_question_key'
        ) THEN
          ALTER TABLE hand_raises ADD CONSTRAINT hand_raises_question_key UNIQUE (question);
        END IF;
      END $$;

      TRUNCATE TABLE question_history RESTART IDENTITY;
      INSERT INTO question_history (question)
      SELECT question FROM hand_raises GROUP BY question ORDER BY MIN(raised_at);
      INSERT INTO question_history (question)
      SELECT DISTINCT question FROM users
      WHERE question NOT IN (SELECT question FROM question_history);
      INSERT INTO question_history (question)
      SELECT 'Question 1'
      WHERE NOT EXISTS (SELECT 1 FROM question_history);
    `;
    await pool.query(createTableQuery);
    console.log('PostgreSQL "users" table initialized and ready.');
  } catch (err) {
    console.error('Error creating users table:', err.message);
  }

  return pool;
}

const pool = new Pool(dbConfig);

module.exports = {
  pool,
  initializeDatabase,
  dbConfig
};
