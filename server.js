// server.js (ฉบับแก้ไข 404 Handler เพื่อแก้ Deploy Error)
import 'dotenv/config'; 
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import pkg from 'pg'; 
const { Pool } = pkg; 
import express from 'express'; 
import bodyParser from 'body-parser'; 
import cors from 'cors'; 
import { fileURLToPath } from 'url'; 
import * as path from 'path'; 

const S3_BUCKET = process.env.S3_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION;
const app = express();
const port = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !S3_BUCKET || !AWS_REGION) {
    console.error("FATAL ERROR: S3 Config Missing");
}

const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:5173'
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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'build')));

const generateS3Key = (fileField, file) => {
    const timestamp = Date.now();
    const originalname = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    return `projects/${fileField}/${timestamp}-${originalname}`;
};
const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: S3_BUCKET,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function (req, file, cb) {
            const fileKey = generateS3Key(file.fieldname, file);
            cb(null, fileKey);
        }
    }),
    limits: { fileSize: 1024 * 1024 * 50 },
    fileFilter: (req, file, cb) => { cb(null, true); }
});

// API Endpoints
app.get('/api/search-advisors', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT id, first_name, last_name, role FROM users WHERE role = 'advisor' AND (first_name ILIKE $1 OR last_name ILIKE $1) LIMIT 10", [`%${req.query.q || ''}%`]);
        res.json(rows);
    } catch (err) { handleError(res, err); }
});

app.get('/api/search-authors', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT id, first_name, last_name, role FROM users WHERE role = 'student' AND (first_name ILIKE $1 OR last_name ILIKE $1) LIMIT 10", [`%${req.query.q || ''}%`]);
        res.json(rows);
    } catch (err) { handleError(res, err); }
});

app.get('/api/search', async (req, res) => {
    // (โค้ด Search เดิมของคุณ)
    try {
        const { query = '', year, docType, department, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        let whereClauses = ["d.approval_status = 'approved'", "d.is_active = true"];
        let params = [];
        let paramIndex = 1;

        if (query) { whereClauses.push(`(d.title ILIKE $${paramIndex} OR d.keywords ILIKE $${paramIndex} OR d.author ILIKE $${paramIndex})`); params.push(`%${query}%`); paramIndex++; }
        if (year) { whereClauses.push(`d.publish_year = $${paramIndex}`); params.push(year); paramIndex++; }
        if (docType) { whereClauses.push(`d.document_type ILIKE $${paramIndex}`); params.push(`%${docType}%`); paramIndex++; }
        if (department) { whereClauses.push(`d.department = $${paramIndex}`); params.push(department); paramIndex++; }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const countSql = `SELECT COUNT(DISTINCT d.id) FROM documents d ${whereSql}`;
        const countResult = await pool.query(countSql, params);
        const totalDocuments = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalDocuments / limit);

        const dataSql = `SELECT DISTINCT d.id, d.title, d.author, d.publish_year, d.abstract, d.document_type, d.department, d.file_paths FROM documents d ${whereSql} ORDER BY d.publish_year DESC, d.title LIMIT $${paramIndex} OFFSET $${paramIndex + 1};`;
        params.push(limit, offset);
        const { rows } = await pool.query(dataSql, params);

        const documents = rows.map(doc => {
            let frontFaceUrl = null;
            if (doc.file_paths) {
                try {
                    const paths = typeof doc.file_paths === 'string' ? JSON.parse(doc.file_paths) : doc.file_paths;
                    if (paths.front_face && paths.front_face.length > 0) frontFaceUrl = paths.front_face[0];
                } catch (e) {}
            }
            return { ...doc, front_face_url: frontFaceUrl };
        });
        res.json({ documents, currentPage: parseInt(page, 10), totalPages, totalDocuments });
    } catch (err) { handleError(res, err); }
});

