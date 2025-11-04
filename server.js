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
    // Consider exiting if essential config is missing
    // process.exit(1); 
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
  // (แก้ไข) ลบ 'S' ที่เกินมาจาก 'httpsS://'
  origin: 'https://my-firstprojectdeploysohard.onrender.com' 
};
app.use(cors(corsOptions)); 
    
// ตั้งค่าการเชื่อมต่อ PostgreSQL (อ่านจาก DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: {
    rejectUnauthorized: false // Necessary for Render's internal connections
  }
});

// ทดสอบการเชื่อมต่อ (แค่ครั้งเดียว)
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack); 
  }
  console.log('Connected to PostgreSQL database successfully!');
  client.query('SELECT NOW()', (err, result) => { // Test with a simple query
      release();
      if (err) {
          return console.error('Error executing query', err.stack);
      }
      console.log('PostgreSQL connection test query successful:', result.rows);
  });
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // <-- เพิ่มเพื่อรองรับ Form Data จาก Multer
// แก้ไข: ใช้ __dirname เพื่อเสิร์ฟไฟล์ Static อย่างถูกต้อง
// Only serve local 'uploads' if they exist and are needed (likely not with S3)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===============================================
// API for Users (CRUD Operations) - (แก้ไขเป็น pg)
// ===============================================

// GET: ดึงข้อมูลผู้ใช้ทั้งหมด (คืนค่า Logic เดิม)
app.get('/api/users', async (req, res, next) => { 
  console.log("==> /api/users route handler started."); 
  const sql = `
    SELECT 
      id, username, first_name, last_name, email, 
      role, is_active, created_at
    FROM users
  `;

  try {
    console.log("Executing SQL for /api/users"); 
    const results = await pool.query(sql);
    console.log(`Successfully fetched ${results.rows.length} users.`); 
    res.json(results.rows); 
  } catch (err) {
    console.error('!!! ERROR fetching users:', err.message, err.stack); 
    next(err); // Pass error to global handler
  }
});

//สำหรับดึงข้อมูลผู้ใช้รายคน
app.get('/api/users/:id', async (req, res, next) => { // <-- Add next
  const userId = req.params.id;
  const sql = 'SELECT id, username, password, email, identification, first_name, last_name, role, is_active FROM users WHERE id = $1'; 
  
  try {
    const results = await pool.query(sql, [userId]);
    if (results.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(results.rows[0]); 
  } catch (err) {
    console.error('Error fetching user by ID:', err); 
    next(err); // Pass error to global handler
  }
});

//สร้างผู้ใช้ใหม่
app.post('/api/users', async (req, res, next) => { // <-- Add next
  const { username, email, password, first_name, last_name, identification, role } = req.body;
  // Basic validation
  if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'Missing required user fields.' });
  }
  const is_active = true; 
  const sql = `
    INSERT INTO users (username, email, password, password_hash, first_name, last_name, identification, role, is_active) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id`; 
  // IMPORTANT FIX: Use password for password_hash as well to satisfy NOT NULL constraint (since no hashing library is used)
  const values = [username, email, password, password, first_name, last_name, identification || null, role || 'student', is_active];

  try {
    const result = await pool.query(sql, values);
    res.status(201).json({ message: 'User created successfully', userId: result.rows[0].id }); 
  } catch (err) {
    console.error('Error creating user:', err); 
    next(err); // Pass error to global handler
  }
});

// PUT: อัปเดตข้อมูลผู้ใช้
app.put('/api/users/:id', async (req, res, next) => { // <-- Add next
  const userId = req.params.id;
  const { password } = req.body; 

  if (!password) {
    return res.status(400).json({ message: 'Password is required to update.' });
  }

  const updateSql = `
    UPDATE users SET password = $1 
    WHERE id = $2
  `; 
  const values = [password, userId];

  try {
    const result = await pool.query(updateSql, values);
    if (result.rowCount === 0) { 
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error updating user password:', err); 
    next(err); // Pass error to global handler
  }
});

// DELETE: ลบผู้ใช้
app.delete('/api/users/:id', async (req, res, next) => { // <-- Add next
  const userId = req.params.id;
  const sql = 'DELETE FROM users WHERE id = $1'; 
  
  try {
    const result = await pool.query(sql, [userId]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'User not found' }); 
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err); 
    next(err); // Pass error to global handler
  }
});

