// server.js (เวอร์ชันแก้ไข PostgreSQL)
require('dotenv').config();
const { Pool } = require('pg');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const app = express();
const port = process.env.PORT || 5000;

// (สำคัญ!) ตั้งค่า CORS ให้ถูกต้อง
const corsOptions = {
  origin: 'https://my-firstprojectdeploysohard.onrender.com' 
};
app.use(cors(corsOptions)); // <--- ใช้ตัวแปรนี้
    
// ตั้งค่าการเชื่อมต่อ PostgreSQL (อ่านจาก DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: {
    rejectUnauthorized: false
  }
});

// ทดสอบการเชื่อมต่อ (แค่ครั้งเดียว)
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack); 
  }
  console.log('Connected to PostgreSQL database successfully!');
  release();
});

// Middleware
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); 

// ===============================================
// API for Users (CRUD Operations) - (แก้ไขเป็น pg)
// ===============================================

// GET: ดึงข้อมูลผู้ใช้ทั้งหมด
app.get('/api/users', async (req, res) => {
  const sql = `
    SELECT 
      id, username, first_name, last_name, email, 
      role, is_active, created_at
    FROM users
  `;

  try {
    const results = await pool.query(sql);
    res.json(results.rows); // <-- pg: ใช้ .rows
  } catch (err) {
    console.error('Error fetching users:', err);
    return res.status(500).json({ error: 'Database query failed' });
  }
});

//สำหรับดึงข้อมูลผู้ใช้รายคน
app.get('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  const sql = 'SELECT id, username, password, email, identification, first_name, last_name, role, is_active FROM users WHERE id = $1'; // <-- pg: ใช้ $1
  
  try {
    const results = await pool.query(sql, [userId]);
    if (results.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(results.rows[0]); // <-- pg: ใช้ .rows[0]
  } catch (err) {
    return res.status(500).json({ error: 'Database query failed' });
  }
});

//สร้างผู้ใช้ใหม่
app.post('/api/users', async (req, res) => {
  const { username, email, password, first_name, last_name, identification, role } = req.body;
  const is_active = true; // <-- pg: ใช้ boolean true
  const sql = `
    INSERT INTO users (username, email, password, first_name, last_name, identification, role, is_active) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id`; // <-- pg: ใช้ RETURNING id
  const values = [username, email, password, first_name, last_name, identification, role, is_active];

  try {
    const result = await pool.query(sql, values);
    res.status(201).json({ message: 'User created successfully', userId: result.rows[0].id }); // <-- pg: อ่าน .rows[0].id
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create user', details: err.message });
  }
});

// PUT: อัปเดตข้อมูลผู้ใช้
app.put('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  const { password } = req.body; 

  if (!password) {
    return res.status(400).json({ message: 'Password is required to update.' });
  }

  const updateSql = `
    UPDATE users SET password = $1 
    WHERE id = $2
  `; // <-- pg: ใช้ $1, $2
  const values = [password, userId];

  try {
    const result = await pool.query(updateSql, values);
    if (result.rowCount === 0) { // <-- pg: ใช้ .rowCount
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Failed to update user password:', err);
    return res.status(500).json({ error: 'Failed to update password', details: err.message });
  }
});

