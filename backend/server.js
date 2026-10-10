require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const http = require('http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8000;
const PYTHON_PORT = process.env.PYTHON_PORT || 8001;

// Body parser middleware specifically for our intercepted JSON endpoints
const bodyParser = express.json();

let pool = null;

// 1. Locate python executable in venv or system fallbacks
function getPythonExecutable() {
  const winVenv = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
  const unixVenv = path.join(__dirname, 'venv', 'bin', 'python');

  if (fs.existsSync(winVenv)) {
    console.log(`[JobShield] Using Windows virtual environment Python: ${winVenv}`);
    return winVenv;
  }
  if (fs.existsSync(unixVenv)) {
    console.log(`[JobShield] Using Unix/macOS virtual environment Python: ${unixVenv}`);
    return unixVenv;
  }

  console.log('[JobShield] Virtual environment not found. Falling back to system Python...');
  return process.platform === 'win32' ? 'python' : 'python3';
}

// 2. Ensure ML model is trained and initialized
const pythonBin = getPythonExecutable();
const modelFile = path.join(__dirname, 'app', 'ml', 'model.pkl');
if (!fs.existsSync(modelFile)) {
  console.log('[JobShield ML] Model not found. Initializing ML engine and training classifier...');
  try {
    spawnSync(pythonBin, ['inspect_db.py'], {
      cwd: __dirname,
      stdio: 'inherit'
    });
    console.log('[JobShield ML] ML engine initialization completed.');
  } catch (mlErr) {
    console.warn('[JobShield ML] Automatic ML setup warning:', mlErr.message);
  }
}

console.log(`[JobShield] Starting FastAPI backend on port ${PYTHON_PORT} using ${pythonBin}...`);

const pythonProcess = spawn(pythonBin, [
  '-m', 'uvicorn', 'app.main:app',
  '--port', PYTHON_PORT.toString(),
  '--host', '127.0.0.1'
], {
  cwd: __dirname,
  stdio: 'inherit' // Inherit stdio so python logs print directly in the node terminal
});

pythonProcess.on('error', (err) => {
  console.error('[JobShield Error] Failed to start Python process:', err);
  console.error('Please ensure Python is installed and requirements.txt is installed in backend virtual environment.');
});

pythonProcess.on('exit', (code, signal) => {
  console.log(`[JobShield] Python FastAPI backend process exited with code ${code} (signal: ${signal})`);
  process.exit(code || 0);
});

// 3. Initialize MySQL Connection Pool and verify table
async function initDb() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306'),
  };

  try {
    console.log('[JobShield] Connecting to MySQL server...');
    // Connect without specifying database first, to ensure database exists
    const connection = await mysql.createConnection(connectionConfig);
    const dbName = process.env.DB_NAME || 'jobshield';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.end();

    // Create the pool
    pool = mysql.createPool({
      ...connectionConfig,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log(`[JobShield] Connected to MySQL database "${dbName}" successfully.`);

    // Create users table
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createUsersTableQuery);
    console.log('[JobShield] MySQL Table "users" verified/created.');

    // Create job_scans table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS job_scans (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(64) NULL,
        job_text TEXT NOT NULL,
        risk_level VARCHAR(20) NOT NULL,
        risk_score INT NOT NULL,
        red_flags JSON NOT NULL,
        analysis_result JSON NOT NULL,
        fingerprint VARCHAR(64) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createTableQuery);
    console.log('[JobShield] MySQL Table "job_scans" verified/created.');
  } catch (err) {
    console.error('[JobShield Error] MySQL initialization failed:', err.message);
    console.error('Ensure that your MySQL server is running, and the credentials in .env are correct.');
  }
}