//API for Project Summaries
app.get('/api/users/:id/summary', async (req, res, next) => { // <-- Add next
  const userId = req.params.id;

  try {
    //Get the user's full name from the users table
    const userSql = 'SELECT first_name, last_name FROM users WHERE id = $1'; 
    const userResults = await pool.query(userSql, [userId]);

    if (userResults.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResults.rows[0];
    const userFullName = `${user.first_name || ''} ${user.last_name || ''}`.trim(); // Handle null names

    //Get the counts from the documents table using the full name
    const summarySql = `
      SELECT
        COUNT(*) AS uploaded,
        SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) AS approved
      FROM documents
      WHERE author = $1
    `; 

    const summaryResults = await pool.query(summarySql, [userFullName]);
    const summary = summaryResults.rows[0];
    res.json({
      uploaded: summary.uploaded || 0,
      approved: parseInt(summary.approved) || 0,
    });

  } catch (err) {
    console.error('Error fetching document summary:', err);
    next(err); // Pass error to global handler
  }
});

app.get('/api/users/:id/profile', async (req, res, next) => { // <-- Add next
  const userId = req.params.id;
  const sql = 'SELECT first_name, last_name, role FROM users WHERE id = $1'; 
  
  try {
    const results = await pool.query(sql, [userId]);
    if (results.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userProfile = results.rows[0];
    // Map roles for display if needed
    // if (userProfile.role === 'admin') { ... } 
    res.json(userProfile);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    next(err); // Pass error to global handler
  }
});

app.get('/api/users/:id/projects', async (req, res, next) => { // <-- Add next
  const userId = req.params.id;

  try {
    //ดึงชื่อเต็มของผู้ใช้จากตาราง users
    const userSql = 'SELECT first_name, last_name FROM users WHERE id = $1'; 
    const userResults = await pool.query(userSql, [userId]);

    if (userResults.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResults.rows[0];
    const userFullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();

    // Step 2: ดึงข้อมูลโปรเจกต์
    const projectsSql = `
      SELECT
        id, title, approval_status, is_active, created_at AS submitted_date 
      FROM documents
      WHERE 
        author LIKE $1 OR          
        advisorName LIKE $2 OR     
        coAdvisorName LIKE $3 OR
        co_author LIKE $4      -- (!!!) เพิ่มบรรทัดนี้
      ORDER BY created_at DESC
    `; 

    // (!!!) เพิ่ม userFullName อีก 1 ตัวสำหรับ $4
    const values = [userFullName, userFullName, userFullName, userFullName]; 
    const projectsResults = await pool.query(projectsSql, values);
    res.json(projectsResults.rows);

  } catch (err) {
    console.error('Error fetching user projects:', err);
    next(err); // Pass error to global handler
  }
});

app.get('/api/students/search', async (req, res, next) => {
    const searchTerm = req.query.query || '';
    if (searchTerm.length < 3) {
        return res.json([]);
    }

    const searchPattern = `%${searchTerm}%`;
    const sql = `
        SELECT id, first_name, last_name 
        FROM users 
        WHERE role = 'student' -- ค้นหาเฉพาะนักศึกษา
          AND (LOWER(first_name) LIKE LOWER($1) OR LOWER(last_name) LIKE LOWER($2))
        LIMIT 10;
    `; 
    const values = [searchPattern, searchPattern];

    try {
        const results = await pool.query(sql, values);
        res.json(results.rows); 
    } catch (err) {
        console.error('Error fetching student suggestions:', err); 
        next(err); // Pass error to global handler
    }
});

// ===============================================
// API for Authentication
// ===============================================
app.post('/api/login', async (req, res, next) => { // <-- Add next
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'โปรดระบุชื่อผู้ใช้และรหัสผ่าน' });
  }
  
  const sql = 'SELECT id, username, password, role, first_name, last_name, is_active FROM users WHERE username = $1'; 
  
  try {
    const results = await pool.query(sql, [username]);

    if (results.rows.length === 0) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const user = results.rows[0];
    
    // IMPORTANT: Plain text password comparison is insecure! Use bcrypt in production.
    if (user.password !== password) { 
      return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
    }
    
    if (user.is_active === false) { 
      return res.status(403).json({ message: 'บัญชีผู้ใช้ถูกระงับ กรุณาติดต่อผู้ดูแลระบบ' });
    }
    
    // Exclude password from the response
    const userResponse = { 
        id: user.id, 
        username: user.username,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        is_active: user.is_active
    };
    
    res.status(200).json({ 
      message: 'Login สำเร็จ', 
      user: userResponse
    });
  } catch (err) {
    console.error('Database query error during login:', err); 
    next(err); // Pass error to global handler
  }
});


