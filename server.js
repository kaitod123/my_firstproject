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
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !S3_BUCKET || !AWS_REGION) {
    console.error("FATAL ERROR: S3 Environment variables (Keys, Bucket, Region) are not fully configured.");
    // ใน Production, คุณอาจจะต้องการให้ Process จบการทำงาน
    // process.exit(1); 
} else {
    console.log("S3 Config: Bucket and Region found.");
    // ไม่ควร log key ออกมาใน production
}

// **********************************************
// INIT S3 Client (V3)
// **********************************************
// ใช้ AWS_REGION ที่เรากำหนด
const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});
console.log(`S3 Client initialized for region: ${AWS_REGION}`);


// **********************************************
// INIT PostgreSQL Pool
// **********************************************
// ใช้ PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT จาก .env
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // DATABASE_URL คือตัวแปรมาตรฐานที่ Render/Heroku ใช้
    ssl: {
        rejectUnauthorized: false // จำเป็นสำหรับ Render/Heroku (ถ้าเชื่อมต่อภายนอก)
    }
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client for initial connection', err.stack);
    }
    client.query('SELECT NOW()', (err, result) => {
        release();
        if (err) {
            return console.error('Error executing initial query', err.stack);
        }
        console.log('PostgreSQL Database connected successfully:', result.rows[0].now);
    });
});


// **********************************************
// Middleware
// **********************************************
// ตั้งค่า CORS ให้ยืดหยุ่น (อนุญาต Domain ของ Frontend ใน .env)
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000', // URL ของ React App
    'http://localhost:5173' // เพิ่ม Vite default port
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Middleware สำหรับ Parse JSON (สำหรับ req.body ที่ไม่ใช่ Form/File)
app.use(bodyParser.json());
// Middleware สำหรับ Parse Form Data (แบบ x-www-form-urlencoded)
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (ถ้ามี Build React ในนี้)
app.use(express.static(path.join(__dirname, 'build')));


// **********************************************
// Multer-S3 UPLOAD Config
// **********************************************

// ฟังก์ชันสร้าง Key (ชื่อไฟล์) ใน S3
const generateS3Key = (fileField, file) => {
    // projects/[field]/[timestamp]-[original_filename]
    // projects/complete_pdf/1712345678-my_resume.pdf
    const timestamp = Date.now();
    const originalname = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_'); // Sanitize
    return `projects/${fileField}/${timestamp}-${originalname}`;
};

const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: S3_BUCKET,
        contentType: multerS3.AUTO_CONTENT_TYPE, // ตรวจจับ Mime Type อัตโนมัติ
        key: function (req, file, cb) {
            // file.fieldname คือ key ที่เราตั้งใน React (เช่น 'complete_pdf', 'web_files')
            const fileKey = generateS3Key(file.fieldname, file);
            cb(null, fileKey);
        }
    }),
    limits: {
        fileSize: 1024 * 1024 * 50 // จำกัดขนาดไฟล์ 50MB (ปรับตามต้องการ)
    },
    fileFilter: (req, file, cb) => {
        // (Optional) ถ้าต้องการจำกัดประเภทไฟล์ที่นี่
        // if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        //     cb(null, true);
        // } else {
        //     cb(new Error('Invalid file type.'), false);
        // }
        cb(null, true); // อนุญาตทุกไฟล์ (ตาม Logic ปัจจุบัน)
    }
});


// **********************************************
// API Endpoints
// **********************************************

// ----------------------------------------------
// API: ค้นหา (สำหรับ Autocomplete)
// ----------------------------------------------

// Endpoint: ค้นหาอาจารย์ที่ปรึกษา (Advisors)
app.get('/api/search-advisors', async (req, res) => {
    const query = req.query.q || '';
    try {
        const sql = `
            SELECT id, first_name, last_name, role 
            FROM users 
            WHERE 
                role = 'advisor' 
                AND (
                    first_name ILIKE $1 OR 
                    last_name ILIKE $1 OR
                    (first_name || ' ' || last_name) ILIKE $1
                )
            LIMIT 10;
        `;
        const { rows } = await pool.query(sql, [`%${query}%`]);
        res.json(rows);
    } catch (err) {
        handleError(res, err, 'Search Advisors');
    }
});

// Endpoint: ค้นหาผู้แต่ง (Authors)
app.get('/api/search-authors', async (req, res) => {
    const query = req.query.q || '';
    try {
        // ค้นหาจาก Users ที่เป็น 'student'
        const sql = `
            SELECT id, first_name, last_name, role 
            FROM users 
            WHERE 
                role = 'student' 
                AND (
                    first_name ILIKE $1 OR 
                    last_name ILIKE $1 OR
                    (first_name || ' ' || last_name) ILIKE $1
                )
            LIMIT 10;
        `;
        const { rows } = await pool.query(sql, [`%${query}%`]);
        res.json(rows);
    } catch (err) {
        handleError(res, err, 'Search Authors');
    }
});