// 4. Text Normalization and Fingerprint generation helpers
function getFingerprint(text) {
  if (!text) return '';
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // remove all non-alphanumeric characters to handle whitespace/punctuation variations
    .trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

async function saveScanToDb(analysis, fingerprint, userId) {
  if (!pool) return;
  const id = analysis.id;
  const jobText = analysis.raw_text;
  const riskLevel = analysis.classification;
  const riskScore = analysis.risk_score;
  const redFlags = JSON.stringify(analysis.red_flags || []);
  const analysisResult = JSON.stringify(analysis);
  
  await pool.query(
    `INSERT INTO job_scans (id, user_id, job_text, risk_level, risk_score, red_flags, analysis_result, fingerprint)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id=id`, // Prevent crashes on duplicate insertion race conditions
    [id, userId || null, jobText, riskLevel, riskScore, redFlags, analysisResult, fingerprint]
  );
  console.log(`[JobShield] Saved new scan to MySQL database. ID: ${id}`);
}

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  jwt.verify(token, process.env.JWT_SECRET || 'jobshield-user-secret-change-me', (err, decoded) => {
    if (err) return next();
    req.userId = decoded.id;
    next();
  });
}

// Enable JWT authentication globally on all intercepted routes
app.use(authenticateToken);

// Fallback in-memory user store when MySQL is offline
const fallbackUsers = new Map();

// User Authentication Endpoints
app.post('/api/auth/register', bodyParser, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(422).json({ detail: 'Email and password are required.' });
  }

  try {
    if (!pool) {
      if (fallbackUsers.has(email)) {
        return res.status(409).json({ detail: 'Email address already registered.' });
      }
      const userId = crypto.randomUUID();
      const passwordHash = bcrypt.hashSync(password, 10);
      fallbackUsers.set(email, { id: userId, email, password_hash: passwordHash });

      const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET || 'jobshield-user-secret-change-me', {
        expiresIn: '24h'
      });

      console.log(`[JobShield Fallback Auth] User registered: ${email}`);
      return res.json({ token, email });
    }

    const [existing] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ detail: 'Email address already registered.' });
    }

    const userId = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(password, 10);

    await pool.query(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [userId, email, passwordHash]
    );

    const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET || 'jobshield-user-secret-change-me', {
      expiresIn: '24h'
    });

    console.log(`[JobShield] User registered: ${email}`);
    return res.json({ token, email });
  } catch (err) {
    console.error('[JobShield Error] Register error:', err);
    return res.status(500).json({ detail: 'An error occurred during registration.' });
  }
});

app.post('/api/auth/login', bodyParser, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(422).json({ detail: 'Email and password are required.' });
  }

  try {
    if (!pool) {
      const user = fallbackUsers.get(email);
      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ detail: 'Invalid email or password.' });
      }

      const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET || 'jobshield-user-secret-change-me', {
        expiresIn: '24h'
      });

      console.log(`[JobShield Fallback Auth] User logged in: ${email}`);
      return res.json({ token, email });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (users.length === 0) {
      return res.status(401).json({ detail: 'Invalid email or password.' });
    }

    const user = users[0];
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ detail: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET || 'jobshield-user-secret-change-me', {
      expiresIn: '24h'
    });

    console.log(`[JobShield] User logged in: ${email}`);
    return res.json({ token, email });
  } catch (err) {
    console.error('[JobShield Error] Login error:', err);
    return res.status(500).json({ detail: 'An error occurred during login.' });
  }
});