// ===============================================
// API for Documents
// ===============================================

app.get('/api/documents', async (req, res, next) => { // <-- Add next
    const searchTerm = req.query.search || '';
    const departmentFilter = req.query.department || '';
    const yearFilter = req.query.year || '';
    const typeFilter = req.query.type || '';
    const statusFilter = req.query.status || ''; 
    const limit = req.query.limit || null;

    let sql = `
        SELECT 
            id, title, title_eng, author, department, advisorName, 
            abstract, keywords, document_type, publish_year, approval_status, is_active,
            file_paths,scan_date,display_date,language
        FROM documents
    `;
    let values = [];
    let whereConditions = [];
    let paramIndex = 1; 

    // Default filter for public view: approved and active
    if (statusFilter === 'active' || !statusFilter) { 
        whereConditions.push("approval_status = 'approved'");
        whereConditions.push("is_active = TRUE"); 
    } else if (statusFilter === 'all') {
        // Admin might request 'all' statuses (no status filter applied)
    } else if (statusFilter === 'pending') {
         whereConditions.push("approval_status = 'pending'");
    } else if (statusFilter === 'rejected') {
         whereConditions.push("approval_status = 'rejected'");
    } // Add more specific status filters if needed

    if (searchTerm) {
        const searchPattern = `%${searchTerm}%`;
        whereConditions.push(`(
            LOWER(author) LIKE LOWER($${paramIndex}) OR
            LOWER(title) LIKE LOWER($${paramIndex + 1}) OR
            LOWER(title_eng) LIKE LOWER($${paramIndex + 2}) OR
            LOWER(abstract) LIKE LOWER($${paramIndex + 3}) OR
            LOWER(keywords) LIKE LOWER($${paramIndex + 4}) OR
            LOWER(document_type) LIKE LOWER($${paramIndex + 5}) OR
            LOWER(department) LIKE LOWER($${paramIndex + 6}) OR
            LOWER(advisorName) LIKE LOWER($${paramIndex + 7}) OR
            LOWER(coAdvisorName) LIKE LOWER($${paramIndex + 8})
        )`);
        values.push(...Array(9).fill(searchPattern)); // Add 9 search patterns
        paramIndex += 9; 
    }

    if (departmentFilter) {
        whereConditions.push(`department = $${paramIndex}`); 
        values.push(departmentFilter);
        paramIndex++;
    }

    if (yearFilter) {
        if (!isNaN(parseInt(yearFilter))) { // Validate year input
            whereConditions.push(`publish_year = $${paramIndex}`); 
            values.push(parseInt(yearFilter));
            paramIndex++;
        }
    }

    if (typeFilter) {
        whereConditions.push(`document_type LIKE $${paramIndex}`); 
        values.push(`%${typeFilter}%`);
        paramIndex++;
    }

    if (whereConditions.length > 0) {
        sql += ' WHERE ' + whereConditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';

    if (limit && !isNaN(parseInt(limit))) {
        sql += ` LIMIT $${paramIndex}`; 
        values.push(parseInt(limit));
    }

    // console.log("Executing SQL for /api/documents:", sql); 
    // console.log("Values:", values);      

    try {
        const results = await pool.query(sql, values); 
        res.json(results.rows);
    } catch (err) {
        console.error('Error fetching documents:', err); 
        next(err); // Pass error to global handler
    }
});

app.get('/api/documents/:id', async (req, res, next) => { // <-- Add next
  const documentId = req.params.id;
  const sql = `
    SELECT * FROM documents
    WHERE id = $1;
  `; 
  
  try {
    const results = await pool.query(sql, [documentId]);
    if (results.rows.length > 0) {
      res.status(200).json(results.rows[0]);
    } else {
      res.status(404).json({ message: 'ไม่พบเอกสาร' });
    }
  } catch (err) {
    console.error('Error fetching document by ID:', err); 
    next(err); // Pass error to global handler
  }
});

app.delete('/api/documents/:id', async (req, res, next) => { // <-- Add next
  const documentId = req.params.id;
  const sql = 'DELETE FROM users WHERE id = $1'; 
  
  try {
    const result = await pool.query(sql, [documentId]);
    if (result.rowCount === 0) { 
      return res.status(404).json({ message: 'ไม่พบเอกสารที่ต้องการลบ' });
    }
    res.status(200).json({ message: 'ลบเอกสารเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('Error deleting document:', err); 
    next(err); // Pass error to global handler
  }
});

// --- S3 Multer Setup ---
const upload = multer({
  storage: multerS3({
    s3: s3Client, 
    bucket: S3_BUCKET,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const sanitizedFilename = (file.originalname || 'unknown-file') // Handle undefined originalname
                                .replace(/[^a-zA-Z0-9.\-_]/g, '_'); // Replace unsafe chars with underscore
      const uniqueFileName = Date.now() + '-' + sanitizedFilename;
      const s3Path = `projects/${file.fieldname}/${uniqueFileName}`; 
      cb(null, s3Path);
    }
  })
});

// Define fields expected for upload
const uploadFields = [
    { name: 'complete_pdf', maxCount: 10 },
    { name: 'complete_doc', maxCount: 10 },
    { name: 'article_files', maxCount: 10 }, 
    { name: 'program_files', maxCount: 1 }, 
    { name: 'web_files', maxCount: 2 },
    { name: 'poster_files', maxCount: 5 },
    { name: 'certificate_files', maxCount: 5 },
    { name: 'front_face', maxCount: 1 }
];

// Middleware instance using the defined fields
const uploadMiddleware = upload.fields(uploadFields);

// --- API Upload Project (Corrected structure) ---
app.post('/api/upload-project', (req, res, next) => { 
    // Step 1: Execute the Multer middleware
    uploadMiddleware(req, res, async (err) => {
        // Step 2: Handle any errors from Multer/S3
        if (err) {
            console.error('Multer/S3 Error in /api/upload-project:', err); 
            return next(err); // Pass to global error handler
        }
        
        // Step 3: If no Multer error, proceed with database logic
        const {
            document_type, title, title_eng, author, abstract,
            advisorName, department, coAdvisorName, keywords, supportAgency,
            permission,co_author
        } = req.body;

        // Basic Validation
        if (!title || !author || !permission) {
             return res.status(400).json({ message: 'Missing required fields: title, author, permission.' });
        }

        try {
            const uploadedFiles = req.files;             
            const filePathsJson = {};

            uploadFields.forEach(field => { // Iterate through defined fields
                const fieldName = field.name;
                if (uploadedFiles && uploadedFiles[fieldName]) { 
                    filePathsJson[fieldName] = uploadedFiles[fieldName].map(f => f.location); // Get S3 URL
                } else {
                    filePathsJson[fieldName] = []; // Ensure every field exists in JSON
                }
            });
            
            const sql = `
                INSERT INTO documents (
                    document_type, title, title_eng, author, abstract, keywords,
                    advisorName, department, coAdvisorName, supportAgency,
                    file_paths, file_sizes,
                    is_active,
                    co_author,
                    publish_year, scan_date, approval_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, EXTRACT(YEAR FROM NOW()), CURRENT_DATE, 'pending')
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
                JSON.stringify(filePathsJson), // file_paths ($11)
                '', // file_sizes ($12) - Placeholder for NOT NULL constraint
                (permission === 'true' || permission === true), // is_active ($13)
                co_author || null // (!!!) ADDED: co_author value ($14) (!!!)
            ]
            
            console.log("Attempting to insert into DB..."); 
            const result = await pool.query(sql, values); 
            console.log("DB Insert successful, Project ID:", result.rows[0].id); 
            
            res.status(201).json({
                message: 'บันทึกข้อมูลและไฟล์เรียบร้อยแล้ว',
                projectId: result.rows[0].id
            });

        } catch (dbErr) {
            console.error('!!! DATABASE ERROR on upload !!!:', dbErr.message, dbErr.stack); 
            next(dbErr); // Pass DB error to global handler
        }
    });
});
// --- (End API Upload Project) ---

app.get('/api/professor/documents/:id', async (req, res, next) => { // <-- Add next
  const documentId = req.params.id;
  const sql = `
    SELECT 
        id, title, title_eng, author, department, advisorName, coAdvisorName, 
        abstract, keywords, supportAgency, document_type, publish_year, 
        approval_status, is_active, file_paths ,scan_date,display_date,language
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
      console.error("Could not parse file_paths JSON for professor view:", e); 
    }

    const documentWithParsedFiles = { 
      ...document, 
      file_paths: filePathsObject 
    };
    
    res.json(documentWithParsedFiles);
  } catch (err) {
    console.error('Error fetching professor document details:', err); 
    next(err); // Pass error to global handler
  }
});

// **********************************************
// (!!!) CORRECTED API FOR DOWNLOAD (!!!)
// **********************************************
// (แก้ไข) FIX: 
// 1. เปลี่ยนจาก String Path เป็น RegExp Object ( /.../ )
//    เพื่อหลีกเลี่ยง PathError [TypeError]: Missing parameter name
//    RegExp นี้จะจับทุกอย่างที่ตามหลัง /api/download/
// 2. ดึง s3Key จาก req.params[0] (เหมือนเดิม)
app.get(/\/api\/download\/(.*)/, async (req, res, next) => { 
    // (แก้ไข) ดึง s3Key จาก req.params[0] (index 0)
    const s3Key = req.params[0]; 
    
    console.log("Attempting to download S3 Key:", s3Key);

    if (!s3Key) {
        return res.status(400).send('S3 Key is required.');
    }

    const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key, // Use the captured key
    });
    
    try {
        const url = await getSignedUrl(s3Client, command, { expiresIn: 300 }); 
        console.log("Generated Signed URL:", url); 
        res.redirect(url);
    } catch (err) {
        console.error("Error generating signed URL for S3:", err.message, err.stack); 
        // Handle specific S3 errors like NoSuchKey
        if (err.Code === 'NoSuchKey' || err.name === 'NoSuchKey') {
             return res.status(404).send('File not found in S3.');
        }
        next(err); // Pass other errors to global handler
    }
});
// **********************************************
// (!!!) END OF CORRECTION (!!!)
// **********************************************

app.put('/api/documents/:id/approval', async (req, res, next) => { // <-- Add next
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
    successMessage = 'ปฏิเสธโครงงานเรียบร้อยแล้ว (ส่งกลับไปให้ผู้ใชแก้ไข)';
  }

  try {
    const result = await pool.query(sql, values);
    if (result.rowCount === 0) { 
      return res.status(404).json({ message: 'ไม่พบเอกสารหรือเอกสารถูกจัดการไปแล้ว' });
    }
    res.json({ message: successMessage });
  } catch (err) {
    console.error('Error updating approval status:', err); 
    next(err); // Pass error to global handler
  }
});