// ----------------------------------------------
// API: ค้นหาเอกสาร (สำหรับ Student/Public)
// ----------------------------------------------
app.get('/api/search', async (req, res) => {
    // ... (Endpoint นี้ยาวมาก และไม่เกี่ยวข้องกับปัญหาหลัก) ...
    // ... (สมมติว่า Endpoint นี้ทำงานถูกต้อง) ...
    // ... (ขอย่อไว้เพื่อความกระชับ) ...
    
    // (จำลองการทำงานของ Endpoint Search)
     try {
        const { 
            query = '', 
            year, 
            docType, 
            department, 
            page = 1, 
            limit = 10 
        } = req.query;

        const offset = (page - 1) * limit;
        let whereClauses = ["d.approval_status = 'approved'", "d.is_active = true"];
        let params = [];
        let paramIndex = 1;

        if (query) {
            whereClauses.push(`(d.title ILIKE $${paramIndex} OR d.keywords ILIKE $${paramIndex} OR d.author ILIKE $${paramIndex})`);
            params.push(`%${query}%`);
            paramIndex++;
        }
        if (year) {
            whereClauses.push(`d.publish_year = $${paramIndex}`);
            params.push(year);
            paramIndex++;
        }
        if (docType) {
            // สมมติว่า docType ใน DB เป็น Array ที่เก็บใน Text (เช่น 'IOT,AI')
            whereClauses.push(`d.document_type ILIKE $${paramIndex}`);
            params.push(`%${docType}%`);
            paramIndex++;
        }
        if (department) {
            whereClauses.push(`d.department = $${paramIndex}`);
            params.push(department);
            paramIndex++;
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Query สำหรับนับจำนวนทั้งหมด
        const countSql = `SELECT COUNT(DISTINCT d.id) FROM documents d ${whereSql}`;
        const countResult = await pool.query(countSql, params);
        const totalDocuments = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalDocuments / limit);

        // Query สำหรับดึงข้อมูลเอกสาร (ใช้ DISTINCT)
        const dataSql = `
            SELECT DISTINCT
                d.id, d.title, d.author, d.publish_year, 
                d.abstract, d.document_type, d.department, d.file_paths
            FROM documents d
            ${whereSql}
            ORDER BY d.publish_year DESC, d.title
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
        `;
        
        params.push(limit, offset);
        
        const { rows } = await pool.query(dataSql, params);
        
        // (FIX) ตรวจสอบ file_paths
        const documents = rows.map(doc => {
            let frontFaceUrl = null;
            if (doc.file_paths && typeof doc.file_paths === 'object' && doc.file_paths.front_face && doc.file_paths.front_face.length > 0) {
                 // ถ้า file_paths เป็น JSONB/JSON และถูก parse อัตโนมัติ
                frontFaceUrl = doc.file_paths.front_face[0];
            } else if (typeof doc.file_paths === 'string' && doc.file_paths.trim().startsWith('{')) {
                // ถ้า file_paths เป็น JSON String
                try {
                    const parsedPaths = JSON.parse(doc.file_paths);
                    if (parsedPaths.front_face && parsedPaths.front_face.length > 0) {
                        frontFaceUrl = parsedPaths.front_face[0];
                    }
                } catch(e) { 
                    console.error(`Error parsing file_paths in search: ${e.message}`);
                    frontFaceUrl = null; // ถ้า JSON พัง
                }
            }
            
            return {
                ...doc,
                // ส่งแค่ URL รูปหน้าปก (ถ้ามี)
                front_face_url: frontFaceUrl 
            };
        });

        res.json({
            documents,
            currentPage: parseInt(page, 10),
            totalPages,
            totalDocuments
        });

    } catch (err) {
        handleError(res, err, 'Search Documents');
    }
});