// Mock UPI Verification API
app.get('/api/upi/verify', async (req, res) => {
  const upiId = req.query.upi_id;
  if (!upiId) {
    return res.status(422).json({ detail: 'upi_id query parameter is required.' });
  }

  try {
    const upiLower = upiId.toLowerCase();
    
    // Check if UPI matches any known scam patterns
    let scamMatch = false;
    if (pool) {
      const [rows] = await pool.query(
        'SELECT * FROM job_scans WHERE JSON_CONTAINS(red_flags, ?, "$") OR job_text LIKE ?',
        [JSON.stringify({ value: upiId }), `%${upiId}%`]
      );
      if (rows.length > 0) scamMatch = true;
    }

    let ownerName = '';
    let accountType = 'personal'; // personal or business
    let riskStatus = 'low'; // low, medium, high
    let message = '';

    // Generate mock responses based on name keywords
    if (upiLower.includes('apex')) {
      ownerName = 'Apex Global Solutions Ltd';
      accountType = 'business';
      riskStatus = 'low';
      message = 'Verified business merchant account.';
    } else if (upiLower.includes('brightfuture')) {
      ownerName = 'BrightFuture Innovations Pvt Ltd';
      accountType = 'business';
      riskStatus = 'medium';
      message = 'Business merchant account, but organization associated has flags.';
    } else if (upiLower.includes('fake') || upiLower.includes('scam') || scamMatch) {
      ownerName = 'Rajesh Kumar (Individual)';
      accountType = 'personal';
      riskStatus = 'high';
      message = 'WARNING: Personal savings account linked with job scam reports.';
    } else {
      // General random personal account simulation
      const personalNames = ['Ramesh Shah', 'Anita Patel', 'Sanjay Kumar', 'Priya Sharma', 'Vikram Singh'];
      const index = Math.abs(upiLower.charCodeAt(0) + upiLower.charCodeAt(upiLower.length - 1)) % personalNames.length;
      ownerName = personalNames[index] + ' (Individual)';
      accountType = 'personal';
      riskStatus = 'medium';
      message = 'Personal savings account. Businesses should not request payment to individual UPI accounts.';
    }

    return res.json({
      upi_id: upiId,
      owner_name: ownerName,
      account_type: accountType,
      risk_status: riskStatus,
      message: message
    });
  } catch (err) {
    console.error('[JobShield Error] UPI verification error:', err);
    return res.status(500).json({ detail: 'An error occurred during UPI verification.' });
  }
});

// 5. Intercept API endpoints for Duplicate Detection and Persistence

// TEXT Analysis
app.post('/api/analyze/text', bodyParser, async (req, res) => {
  const { text, category_hint, session_id } = req.body;
  if (!text || text.trim().length < 5) {
    return res.status(422).json({ detail: 'Could not extract enough readable content to analyze.' });
  }

  try {
    const fingerprint = getFingerprint(text);

    // Check database for duplicates
    if (pool) {
      try {
        const [rows] = await pool.query('SELECT * FROM job_scans WHERE fingerprint = ? LIMIT 1', [fingerprint]);
        if (rows.length > 0) {
          console.log(`[JobShield] Duplicate text scan detected. Fingerprint: ${fingerprint}`);
          const analysis = JSON.parse(rows[0].analysis_result);
          analysis.is_duplicate = true;
          analysis.created_at = rows[0].created_at;
          analysis.risk_score = rows[0].risk_score;
          analysis.classification = rows[0].risk_level;
          analysis.id = rows[0].id;
          return res.json(analysis);
        }
      } catch (dbErr) {
        console.error('[JobShield DB Warning] Duplicate query failed:', dbErr.message);
      }
    }

    // Call FastAPI backend to do the actual analysis
    const pyResp = await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/analyze/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    if (!pyResp.ok) {
      const errData = await pyResp.json();
      return res.status(pyResp.status).json(errData);
    }

    const analysis = await pyResp.json();

    // Save scan to database
    try {
      await saveScanToDb(analysis, fingerprint, req.userId || session_id);
    } catch (dbErr) {
      console.error('[JobShield DB Error] Failed to save scan:', dbErr.message);
    }

    return res.json(analysis);
  } catch (err) {
    console.error('[JobShield Error] analyze/text error:', err);
    return res.status(500).json({ detail: 'A server or database error occurred during analysis.' });
  }
});