// **********************************************
// Route Handlers without /api/ prefix (Keep if needed, but ensure consistency)
// **********************************************
app.put('/documents/:id/approval', async (req, res, next) => { // <-- Add next
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
        console.error('Database error on approval/rejection via non-api route:', err); 
        next(err); // Pass error to global handler
    }
});

app.put('/api/documents/:id/toggle-active', async (req, res, next) => { // <-- Add next
  const { id } = req.params;
  const { isActive } = req.body;

  // Validate isActive
  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ message: 'isActive must be a boolean.' });
  }

  const sql = `UPDATE documents SET is_active = $1 WHERE id = $2 AND approval_status = 'approved'`; 
  const values = [isActive, id];

  try {
    const result = await pool.query(sql, values);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Document not found or not approved.' }); 
    res.json({ message: 'Active status toggled successfully.' });
  } catch (err) {
    console.error('Error toggling active status:', err); 
    next(err); // Pass error to global handler
  }
});

// Consider adding authentication/authorization middleware here
app.get('/api/admin/documents', async (req, res, next) => { // <-- Add next
  const sql = `SELECT id, title, publish_year, approval_status, is_active FROM documents ORDER BY created_at DESC`;
  try {
    const results = await pool.query(sql);
    res.json(results.rows); 
  } catch (err) {
    console.error('Error fetching admin documents:', err); 
    next(err); // Pass error to global handler
  }
});