// ----------------------------------------------
// API: UPLOAD โครงงาน (CREATE)
// ----------------------------------------------
app.post('/api/upload-project', 
    upload.fields([
        // กำหนด field ที่จะรับ (ต้องตรงกับ FormData ใน React)
        { name: 'complete_pdf', maxCount: 10 },
        { name: 'complete_doc', maxCount: 10 },
        { name: 'article_files', maxCount: 10 },
        { name: 'program_files', maxCount: 10 },
        { name: 'web_files', maxCount: 10 },
        { name: 'poster_files', maxCount: 10 },
        { name: 'certificate_files', maxCount: 10 },
        { name: 'front_face', maxCount: 1 } // รูปหน้าปก
    ]), 
    async (req, res) => {
        
    console.log("Received /api/upload-project request...");
    
    // 1. ดึงข้อมูล Text จาก req.body
    // (ข้อมูลจาก Form ที่ไม่ใช่ไฟล์ จะถูกส่งมาใน req.body)
    const {
        document_type, title, title_eng, author, co_author, abstract,
        advisorName, department, coAdvisorName, keywords, supportAgency,
        publish_year, scan_date, display_date, language
    } = req.body;

    // 2. ดึงข้อมูล User ID (สมมติว่าส่งมาใน Header หรือ Token)
    // *** (สำคัญ) ใน Production ต้องใช้ Token ที่ยืนยันแล้ว
    // *** (ชั่วคราว) สมมติว่า Client ส่ง userId มาใน body
    const userId = req.body.userId || null; // (ต้องแก้เป็นการดึงจาก Token จริง)

    if (!userId) {
        return res.status(401).json({ message: "Unauthorized: User ID is missing."});
    }

    // 3. จัดการไฟล์ที่อัปโหลด (req.files)
    // req.files จะเป็น Object ที่มี Key เป็น Fieldname
    // เช่น req.files['complete_pdf'] = [...] (Array of file objects)
    
    const filePathsJson = {};
    const fileKeys = [
        'complete_pdf', 'complete_doc', 'article_files', 'program_files', 
        'web_files', 'poster_files', 'certificate_files', 'front_face'
    ];

    if (req.files) {
        fileKeys.forEach(key => {
            if (req.files[key] && req.files[key].length > 0) {
                // เก็บ S3 Key (ไม่ใช่ URL เต็ม)
                filePathsJson[key] = req.files[key].map(file => file.key); 
            } else {
                filePathsJson[key] = []; // เก็บเป็น Array ว่าง
            }
        });
    } else {
        // ถ้าไม่มีการอัปโหลดไฟล์เลย (ซึ่งไม่น่าเกิด)
        fileKeys.forEach(key => { filePathsJson[key] = []; });
    }

    // 4. บันทึกลงฐานข้อมูล (PostgreSQL)
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // เริ่ม Transaction

        // 4.1. INSERT ลง documents
        const sql = `
            INSERT INTO documents (
                document_type, title, title_eng, author, co_author, abstract, 
                advisorName, department, coAdvisorName, keywords, supportAgency, 
                file_paths, publish_year, scan_date, display_date, language, 
                approval_status, is_active, status
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING id;
        `;
        
        const values = [
            document_type, title, title_eng, author, co_author, abstract, 
            advisorName, department, coAdvisorName, keywords, supportAgency, 
            
            // (!!!) FIX 1: ใช้ JSON.stringify()
            // บังคับให้ object 'filePathsJson' ถูกแปลงเป็น JSON String ก่อนบันทึกลง DB
            // แม้ว่าคอลัมน์จะเป็น JSONB/JSON, การส่ง JSON String คือวิธีที่ปลอดภัยที่สุด
            JSON.stringify(filePathsJson), 
            
            publish_year || null, // (ป้องกันค่าว่าง)
            scan_date || null,
            display_date || null,
            language || 'ไทย',
            'pending', // (สถานะเริ่มต้น)
            false,     // (ยังไม่ active จนกว่าจะ Approve)
            'active'   // (status เก่า? อาจจะซ้ำซ้อนกับ is_active)
        ];

        const docResult = await client.query(sql, values);
        const newDocumentId = docResult.rows[0].id;

        // 4.2. (Optional) ถ้ามีตารางเชื่อมโยง User กับ Document
        // (สมมติว่า 'author' อาจจะไม่ใช่ ID แต่เป็นแค่ชื่อ)
        // ถ้า 'author' ควรเป็น User ID ที่อัปโหลด:
        // const linkSql = `INSERT INTO user_documents (user_id, document_id) VALUES ($1, $2)`;
        // await client.query(linkSql, [userId, newDocumentId]);

        await client.query('COMMIT'); // ยืนยัน Transaction
        
        console.log(`Document ${newDocumentId} created successfully.`);
        res.status(201).json({ 
            message: 'Project uploaded successfully!', 
            documentId: newDocumentId,
            filesUploaded: filePathsJson
        });

    } catch (err) {
        await client.query('ROLLBACK'); // ยกเลิก Transaction ถ้า Error
        handleError(res, err, 'Upload Project');
    } finally {
        client.release(); // คืน Client กลับ Pool
    }
});


