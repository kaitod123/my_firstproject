<<<<<<< HEAD
<?php
// api/document.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// การเชื่อมต่อฐานข้อมูล
class DatabaseConnection {
    private $host = 'localhost';
    private $database = 'Project';
    private $username = 'root';
    private $password = '12345678';
    private $connection;
    
    public function __construct() {
        try {
            $this->connection = new PDO(
                "mysql:host={$this->host};dbname={$this->database};charset=utf8",
                $this->username,
                $this->password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]
            );
        } catch (PDOException $e) {
            die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
        }
    }
    
    public function getConnection() {
        return $this->connection;
    }
}

// คลาสสำหรับจัดการข้อมูลเอกสาร
class DocumentManager {
    private $db;
    
    public function __construct() {
        $database = new DatabaseConnection();
        $this->db = $database->getConnection();
    }
    
    public function getDocumentById($id) {
        try {
            // ดึงข้อมูลเอกสารหลัก
            $stmt = $this->db->prepare("
                SELECT 
                    d.id,
                    d.title,
                    d.document_name,
                    d.author,
                    d.department,
                    d.document_conversion,
                    d.abstract,
                    d.keywords,
                    d.thai_sh,
                    d.classification,
                    d.tools,
                    d.field,
                    d.publisher,
                    d.publish_year,
                    d.scan_date,
                    d.display_date,
                    d.document_type,
                    d.mime_type,
                    d.profile_image,
                    d.language,
                    d.publication_year,
                    d.created_at,
                    d.updated_at
                FROM documents d 
                WHERE d.id = ?
            ");
            
            $stmt->execute([$id]);
            $document = $stmt->fetch();
            
            if (!$document) {
                return ['error' => 'Document not found'];
            }
            
            // ดึงข้อมูลไฟล์แนบ
            $stmt = $this->db->prepare("
                SELECT 
                    filename,
                    file_size,
                    download_url,
                    file_type
                FROM document_files 
                WHERE document_id = ?
                ORDER BY sort_order ASC
            ");
            
            $stmt->execute([$id]);
            $files = $stmt->fetchAll();
            
            // รวมข้อมูลเอกสารกับไฟล์แนบ
            $document['files'] = $files;
            
            return $document;
            
        } catch (PDOException $e) {
            return ['error' => 'Database error: ' . $e->getMessage()];
        }
    }
    
    public function getAllDocuments($limit = 10, $offset = 0) {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    id,
                    title,
                    document_name,
                    author,
                    department,
                    publish_year,
                    document_type,
                    created_at
                FROM documents 
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ");
            
            $stmt->execute([$limit, $offset]);
            return $stmt->fetchAll();
            
        } catch (PDOException $e) {
            return ['error' => 'Database error: ' . $e->getMessage()];
        }
    }
    
    public function searchDocuments($keyword, $limit = 10) {
        try {
            $searchTerm = "%{$keyword}%";
            $stmt = $this->db->prepare("
                SELECT 
                    id,
                    title,
                    document_name,
                    author,
                    department,
                    publish_year,
                    document_type
                FROM documents 
                WHERE title LIKE ? 
                   OR document_name LIKE ? 
                   OR author LIKE ?
                   OR keywords LIKE ?
                ORDER BY created_at DESC
                LIMIT ?
            ");
            
            $stmt->execute([$searchTerm, $searchTerm, $searchTerm, $searchTerm, $limit]);
            return $stmt->fetchAll();
            
        } catch (PDOException $e) {
            return ['error' => 'Database error: ' . $e->getMessage()];
        }
    }
}

// จัดการ HTTP Request
$method = $_SERVER['REQUEST_METHOD'];
$documentManager = new DocumentManager();

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            // ดึงข้อมูลเอกสารเฉพาะ
            $id = filter_var($_GET['id'], FILTER_VALIDATE_INT);
            if ($id) {
                $result = $documentManager->getDocumentById($id);
                echo json_encode($result, JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode(['error' => 'Invalid document ID'], JSON_UNESCAPED_UNICODE);
            }
        } elseif (isset($_GET['search'])) {
            // ค้นหาเอกสาร
            $keyword = trim($_GET['search']);
            $limit = isset($_GET['limit']) ? filter_var($_GET['limit'], FILTER_VALIDATE_INT) : 10;
            $result = $documentManager->searchDocuments($keyword, $limit);
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
        } else {
            // ดึงข้อมูลเอกสารทั้งหมด
            $limit = isset($_GET['limit']) ? filter_var($_GET['limit'], FILTER_VALIDATE_INT) : 10;
            $offset = isset($_GET['offset']) ? filter_var($_GET['offset'], FILTER_VALIDATE_INT) : 0;
            $result = $documentManager->getAllDocuments($limit, $offset);
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
        }
        break;
        
    case 'OPTIONS':
        // Handle preflight request
        http_response_code(200);
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
        break;
}
?>
=======
$config = [
    'host' => 'localhost',
    'dbname' => 'project',  // เปลี่ยนเป็นชื่อฐานข้อมูลของคุณ
    'username' => 'root',     // เปลี่ยนเป็น username ของคุณ
    'password' => '12345678',     // เปลี่ยนเป็น password ของคุณ
    'charset' => 'utf8mb4'
];
>>>>>>> aeda49a (Deploy to GitHub Pages)