// Keep this only if frontend specifically calls it without /api/
app.get('/admin/documents', async (req, res, next) => { // <-- Add next
    const sql = `SELECT id, title, publish_year, approval_status, is_active FROM documents ORDER BY created_at DESC`;
    try {
        const results = await pool.query(sql);
        res.json(results.rows); 
    } catch (err) {
        console.error('Error fetching admin documents via non-api route:', err); 
        next(err); // Pass error to global handler
    }
});

app.get('/api/advisors/search', async (req, res, next) => { // <-- Add next
    const searchTerm = req.query.query || '';
    // Return early if search term is too short
    if (searchTerm.length < 3) {
        return res.json([]); 
    }

    const searchPattern = `%${searchTerm}%`;
    const sql = `
        SELECT id, first_name, last_name 
        FROM users 
        WHERE role IN ('advisor', 'admin') 
          AND (LOWER(first_name) LIKE LOWER($1) OR LOWER(last_name) LIKE LOWER($2))
        LIMIT 10;
    `; 
    const values = [searchPattern, searchPattern];

    try {
        const results = await pool.query(sql, values);
        res.json(results.rows); 
    } catch (err) {
        console.error('Error fetching advisor suggestions:', err); 
        next(err); // Pass error to global handler
    }
});

app.get('/api/project-details/:id', async (req, res, next) => { // <-- Add next
  const projectId = req.params.id;
  const sql = `
    SELECT 
      id, title, title_eng, author, abstract, keywords,
      advisorName, department, coAdvisorName, supportAgency, document_type,
      file_paths,scan_date,display_date,language
    FROM documents 
    WHERE id = $1
  `; 
  
  try {
    const results = await pool.query(sql, [projectId]);
    if (results.rows.length === 0) return res.status(404).json({ message: 'Project not found' });
    
    let projectDetails = results.rows[0];
    // Ensure file_paths is an object
    try {
        projectDetails.file_paths = (typeof projectDetails.file_paths === 'string') 
                                    ? JSON.parse(projectDetails.file_paths || '{}') 
                                    : (projectDetails.file_paths || {});
    } catch(e) {
        console.error('Error parsing file_paths for project details:', e); 
        projectDetails.file_paths = {}; // Default to empty object on error
    }
    
    res.json(projectDetails); 
  } catch (err) {
    console.error('Error fetching project details:', err); 
    next(err); // Pass error to global handler
  }
});


