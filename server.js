// server.js (เวอร์ชันแก้ไข PostgreSQL และ S3 - ใช้ ES Module)
import 'dotenv/config'; 
import multer from 'multer';
import multerS3 from 'multer-s3';

// **********************************************
// IMPORT AWS SDK V3 (ใหม่)
// **********************************************
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'; // สำหรับ API Download

// **********************************************
// IMPORT Core Modules และ PG
// **********************************************
import pkg from 'pg'; 
const { Pool } = pkg; 
import express from 'express'; 
import bodyParser from 'body-parser'; 
import cors from 'cors'; 
import { fileURLToPath } from 'url'; 
import * as path from 'path'; 

// **********************************************
// Global Config
// **********************************************
const S3_BUCKET = process.env.S3_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION;
const app = express();
const port = process.env.PORT || 5000;

// กำหนด __filename และ __dirname สำหรับ ES Module (สำคัญสำหรับการหา Path)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ตรวจสอบว่า S3 Keys ถูกโหลดหรือไม่
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !S3_BUCKET) {
    console.error("FATAL ERROR: AWS keys or S3 Bucket name are missing from Environment Variables!");
}

// **********************************************
// กำหนด S3 Client (V3)
// **********************************************
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});


// (สำคัญ!) ตั้งค่า CORS ให้ถูกต้อง
const corsOptions = {
  origin: 'https://my-firstprojectdeploysohard.onrender.com' 
};
app.use(cors(corsOptions)); 
    
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
app.use(bodyParser.urlencoded({ extended: true })); // <-- เพิ่มเพื่อรองรับ Form Data จาก Multer
// แก้ไข: ใช้ __dirname เพื่อเสิร์ฟไฟล์ Static อย่างถูกต้อง
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===============================================
// API for Users (CRUD Operations) - (แก้ไขเป็น pg)
// ===============================================