// DELETE: ลบผู้ใช้
app.delete('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  const sql = 'DELETE FROM users WHERE id = $1'; // <-- pg: ใช้ $1
  
  try {
    const result = await pool.query(sql, [userId]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'User not found' }); // <-- pg: ใช้ .rowCount
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

//API for Project Summaries
app.get('/api/users/:id/summary', async (req, res) => {
  const userId = req.params.id;

  try {
    //Get the user's full name from the users table
    const userSql = 'SELECT first_name, last_name FROM users WHERE id = $1'; // <-- pg: ใช้ $1
    const userResults = await pool.query(userSql, [userId]);

    if (userResults.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResults.rows[0];
    const userFullName = `${user.first_name} ${user.last_name}`;

    //Get the counts from the documents table using the full name
    const summarySql = `
      SELECT
        COUNT(*) AS uploaded,
        SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) AS approved
      FROM documents
      WHERE author = $1
    `; // <-- pg: ใช้ $1

    const summaryResults = await pool.query(summarySql, [userFullName]);
    const summary = summaryResults.rows[0];
    res.json({
      uploaded: summary.uploaded || 0,
      approved: parseInt(summary.approved) || 0,
    });

  } catch (err) {
    console.error('Error fetching document summary:', err);
    return res.status(500).json({ message: 'Database error fetching summary' });
  }
});

app.get('/api/users/:id/profile', async (req, res) => {
  const userId = req.params.id;
  const sql = 'SELECT first_name, last_name, role FROM users WHERE id = $1'; // <-- pg: ใช้ $1
  
  try {
    const results = await pool.query(sql, [userId]);
    if (results.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userProfile = results.rows[0];
    if (userProfile.role === 'admin') {
      userProfile.role = 'Administrator';
    } else if (userProfile.role === 'user') {
      userProfile.role = 'User';
    }
    res.json(userProfile);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return res.status(500).json({ error: 'Database query failed' });
  }
});

app.get('/api/users/:id/projects', async (req, res) => {
  const userId = req.params.id;

  try {
    //ดึงชื่อเต็มของผู้ใช้จากตาราง users
    const userSql = 'SELECT first_name, last_name FROM users WHERE id = $1'; // <-- pg: ใช้ $1
    const userResults = await pool.query(userSql, [userId]);

    if (userResults.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResults.rows[0];
    const userFullName = `${user.first_name} ${user.last_name}`; // ชื่อเต็มของผู้ใช้ที่เข้าสู่ระบบ

    // Step 2: ดึงข้อมูลโปรเจกต์
    const projectsSql = `
      SELECT
        id, title, approval_status, is_active, created_at AS submitted_date 
      FROM documents
      WHERE 
        author LIKE $1 OR          -- เป็นผู้เขียนหลัก
        advisorName LIKE $2 OR     -- เป็นอาจารย์ที่ปรึกษา
        coAdvisorName LIKE $3      -- เป็นอาจารย์ที่ปรึกษาร่วม
      ORDER BY created_at DESC
    `; // <-- pg: ใช้ $1, $2, $3

    const values = [userFullName, userFullName, userFullName];
    const projectsResults = await pool.query(projectsSql, values);
    res.json(projectsResults.rows);

  } catch (err) {
    console.error('Error fetching user projects:', err);
    return res.status(500).json({ message: 'Database error fetching projects' });
  }
});

// ===============================================
// API for Authentication
// ===============================================
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'โปรดระบุชื่อผู้ใช้และรหัสผ่าน' });
  }
  
  const sql = 'SELECT id, username, password, role, first_name, last_name, is_active FROM users WHERE username = $1'; // <-- pg: ใช้ $1
  
  try {
    const results = await pool.query(sql, [username]);

    if (results.rows.length === 0) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const user = results.rows[0];
    
    if (user.password !== password) {
      return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
    }
    // (สำคัญ) MySQL 0/1, PostgreSQL true/false
    if (user.is_active === false) { // <-- pg: ใช้ boolean false
      return res.status(403).json({ message: 'บัญชีผู้ใช้ถูกระงับ กรุณาติดต่อผู้ดูแลระบบ' });
    }
    
    res.status(200).json({ 
      message: 'Login สำเร็จ', 
      user: { 
        id: user.id, 
        username: user.username,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        is_active: user.is_active
      } 
    });
  } catch (err) {
    console.error('Database query error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
});


// ===============================================
// API for Documents
// ===============================================

app.get('/api/documents', async (req, res) => {
    const searchTerm = req.query.search || '';
    const departmentFilter = req.query.department || '';
    const yearFilter = req.query.year || '';
    const typeFilter = req.query.type || '';
    const statusFilter = req.query.status || ''; 
    const limit = req.query.limit || null;

    let sql = 'SELECT * FROM documents';
    let values = [];
    let whereConditions = [];
    let paramIndex = 1; // <-- pg: สร้างตัวนับ Parameter

    // (แก้ไข) เพิ่มเงื่อนไขสถานะ (Status)
    if (statusFilter === 'active' || !statusFilter) {
        whereConditions.push("approval_status = 'approved'");
        whereConditions.push("is_active = TRUE"); // <-- pg: ใช้ TRUE
    }

    // (ถ้ามี) เพิ่มเงื่อนไขการค้นหา (Search)
    if (searchTerm) {
        const searchPattern = `%${searchTerm}%`;
        // <-- pg: ใช้ $1, $2, ...
        whereConditions.push(`(
            author LIKE $${paramIndex} OR
            title LIKE $${paramIndex + 1} OR
            title_eng LIKE $${paramIndex + 2} OR
            abstract LIKE $${paramIndex + 3} OR
            keywords LIKE $${paramIndex + 4} OR
            document_type LIKE $${paramIndex + 5} OR
            department LIKE $${paramIndex + 6} OR
            advisorName LIKE $${paramIndex + 7} OR
            coAdvisorName LIKE $${paramIndex + 8}
        )`);
        values.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        paramIndex += 9; // เลื่อนตัวนับไป 9
    }

    // (ถ้ามี) เพิ่มเงื่อนไข Filter: สาขา (Department)
    if (departmentFilter) {
        whereConditions.push(`department = $${paramIndex}`); // <-- pg: ใช้ $...
        values.push(departmentFilter);
        paramIndex++;
    }

    // (ถ้ามี) เพิ่มเงื่อนไข Filter: ปี (Year)
    if (yearFilter) {
        // !!! (แก้ไขแล้ว) เปลี่ยน $1 เป็น $${paramIndex} !!!
        whereConditions.push(`publish_year = $${paramIndex}`); 
        values.push(yearFilter);
        paramIndex++;
    }

    // (ถ้ามี) เพิ่มเงื่อนไข Filter: ประเภท (Type)
    if (typeFilter) {
        // !!! (แก้ไขแล้ว) เปลี่ยน $1 เป็น $${paramIndex} !!!
        whereConditions.push(`document_type LIKE $${paramIndex}`); 
        values.push(`%${typeFilter}%`);
        paramIndex++;
    }

    // ประกอบร่าง SQL
    if (whereConditions.length > 0) {
        sql += ' WHERE ' + whereConditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';

    // (เพิ่ม) เพิ่มการจำกัดจำนวน (LIMIT)
    if (limit && !isNaN(parseInt(limit))) {
        sql += ` LIMIT $${paramIndex}`; // <-- pg: ใช้ $...
        values.push(parseInt(limit));
    }

    console.log("Executing SQL:", sql); // Log SQL
    console.log("Values:", values);      // Log Values

    try {
        const results = await pool.query(sql, values); // <-- pg: ส่ง values เข้าไป
        res.json(results.rows);
    } catch (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ message: 'Error fetching documents' });
    }
});