// API to Update Project (PUT /api/projects/:id)
app.put('/api/projects/:id', (req, res, next) => { 
    // Step 1: Execute Multer middleware first
    uploadMiddleware(req, res, async (err) => {
        // Step 2: Handle Multer/S3 errors
        if (err) {
            console.error("Multer/S3 Error in PUT /api/projects/:id:", err); 
            return next(err); // Pass to global handler
        }

        // Step 3: Proceed with update logic if no upload error
        const projectId = req.params.id;
        const { 
          title, title_eng, abstract, keywords, advisorName, 
          department, coAdvisorName, supportAgency, document_type 
          // Note: 'permission' or 'is_active' is not typically updated here directly
        } = req.body; 

        // Basic validation
        if (!title) {
            return res.status(400).json({ message: 'Title is required for update.' });
        }

        try {
          // Fetch existing project data
          const getSql = "SELECT file_paths, approval_status FROM documents WHERE id = $1"; 
          const results = await pool.query(getSql, [projectId]);

          if (results.rows.length === 0) return res.status(404).json({ message: 'Project not found' }); 

          let existingFilePaths = {};
          try {
            existingFilePaths = (typeof results.rows[0].file_paths === 'string')
                                ? JSON.parse(results.rows[0].file_paths || '{}')
                                : (results.rows[0].file_paths || {});
          } catch (parseErr) {
            console.error("Error parsing existing file_paths during update:", parseErr); 
            existingFilePaths = {}; 
          }

          // Determine the new status - always reset to 'pending' on update
          const newStatus = 'pending'; 

          // Merge new files (if any) with existing ones
          const hasNewFiles = req.files && Object.keys(req.files).length > 0;
          if (hasNewFiles) {
              uploadFields.forEach(field => { // Iterate through defined fields
                  const fieldName = field.name;
                  if (req.files[fieldName]) {
                      // Overwrite or add new file locations for this field
                      existingFilePaths[fieldName] = req.files[fieldName].map(f => f.location); 
                  }
              });
          }

          // Prepare SQL update
          const updateSql = `
            UPDATE documents SET 
              title = $1, title_eng = $2, abstract = $3, keywords = $4, advisorName = $5, 
              department = $6, coAdvisorName = $7, supportAgency = $8, document_type = $9,
              file_paths = $10, 
              approval_status = $11, 
              updated_at = NOW() 
              // is_active might need specific logic based on approval status
            WHERE id = $12
          `; 
          const values = [
            title || null, 
            title_eng || null, 
            abstract || null, 
            keywords || null, 
            advisorName || null, 
            department || null, 
            coAdvisorName || null, 
            supportAgency || null, 
            Array.isArray(document_type) ? document_type.join(',') : document_type,
            JSON.stringify(existingFilePaths), 
            newStatus, 
            projectId 
          ];

          await pool.query(updateSql, values); 
          
          res.json({ message: 'Project updated and resubmitted for approval successfully!' });

        } catch (updateErr) {
          console.error("Error updating project:", updateErr.message, updateErr.stack); 
          next(updateErr); 
        }
    });
});

