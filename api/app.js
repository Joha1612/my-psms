// api/app.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const upload = multer();
const app = express();
app.use(cors());
app.use(express.json());

// optional: serve static frontend if you later add /web folder
app.use('/', express.static(path.join(__dirname, '..', 'web')));

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'psm',
  waitForConnections: true,
  connectionLimit: 10,
});

// ✅ POST → নতুন ডাটা এন্ট্রি
app.post('/api', upload.none(), async (req, res) => {
  try {
    const b = req.body;
    const sql = `
      INSERT INTO salaryrecords
      (\`Date\`, \`Year\`, \`Month\`, \`Payment type\`, \`Salary Amount\`, 
       \`Amount payable\`, \`Monthly due\`, \`Total due\`, \`Comment\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      b.Date || b.date,
      b.Year || b.year,
      b.Month || b.month,
      b['Payment type'] || b.paymentType,
      parseFloat(b['Salary Amount'] || b.salaryAmount || 0),
      parseFloat(b['Amount payable'] || b.amountPayable || 0),
      parseFloat(b['Monthly due'] || b.monthlyDue || 0),
      parseFloat(b['Total due'] || b.totalDue || 0),
      b.Comment || b.comment || ''
    ];
    await pool.query(sql, values);
    res.send('Success');
  } catch (err) {
    console.error(err);
    res.status(500).send('InsertFailed');
  }
});

// ✅ GET → ডাটা রিড বা টোটাল ডিউ
app.get('/api', async (req, res) => {
  try {
    const { action, month, year } = req.query;
    if (action === 'read') {
      let sql = 'SELECT * FROM salaryrecords';
      const params = [];
      const conds = [];
      if (month) { conds.push('`Month` = ?'); params.push(month); }
      if (year) { conds.push('`Year` = ?'); params.push(year); }
      if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
      sql += ' ORDER BY `Date` DESC';
      const [rows] = await pool.query(sql, params);
      return res.json({ entries: rows });
    }

    const [rows] = await pool.query('SELECT COALESCE(SUM(`Total due`),0) AS totalDue FROM salaryrecords');
    res.json({ totalDue: rows[0].totalDue || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// ✅ রিপোর্ট এন্ডপয়েন্ট (মাসভিত্তিক সারাংশ)
app.get('/api/reports/monthly-summary', async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear().toString();
    const [rows] = await pool.query(`
      SELECT \`Month\`, SUM(\`Monthly due\`) AS month_due, SUM(\`Total due\`) AS total_due
      FROM salaryrecords WHERE \`Year\` = ? GROUP BY \`Month\`
    `, [year]);
    res.json({ year, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`✅ API running on port ${port}`));