// GET: ดึงข้อมูลผู้ใช้ทั้งหมด (แก้ไข: เพิ่ม Logging)
app.get('/api/users', async (req, res) => {
  console.log("Attempting to fetch users from DB..."); // <-- Log 1: เริ่มทำงาน
  const sql = `
    SELECT 
      id, username, first_name, last_name, email, 
      role, is_active, created_at
    FROM users
  `;

  try {
    console.log("Executing SQL for /api/users"); // <-- Log 2: ก่อน Query
    const results = await pool.query(sql);
    console.log(`Successfully fetched ${results.rows.length} users.`); // <-- Log 3: หลัง Query สำเร็จ
    res.json(results.rows); // <-- pg: ใช้ .rows
  } catch (err) {
    // นี่คือส่วนที่ควรจะทำงานถ้า DB Query ล้มเหลว
    console.error('!!! ERROR fetching users:', err.message, err.stack); // <-- Log 4: แสดง Error ชัดเจน
    // ส่ง JSON Error กลับไปเสมอ
    return res.status(500).json({ error: 'Database query failed', details: err.message }); 
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
    console.error('Error fetching user by ID:', err); // <-- เพิ่ม Logging
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
    console.error('Error creating user:', err); // <-- เพิ่ม Logging
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
    console.error('Error updating user password:', err); // <-- เพิ่ม Logging
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
    console.error('Error deleting user:', err); // <-- เพิ่ม Logging
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
    console.error('Database query error during login:', err); // <-- เพิ่ม Logging
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

    let sql = `
        SELECT 
            id, title, title_eng, author, department, advisorName, 
            abstract, keywords, document_type, publish_year, approval_status, is_active 
        FROM documents
    `;
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

    // console.log("Executing SQL:", sql); // Log SQL (เอาออกชั่วคราว)
    // console.log("Values:", values);      // Log Values (เอาออกชั่วคราว)

    try {
        const results = await pool.query(sql, values); // <-- pg: ส่ง values เข้าไป
        res.json(results.rows);
    } catch (err) {
        console.error('Error fetching documents:', err); // <-- เพิ่ม Logging
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
    console.error('Error fetching document by ID:', err); // <-- เพิ่ม Logging
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
    console.error('Error deleting document:', err); // <-- เพิ่ม Logging
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบเอกสาร' });
  }
});

// --- S3 Multer Setup ---
const upload = multer({
  storage: multerS3({
    s3: s3Client, // <--- แก้ไขตรงนี้: ใช้ s3Client (V3)
    bucket: S3_BUCKET,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      // ตั้งชื่อไฟล์ใน S3 ให้ไม่ซ้ำกัน (timestamp-originalfilename)
      const sanitizedFilename = file.originalname
                                .replace(/\s/g, '-')  // แทนที่ช่องว่างด้วยขีดกลาง
                                .replace(/[()']/g, ''); // ลบวงเล็บและเครื่องหมายคำพูด
      const uniqueFileName = Date.now() + '-' + sanitizedFilename;
      // กำหนด path ภายใน bucket (เช่น projects/complete_pdf/...)
      // file.fieldname คือชื่อ input field เช่น 'complete_pdf'
      const s3Path = `projects/${file.fieldname}/${uniqueFileName}`; 
      cb(null, s3Path);
    }
  })
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

// --- API Upload Project (แก้ไขให้ถูกต้อง) ---
app.post('/api/upload-project', (req, res, next) => { // <-- เพิ่ม next
    
    // ใช้ Multer Middleware และจับ Error ด้วยตัวเอง
    uploadMiddleware(req, res, async (err) => {
        
        if (err) {
            console.error('Multer/S3 Error in /api/upload-project:', err); // <-- Log Error ที่นี่
            // ส่ง Error ไปให้ Global Handler จัดการ
            return next(err); 
        }
        
        // --- ส่วนประมวลผลฐานข้อมูล (รันเมื่อไม่มี Error) ---
        const {
            document_type, title, title_eng, author, abstract,
            advisorName, department, coAdvisorName, keywords, supportAgency,
            permission // <-- ดึง permission ออกมาแล้ว
        } = req.body;

        try {
            const uploadedFiles = req.files; 
            
            const filePathsJson = {};
            const fileFields = [
                'complete_pdf', 'complete_doc', 'article_files', 'program_files', 
                'web_files', 'poster_files', 'certificate_files', 'front_face'
            ];

            fileFields.forEach(field => {
                if (uploadedFiles && uploadedFiles[field]) { // <-- เพิ่ม Check uploadedFiles
                    // ใช้ .map(f => f.location) เพื่อเก็บ S3 URL
                    filePathsJson[field] = uploadedFiles[field].map(f => f.location);
                } else {
                    filePathsJson[field] = [];
                }
            });
            
            const sql = `
                INSERT INTO documents (
                    document_type, title, title_eng, author, abstract, keywords,
                    advisorName, department, coAdvisorName, supportAgency,
                    file_paths, file_sizes,
                    is_active,
                    publish_year, scan_date, approval_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, EXTRACT(YEAR FROM NOW()), CURRENT_DATE, 'pending')
                RETURNING id; 
            `; 

            const values = [
                Array.isArray(document_type) ? document_type.join(',') : document_type, 
                title || null,
                title_eng || null,
                author || null,
                abstract || null,
                keywords || null,
                advisorName || null,
                department || null,
                coAdvisorName || null,
                supportAgency || null,
                JSON.stringify(filePathsJson),
                '', // file_sizes
                (permission === 'true' || permission === true) // is_active
            ];
            
            console.log("Attempting to insert into DB..."); // <-- Log ก่อน Insert
            const result = await pool.query(sql, values); 
            console.log("DB Insert successful, Project ID:", result.rows[0].id); // <-- Log หลัง Insert
            
            res.status(201).json({
                message: 'บันทึกข้อมูลและไฟล์เรียบร้อยแล้ว',
                projectId: result.rows[0].id
            });

        } catch (dbErr) {
            console.error('!!! DATABASE ERROR on upload !!!:', dbErr.message, dbErr.stack); // <-- Log DB Error ชัดเจน
            // ส่ง Error ไปให้ Global Handler จัดการ
            next(dbErr); 
        }
    });
});
// --- (จบ API Upload Project) ---

app.get('/api/professor/documents/:id', async (req, res) => {
  const documentId = req.params.id;
  // แก้ไข: ใช้ SELECT field ชัดเจน
  const sql = `
    SELECT 
        id, title, title_eng, author, department, advisorName, coAdvisorName, 
        abstract, keywords, supportAgency, document_type, publish_year, 
        approval_status, is_active, file_paths 
    FROM documents 
    WHERE id = $1
  `; 
  
  try {
    const results = await pool.query(sql, [documentId]);
    if (results.rows.length === 0) return res.status(404).json({ message: 'Document not found' });
    
    const document = results.rows[0];
    
    let filePathsObject = {};
    try {
      if (document.file_paths) {
        filePathsObject = (typeof document.file_paths === 'string') 
                            ? JSON.parse(document.file_paths) 
                            : document.file_paths;
      }
    } catch (e) {
      console.error("Could not parse file_paths JSON for professor view:", e); // <-- เพิ่ม Logging
    }

    // แก้ไข: ไม่ต้อง stringify ซ้ำ ถ้า DB คืน object มา
    const documentWithParsedFiles = { 
      ...document, 
      file_paths: filePathsObject // ส่งเป็น Object ไปเลย
    };
    
    res.json(documentWithParsedFiles);
  } catch (err) {
    console.error('Error fetching professor document details:', err); // <-- เพิ่ม Logging
    return res.status(500).json({ message: 'Database error' });
  }
});

// (API for Download) - จำเป็นต้องเปลี่ยนไปใช้ S3
app.get('/api/download/:s3Key(*)', async (req, res, next) => { // <-- เพิ่ม next และใช้ wildcard (*)
    const { s3Key } = req.params; // Parameter คือ S3 Key ทั้งหมด
    
    // Log s3Key ที่ได้รับ
    console.log("Attempting to download S3 Key:", s3Key);

    // ตรวจสอบว่า s3Key มีค่าหรือไม่
    if (!s3Key) {
        return res.status(400).send('S3 Key is required.');
    }

    const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key, // Key คือ S3 Path/Filename ทั้งหมดที่ Frontend ส่งมา
    });
    
    try {
        // สร้าง Signed URL สำหรับดาวน์โหลด
        const url = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // URL มีอายุ 5 นาที
        console.log("Generated Signed URL:", url); // Log URL ที่สร้างได้
        // Redirect ผู้ใช้ไปที่ Signed URL ของ S3
        res.redirect(url);
    } catch (err) {
        console.error("Error generating signed URL for S3:", err.message, err.stack); // <-- Log Error ชัดเจน
        // ส่ง Error ไปให้ Global Handler
        next(err); 
    }
});

app.put('/api/documents/:id/approval', async (req, res) => {
  const documentId = req.params.id;
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
    values = [approvalStatus, documentId];
    successMessage = 'อนุมัติโครงงานเรียบร้อยแล้ว';
  
  } else { 
    sql = `UPDATE documents 
           SET approval_status = $1, is_active = FALSE 
           WHERE id = $2`; // <-- pg: $1, $2, FALSE
    values = [approvalStatus, documentId]; // approvalStatus คือ 'rejected'
    successMessage = 'ปฏิเสธโครงงานเรียบร้อยแล้ว (ส่งกลับไปให้ผู้ใชแก้ไข)';
  }

  try {
    const result = await pool.query(sql, values);
    if (result.rowCount === 0) { // <-- pg: .rowCount
      return res.status(404).json({ message: 'ไม่พบเอกสารหรือเอกสารถูกจัดการไปแล้ว' });
    }
    res.json({ message: successMessage });
  } catch (err) {
    console.error('Error updating approval status:', err); // <-- เพิ่ม Logging
    return res.status(500).json({ message: 'Database error' });
  }
});


// **********************************************
// แก้ไข: เพิ่ม Route Handler ที่ขาดหายไป (อนุมัติ)
// **********************************************
app.put('/documents/:id/approval', async (req, res) => {
    // โยนการเรียกไปที่ Route ที่ถูกต้อง
    // Note: ควรตรวจสอบสิทธิ์ผู้ใช้ก่อนเสมอว่า user เป็น admin/advisor
    const documentId = req.params.id;
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
               WHERE id = $2`;
        values = [approvalStatus, documentId];
        successMessage = 'อนุมัติโครงงานเรียบร้อยแล้ว';
    } else { 
        sql = `UPDATE documents 
               SET approval_status = $1, is_active = FALSE 
               WHERE id = $2`;
        values = [approvalStatus, documentId];
        successMessage = 'ปฏิเสธโครงงานเรียบร้อยแล้ว';
    }

    try {
        const result = await pool.query(sql, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'ไม่พบเอกสารหรือเอกสารถูกจัดการไปแล้ว' });
        }
        res.json({ message: successMessage });
    } catch (err) {
        console.error('Database error on approval/rejection via non-api route:', err); // <-- เพิ่ม Logging
        return res.status(500).json({ message: 'Database error' });
    }
});
// **********************************************
// จบการแก้ไข


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
    console.error('Error toggling active status:', err); // <-- เพิ่ม Logging
    return res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/admin/documents', async (req, res) => {
  const sql = `SELECT id, title, publish_year, approval_status, is_active FROM documents ORDER BY created_at DESC`;
  try {
    const results = await pool.query(sql);
    res.json(results.rows); // <-- pg: .rows
  } catch (err) {
    console.error('Error fetching admin documents:', err); // <-- เพิ่ม Logging
    return res.status(500).json({ message: 'Database error' });
  }
});

app.get('/admin/documents', async (req, res) => {
    // โยนการเรียกไปที่ Route ที่ถูกต้อง
    // Note: ควรตรวจสอบสิทธิ์ผู้ใช้ก่อนเสมอว่า user เป็น admin หรือไม่
    const sql = `SELECT id, title, publish_year, approval_status, is_active FROM documents ORDER BY created_at DESC`;
    try {
        const results = await pool.query(sql);
        res.json(results.rows); // <-- pg: .rows
    } catch (err) {
        console.error('Error fetching admin documents via non-api route:', err); // <-- เพิ่ม Logging
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
    `; // <-- pg: ใช้ $1, $2
    const values = [searchPattern, searchPattern];

    try {
        const results = await pool.query(sql, values);
        res.json(results.rows); // <-- pg: .rows
    } catch (err) {
        console.error('Error fetching advisor suggestions:', err); // <-- เพิ่ม Logging
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
  `; // <-- pg: ใช้ $1
  
  try {
    const results = await pool.query(sql, [projectId]);
    if (results.rows.length === 0) return res.status(404).json({ message: 'Project not found' });
    // แก้ไข: ไม่ต้อง stringify ซ้ำ
    res.json(results.rows[0]); // <-- pg: .rows[0] (ส่ง file_paths เป็น object)
  } catch (err) {
    console.error('Error fetching project details:', err); // <-- เพิ่ม Logging
    return res.status(500).json({ message: 'Database error' });
  }
});


app.put('/api/projects/:id', (req, res, next) => { // <-- เพิ่ม next
    // ใช้ Multer Middleware ก่อน
    uploadMiddleware(req, res, async (err) => {
        if (err) {
            console.error("Multer/S3 Error in PUT /api/projects/:id:", err); // <-- Log Multer Error
            return next(err); // ส่ง Error ให้ Global Handler
        }

        // ถ้าไม่มี Error จาก Multer ให้ทำงานต่อ
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
          } catch (parseErr) {
            console.error("Error parsing existing file_paths:", parseErr); // <-- Log Parsing Error
            existingFilePaths = {}; // ใช้ Object ว่างถ้า Parse ไม่ได้
          }

          const currentStatus = results.rows[0].approval_status;
          // แก้ไข: สถานะเป็น 'pending' เสมอเมื่อมีการแก้ไข
          const newStatus = 'pending'; 

          const hasNewFiles = req.files && Object.keys(req.files).length > 0;
          if (hasNewFiles) {
              for (const fieldName in req.files) {
                  // ใช้ .map(f => f.location) เพื่อเก็บ S3 URL
                  existingFilePaths[fieldName] = req.files[fieldName].map(f => f.location);
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
            newStatus, // สถานะเป็น pending เสมอ
            projectId
          ];

          await pool.query(updateSql, values); 
          
          let message = 'Project updated and resubmitted for approval successfully!';
          
          res.json({ message: message });

        } catch (updateErr) {
          console.error("Error updating project:", updateErr.message, updateErr.stack); // <-- Log Update Error ชัดเจน
          next(updateErr); // ส่ง Error ให้ Global Handler
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
    // 1. ดึงข้อมูลเอกสาร (ใช้ SELECT field ชัดเจน)
    const documentSql = `
        SELECT 
            id, title, title_eng, author, department, advisorName, coAdvisorName, 
            abstract, keywords, document_type, publish_year, approval_status, is_active, 
            file_paths 
        FROM documents 
        WHERE id = $1
    `;
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
    } catch (parseErr) {
      console.error("Error parsing file_paths for student view:", parseErr); // <-- Log Parsing Error
      allFiles = {}; // ใช้ Object ว่างถ้า Parse ไม่ได้
    }

    if (canSeeAllFiles) {
      // ส่ง file_paths เป็น object
      return res.json({ ...document, file_paths: allFiles }); 
    } else {
      // กรองเฉพาะไฟล์ที่อนุญาต (เช่น complete_pdf)
      const filteredFiles = {
        complete_pdf: allFiles.complete_pdf || [] 
        // หากต้องการอนุญาตไฟล์ประเภทอื่น เพิ่มที่นี่
      };
      // ส่ง file_paths เป็น object ที่ถูกกรองแล้ว
      return res.json({ ...document, file_paths: filteredFiles }); 
    }
  } catch (err) {
    console.error('Error fetching student document details:', err); // <-- เพิ่ม Logging
    return res.status(500).json({ message: 'Database error', error: err.message });
  }
});


// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// **********************************************
// GLOBAL ERROR HANDLER (ไว้ล่างสุดก่อน Start Server)
// **********************************************
// นี่คือ Handler ที่รับ Multer Error (หรือ Error อื่นๆ ที่ไม่ถูกจับ)
app.use((err, req, res, next) => {
    // Log Error ทั้งหมดที่เข้ามาใน Handler นี้
    console.error('!!! GLOBAL ERROR HANDLER CAUGHT ERROR !!!:', err.message, err.stack); 

    if (err instanceof multer.MulterError) {
        // console.error('Global Multer Error Handler:', err.message); // Log ซ้ำซ้อน เอาออก
        return res.status(400).json({ 
            message: 'Multer Error: ' + err.message,
            errorDetails: err.code
        });
    } else if (err.Code === 'AccessDenied') { // จับ AWS Access Denied โดยเฉพาะ
         return res.status(403).json({ 
            message: 'S3 Access Denied: ' + err.message,
            errorDetails: err.Code
        });
    } else if (err.code && err.code.startsWith('NetworkingError')) { // จับ AWS Networking Error
         return res.status(503).json({ // Service Unavailable
            message: 'S3 Connection Error: ' + err.message,
            errorDetails: err.code
        });
    } else if (err.code === '23505') { // PostgreSQL Unique Violation
        return res.status(409).json({ // Conflict
            message: 'Database Error: Unique constraint violation.',
            errorDetails: err.detail || err.message
        });
    } else if (err.code === '23502') { // PostgreSQL Not Null Violation
        return res.status(400).json({ // Bad Request
            message: 'Database Error: Not-null constraint violation.',
            errorDetails: err.detail || err.message
        });
    }
    
    // สำหรับ Error อื่นๆ ที่ไม่คาดคิด (รวมถึง Database Errors ทั่วไป)
    // console.error('Global Internal Server Error:', err.stack); // Log ซ้ำซ้อน เอาออก
    res.status(500).json({
        message: 'Internal Server Error: ' + (err.message || 'Unknown Server Error'),
        // ส่ง stack trace เฉพาะใน Development (ถ้าต้องการ)
        // errorDetails: process.env.NODE_ENV === 'development' ? err.stack : undefined 
        errorDetails: err.stack // ส่งไปก่อนเพื่อ Debug
    });
});

