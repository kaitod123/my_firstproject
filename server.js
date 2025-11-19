// server.js (เวอร์ชันแก้ไข Routing - ใช้ Query Parameter ที่ปลอดภัยที่สุด)
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
// API: Download ไฟล์ (แก้ไขส่วนนี้)
// ----------------------------------------------
// (!!!) FIX: ใช้ Query Parameter แทน Path Variable เพื่อความชัวร์ที่สุด
// เรียกใช้แบบ: /api/download?key=projects/web/file.zip
app.get('/api/download', async (req, res) => {
    const s3Key = req.query.key; // รับค่าจาก ?key=...
    
    if (!s3Key) {
        return res.status(400).send("Missing file key query parameter.");
    }
    
    console.log(`Attempting download for S3 Key: ${s3Key}`);

    try {
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); 
        res.redirect(signedUrl);

    } catch (err) {
        console.error("S3 GetObjectCommand Error:", err);
        if (err.name === 'NoSuchKey') {
             return res.status(404).send('File not found in S3.');
        }
        handleError(res, err, 'Download File');
    }
});


// ... (Auth APIs เหมือนเดิม) ...
app.post('/api/login', async (req, res) => { /* ... */ });
app.post('/api/register', async (req, res) => { /* ... */ });
app.get('/api/users/profile/:id', async (req, res) => { /* ... */ });
app.put('/api/users/profile/:id', async (req, res) => { /* ... */ });
app.get('/api/student/documents', async (req, res) => { /* ... */ });
app.get('/api/student/documents/:id', async (req, res) => { /* ... */ });
app.get('/api/admin/documents', async (req, res) => { /* ... */ });
app.delete('/api/admin/documents/:id', async (req, res) => { /* ... */ });
app.put('/api/admin/documents/status/:id', async (req, res) => { /* ... */ });
app.put('/api/admin/documents/:id', upload.fields([ /* ... */ ]), async (req, res) => { /* ... */ });

app.get('*', (req, res) => {
    res.status(404).json({ message: "Endpoint not found." });
});

const handleError = (res, err, context = 'Unknown Context') => {
    console.error(`Error in ${context}:`, err.message);
    res.status(500).json({ message: 'Internal Server Error: ' + err.message });
};

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});