// ----------------------------------------------
// API: UPDATE โครงงาน (EDIT)
// ----------------------------------------------
app.put('/api/projects/:id', 
    upload.fields([
        // (เหมือนกับตอน Create)
        { name: 'complete_pdf', maxCount: 10 },
        { name: 'complete_doc', maxCount: 10 },
        { name: 'article_files', maxCount: 10 },
        { name: 'program_files', maxCount: 10 },
        { name: 'web_files', maxCount: 10 },
        { name: 'poster_files', maxCount: 10 },
        { name: 'certificate_files', maxCount: 10 },
        { name: 'front_face', maxCount: 1 }
    ]),
    async (req, res) => {
    
    const { id } = req.params;
    
    // 1. ดึงข้อมูล Text (เหมือนตอน Create)
    const {
        document_type, title, title_eng, author, co_author, abstract,
        advisorName, department, coAdvisorName, keywords, supportAgency,
        publish_year, scan_date, display_date, language,
        // (สำคัญ) Client ต้องส่งไฟล์ที่ถูกลบมา
        removedFiles, // (คาดหวังว่าจะเป็น JSON String ของ Array: '["key1.pdf", "key2.jpg"]')
        existingFiles // (คาดหวังว่าจะเป็น JSON String ของ Object)
    } = req.body;
        
    // (ต้องตรวจสอบสิทธิ์ User ว่าเป็นเจ้าของเอกสารนี้หรือไม่)
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. ดึงข้อมูล file_paths เก่า
        let existingFilePaths = {};
        if (existingFiles) {
             try {
                existingFilePaths = JSON.parse(existingFiles);
             } catch(e) { console.error("Error parsing existingFiles JSON"); }
        } else {
            // (Fallback) ถ้า Client ไม่ได้ส่งมา ให้ดึงจาก DB (แต่ควรส่งมา)
            const oldDoc = await client.query("SELECT file_paths FROM documents WHERE id = $1", [id]);
            if (oldDoc.rows.length > 0) {
                 if (typeof oldDoc.rows[0].file_paths === 'object') {
                    existingFilePaths = oldDoc.rows[0].file_paths;
                 } else if (typeof oldDoc.rows[0].file_paths === 'string') {
                    existingFilePaths = JSON.parse(oldDoc.rows[0].file_paths);
                 }
            }
        }
        
        // 2. ลบไฟล์ (S3) ที่ Client สั่งลบ
        let removedKeys = [];
        if (removedFiles) {
            try {
                removedKeys = JSON.parse(removedFiles);
                // (ต้องมี Logic ลบไฟล์ออกจาก S3 ที่นี่... ขอย่อไว้)
                console.log("Need to delete keys:", removedKeys);
                
                // (ลบออกจาก existingFilePaths ด้วย)
                for (const key in existingFilePaths) {
                    existingFilePaths[key] = existingFilePaths[key].filter(fileKey => !removedKeys.includes(fileKey));
                }

            } catch(e) { console.error("Error parsing removedFiles JSON"); }
        }

        // 3. จัดการไฟล์ใหม่ (ที่อัปโหลดมา)
        const newFilePaths = {};
        const fileKeys = [
            'complete_pdf', 'complete_doc', 'article_files', 'program_files', 
            'web_files', 'poster_files', 'certificate_files', 'front_face'
        ];

        if (req.files) {
            fileKeys.forEach(key => {
                if (req.files[key] && req.files[key].length > 0) {
                    newFilePaths[key] = req.files[key].map(file => file.key);
                }
            });
        }
        
        // 4. รวมไฟล์เก่า (ที่เหลือ) กับไฟล์ใหม่
        const updatedFilePaths = { ...existingFilePaths };
        for (const key in newFilePaths) {
            if (!updatedFilePaths[key]) {
                 updatedFilePaths[key] = [];
            }
            // (Handle รูปหน้าปก - ให้แทนที่ ไม่ใช่เพิ่ม)
            if (key === 'front_face' && newFilePaths[key].length > 0) {
                 updatedFilePaths[key] = newFilePaths[key]; // แทนที่
            } else {
                 updatedFilePaths[key] = [...updatedFilePaths[key], ...newFilePaths[key]]; // เพิ่มต่อ
            }
        }

        // 5. อัปเดตฐานข้อมูล
        const updateSql = `
            UPDATE documents SET
                document_type = $1, title = $2, title_eng = $3, author = $4, co_author = $5,
                abstract = $6, advisorName = $7, department = $8, coAdvisorName = $9,
                keywords = $10, supportAgency = $11, 
                
                file_paths = $12, // (!!!) FIX 2: ใช้ JSON.stringify()
                
                publish_year = $13, scan_date = $14, display_date = $15, language = $16,
                updated_at = NOW(),
                approval_status = 'pending', // (กลับไปรออนุมัติใหม่เมื่อแก้ไข)
                is_active = false
            WHERE id = $17
            RETURNING *;
        `;
        
        const updateValues = [
            document_type, title, title_eng, author, co_author, abstract,
            advisorName, department, coAdvisorName, keywords, supportAgency,
            
            // (!!!) FIX 2: ใช้ JSON.stringify()
            JSON.stringify(updatedFilePaths), 
            
            publish_year || null,
            scan_date || null,
            display_date || null,
            language || 'ไทย',
            id
        ];
        
        const { rows } = await pool.query(updateSql, updateValues);
        
        if (rows.length === 0) {
            throw new Error("Document not found or update failed.");
        }

        await client.query('COMMIT');
        
        console.log(`Document ${id} updated successfully.`);
        res.status(200).json({
            message: 'Project updated successfully!',
            document: rows[0]
        });

    } catch (err) {
        await client.query('ROLLBACK');
        handleError(res, err, 'Update Project');
    } finally {
        client.release();
    }
});