// URL Analysis
app.post('/api/analyze/url', bodyParser, async (req, res) => {
  const { url, category_hint, session_id } = req.body;
  if (!url || url.trim().length < 4) {
    return res.status(422).json({ detail: 'Please paste a valid URL.' });
  }

  try {
    // Call FastAPI to fetch and analyze URL
    const pyResp = await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/analyze/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    if (!pyResp.ok) {
      const errData = await pyResp.json();
      return res.status(pyResp.status).json(errData);
    }

    const analysis = await pyResp.json();
    const rawText = analysis.raw_text;
    const fingerprint = getFingerprint(rawText);

    // Check for duplicate in database
    if (pool) {
      try {
        const [rows] = await pool.query('SELECT * FROM job_scans WHERE fingerprint = ? LIMIT 1', [fingerprint]);
        if (rows.length > 0) {
          console.log(`[JobShield] Duplicate URL scan detected. Fingerprint: ${fingerprint}`);
          const dupAnalysis = JSON.parse(rows[0].analysis_result);
          dupAnalysis.is_duplicate = true;
          dupAnalysis.created_at = rows[0].created_at;
          dupAnalysis.risk_score = rows[0].risk_score;
          dupAnalysis.classification = rows[0].risk_level;
          dupAnalysis.id = rows[0].id;
          return res.json(dupAnalysis);
        }
      } catch (dbErr) {
        console.error('[JobShield DB Warning] Duplicate query failed:', dbErr.message);
      }
    }

    // Save scan to database
    try {
      await saveScanToDb(analysis, fingerprint, req.userId || session_id);
    } catch (dbErr) {
      console.error('[JobShield DB Error] Failed to save scan:', dbErr.message);
    }

    return res.json(analysis);
  } catch (err) {
    console.error('[JobShield Error] analyze/url error:', err);
    return res.status(500).json({ detail: 'A server or database error occurred during analysis.' });
  }
});

// UPLOAD File Analysis (piped request to support multpart streaming)
app.post('/api/analyze/upload', (req, res) => {
  const headers = { ...req.headers };
  headers.host = `127.0.0.1:${PYTHON_PORT}`;

  const options = {
    hostname: '127.0.0.1',
    port: PYTHON_PORT,
    path: '/api/analyze/upload',
    method: 'POST',
    headers: headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    let responseBody = '';

    proxyRes.on('data', (chunk) => {
      responseBody += chunk;
    });

    proxyRes.on('end', async () => {
      if (proxyRes.statusCode !== 200) {
        res.status(proxyRes.statusCode).set(proxyRes.headers);
        return res.send(responseBody);
      }

      try {
        const analysis = JSON.parse(responseBody);
        const rawText = analysis.raw_text;
        const fingerprint = getFingerprint(rawText);

        // Check for duplicate in database
        if (pool) {
          try {
            const [rows] = await pool.query('SELECT * FROM job_scans WHERE fingerprint = ? LIMIT 1', [fingerprint]);
            if (rows.length > 0) {
              console.log(`[JobShield] Duplicate OCR scan detected. Fingerprint: ${fingerprint}`);
              const dupAnalysis = JSON.parse(rows[0].analysis_result);
              dupAnalysis.is_duplicate = true;
              dupAnalysis.created_at = rows[0].created_at;
              dupAnalysis.risk_score = rows[0].risk_score;
              dupAnalysis.classification = rows[0].risk_level;
              dupAnalysis.id = rows[0].id;
              return res.json(dupAnalysis);
            }
          } catch (dbErr) {
            console.error('[JobShield DB Warning] Duplicate query failed:', dbErr.message);
          }
        }

        // Save scan to database
        try {
          await saveScanToDb(analysis, fingerprint, req.userId || analysis.session_id);
        } catch (dbErr) {
          console.error('[JobShield DB Error] Failed to save scan:', dbErr.message);
        }

        return res.json(analysis);
      } catch (err) {
        console.error('[JobShield Error] analyze/upload response processing error:', err);
        return res.status(500).json({ detail: 'An error occurred while saving the upload analysis.' });
      }
    });
  });

  proxyReq.on('error', (err) => {
    console.error('[JobShield Error] Proxy upload request error:', err);
    return res.status(500).json({ detail: 'Failed to connect to scanner engine.' });
  });

  // Pipe incoming request stream to proxy request
  req.pipe(proxyReq);
});