app.get('/api/student/documents/:id', async (req, res, next) => { // <-- Add next
  const documentId = req.params.id;
  const studentUserId = req.query.userId; 

  if (!studentUserId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const documentSql = `
        SELECT 
            id, title, title_eng, author, department, advisorName, coAdvisorName, 
            abstract, keywords, document_type, publish_year, approval_status, is_active, 
            file_paths,scan_date,display_date,language
        FROM documents 
        WHERE id = $1
    `;
    const docResults = await pool.query(documentSql, [documentId]);
    if (docResults.rows.length === 0) return res.status(404).json({ message: 'Document not found' });

    const document = docResults.rows[0];
    
    const userSql = "SELECT first_name, last_name, role FROM users WHERE id = $1"; 
    const userResults = await pool.query(userSql, [studentUserId]);
    if (userResults.rows.length === 0) return res.status(404).json({ message: 'User requesting access not found' });

    const user = userResults.rows[0];
    const userFullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();

    // Authorization logic
    const isRoleAdminOrAdvisor = user.role === 'admin' || user.role === 'advisor'; 
    const isAuthor = document.author === userFullName;
    const isAdvisor = document.advisorName === userFullName;
    const isCoAdvisor = document.coAdvisorName === userFullName;
    const isInvolved = isAuthor || isAdvisor || isCoAdvisor;
    const canSeeAllFiles = isRoleAdminOrAdvisor || isInvolved;

    let allFiles = {};
    try {
      allFiles = (typeof document.file_paths === 'string')
                    ? JSON.parse(document.file_paths || '{}')
                    : (document.file_paths || {});
    } catch (parseErr) {
      console.error("Error parsing file_paths for student view:", parseErr); 
      allFiles = {}; 
    }

    // Prepare response, filtering files if necessary
    const responseDocument = { ...document }; // Clone document data

    if (canSeeAllFiles) {
      responseDocument.file_paths = allFiles; // Send all files as object
    } else {
      // Filter: only allow specific files (e.g., complete_pdf)
      const filteredFiles = {
        complete_pdf: allFiles.complete_pdf || [] 
      };
      responseDocument.file_paths = filteredFiles; // Send filtered files as object
    }
    
    return res.json(responseDocument); 

  } catch (err) {
    console.error('Error fetching student document details:', err); 
    next(err); // Pass DB error to global handler
  }
});