// ----------------------------------------------
// API: ดึงข้อมูล (สำหรับหน้า Edit)
// ----------------------------------------------
app.get('/api/projects/:id', async (req, res) => {
    const { id } = req.params;
    // (ต้องตรวจสอบสิทธิ์ User ว่าเป็นเจ้าของเอกสารนี้หรือไม่)
    
    try {
        const sql = "SELECT * FROM documents WHERE id = $1";
        const { rows } = await pool.query(sql, [id]);

        if (rows.length > 0) {
            const document = rows[0];
            
            // (FIX) ตรวจสอบและ Parse file_paths
             if (typeof document.file_paths === 'string') {
                try {
                    document.file_paths = JSON.parse(document.file_paths);
                } catch (e) {
                    console.error(`Invalid JSON in file_paths for doc ${id}`);
                    document.file_paths = {}; // ถ้า JSON พัง ให้ส่ง Object ว่าง
                }
            } else if (document.file_paths === null) {
                document.file_paths = {}; // ถ้าเป็น NULL
            }
            
            res.json(document);
        } else {
            res.status(404).json({ message: "Document not found" });
        }
    } catch (err) {
        handleError(res, err, 'Get Project Details');
    }
});


// ----------------------------------------------
// API: Download ไฟล์ (ต้องใช้ S3 V3)
// ----------------------------------------------
app.get('/api/download/:key(*)', async (req, res) => {
    const s3Key = req.params.key;
    if (!s3Key) {
        return res.status(400).send("Missing file key.");
    }
    
    console.log(`Attempting download for S3 Key: ${s3Key}`);

    try {
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key,
            // (Optional) บังคับให้ Browser ดาวน์โหลดแทนที่จะเปิด
            // ResponseContentDisposition: 'attachment' 
        });

        // สร้าง Signed URL ที่มีอายุสั้นๆ (เช่น 5 นาที)
        // Client จะ Redirect ไปที่ URL นี้
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); 
        
        // ส่ง URL กลับไปให้ Client Redirect
        res.redirect(signedUrl);

    } catch (err) {
         // (Error Handling สำหรับ Download)
        if (err.name === 'NoSuchKey') {
            console.warn(`Download Error: S3 Key not found: ${s3Key}`);
            return res.status(404).send('File not found in S3.');
        } else if (err.name === 'AccessDenied') {
             console.error(`Download Error: S3 Access Denied for key: ${s3Key}. Check S3 permissions.`);
             return res.status(503).send('S3 Access Denied.');
        }
        
        console.error("S3 GetObjectCommand Error:", err);
        handleError(res, err, 'Download File');
    }
});


// ----------------------------------------------
// API: AUTH (Login/Register) - (แบบง่าย)
// ----------------------------------------------
// (หมายเหตุ: ไม่มีการใช้ bcrypt/Token ในตัวอย่างนี้ ซึ่งไม่ปลอดภัยสำหรับ Production)

// Endpoint: Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // (!!!) (ไม่ปลอดภัย) ตรวจสอบ Password แบบ Plaintext (ควรใช้ bcrypt)
        const sql = `
            SELECT id, username, email, first_name, last_name, role, is_active 
            FROM users 
            WHERE email = $1 AND password = $2; 
        `;
        const { rows } = await pool.query(sql, [email, password]);

        if (rows.length > 0) {
            const user = rows[0];
            if (!user.is_active) {
                return res.status(403).json({ message: 'User account is inactive.' });
            }
            // (ส่ง Token กลับไปแทนข้อมูล User จริง)
            res.json({
                message: 'Login successful',
                user: user 
                // token: jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' })
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password.' });
        }
    } catch (err) {
        handleError(res, err, 'Login');
    }
});

// Endpoint: Register (สมมติว่ามี)
app.post('/api/register', async (req, res) => {
     const { username, email, password, first_name, last_name, identification } = req.body;
     
     // (ควร Validate ข้อมูล)
     if (!username || !email || !password || !first_name || !last_name || !identification) {
         return res.status(400).json({ message: "All fields are required."});
     }
     
     // (ควร Hash Password)
     
     const sql = `
        INSERT INTO users (username, email, password, first_name, last_name, identification, role, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, username, email, first_name, last_name, role;
     `;
     const values = [
         username, email, password, first_name, last_name, identification, 
         'student', // (Default role)
         true       // (Default active)
     ];
     
     try {
        const { rows } = await pool.query(sql, values);
        res.status(201).json({
            message: "User registered successfully.",
            user: rows[0]
        });
     } catch(err) {
         // (Error code 23505 = Unique Violation)
         if (err.code === '23505') {
             if (err.constraint === 'users_email_key') {
                 return res.status(409).json({ message: "Error: Email already exists."});
             }
             if (err.constraint === 'users_username_key') {
                 return res.status(409).json({ message: "Error: Username already exists."});
             }
         }
         handleError(res, err, 'Register');
     }
});