// GET specific analysis by ID
app.get('/api/analyze/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (pool) {
      const [rows] = await pool.query('SELECT * FROM job_scans WHERE id = ? LIMIT 1', [id]);
      if (rows.length > 0) {
        const analysis = JSON.parse(rows[0].analysis_result);
        analysis.created_at = rows[0].created_at;
        analysis.risk_score = rows[0].risk_score;
        analysis.classification = rows[0].risk_level;
        return res.json(analysis);
      }
    }

    // Fallback proxy to FastAPI SQLite (e.g. for demo data or older items)
    const response = await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/analyze/${id}`);
    if (!response.ok) {
      return res.status(response.status).json({ detail: 'Analysis not found.' });
    }
    const result = await response.json();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ detail: 'Error retrieving analysis.' });
  }
});

// GET Scan History (queried directly from MySQL)
app.get('/api/history', async (req, res) => {
  const sessionId = req.query.session_id;
  if (!sessionId && !req.userId) {
    return res.status(422).json({ detail: 'session_id query parameter is required' });
  }

  try {
    if (pool) {
      const [rows] = await pool.query(
        'SELECT id, risk_score, risk_level, category, analysis_result, created_at FROM job_scans WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [req.userId || sessionId]
      );
      
      const out = rows.map(r => {
        const analysis = JSON.parse(r.analysis_result);
        const entities = analysis.extracted_entities || {};
        return {
          id: r.id,
          category: analysis.category,
          organization: entities.organization || 'Unknown',
          title: entities.title || 'Job Ad',
          risk_score: r.risk_score,
          classification: r.risk_level,
          created_at: r.created_at
        };
      });
      return res.json(out);
    }

    // Fallback proxy
    const response = await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/history?session_id=${sessionId}`);
    const result = await response.json();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ detail: 'Error fetching history.' });
  }
});

