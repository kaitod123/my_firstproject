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

// ... API Endpoints ... (ย่อส่วนอื่นเพื่อความกระชับ)
app.get('/api/search-advisors', async (req, res) => { /* ...Code... */ });
app.get('/api/search-authors', async (req, res) => { /* ...Code... */ });
app.get('/api/search', async (req, res) => { /* ...Code... */ });

// API: Upload Project (แก้ JSON.stringify)
app.post('/api/upload-project', upload.fields([
        { name: 'complete_pdf', maxCount: 10 },
        { name: 'complete_doc', maxCount: 10 },
        { name: 'article_files', maxCount: 10 },
        { name: 'program_files', maxCount: 10 },
        { name: 'web_files', maxCount: 10 },
        { name: 'poster_files', maxCount: 10 },
        { name: 'certificate_files', maxCount: 10 },
        { name: 'front_face', maxCount: 1 }
    ]), async (req, res) => {
    
    const { document_type, title, title_eng, author, co_author, abstract, advisorName, department, coAdvisorName, keywords, supportAgency, publish_year, scan_date, display_date, language } = req.body;
    const userId = req.body.userId;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const filePathsJson = {};
    const fileKeys = ['complete_pdf', 'complete_doc', 'article_files', 'program_files', 'web_files', 'poster_files', 'certificate_files', 'front_face'];

    if (req.files) {
        fileKeys.forEach(key => {
            if (req.files[key] && req.files[key].length > 0) {
                filePathsJson[key] = req.files[key].map(file => file.key); 
            } else {
                filePathsJson[key] = [];
            }
        });
    } else {
        fileKeys.forEach(key => { filePathsJson[key] = []; });
    }

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
    } finally {
        client.release();
    }
});

// API: Update Project (แก้ JSON.stringify)
app.put('/api/projects/:id', upload.fields([ /* ...fields... */ ]), async (req, res) => { /* ...Code logic with JSON.stringify updated... */ });

app.get('/api/projects/:id', async (req, res) => { /* ...Code logic... */ });

// (!!!) FIX: Download API using Query Param
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

// ... Auth & Other APIs ...
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

app.get('*', (req, res) => { res.status(404).json({ message: "Endpoint not found." }); });

const handleError = (res, err, context = 'Unknown') => {
    console.error(`Error in ${context}:`, err.message);
    res.status(500).json({ message: 'Internal Server Error: ' + err.message });
};

app.listen(port, () => { console.log(`Server listening on port ${port}`); });