// Endpoint: Get User Profile (สำหรับหน้า Edit Profile)
app.get('/api/users/profile/:id', async (req, res) => {
    const { id } = req.params;
    // (ต้องตรวจสอบ Token ว่าตรงกับ ID ที่ขอหรือไม่)
    
    try {
        const sql = `
            SELECT id, username, email, first_name, last_name, identification, role 
            FROM users 
            WHERE id = $1;
        `;
        const { rows } = await pool.query(sql, [id]);
        
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (err) {
        handleError(res, err, 'Get User Profile');
    }
});

// Endpoint: Update User Profile
app.put('/api/users/profile/:id', async (req, res) => {
    const { id } = req.params;
    const { username, email, first_name, last_name, identification, currentPassword, newPassword } = req.body;
    // (ต้องตรวจสอบ Token ว่าตรงกับ ID ที่ขอหรือไม่)

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // (ส่วนที่ 1: อัปเดตข้อมูลทั่วไป)
        const updateProfileSql = `
            UPDATE users SET
                username = $1,
                email = $2,
                first_name = $3,
                last_name = $4,
                identification = $5,
                updated_at = NOW()
            WHERE id = $6
            RETURNING id, username, email, first_name, last_name, role;
        `;
        const profileValues = [username, email, first_name, last_name, identification, id];
        const { rows } = await client.query(updateProfileSql, profileValues);
        
        if (rows.length === 0) {
            throw new Error("User not found or profile update failed.");
        }
        
        const updatedUser = rows[0];

        // (ส่วนที่ 2: อัปเดต Password ถ้ามีการส่งมา)
        if (currentPassword && newPassword) {
            // 2.1 ตรวจสอบรหัสผ่านเดิม (ไม่ปลอดภัย ควรใช้ bcrypt.compare)
            const passCheck = await client.query("SELECT id FROM users WHERE id = $1 AND password = $2", [id, currentPassword]);
            if (passCheck.rows.length === 0) {
                 await client.query('ROLLBACK'); // (สำคัญ)
                 client.release();
                 return res.status(401).json({ message: "Current password incorrect."});
            }
            
            // 2.2 อัปเดตรหัสผ่านใหม่ (ไม่ปลอดภัย ควร Hash newPassword)
            await client.query("UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2", [newPassword, id]);
            console.log(`Password updated for user ${id}`);
        }
        
        await client.query('COMMIT');
        res.json({
            message: "Profile updated successfully.",
            user: updatedUser
        });

    } catch (err) {
        await client.query('ROLLBACK');
        handleError(res, err, 'Update User Profile');
    } finally {
        client.release();
    }
});


// ----------------------------------------------
// API: หน้า STUDENT (My Documents)
// ----------------------------------------------
app.get('/api/student/documents', async (req, res) => {
    const userId = req.query.userId; // (ควรดึงจาก Token)
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized: User ID is missing."});
    }

    try {
        // (สมมติว่า 'author' ใน 'documents' เก็บ ID ของ User ที่เป็น Student)
        // (ถ้า 'author' เก็บชื่อ, ต้อง Join กับ 'users' หรือใช้ตารางเชื่อม)
        
        // (แก้สมมติฐาน: สมมติว่า 'author' เก็บชื่อ และเราต้องหาจากชื่อ)
        // (ดึงชื่อ User จาก ID ก่อน)
        const userSql = "SELECT first_name, last_name FROM users WHERE id = $1";
        const userRes = await pool.query(userSql, [userId]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: "User not found."});
        }
        const authorName = `${userRes.rows[0].first_name} ${userRes.rows[0].last_name}`;

        // (ค้นหาเอกสารจากชื่อที่ตรงกัน)
        const docsSql = `
            SELECT id, title, publish_year, document_type, approval_status, is_active 
            FROM documents 
            WHERE author = $1
            ORDER BY created_at DESC;
        `;
        const { rows } = await pool.query(docsSql, [authorName]);
        
        res.json(rows);
        
    } catch (err) {
        handleError(res, err, 'Get Student Documents');
    }
});


// ----------------------------------------------
// API: หน้า STUDENT (Document Details)
// ----------------------------------------------
app.get('/api/student/documents/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.query.userId; // (ควรดึงจาก Token)

    if (!userId) {
        return res.status(401).json({ message: "Unauthorized: User ID is missing."});
    }
    
    try {
        // (ดึงชื่อ User เพื่อตรวจสอบความเป็นเจ้าของ)
        const userSql = "SELECT first_name, last_name FROM users WHERE id = $1";
        const userRes = await pool.query(userSql, [userId]);
        if (userRes.rows.length === 0) {
             return res.status(404).json({ message: "User not found."});
        }
        const authorName = `${userRes.rows[0].first_name} ${userRes.rows[0].last_name}`;

        // (ดึงเอกสาร และตรวจสอบว่า 'author' ตรงกัน)
        const documentSql = `
            SELECT 
                id, title, title_eng, author, co_author, department, advisorName, coAdvisorName, 
                abstract, keywords, document_type, publish_year, approval_status, is_active, 
                file_paths, scan_date, display_date, language
            FROM documents 
            WHERE id = $1 AND author = $2;
        `;
        const { rows } = await pool.query(documentSql, [id, authorName]);

        if (rows.length > 0) {
             const document = rows[0];
            
            // (FIX) ตรวจสอบและ Parse file_paths
             if (typeof document.file_paths === 'string') {
                try {
                    document.file_paths = JSON.parse(document.file_paths);
                } catch (e) {
                    console.error(`Invalid JSON in file_paths for doc ${id}`);
                    document.file_paths = {}; 
                }
            } else if (document.file_paths === null) {
                document.file_paths = {}; 
            }
            
            res.json(document);
        } else {
            res.status(404).json({ message: "Document not found or you do not have permission." });
        }
    } catch (err) {
        handleError(res, err, 'Get Student Document Details');
    }
});


