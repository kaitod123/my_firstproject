    // server.js
    require('dotenv').config();
    const express = require('express');
    const mysql = require('mysql');
    const bodyParser = require('body-parser');
    const cors = require('cors');
    const multer = require('multer');
    const path = require('path');
    const app = express();
    const port = 5000;
    
    // Middleware
    app.use(cors());
    app.use(bodyParser.json());
    
    // ทำให้ Express สามารถเข้าถึงไฟล์ในโฟลเดอร์ uploads ได้โดยตรง
    app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); 
    
    // 1. เปลี่ยนมาใช้ 'pg'
const { Pool } = require('pg');

// 2. สร้าง Pool ใหม่
const pool = new Pool({
  // 3. อ่าน 'DATABASE_URL' จาก Environment ที่เราตั้งค่าบน Render
  connectionString: process.env.DATABASE_URL, 
  
  // 4. (สำคัญมาก) เพิ่มส่วนนี้เพื่อให้เชื่อมต่อกับ Render DB ได้
  ssl: {
    rejectUnauthorized: false
  }
});

// 5. ทดสอบการเชื่อมต่อ
pool.connect((err, client, release) => {
  if (err) {
    // นี่คือ Error ที่คุณจะเห็นถ้าตั้งค่า ENV ผิด
    return console.error('Error acquiring client', err.stack); 
  }
  console.log('Connected to PostgreSQL database successfully!'); // <-- เราอยากเห็นข้อความนี้
  release();
});