app.get('/api/documents/:id', async (req, res) => {
  const documentId = req.params.id;
  const sql = `
    SELECT
      id, title, title_eng, author, department, advisorName,
      abstract, keywords, thai_sh, supportAgency, tools, field,
      publisher, publish_year, scan_date, display_date, document_type,
      mime_type, profile_image, language, publication_year, status,
      created_at, updated_at, file_paths
    FROM documents
    WHERE id = $1;
  `; // <-- pg: ใช้ $1
  
  try {
    const results = await pool.query(sql, [documentId]);
    if (results.rows.length > 0) {
      res.status(200).json(results.rows[0]);
    } else {
      res.status(404).json({ message: 'ไม่พบเอกสาร' });
    }
  } catch (err) {
    console.error('Error fetching document by ID from database:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเอกสาร' });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
  const documentId = req.params.id;
  const sql = 'DELETE FROM documents WHERE id = $1'; // <-- pg: ใช้ $1
  
  try {
    const result = await pool.query(sql, [documentId]);
    if (result.rowCount === 0) { // <-- pg: ใช้ .rowCount
      return res.status(404).json({ message: 'ไม่พบเอกสารที่ต้องการลบ' });
    }
    res.status(200).json({ message: 'ลบเอกสารเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('Error deleting document from database:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบเอกสาร' });
  }
});

// --- (ส่วน Multer Setup ไม่มีการเปลี่ยนแปลง) ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    // *** เพิ่มโค้ด Sanitize ชื่อไฟล์ ***
    const sanitizedFilename = file.originalname
                                .replace(/\s/g, '-')  // แทนที่ช่องว่างด้วยขีดกลาง
                                .replace(/[()']/g, ''); // ลบวงเล็บและเครื่องหมายคำพูด

    // ใช้ชื่อไฟล์ที่ปลอดภัย
    cb(null, uniqueSuffix + '-' + sanitizedFilename); 
  },
});

const allowedExtensions = {
    'complete_pdf': ['.pdf'],
    'complete_doc': ['.docx'],
    'article_files': ['.pdf'],
    'program_files': ['.zip', '.rar', '.exe'],
    'web_files': ['.zip'],
    'poster_files': ['.psd', '.jpg', '.jpeg'],
    'certificate_files': ['.pdf', '.jpg', '.jpeg', '.png'],
    'front_face': ['.jpeg']
};
const fileFilter = (req, file, cb) => {
    const fieldName = file.fieldname;
    const allowed = allowedExtensions[fieldName];
    if (!allowed) {
        return cb(new Error(`Invalid field name ${fieldName}`), false);
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`ไม่อนุญาตให้อัปโหลดไฟล์ ${ext} สำหรับช่องนี้ (รองรับเฉพาะ ${allowed.join(', ')})`), false);
    }
};
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter 
});
const uploadMiddleware = upload.fields([
    { name: 'complete_pdf', maxCount: 10 },
    { name: 'complete_doc', maxCount: 10 },
    { name: 'article_files', maxCount: 10 }, 
    { name: 'program_files', maxCount: 1 }, 
    { name: 'web_files', maxCount: 2 },
    { name: 'poster_files', maxCount: 5 },
    { name: 'certificate_files', maxCount: 5 },
    { name: 'front_face', maxCount: 1 }
]);
// --- (จบส่วน Multer Setup) ---