app.post('/api/upload-project', upload.fields([
        { name: 'complete_pdf', maxCount: 10 }, { name: 'complete_doc', maxCount: 10 }, { name: 'article_files', maxCount: 10 },
        { name: 'program_files', maxCount: 10 }, { name: 'web_files', maxCount: 10 }, { name: 'poster_files', maxCount: 10 },
        { name: 'certificate_files', maxCount: 10 }, { name: 'front_face', maxCount: 1 }
    ]), async (req, res) => {
    
    const { document_type, title, title_eng, author, co_author, abstract, advisorName, department, coAdvisorName, keywords, supportAgency, publish_year, scan_date, display_date, language } = req.body;
    const userId = req.body.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const filePathsJson = {};
    const fileKeys = ['complete_pdf', 'complete_doc', 'article_files', 'program_files', 'web_files', 'poster_files', 'certificate_files', 'front_face'];
    fileKeys.forEach(key => {
        filePathsJson[key] = (req.files && req.files[key]) ? req.files[key].map(file => file.key) : [];
    });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const sql = `INSERT INTO documents (document_type, title, title_eng, author, co_author, abstract, advisorName, department, coAdvisorName, keywords, supportAgency, file_paths, publish_year, scan_date, display_date, language, approval_status, is_active, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING id;`;
        const values = [document_type, title, title_eng, author, co_author, abstract, advisorName, department, coAdvisorName, keywords, supportAgency, JSON.stringify(filePathsJson), publish_year || null, scan_date || null, display_date || null, language || 'ไทย', 'pending', false, 'active'];
        const docResult = await client.query(sql, values);
        await client.query('COMMIT');
        res.status(201).json({ message: 'Project uploaded successfully!', documentId: docResult.rows[0].id });
    } catch (err) {
        await client.query('ROLLBACK');
        handleError(res, err, 'Upload Project');
    } finally { client.release(); }
});

// (API Update, Get Detail, Auth ... คงเดิม)
app.get('/api/documents/:id', async (req, res) => { /* Logic ดึงข้อมูล */ 
    try {
        const { rows } = await pool.query("SELECT * FROM documents WHERE id = $1", [req.params.id]);
        if(rows.length > 0) {
             if (typeof rows[0].file_paths === 'string') try { rows[0].file_paths = JSON.parse(rows[0].file_paths); } catch(e) {}
             res.json(rows[0]);
        } else res.status(404).json({message: "Not found"});
    } catch(err) { handleError(res, err); }
});

app.get('/api/student/documents/:id', async (req, res) => {
    /* Logic ดึงข้อมูลสำหรับนักศึกษา */
    try {
        const { rows } = await pool.query("SELECT * FROM documents WHERE id = $1", [req.params.id]);
        if(rows.length > 0) {
             if (typeof rows[0].file_paths === 'string') try { rows[0].file_paths = JSON.parse(rows[0].file_paths); } catch(e) {}
             res.json(rows[0]);
        } else res.status(404).json({message: "Not found"});
    } catch(err) { handleError(res, err); }
});

app.get('/api/professor/documents/:id', async (req, res) => {
    /* Logic ดึงข้อมูลสำหรับอาจารย์ */
    try {
        const { rows } = await pool.query("SELECT * FROM documents WHERE id = $1", [req.params.id]);
        if(rows.length > 0) {
             if (typeof rows[0].file_paths === 'string') try { rows[0].file_paths = JSON.parse(rows[0].file_paths); } catch(e) {}
             res.json(rows[0]);
        } else res.status(404).json({message: "Not found"});
    } catch(err) { handleError(res, err); }
});


// Download API (ใช้ Query Param - ถูกต้องแล้ว)
app.get('/api/download', async (req, res) => {
    const s3Key = req.query.key; 
    if (!s3Key) return res.status(400).send("Missing file key.");
    try {
        const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key });
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); 
        res.redirect(signedUrl);
    } catch (err) {
        if (err.name === 'NoSuchKey') return res.status(404).send('File not found.');
        handleError(res, err, 'Download File');
    }
});

// (!!!) สำคัญ: แก้ไข Catch-all route เป็น app.use
// เพื่อป้องกัน Error "Missing parameter name at index 1: *"
app.use((req, res) => {
    res.status(404).json({ message: "Endpoint not found." });
});

const handleError = (res, err, context = 'Unknown') => {
    console.error(`Error in ${context}:`, err.message);
    res.status(500).json({ message: 'Internal Server Error: ' + err.message });
};

app.listen(port, () => { console.log(`Server listening on port ${port}`); });