// ----------------------------------------------
// API: หน้า ADMIN (Manage Documents)
// ----------------------------------------------

// Endpoint: ดึงเอกสารทั้งหมด (สำหรับ Admin)
app.get('/api/admin/documents', async (req, res) => {
    // (ต้องตรวจสอบ Token ว่าเป็น Admin)
    const { status = 'all' } = req.query; // (all, pending, approved, rejected)

    let sql = `
        SELECT id, title, author, department, document_type, publish_year, approval_status, is_active 
        FROM documents
    `;
    
    let params = [];
    if (status !== 'all') {
        sql += " WHERE approval_status = $1";
        params.push(status);
    }
    sql += " ORDER BY created_at DESC;";

    try {
        const { rows } = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        handleError(res, err, 'Admin Get Documents');
    }
});

// Endpoint: ลบเอกสาร (สำหรับ Admin)
app.delete('/api/admin/documents/:id', async (req, res) => {
    // (ต้องตรวจสอบ Token ว่าเป็น Admin)
    const { id } = req.params;

    // (ควรลบไฟล์ใน S3 ที่เกี่ยวข้องด้วย... ขอย่อไว้)
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // (ต้องลบจากตารางลูกก่อน ถ้ามี FK)
        // await client.query("DELETE FROM document_categories WHERE document_id = $1", [id]);
        // await client.query("DELETE FROM document_files WHERE document_id = $1", [id]);
        
        // (ลบจากตารางหลัก)
        const result = await client.query("DELETE FROM documents WHERE id = $1", [id]);
        
        await client.query('COMMIT');
        
        if (result.rowCount > 0) {
            res.status(200).json({ message: `Document ${id} deleted successfully.`});
        } else {
            res.status(404).json({ message: "Document not found."});
        }
    } catch (err) {
        await client.query('ROLLBACK');
        handleError(res, err, 'Admin Delete Document');
    } finally {
        client.release();
    }
});


// Endpoint: อัปเดตสถานะเอกสาร (สำหรับ Admin)
app.put('/api/admin/documents/status/:id', async (req, res) => {
    // (ต้องตรวจสอบ Token ว่าเป็น Admin)
    const { id } = req.params;
    const { approval_status, is_active } = req.body; // (เช่น 'approved', true)

    if (!approval_status && typeof is_active === 'undefined') {
        return res.status(400).json({ message: "approval_status or is_active is required."});
    }

    // (สร้าง Query แบบ Dynamic)
    let setClauses = [];
    let values = [];
    let paramIndex = 1;

    if (approval_status) {
        setClauses.push(`approval_status = $${paramIndex++}`);
        values.push(approval_status);
    }
    if (typeof is_active !== 'undefined') {
        setClauses.push(`is_active = $${paramIndex++}`);
        values.push(is_active);
    }
    
    values.push(id); // (ID อยู่สุดท้าย)

    const sql = `
        UPDATE documents 
        SET ${setClauses.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *;
    `;

    try {
        const { rows } = await pool.query(sql, values);
        if (rows.length > 0) {
            res.json({
                message: `Document ${id} status updated.`,
                document: rows[0]
            });
        } else {
            res.status(404).json({ message: "Document not found."});
        }
    } catch (err) {
        handleError(res, err, 'Admin Update Status');
    }
});