// API Upload Project ---
app.post('/api/upload-project', (req, res) => {

    uploadMiddleware(req, res, async function (err) { // <-- (เพิ่ม async)
        
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({ message: 'File upload error: ' + err.message });
        } else if (err) {
            console.error('File filter error:', err);
            return res.status(400).json({ message: err.message }); 
        }

        const {
            document_type, title, title_eng, author, abstract,
            advisorName, department, coAdvisorName, keywords, supportAgency
        } = req.body;

        try {
            const filePathsJson = {};
            const fileFields = [
                'complete_pdf', 'complete_doc', 'article_files', 'program_files', 
                'web_files', 'poster_files', 'certificate_files', 'front_face' // เพิ่ม front_face ด้วย
            ];

            fileFields.forEach(field => {
                if (req.files[field]) {
                    // ใช้ .map(f => f.filename) เพื่อเก็บเฉพาะชื่อไฟล์ที่ Multer สร้างให้
                    filePathsJson[field] = req.files[field].map(f => f.filename);
                } else {
                    filePathsJson[field] = [];
                }
            })
            // (แก้ไข) เปลี่ยนไวยากรณ์ SQL เป็น PostgreSQL
            const sql = `
                INSERT INTO documents (
                    document_type, title, title_eng, author, abstract, keywords,
                    advisorName, department, coAdvisorName, supportAgency,
                    file_paths, 
                    publish_year, scan_date, approval_status, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, EXTRACT(YEAR FROM NOW()), CURRENT_DATE, 'pending', FALSE)
                RETURNING id; 
            `; // <-- pg: ใช้ $1..$11, EXTRACT/CURRENT_DATE, FALSE, และ RETURNING id

            const values = [
                document_type || null,
                title || null,
                title_eng || null,
                author || null,
                abstract || null,
                keywords || null,
                advisorName || null,
                department || null,
                coAdvisorName || null,
                supportAgency || null,
                JSON.stringify(filePathsJson) // pg รับ JSON string ได้ดี
            ];

            const result = await pool.query(sql, values); // <-- (แก้ไข) ใช้ await pool.query
            
            res.status(201).json({
                message: 'บันทึกข้อมูลและไฟล์เรียบร้อยแล้ว',
                projectId: result.rows[0].id // <-- (แก้ไข) อ่าน ID จาก .rows[0].id
            });

        } catch (e) {
            console.error('!!! DATABASE/SERVER ERROR on upload !!!:', e);
            res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูล', error: e.message });
        }
    });
});

app.get('/api/professor/documents/:id', async (req, res) => {
  const documentId = req.params.id;
  const sql = "SELECT * FROM documents WHERE id = $1"; // <-- pg: ใช้ $1
  
  try {
    const results = await pool.query(sql, [documentId]);
    if (results.rows.length === 0) return res.status(404).json({ message: 'Document not found' });
    
    const document = results.rows[0];
    
    // (โค้ดส่วนนี้ถูกต้อง ไม่ต้องแก้ไขตรรกะ)
    let filePathsObject = {};
    try {
      if (document.file_paths) {
        // pg อาจจะคืนค่าเป็น object มาแล้ว แต่ JSON.parse(string) ก็ยังปลอดภัย
        filePathsObject = (typeof document.file_paths === 'string') 
                            ? JSON.parse(document.file_paths) 
                            : document.file_paths;
      }
    } catch (e) {
      console.error("Could not parse file_paths JSON from DB:", e);
    }

    const documentWithJsonFiles = { 
      ...document, 
      file_paths: JSON.stringify(filePathsObject) 
    };
    
    res.json(documentWithJsonFiles);
  } catch (err) {
    return res.status(500).json({ message: 'Database error' });
  }
});