// อย่าลืม export 'pool' ไปใช้ในส่วนอื่นๆ ของแอป
// module.exports = pool;
    
    // ===============================================
    // API for Users (CRUD Operations)
    // ... (โค้ดส่วน API for Users ไม่มีการเปลี่ยนแปลง) ...
    // ===============================================
    
    // GET: ดึงข้อมูลผู้ใช้ทั้งหมด (โค้ดเดิม)
    app.get('/api/users', (req, res) => {
      const sql = `
        SELECT 
          id, 
          username,
          first_name,
          last_name,
          email, 
          role, 
          is_active,
          created_at
        FROM users
      `;
    
      db.query(sql, (err, results) => {
        if (err) {
          console.error('Error fetching users:', err);
          return res.status(500).json({ error: 'Database query failed' });
        }
        res.json(results);
      });
    });
    
    //สำหรับดึงข้อมูลผู้ใช้รายคน
    app.get('/api/users/:id', (req, res) => {
      const userId = req.params.id;
      const sql = 'SELECT id, username, password, email, identification, first_name, last_name, role, is_active FROM users WHERE id = ?';
      
      db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database query failed' });
        if (results.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json(results[0]);
      });
    });
    
    //สร้างผู้ใช้ใหม่
    app.post('/api/users', (req, res) => {
      const { username, email, password, first_name, last_name, identification, role } = req.body;
      const is_active = 1;
      const sql = `
        INSERT INTO users (username, email, password, first_name, last_name, identification, role, is_active) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [username, email, password, first_name, last_name, identification, role, is_active];
    
      db.query(sql, values, (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to create user', details: err.message });
        res.status(201).json({ message: 'User created successfully', userId: result.insertId });
      });
    });
    
    // PUT: อัปเดตข้อมูลผู้ใช้
    app.put('/api/users/:id', (req, res) => {
      const userId = req.params.id;
      // ดึงเฉพาะ password จาก Body (เพราะ Frontend ส่งมาแค่ password)
      const { password } = req.body; 
    
      if (!password) {
        // โค้ดนี้จะป้องกันการอัปเดตถ้าไม่มี password ส่งมา
        return res.status(400).json({ message: 'Password is required to update.' });
      }
    
      // อัพเดต password
      const updateSql = `
        UPDATE users SET password = ? 
        WHERE id = ?
      `;
      const values = [password, userId];
    
      db.query(updateSql, values, (err, result) => {
        if (err) {
          console.error('Failed to update user password:', err);
          // หากเกิด error จากการเชื่อมต่อหรือ SQL
          return res.status(500).json({ error: 'Failed to update password', details: err.message });
        }
        
        // ตรวจสอบ affectedRows: หากผลกระทบเป็น 0 หมายความว่าไม่พบ ID นั้นในฐานข้อมูล
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'User not found' });
        }
        
        // สำเร็จ
        res.json({ message: 'Password updated successfully' });
      });
    });
    
    // DELETE: ลบผู้ใช้
    app.delete('/api/users/:id', (req, res) => {
      const userId = req.params.id;
      const sql = 'DELETE FROM users WHERE id = ?';
      db.query(sql, [userId], (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to delete user' });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
      });
    });
    
    //API for Project Summaries
    app.get('/api/users/:id/summary', (req, res) => {
      const userId = req.params.id;
    
      //Get the user's full name from the users table
      const userSql = 'SELECT first_name, last_name FROM users WHERE id = ?';
      db.query(userSql, [userId], (err, userResults) => {
        if (err) {
          console.error('Error fetching user for summary:', err);
          return res.status(500).json({ message: 'Database error fetching user' });
        }
        if (userResults.length === 0) {
          return res.status(404).json({ message: 'User not found' });
        }
    
        const user = userResults[0];
        const userFullName = `${user.first_name} ${user.last_name}`;
    
        //Get the counts from the documents table using the full name
        const summarySql = `
          SELECT
            COUNT(*) AS uploaded,
            SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) AS approved
          FROM documents
          WHERE author = ?
        `;
    
        db.query(summarySql, [userFullName], (err, summaryResults) => {
          if (err) {
            console.error('Error fetching document summary:', err);
            return res.status(500).json({ message: 'Database error fetching summary' });
          }
    
          const summary = summaryResults[0];
          res.json({
            uploaded: summary.uploaded || 0,
            approved: parseInt(summary.approved) || 0,
          });
        });
      });
    });
    
    app.get('/api/users/:id/profile', (req, res) => {
      const userId = req.params.id;
      const sql = 'SELECT first_name, last_name, role FROM users WHERE id = ?';
      
      db.query(sql, [userId], (err, results) => {
        if (err) {
          console.error('Error fetching user profile:', err);
          return res.status(500).json({ error: 'Database query failed' });
        }
        if (results.length === 0) {
          return res.status(404).json({ message: 'User not found' });
        }
        
        const userProfile = results[0];
        if (userProfile.role === 'admin') {
          userProfile.role = 'Administrator';
        } else if (userProfile.role === 'user') {
          userProfile.role = 'User';
        }
        res.json(userProfile);
      });
    });
    
    app.get('/api/users/:id/projects', (req, res) => {
      const userId = req.params.id;
    
      //ดึงชื่อเต็มของผู้ใช้จากตาราง users
      const userSql = 'SELECT first_name, last_name FROM users WHERE id = ?';
      db.query(userSql, [userId], (err, userResults) => {
        if (err) {
          console.error('Error fetching user for projects:', err);
          return res.status(500).json({ message: 'Database error fetching user' });
        }
        if (userResults.length === 0) {
          return res.status(404).json({ message: 'User not found' });
        }
    
        const user = userResults[0];
        const userFullName = `${user.first_name} ${user.last_name}`; // ชื่อเต็มของผู้ใช้ที่เข้าสู่ระบบ
    
        // Step 2: ดึงข้อมูลโปรเจกต์ทั้งหมดจากตาราง documents โดยใช้ชื่อเต็ม
        // *** แก้ไข: เพิ่ม is_active เข้าไปใน SELECT statement ***
        const projectsSql = `
          SELECT
            id,
            title,
            approval_status,
            is_active, 
            created_at AS submitted_date 
          FROM documents
          WHERE 
            author LIKE ? OR          -- เป็นผู้เขียนหลัก
            advisorName LIKE ? OR     -- เป็นอาจารย์ที่ปรึกษา
            coAdvisorName LIKE ?      -- เป็นอาจารย์ที่ปรึกษาร่วม
          ORDER BY created_at DESC
        `;
    
        // ใช้ userFullName เป็นค่าค้นหาสำหรับทุกเงื่อนไข
        const values = [userFullName, userFullName, userFullName];
    
        db.query(projectsSql, values, (err, projectsResults) => {
          if (err) {
            console.error('Error fetching user projects:', err);
            return res.status(500).json({ message: 'Database error fetching projects' });
          }
          res.json(projectsResults);
        });
      });
    });
    
    // ===============================================
    // API for Authentication
    // ===============================================
    app.post('/api/login', (req, res) => {
      const { username, password } = req.body;
    
      if (!username || !password) {
        return res.status(400).json({ message: 'โปรดระบุชื่อผู้ใช้และรหัสผ่าน' });
      }
      
      const sql = 'SELECT id, username, password, role, first_name, last_name,is_active FROM users WHERE username = ?';
      db.query(sql, [username], (err, results) => {
        if (err) {
          console.error('Database query error:', err);
          return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
        }
    
        if (results.length === 0) {
          return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }
    
        const user = results[0];
        
        if (user.password !== password) {
          return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
        }
        if (user.is_active === 0) {
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
      });
    });
    
    
    // ===============================================
    // API for Documents
    // ===============================================
    
    // (ไฟล์ server.js)
    
    app.get('/api/documents', (req, res) => {
        // 1. อ่านค่า Search และ Filters จาก req.query
        const searchTerm = req.query.search || '';
        const departmentFilter = req.query.department || '';
        const yearFilter = req.query.year || ''; // ปีเป็น ค.ศ. (เช่น 2024)
        const typeFilter = req.query.type || '';
        const statusFilter = req.query.status || ''; 
        const limit = req.query.limit || null; // อ่านค่า limit
    
        let sql = 'SELECT * FROM documents';
        let values = [];
    
        // 2. สร้าง Array สำหรับเก็บเงื่อนไข WHERE
        let whereConditions = [];
    
        // 3. (แก้ไข) เพิ่มเงื่อนไขสถานะ (Status)
        // ถ้า statusFilter เป็น 'active' หรือ ไม่ได้ระบุ Filter (ค่า default)
        if (statusFilter === 'active' || !statusFilter) {
            // ให้แสดงเฉพาะโปรเจกต์ที่อนุมัติแล้ว (approved) และ เปิดแสดงผล (is_active = TRUE)
            whereConditions.push("approval_status = 'approved'");
            whereConditions.push("is_active = TRUE");
        }
        // ถ้าในอนาคตมีการส่ง statusFilter ค่าอื่นมา (เช่น 'all', 'pending')
        // โค้ดส่วนนี้จะไม่กรอง ทำให้สามารถแสดงผลทุกสถานะได้ (ถ้าผู้ใช้มีสิทธิ์)
    
        // 4. (ถ้ามี) เพิ่มเงื่อนไขการค้นหา (Search)
        if (searchTerm) {
            const searchPattern = `%${searchTerm}%`;
            whereConditions.push(`(
                author LIKE ? OR
                title LIKE ? OR
                title_eng LIKE ? OR
                abstract LIKE ? OR
                keywords LIKE ? OR
                document_type LIKE ? OR
                department LIKE ? OR
                advisorName LIKE ? OR
                coAdvisorName LIKE ?
            )`);
            // เพิ่มค่าสำหรับ Search เข้าไปใน values
            values.push(searchPattern); // author
            values.push(searchPattern); // title
            values.push(searchPattern); // title_eng
            values.push(searchPattern); // abstract
            values.push(searchPattern); // keywords
            values.push(searchPattern); // document_type
            values.push(searchPattern); // department
            values.push(searchPattern); // advisorName
            values.push(searchPattern); // coAdvisorName
        }
    
        // 5. (ถ้ามี) เพิ่มเงื่อนไข Filter: สาขา (Department)
        if (departmentFilter) {
            whereConditions.push("department = ?");
            values.push(departmentFilter);
        }
    
        // 6. (ถ้ามี) เพิ่มเงื่อนไข Filter: ปี (Year) - ใช้ปี ค.ศ. ที่ส่งมา
        if (yearFilter) {
            whereConditions.push("publish_year = ?");
            values.push(yearFilter); // ใช้ค่าปี ค.ศ. ได้เลย
        }
    
        // 7. (ถ้ามี) เพิ่มเงื่อนไข Filter: ประเภท (Type) - (!!! แก้ไข !!!)
        if (typeFilter) {
            // (แก้ไข) เปลี่ยนจาก = (เท่ากับ) เป็น LIKE (ค้นหาว่ามีคำนั้นอยู่ข้างในหรือไม่)
            // This allows finding "Website" inside "Website, Game"
            whereConditions.push("document_type LIKE ?");
            values.push(`%${typeFilter}%`); // เพิ่ม % (wildcard) รอบๆค่าที่ค้นหา
        }
    
        // 8. ประกอบร่าง SQL
        if (whereConditions.length > 0) {
            sql += ' WHERE ' + whereConditions.join(' AND ');
        }
    
        // 9. เรียงลำดับ
        sql += ' ORDER BY created_at DESC';
    
        // 10. (เพิ่ม) เพิ่มการจำกัดจำนวน (LIMIT) ถ้ามีการส่งค่ามา
        if (limit && !isNaN(parseInt(limit))) {
            sql += ' LIMIT ?';
            values.push(parseInt(limit));
        }
    
        console.log("Executing SQL:", db.format(sql, values)); // Log SQL ที่จะรัน (สำหรับ Debug)
    
        // 11. รัน Query
        db.query(sql, values, (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).json({ message: 'Error fetching documents' });
            }
            res.json(results);
        });
    });
    
    app.get('/api/documents/:id', (req, res) => {
      const documentId = req.params.id;
      const sql = `
        SELECT
          id, title, title_eng, author, department, advisorName,
          abstract, keywords, thai_sh, supportAgency, tools, field,
          publisher, publish_year, scan_date, display_date, document_type,
          mime_type, profile_image, language, publication_year, status,
          created_at, updated_at, file_paths
        FROM documents
        WHERE id = ?;
      `;
      db.query(sql, [documentId], (err, results) => {
        if (err) {
          console.error('Error fetching document by ID from database:', err);
          return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเอกสาร' });
        }
        if (results.length > 0) {
          res.status(200).json(results[0]);
        } else {
          res.status(404).json({ message: 'ไม่พบเอกสาร' });
        }
      });
    });
    
    app.delete('/api/documents/:id', (req, res) => {
      const documentId = req.params.id;
      const sql = 'DELETE FROM documents WHERE id = ?';
      db.query(sql, [documentId], (err, result) => {
        if (err) {
          console.error('Error deleting document from database:', err);
          return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบเอกสาร' });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'ไม่พบเอกสารที่ต้องการลบ' });
        }
        res.status(200).json({ message: 'ลบเอกสารเรียบร้อยแล้ว' });
      });
    });
    
    // --- (แก้ไข) ส่วน Multer Setup ---
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, 'uploads/');
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
      },
    });
    
    // (เพิ่ม) สร้าง Map ของนามสกุลไฟล์ที่อนุญาต
    const allowedExtensions = {
        'complete_pdf': ['.pdf'],
        'complete_doc': ['.docx'], //บังคับ .docx เท่านั้น
        'article_files': ['.pdf'],
        'program_files': ['.zip', '.rar', '.exe'],
        'web_files': ['.zip'],
        'poster_files': ['.psd', '.jpg', '.jpeg'],
        'certificate_files': ['.pdf', '.jpg', '.jpeg', '.png']
    };
    
    //สร้างฟังก์ชัน fileFilter
    const fileFilter = (req, file, cb) => {
        const fieldName = file.fieldname;
        const allowed = allowedExtensions[fieldName];
    
        if (!allowed) {
            // ถ้า fieldname ไม่ตรงกับที่เรากำหนดไว้
            return cb(new Error(`Invalid field name ${fieldName}`), false);
        }
    
        const ext = path.extname(file.originalname).toLowerCase();
    
        if (allowed.includes(ext)) {
            // นามสกุลไฟล์ถูกต้อง
            cb(null, true);
        } else {
            // (สำคัญ) นามสกุลไฟล์ไม่ถูกต้อง
            cb(new Error(`ไม่อนุญาตให้อัปโหลดไฟล์ ${ext} สำหรับช่องนี้ (รองรับเฉพาะ ${allowed.join(', ')})`), false);
        }
    };
    
    // (แก้ไข) เพิ่ม fileFilter เข้าไปใน multer
    const upload = multer({ 
        storage: storage,
        fileFilter: fileFilter 
    });
    
    //สร้างmiddleware สำหรับ upload.fields
    // เพื่อให้เราสามารถดักจับ error ได้
    const uploadMiddleware = upload.fields([
        { name: 'complete_pdf', maxCount: 10 },
        { name: 'complete_doc', maxCount: 10 },
        { name: 'article_files', maxCount: 10 }, 
        { name: 'program_files', maxCount: 1 }, 
        { name: 'web_files', maxCount: 2 },
        { name: 'poster_files', maxCount: 5 },
        { name: 'certificate_files', maxCount: 5 }
    ]);
    
    
    // API Upload Project ---
    app.post('/api/upload-project', (req, res) => {
    
        // (เพิ่ม) เรียกใช้ middleware ด้วยตนเองเพื่อดักจับ Error
        uploadMiddleware(req, res, function (err) {
            
            // --- (เพิ่ม) ส่วนดักจับ Error จาก Multer และ fileFilter ---
            if (err instanceof multer.MulterError) {
                // Error ที่เกิดจาก Multer (เช่น ไฟล์เยอะเกิน)
                console.error('Multer error:', err);
                return res.status(400).json({ message: 'File upload error: ' + err.message });
            } else if (err) {
                // Error ที่เกิดจาก fileFilter (นามสกุลไฟล์ผิด)
                console.error('File filter error:', err);
                // ส่งข้อความ Error ที่เราตั้งไว้ใน fileFilter กลับไป
                return res.status(400).json({ message: err.message }); 
            }
            // --- จบส่วนดักจับ Error ---
    
            // ถ้าไม่มี Error, โค้ดที่เหลือทำงานตามปกติ
            console.log('Received body:', req.body);
            console.log('Received files:', req.files);
            
            const {
                document_type,
                title,
                title_eng,
                author,
                abstract,
                advisorName,
                department,
                coAdvisorName,
                keywords,
                supportAgency
            } = req.body;
    
            try {
                // Build the JSON object for file paths
                const filePathsJson = {
                    complete_pdf: req.files['complete_pdf'] ? req.files['complete_pdf'].map(f => f.filename) : [],
                    complete_doc: req.files['complete_doc'] ? req.files['complete_doc'].map(f => f.filename) : [],
                    article_files: req.files['article_files'] ? req.files['article_files'].map(f => f.filename) : [],
                    program_files: req.files['program_files'] ? req.files['program_files'].map(f => f.filename) : [],
                    web_files: req.files['web_files'] ? req.files['web_files'].map(f => f.filename) : [],
                    poster_files: req.files['poster_files'] ? req.files['poster_files'].map(f => f.filename) : [],
                    certificate_files: req.files['certificate_files'] ? req.files['certificate_files'].map(f => f.filename) : [],
                };
    
                const sql = `
                    INSERT INTO documents (
                        document_type, title, title_eng, author, abstract, keywords,
                        advisorName, department, coAdvisorName, supportAgency,
                        file_paths, 
                        publish_year, scan_date, approval_status, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, YEAR(CURDATE()), CURDATE(), 'pending', FALSE);
                `;
    
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
                    JSON.stringify(filePathsJson)
                ];
    
                db.query(sql, values, (err, result) => {
                    if (err) {
                        console.error('!!! DATABASE ERROR on upload !!!:', err);
                        return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูล', error: err.message });
                    }
                    res.status(201).json({
                        message: 'บันทึกข้อมูลและไฟล์เรียบร้อยแล้ว',
                        projectId: result.insertId
                    });
                });
            } catch (e) {
                console.error('!!! UNEXPECTED SERVER ERROR in /api/upload-project !!!:', e);
                res.status(500).json({ message: 'เกิดข้อผิดพลาดที่ไม่คาดคิดบนเซิร์ฟเวอร์', error: e.message });
            }
        }); // จบฟังก์ชัน uploadMiddleware
    });
    
    app.get('/api/professor/documents/:id', (req, res) => {
      const documentId = req.params.id;
      const sql = "SELECT * FROM documents WHERE id = ?";
      db.query(sql, [documentId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (results.length === 0) return res.status(404).json({ message: 'Document not found' });
        
        // ดึงข้อมูลเอกสารออกมา
        const document = results[0];
        
        // แปลง object file_paths กลับไปเป็น JSON string
        // เพื่อให้ทำงานร่วมกับโค้ด JSON.parse ใน ProfessorDocumentDetails.jsx
        let filePathsObject = {};
        try {
          if (document.file_paths) {
            filePathsObject = JSON.parse(document.file_paths);
          }
        } catch (e) {
          console.error("Could not parse file_paths JSON from DB:", e);
        }
    
        // สร้าง object ใหม่ที่รวมข้อมูลเดิมและ file_paths ที่แปลงแล้ว
        const documentWithJsonFiles = { 
          ...document, 
          file_paths: JSON.stringify(filePathsObject) 
        };
        
        res.json(documentWithJsonFiles);
      });
    });
    
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
    app.put('/api/documents/:id/approval', (req, res) => {
      const { id } = req.params;
      const { approvalStatus } = req.body; // 'approved' or 'rejected'
    
      if (!['approved', 'rejected'].includes(approvalStatus)) {
        return res.status(400).json({ message: 'Invalid approval status.' });
      }
    
      let sql;
      let values;
      let successMessage;
    
      if (approvalStatus === 'approved') {
        // --- โค้ดส่วน 'approved' ---
        sql = `UPDATE documents 
               SET approval_status = ?, is_active = TRUE, display_date = NOW() 
               WHERE id = ?`;
               // เราอนุญาตให้อนุมัติซ้ำได้ (เผื่อมาจาก 'rejected')
        values = [approvalStatus, id];
        successMessage = 'อนุมัติโครงงานเรียบร้อยแล้ว';
      
      } else { 
        // --- !!! นี่คือส่วนที่แก้ไข !!! ---
        // เปลี่ยนจาก DELETE เป็น UPDATE
        sql = `UPDATE documents 
               SET approval_status = ?, is_active = FALSE 
               WHERE id = ?`;
        values = [approvalStatus, id]; // approvalStatus คือ 'rejected'
        successMessage = 'ปฏิเสธโครงงานเรียบร้อยแล้ว (ส่งกลับไปให้ผู้ใชแก้ไข)';
        // --- จบส่วนที่แก้ไข ---
      }
    
      db.query(sql, values, (err, result) => {
        if (err) {
          console.error('Database error on approval/rejection:', err);
          return res.status(500).json({ message: 'Database error' });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'ไม่พบเอกสารหรือเอกสารถูกจัดการไปแล้ว' });
        }
        res.json({ message: successMessage });
      });
    });
    
    app.put('/api/documents/:id/toggle-active', (req, res) => {
      const { id } = req.params;
      const { isActive } = req.body;
    
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'isActive must be a boolean.' });
      }
    
      const sql = `UPDATE documents SET is_active = ? WHERE id = ? AND approval_status = 'approved'`;
      const values = [isActive, id];
    
      db.query(sql, values, (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Document not found or not approved.' });
        res.json({ message: 'Active status toggled successfully.' });
      });
    });
    
    app.get('/api/admin/documents', (req, res) => {
      const sql = `SELECT id, title, publish_year, approval_status, is_active FROM documents ORDER BY created_at DESC`;
      db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
      });
    });
    
    app.get('/api/advisors/search', (req, res) => {
        const searchTerm = req.query.query || '';
        if (searchTerm.length < 3) {
            return res.json([]); // คืนค่าว่างถ้าคำค้นหาสั้นเกินไป
        }
    
        const searchPattern = `%${searchTerm}%`;
        const sql = `
            SELECT id, first_name, last_name 
            FROM users 
            WHERE role IN ('advisor', 'admin') 
              AND (first_name LIKE ? OR last_name LIKE ?)
            LIMIT 10;
        `;
        const values = [searchPattern, searchPattern];
    
        db.query(sql, values, (err, results) => {
            if (err) {
                console.error('Error fetching advisor suggestions:', err);
                return res.status(500).json({ message: 'Database query failed' });
            }
            res.json(results);
        });
    });
    
    app.get('/api/project-details/:id', (req, res) => {
      const projectId = req.params.id;
      const sql = `
        SELECT 
          id, title, title_eng, author, abstract, keywords,
          advisorName, department, coAdvisorName, supportAgency, document_type,
          file_paths 
        FROM documents 
        WHERE id = ?
      `;
      
      db.query(sql, [projectId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (results.length === 0) return res.status(404).json({ message: 'Project not found' });
        res.json(results[0]);
      });
    });
    
    
    // (แก้ไข) แก้ไข PUT Route ให้ใช้ Middleware ที่ดักจับ Error ได้
    app.put('/api/projects/:id', (req, res) => {
      
        // (เพิ่ม) เรียกใช้ middleware ด้วยตนเองเพื่อดักจับ Error
        uploadMiddleware(req, res, function (err) {
            
            // --- (เพิ่ม) ส่วนดักจับ Error จาก Multer และ fileFilter ---
            if (err instanceof multer.MulterError) {
                console.error('Multer error on update:', err);
                return res.status(400).json({ message: 'File upload error: ' + err.message });
            } else if (err) {
                console.error('File filter error on update:', err);
                return res.status(400).json({ message: err.message }); 
            }
            // --- จบส่วนดักจับ Error ---
    
            // ถ้าไม่มี Error, โค้ดที่เหลือทำงานตามปกติ
            const projectId = req.params.id;
            const { 
              title, title_eng, abstract, keywords, advisorName, 
              department, coAdvisorName, supportAgency, document_type 
            } = req.body; 
    
            const getSql = "SELECT file_paths, approval_status FROM documents WHERE id = ?";
            
            db.query(getSql, [projectId], (err, results) => {
              if (err) return res.status(500).json({ message: 'Database error fetching project' });
              if (results.length === 0) return res.status(404).json({ message: 'Project not found' }); 
    
              let existingFilePaths = {};
              try {
                existingFilePaths = JSON.parse(results[0].file_paths || '{}');
              } catch (e) {
                existingFilePaths = {};
              }
    
              const currentStatus = results[0].approval_status;
              const newStatus = (currentStatus === 'rejected') ? 'pending' : currentStatus;
    
              const hasNewFiles = req.files && Object.keys(req.files).length > 0;
              if (hasNewFiles) {
                  for (const fieldName in req.files) {
                      existingFilePaths[fieldName] = req.files[fieldName].map(f => f.filename);
                  }
              }
    
              let updateSql = `
                UPDATE documents SET 
                  title = ?, title_eng = ?, abstract = ?, keywords = ?, advisorName = ?, 
                  department = ?, coAdvisorName = ?, supportAgency = ?, document_type = ?,
                  file_paths = ?, 
                  approval_status = ?, 
                  updated_at = NOW() 
                WHERE id = ?
              `;
              let values = [
                title, title_eng, abstract, keywords, advisorName, 
                department, coAdvisorName, supportAgency, document_type,
                JSON.stringify(existingFilePaths), 
                newStatus, 
                projectId
              ];
    
              db.query(updateSql, values, (updateErr, result) => {
                if (updateErr) {
                  console.error("Error updating project:", updateErr);
                  return res.status(500).json({ message: 'Failed to update project' });
                }
                
                let message = 'Project updated successfully!';
                if (newStatus === 'pending') {
                    message = 'Project updated and resubmitted for approval successfully!';
                }
                
                res.json({ message: message });
              });
            });
        }); // จบฟังก์ชัน uploadMiddleware
    });
    
    app.get('/api/student/documents/:id', (req, res) => {
      const documentId = req.params.id;
      const studentUserId = req.query.userId; // ID ของนักศึกษาที่ login
    
      if (!studentUserId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
    
      // 1. ดึงข้อมูลเอกสาร
      const documentSql = "SELECT * FROM documents WHERE id = ?";
      db.query(documentSql, [documentId], (err, docResults) => {
        if (err) return res.status(500).json({ message: 'Database error fetching document' });
        if (docResults.length === 0) return res.status(404).json({ message: 'Document not found' });
    
        const document = docResults[0];
        
        // 2. ดึงข้อมูลผู้ใช้ที่ล็อกอิน (เพื่อเช็ค Role และ ชื่อ)
        // (แก้ไข) เพิ่ม `role` เข้ามาใน SQL
        const userSql = "SELECT first_name, last_name, role FROM users WHERE id = ?";
    
        db.query(userSql, [studentUserId], (userErr, userResults) => {
          if (userErr) return res.status(500).json({ message: 'Database error fetching user' });
          if (userResults.length === 0) return res.status(404).json({ message: 'User not found' });
    
          const user = userResults[0];
          const userFullName = `${user.first_name} ${user.last_name}`;
    
          // 3. ตรวจสอบสิทธิ์
          //เพิ่มการตรวจสอบ role
          const isRoleAdminOrProfessor = user.role === 'admin' || user.role === 'professor'; // (สันนิษฐานว่า role คือ 'professor')
    
          //เพิ่มการตรวจสอบการมีส่วนร่วม
          const isAuthor = document.author === userFullName;
          const isAdvisor = document.advisorName === userFullName;
          const isCoAdvisor = document.coAdvisorName === userFullName;
          const isInvolved = isAuthor || isAdvisor || isCoAdvisor;
          
          //ถ้าเป็น Admin/Professor หรือ มีส่วนเกี่ยวข้อง = ดูได้ทั้งหมด
          const canSeeAllFiles = isRoleAdminOrProfessor || isInvolved;
    
          let allFiles = {};
          try {
            allFiles = JSON.parse(document.file_paths || '{}');
          } catch (e) {
            console.error("Could not parse file_paths JSON:", e);
          }
    
          if (canSeeAllFiles) {
            // 4. ถ้ามีสิทธิ์: ส่งข้อมูลไฟล์ทั้งหมดกลับไป
            return res.json({ ...document, file_paths: JSON.stringify(allFiles) });
          } else {
            // 5. ถ้าไม่มีสิทธิ์ (เป็น student ที่ไม่ได้เกี่ยวข้อง): กรองข้อมูลไฟล์
            // (แก้ไข) ส่งกลับไปเฉพาะ PDF ตามที่ผู้ใช้ร้องขอ
            const filteredFiles = {
              complete_pdf: allFiles.complete_pdf || []
            };
            
            // 6. ส่งข้อมูลโปรเจกต์กลับไปพร้อมกับ file_paths ที่ถูกกรองแล้ว
            return res.json({ ...document, file_paths: JSON.stringify(filteredFiles) });
          }
        });
      });
    });
    
    
    // Start Server
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
    