app.post('/api/users/bulk', async (req, res, next) => {
    const users = req.body; // นี่คือ Array จาก Excel [ { username: ... }, ... ]
    
    if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ message: "No user data provided or data is not an array." });
    }

    const client = await pool.connect(); // เชื่อมต่อฐานข้อมูล
    
    try {
        await client.query('BEGIN'); // เริ่ม Transaction

        const sql = `
            INSERT INTO users (username, email, password, password_hash, first_name, last_name, identification, role, is_active) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        
        let successfulCount = 0;
        let failedCount = 0;
        let errors = [];

        // วนลูป Array ผู้ใช้ที่ได้จาก Excel
        for (const user of users) {
            
            // ตรวจสอบข้อมูลที่จำเป็น (เหมือนใน Excel)
            if (!user.username || !user.email || !user.password || !user.first_name || !user.last_name) {
                failedCount++;
                errors.push(`Skipped user (username: ${user.username || 'N/A'}): Missing required fields.`);
                continue; // ข้ามไปคนถัดไป
            }

            const values = [
                user.username,
                user.email,
                user.password, // (ยังเป็น Plain text ตามโค้ดเดิม)
                user.password, // (สำหรับ password_hash ตามโค้ดเดิม)
                user.first_name,
                user.last_name,
                user.identification || null,
                user.role || 'student',
                true // ตั้งค่าให้ Active อัตโนมัติ
            ];
            
            try {
                // พยายามเพิ่มผู้ใช้
                await client.query(sql, values);
                successfulCount++;
            } catch (insertErr) {
                // หาก Error (เช่น username ซ้ำ)
                failedCount++;
                errors.push(`Failed to insert ${user.username}: ${insertErr.detail || insertErr.message}`);
            }
        }

        await client.query('COMMIT'); // ยืนยันการเปลี่ยนแปลงทั้งหมด
        
        res.status(201).json({ 
            message: `Bulk upload complete. Successful: ${successfulCount}. Failed: ${failedCount}.`,
            errors: errors
        });

    } catch (err) {
        await client.query('ROLLBACK'); // หากมีปัญหาใหญ่ ให้ยกเลิกทั้งหมด
        console.error('Error during bulk user insert transaction:', err); 
        next(err); // ส่งไปให้ Global Error Handler
    } finally {
        client.release(); // คืนการเชื่อมต่อ
    }
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// **********************************************
// GLOBAL ERROR HANDLER (ไว้ล่างสุดก่อน Start Server)
// **********************************************
app.use((err, req, res, next) => {
    console.error('!!! GLOBAL ERROR HANDLER CAUGHT ERROR !!!:', err.message, err.stack); 

    // Handle Multer specific errors first
    if (err instanceof multer.MulterError) {
        let message = 'File Upload Error: ' + err.message;
        if (err.code === 'LIMIT_FILE_SIZE') message = 'File is too large.';
        if (err.code === 'LIMIT_UNEXPECTED_FILE') message = `Unexpected file field: ${err.field}. Please check field names.`;
        // Add more specific Multer error messages if needed
        return res.status(400).json({ 
            message: message,
            errorDetails: err.code
        });
    } 
    // Handle AWS SDK v3 specific errors (using err.name or err.Code)
    else if (err.name === 'AccessDenied' || err.Code === 'AccessDenied') { 
         return res.status(403).json({ 
            message: 'S3 Access Denied: Check IAM Policy and Bucket Name/Region in Env Vars.',
            errorDetails: err.Code || err.name
        });
    } else if (err.name === 'NoSuchBucket') {
         return res.status(404).json({
            message: 'S3 Error: Bucket not found. Check S3_BUCKET_NAME env var.',
            errorDetails: err.name
         });
    } else if (err.name === 'NoSuchKey') {
         return res.status(404).json({
            message: 'S3 Error: File key not found in bucket.',
            errorDetails: err.name
         });
    } else if (err.code && (err.code.startsWith('NetworkingError') || err.code === 'CredentialsProviderError')) { 
         return res.status(503).json({ 
            message: 'S3 Connection/Credentials Error: Check AWS Keys/Region or network.',
            errorDetails: err.code
        });
    } 
    // Handle PostgreSQL specific errors (using err.code)
    else if (err.code === '23505') { // Unique Violation
        return res.status(409).json({ 
            message: 'Database Error: Unique constraint violation.',
            errorDetails: err.detail || err.message
        });
    } else if (err.code === '23502') { // Not Null Violation
        return res.status(400).json({ 
            message: 'Databasee Error: A required field is missing.',
            errorDetails: `Column '${err.column}' cannot be null.` || err.message
        });
    } else if (err.code && err.code.startsWith('22')) { // Data Exception (e.g., invalid format)
        return res.status(400).json({
            message: 'Database Error: Invalid data format',
            errorDetails: err.message
        });
    }
    
    // Fallback for any other unexpected errors
    res.status(500).json({
        message: 'Internal Server Error: ' + (err.message || 'Unknown Server Error'),
        // Only send stack trace in development for security
        errorDetails: process.env.NODE_ENV === 'development' ? err.stack : 'Error details hidden in production.'
    });
});