// DELETE History Item (from MySQL)
app.delete('/api/history/:id', async (req, res) => {
  const { id } = req.params;
  const sessionId = req.query.session_id;
  if (!sessionId && !req.userId) {
    return res.status(422).json({ detail: 'session_id is required' });
  }

  try {
    if (pool) {
      const [result] = await pool.query(
        'DELETE FROM job_scans WHERE id = ? AND user_id = ?',
        [id, req.userId || sessionId]
      );
      if (result.affectedRows > 0) {
        return res.json({ deleted: true });
      }
    }

    // Fallback proxy
    const response = await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/history/${id}?session_id=${sessionId}`, {
      method: 'DELETE'
    });
    const result = await response.json();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ detail: 'Error deleting history item.' });
  }
});

// GET Dashboard Stats (merged stats from MySQL and Python)
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    // 1. Fetch Python statistics first
    const pyResp = await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/dashboard/stats`);
    let stats = {};
    if (pyResp.ok) {
      stats = await pyResp.json();
    }

    // 2. Fetch MySQL statistics if pool is available
    if (pool) {
      const [allScans] = await pool.query('SELECT risk_level, category, created_at, red_flags, analysis_result FROM job_scans');
      
      if (allScans.length > 0) {
        const total = allScans.length;
        let genuine = 0, suspicious = 0, fake = 0;
        let scamPatternMatches = 0;
        let duplicateMatches = 0;
        let paymentRiskCases = 0;
        const categoryCounts = {};
        const monthlyCounts = {};
        const flagCounts = {};

        allScans.forEach(row => {
          if (row.risk_level === 'likely_genuine') genuine++;
          else if (row.risk_level === 'suspicious') suspicious++;
          else if (row.risk_level === 'likely_fake') fake++;

          const analysis = JSON.parse(row.analysis_result);
          if (analysis.scam_pattern_matches && analysis.scam_pattern_matches.length > 0) scamPatternMatches++;
          if (analysis.duplicate_matches && analysis.duplicate_matches.length > 0) duplicateMatches++;
          if (analysis.payment_risk && analysis.payment_risk.payment_request_detected) paymentRiskCases++;

          // Category counts
          const cat = row.category;
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

          // Monthly counts
          if (row.created_at) {
            const month = new Date(row.created_at).toISOString().slice(0, 7); // YYYY-MM
            monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
          }

          // Flags counts
          const flags = JSON.parse(row.red_flags || '[]');
          flags.forEach(f => {
            const label = f.label || 'Unknown';
            flagCounts[label] = (flagCounts[label] || 0) + 1;
          });
        });

        // Merge or overwrite python stats with MySQL stats
        stats.total_checked = total + (stats.total_checked || 0);
        stats.likely_genuine = genuine + (stats.likely_genuine || 0);
        stats.suspicious = suspicious + (stats.suspicious || 0);
        stats.likely_fake = fake + (stats.likely_fake || 0);
        stats.scam_pattern_matches = scamPatternMatches + (stats.scam_pattern_matches || 0);
        stats.duplicate_matches = duplicateMatches + (stats.duplicate_matches || 0);
        stats.payment_risk_cases = paymentRiskCases + (stats.payment_risk_cases || 0);

        // Update risk distribution array
        stats.risk_distribution = [
          { label: "Likely Genuine", count: stats.likely_genuine },
          { label: "Suspicious", count: stats.suspicious },
          { label: "Likely Fake", count: stats.likely_fake }
        ];

        // Merge category distribution
        const categoryLabels = {
          "part_time_job": "Part-Time Job",
          "internship": "Internship",
          "work_from_home": "Work-From-Home Offer",
          "course_training": "Course / Training Program",
          "scholarship": "Scholarship",
          "government_scheme": "Government / Private Scheme",
          "recruitment": "Recruitment Offer",
          "certificate": "Job / Internship Certificate",
          "freelance": "Freelance Offer",
          "placement_job_fair": "Placement / Job Fair Ad",
        };

        const mergedCategories = {};
        if (stats.category_distribution) {
          stats.category_distribution.forEach(item => {
            mergedCategories[item.category] = item.count;
          });
        }
        Object.keys(categoryCounts).forEach(cat => {
          const label = categoryLabels[cat] || cat;
          mergedCategories[label] = (mergedCategories[label] || 0) + categoryCounts[cat];
        });
        stats.category_distribution = Object.keys(mergedCategories).map(key => ({
          category: key,
          count: mergedCategories[key]
        }));

        // Merge monthly analysis
        const mergedMonths = {};
        if (stats.monthly_analysis) {
          stats.monthly_analysis.forEach(item => {
            mergedMonths[item.month] = item.count;
          });
        }
        Object.keys(monthlyCounts).forEach(m => {
          mergedMonths[m] = (mergedMonths[m] || 0) + monthlyCounts[m];
        });
        stats.monthly_analysis = Object.keys(mergedMonths).sort().map(key => ({
          month: key,
          count: mergedMonths[key]
        }));

        // Merge common flags
        const mergedFlags = {};
        if (stats.most_common_red_flags) {
          stats.most_common_red_flags.forEach(item => {
            mergedFlags[item.label] = item.count;
          });
        }
        Object.keys(flagCounts).forEach(lbl => {
          mergedFlags[lbl] = (mergedFlags[lbl] || 0) + flagCounts[lbl];
        });
        stats.most_common_red_flags = Object.keys(mergedFlags)
          .map(key => ({ label: key, count: mergedFlags[key] }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
      }
    }

    return res.json(stats);
  } catch (err) {
    console.error('[JobShield Error] Dashboard stats error:', err);
    return res.status(500).json({ detail: 'Error compiling dashboard statistics.' });
  }
});

// 6. Generic Proxy fallback for all other /api endpoints (admin routers, report system, etc.)
app.use(createProxyMiddleware({
  pathFilter: '/api',
  target: `http://127.0.0.1:${PYTHON_PORT}`,
  changeOrigin: true,
  logLevel: 'info'
}));

// 7. Serve Frontend static files from frontend/dist
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  console.log(`[JobShield] Serving built frontend files from: ${distPath}`);
  app.use(express.static(distPath));

  // Fallback for SPA Routing (React Router)
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.warn(`[JobShield Warning] Frontend dist folder not found at: ${distPath}`);
  console.warn('[JobShield Warning] Please build the frontend first using "npm run build:frontend" in the root directory.');
  
  app.get('/', (req, res) => {
    res.status(404).send('Frontend build not found. Please run "npm run build:frontend" in the root directory, then restart the server.');
  });
}

// 8. Run DB init and start Express Server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🛡️  JobShield Server running at: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
  });
});

// 9. Graceful shutdown
const cleanUp = () => {
  console.log('[JobShield] Terminating FastAPI backend process...');
  pythonProcess.kill('SIGINT');
  process.exit(0);
};

process.on('SIGINT', cleanUp);
process.on('SIGTERM', cleanUp);