// (API for Download ไม่มีการเปลี่ยนแปลง)
app.get('/api/download/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);

    res.download(filePath, (err) => {
        if (err) {
            console.error("Error on file download:", err);
            if (!res.headersSent) {
                res.status(404).send('File not found.');
            }
        }
    });
});

app.put('/api/documents/:id/approval', async (req, res) => {
  const { id } = req.params;
  const { approvalStatus } = req.body; 

  if (!['approved', 'rejected'].includes(approvalStatus)) {
    return res.status(400).json({ message: 'Invalid approval status.' });
  }

  let sql;
  let values;
  let successMessage;

  if (approvalStatus === 'approved') {
    sql = `UPDATE documents 
           SET approval_status = $1, is_active = TRUE, display_date = NOW() 
           WHERE id = $2`; // <-- pg: $1, $2, TRUE
    values = [approvalStatus, id];
    successMessage = 'อนุมัติโครงงานเรียบร้อยแล้ว';
  
  } else { 
    sql = `UPDATE documents 
           SET approval_status = $1, is_active = FALSE 
           WHERE id = $2`; // <-- pg: $1, $2, FALSE
    values = [approvalStatus, id]; // approvalStatus คือ 'rejected'
    successMessage = 'ปฏิเสธโครงงานเรียบร้อยแล้ว (ส่งกลับไปให้ผู้ใชแก้ไข)';
  }

  try {
    const result = await pool.query(sql, values);
    if (result.rowCount === 0) { // <-- pg: .rowCount
      return res.status(404).json({ message: 'ไม่พบเอกสารหรือเอกสารถูกจัดการไปแล้ว' });
    }
    res.json({ message: successMessage });
  } catch (err) {
    console.error('Database error on approval/rejection:', err);
    return res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/documents/:id/toggle-active', async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ message: 'isActive must be a boolean.' });
  }

  const sql = `UPDATE documents SET is_active = $1 WHERE id = $2 AND approval_status = 'approved'`; // <-- pg: $1, $2
  const values = [isActive, id];

  try {
    const result = await pool.query(sql, values);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Document not found or not approved.' }); // <-- pg: .rowCount
    res.json({ message: 'Active status toggled successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/admin/documents', async (req, res) => {
  const sql = `SELECT id, title, publish_year, approval_status, is_active FROM documents ORDER BY created_at DESC`;
  try {
    const results = await pool.query(sql);
    res.json(results.rows); // <-- pg: .rows
  } catch (err) {
    return res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/advisors/search', async (req, res) => {
    const searchTerm = req.query.query || '';
    if (searchTerm.length < 3) {
        return res.json([]);
    }

    const searchPattern = `%${searchTerm}%`;
    const sql = `
        SELECT id, first_name, last_name 
        FROM users 
        WHERE role IN ('advisor', 'admin') 
          AND (first_name LIKE $1 OR last_name LIKE $2)
        LIMIT 10;
    `; // <-- pg: $1, $2
    const values = [searchPattern, searchPattern];

    try {
        const results = await pool.query(sql, values);
        res.json(results.rows); // <-- pg: .rows
    } catch (err) {
        console.error('Error fetching advisor suggestions:', err);
        return res.status(500).json({ message: 'Database query failed' });
    }
});

app.get('/api/project-details/:id', async (req, res) => {
  const projectId = req.params.id;
  const sql = `
    SELECT 
      id, title, title_eng, author, abstract, keywords,
      advisorName, department, coAdvisorName, supportAgency, document_type,
      file_paths 
    FROM documents 
    WHERE id = $1
  `; // <-- pg: $1
  
  try {
    const results = await pool.query(sql, [projectId]);
    if (results.rows.length === 0) return res.status(404).json({ message: 'Project not found' });
    res.json(results.rows[0]); // <-- pg: .rows[0]
  } catch (err) {
    return res.status(500).json({ message: 'Database error' });
  }
});


app.put('/api/projects/:id', (req, res) => {
  
    uploadMiddleware(req, res, async function (err) { // <-- (เพิ่ม async)
        
        if (err instanceof multer.MulterError) {
            console.error('Multer error on update:', err);
            return res.status(400).json({ message: 'File upload error: ' + err.message });
        } else if (err) {
            console.error('File filter error on update:', err);
            return res.status(400).json({ message: err.message }); 
        }

        const projectId = req.params.id;
        const { 
          title, title_eng, abstract, keywords, advisorName, 
          department, coAdvisorName, supportAgency, document_type 
        } = req.body; 

        try {
          const getSql = "SELECT file_paths, approval_status FROM documents WHERE id = $1"; // <-- pg: $1
          const results = await pool.query(getSql, [projectId]);

          if (results.rows.length === 0) return res.status(404).json({ message: 'Project not found' }); 

          let existingFilePaths = {};
          try {
            existingFilePaths = (typeof results.rows[0].file_paths === 'string')
                                ? JSON.parse(results.rows[0].file_paths || '{}')
                                : (results.rows[0].file_paths || {});
          } catch (e) {
            existingFilePaths = {};
          }

          const currentStatus = results.rows[0].approval_status;
          const newStatus = (currentStatus === 'rejected') ? 'pending' : currentStatus;

          const hasNewFiles = req.files && Object.keys(req.files).length > 0;
          if (hasNewFiles) {
              for (const fieldName in req.files) {
                  existingFilePaths[fieldName] = req.files[fieldName].map(f => f.filename);
              }
          }

          let updateSql = `
            UPDATE documents SET 
              title = $1, title_eng = $2, abstract = $3, keywords = $4, advisorName = $5, 
              department = $6, coAdvisorName = $7, supportAgency = $8, document_type = $9,
              file_paths = $10, 
              approval_status = $11, 
              updated_at = NOW() 
            WHERE id = $12
          `; // <-- pg: $1..$12
          let values = [
            title, title_eng, abstract, keywords, advisorName, 
            department, coAdvisorName, supportAgency, document_type,
            JSON.stringify(existingFilePaths), 
            newStatus, 
            projectId
          ];

          await pool.query(updateSql, values); // <-- (แก้ไข) ใช้ await pool.query
          
          let message = 'Project updated successfully!';
          if (newStatus === 'pending') {
              message = 'Project updated and resubmitted for approval successfully!';
          }
          
          res.json({ message: message });

        } catch (updateErr) {
          console.error("Error updating project:", updateErr);
          return res.status(500).json({ message: 'Failed to update project' });
        }
    });
});

app.get('/api/student/documents/:id', async (req, res) => {
  const documentId = req.params.id;
  const studentUserId = req.query.userId; 

  if (!studentUserId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    // 1. ดึงข้อมูลเอกสาร
    const documentSql = "SELECT * FROM documents WHERE id = $1"; // <-- pg: $1
    const docResults = await pool.query(documentSql, [documentId]);
    if (docResults.rows.length === 0) return res.status(404).json({ message: 'Document not found' });

    const document = docResults.rows[0];
    
    // 2. ดึงข้อมูลผู้ใช้ที่ล็อกอิน
    const userSql = "SELECT first_name, last_name, role FROM users WHERE id = $1"; // <-- pg: $1
    const userResults = await pool.query(userSql, [studentUserId]);
    if (userResults.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = userResults.rows[0];
    const userFullName = `${user.first_name} ${user.last_name}`;

    // 3. ตรวจสอบสิทธิ์ (ตรรกะเดิมถูกต้อง)
    const isRoleAdminOrProfessor = user.role === 'admin' || user.role === 'advisor'; // <-- (แก้ไข) 'professor' เป็น 'advisor' ให้ตรงกับ DB
    const isAuthor = document.author === userFullName;
    const isAdvisor = document.advisorName === userFullName;
    const isCoAdvisor = document.coAdvisorName === userFullName;
    const isInvolved = isAuthor || isAdvisor || isCoAdvisor;
    const canSeeAllFiles = isRoleAdminOrProfessor || isInvolved;

    let allFiles = {};
    try {
      allFiles = (typeof document.file_paths === 'string')
                    ? JSON.parse(document.file_paths || '{}')
                    : (document.file_paths || {});
    } catch (e) {
      console.error("Could not parse file_paths JSON:", e);
    }

    if (canSeeAllFiles) {
      return res.json({ ...document, file_paths: JSON.stringify(allFiles) });
    } else {
      const filteredFiles = {
        complete_pdf: allFiles.complete_pdf || []
      };
      return res.json({ ...document, file_paths: JSON.stringify(filteredFiles) });
    }
  } catch (err) {
    return res.status(500).json({ message: 'Database error', error: err.message });
  }
});


// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});