// Endpoint: (Admin) อัปเดตข้อมูลเอกสาร (เหมือน Student Edit แต่มีสิทธิ์มากกว่า)
app.put('/api/admin/documents/:id', 
    upload.fields([ /* (เหมือน Student Edit) */ 
        { name: 'complete_pdf', maxCount: 10 },
        { name: 'complete_doc', maxCount: 10 },
        { name: 'article_files', maxCount: 10 },
        { name: 'program_files', maxCount: 10 },
        { name: 'web_files', maxCount: 10 },
        { name: 'poster_files', maxCount: 10 },
        { name: 'certificate_files', maxCount: 10 },
        { name: 'front_face', maxCount: 1 }
    ]),
    async (req, res) => {
    // (ต้องตรวจสอบ Token ว่าเป็น Admin)
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // 1. ดึงข้อมูล Text fields จาก req.body
        const fieldsToUpdate = [
            'document_type', 'title', 'title_eng', 'author', 'co_author', 'abstract',
            'advisorName', 'department', 'coAdvisorName', 'keywords', 'supportAgency',
            'publish_year', 'scan_date', 'display_date', 'language'
        ];
        
        let setClauses = [];
        let values = [];
        let paramIndex = 1;

        fieldsToUpdate.forEach(field => {
            if (req.body[field] !== undefined) {
                setClauses.push(`${field} = $${paramIndex++}`);
                values.push(req.body[field] || null); // (แปลงค่าว่างเป็น null)
            }
        });

        // 2. จัดการไฟล์ (ซับซ้อนกว่า Student Edit เพราะต้องรวม)
        const { removedFiles, file_paths } = req.body;
        
        // 2.1 ดึงไฟล์เดิม
        let currentFilePaths = {};
        if (file_paths) {
            try {
                // (Admin อาจจะส่ง JSON string กลับมา)
                currentFilePaths = JSON.parse(file_paths);
            } catch(e) {
                 // (ถ้าพัง ให้ดึงจาก DB)
                 const { rows } = await client.query("SELECT file_paths FROM documents WHERE id = $1", [id]);
                 if(rows.length > 0 && typeof rows[0].file_paths === 'object') currentFilePaths = rows[0].file_paths;
            }
        }
        
        // 2.2 ลบไฟล์ที่ถูกสั่งลบ
        if (removedFiles) {
             let keysToDelete = JSON.parse(removedFiles);
             // (ต้องมี Logic ลบ S3... ขอย่อ)
             console.log("Admin requests to delete keys:", keysToDelete);
             for (const key in currentFilePaths) {
                 currentFilePaths[key] = currentFilePaths[key].filter(fileKey => !keysToDelete.includes(fileKey));
             }
        }
        
        // 2.3 เพิ่มไฟล์ใหม่ (ที่อัปโหลด)
         const fileKeys = [
            'complete_pdf', 'complete_doc', 'article_files', 'program_files', 
            'web_files', 'poster_files', 'certificate_files', 'front_face'
        ];
        if (req.files) {
             fileKeys.forEach(key => {
                if (req.files[key] && req.files[key].length > 0) {
                     const newKeys = req.files[key].map(file => file.key);
                     if (key === 'front_face') {
                         currentFilePaths[key] = newKeys; // แทนที่
                     } else {
                         currentFilePaths[key] = [...(currentFilePaths[key] || []), ...newKeys]; // เพิ่มต่อ
                     }
                }
            });
        }
        
        // 2.4 เพิ่ม file_paths เข้า Query (ใช้ JSON.stringify() - ถูกต้องแล้ว)
        setClauses.push(`file_paths = $${paramIndex++}`);
        values.push(JSON.stringify(currentFilePaths)); 
        
        // 3. สร้าง SQL และ Execute
        if (setClauses.length > 0) {
            setClauses.push(`updated_at = NOW()`);
            values.push(id); // (ID อยู่สุดท้าย)

            const updateSql = `
                UPDATE documents 
                SET ${setClauses.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *;
            `;
            
            const { rows } = await pool.query(updateSql, values);
            
            await client.query('COMMIT');
            res.json({
                message: `Admin updated document ${id}`,
                document: rows[0]
            });
            
        } else {
            // (ถ้าไม่มีอะไรอัปเดตเลย นอกจากไฟล์)
             await client.query('ROLLBACK'); // (หรือ Commit ถ้า Logic ไฟล์แยก)
             res.status(200).json({ message: "No textual fields to update."});
        }

    } catch (err) {
        await client.query('ROLLBACK');
        handleError(res, err, 'Admin Update Document');
    } finally {
        client.release();
    }
});


// ----------------------------------------------
// API: หน้า Homepage (ดึงข้อมูลล่าสุด, ยอดนิยม)
// ----------------------------------------------
// ( ... ขอย่อไว้ ... )


// ----------------------------------------------
// Fallback (สำหรับ React Router)
// ----------------------------------------------
// (จัดการ 404 หรือส่งต่อไปยัง React App)
app.get('*', (req, res) => {
    // (ถ้าใช้ History Router ใน React)
    // res.sendFile(path.join(__dirname, 'build', 'index.html'));
    
    // (ถ้าเป็น API ที่ไม่รู้จัก)
    res.status(404).json({ message: "Endpoint not found." });
});


// ----------------------------------------------
// Error Handler (ส่วนกลาง)
// ----------------------------------------------
const handleError = (res, err, context = 'Unknown Context') => {
    console.error(`Error in ${context}:`, err.message);
    console.error("Full Error Stack:", err.stack); // (ควรปิดใน Production)

    // (แยกประเภท Error)
    
    // S3 Errors (V3)
    if (err.name === 'NoSuchKey') {
        return res.status(404).json({ message: 'S3 Error: File not found.', errorDetails: err.name });
    } else if (err.name === 'AccessDenied') {
         return res.status(503).json({ 
            message: 'S3 Error: Access Denied. Check S3 Policy or Credentials.',
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
        // Only include stack in development
        // errorDetails: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};


// ----------------------------------------------
// Start Server
// ----------------------------------------------
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});