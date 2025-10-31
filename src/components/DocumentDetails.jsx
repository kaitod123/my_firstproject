// src/components/DocumentDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FileText, User, Clock, Download, ChevronLeft, Calendar, PinIcon } from 'lucide-react';
import styles from '../styles/DocumentDetails.module.css';
import tableStyles from '../styles/FileTable.module.css'; // Import CSS ใหม่

const DocumentDetails = () => {
  const { documentId } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDocumentDetails = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/documents/${documentId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data) {
          setDocument(data);
        } else {
          setError('ไม่พบเอกสารนี้');
        }
      } catch (err) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูลเอกสาร:", err);
        setError(`ไม่สามารถดึงข้อมูลเอกสารได้: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchDocumentDetails();
  }, [documentId]);

   const processFilesForTable = (files) => {
    const fileGroupMap = new Map();

    // *** แก้ไข: ตรวจสอบว่าเป็น Object หรือไม่ ก่อนเข้าถึง Object.values ***
    if (!files || typeof files !== 'object' || Array.isArray(files)) {
        return [];
    }

    Object.values(files).flat().forEach(fileName => {
        // ตรวจสอบว่า fileName เป็น String และมีค่าที่ถูกต้อง
        if (typeof fileName !== 'string' || !fileName) return; 
        
        // S3 URL มักมี format: timestamp-filename.ext
        const urlParts = fileName.split('/');
        const nameWithTimestamp = urlParts[urlParts.length - 1]; // ชื่อไฟล์พร้อม timestamp
        
        // แยก timestamp-name กับ extension
        const parts = nameWithTimestamp.split('.');
        const extension = parts.pop().toLowerCase(); // นามสกุล
        const nameWithoutExtension = parts.join('.'); 

        // เอา Timestamp ออก: 123456789-filename -> filename
        const baseName = nameWithoutExtension.substring(nameWithoutExtension.indexOf('-') + 1);

        if (!fileGroupMap.has(baseName)) {
            fileGroupMap.set(baseName, { 
                name: baseName, pdf: null, doc: null, docx: null, 
                zip: null, rar: null, exe: null, psd: null, jpg: null, png: null // เพิ่ม png
            });
        }

        const fileGroup = fileGroupMap.get(baseName);
        
        switch (extension) {
            case 'pdf': fileGroup.pdf = fileName; break;
            case 'doc': fileGroup.doc = fileName; break;
            case 'docx': fileGroup.docx = fileName; break;
            case 'zip': fileGroup.zip = fileName; break;
            case 'rar': fileGroup.rar = fileName; break;
            case 'exe': fileGroup.exe = fileName; break;
            case 'psd': fileGroup.psd = fileName; break;
            case 'jpg':
            case 'jpeg': fileGroup.jpg = fileName; break;
            case 'png': fileGroup.png = fileName; break; // เพิ่ม png
            default:
                break;
        }
    });

    return Array.from(fileGroupMap.values());
  };

  const renderDownloadLink = (fileName) => {
    // fileName ที่นี่คือ S3 Key เต็มๆ
    if (!fileName) return <span className={tableStyles.noFile}>-</span>;
    return (
      // *** แก้ไข URL ให้ใช้ /api/download/ ตามรูปแบบที่ Backend ต้องการ ***
      <a href={`${import.meta.env.VITE_API_URL}/api/download/${fileName}`} className={tableStyles.downloadLink} target="_blank" rel="noopener noreferrer">
        <Download size={16} /> ดาวน์โหลด
      </a>
    );
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>กำลังโหลดรายละเอียดเอกสาร...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorMessage}>
        <p>Error: {error}</p>
        <button 
          onClick={() => navigate(-1)} 
          className={styles.backButton}
        >
          <ChevronLeft /> กลับไปยังหน้าก่อนหน้า
        </button>
      </div>
    );
  }

  if (!document) {
    return (
      <div className={styles.noDocumentFound}>
        <p>ไม่พบเอกสารที่คุณกำลังมองหา</p>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          <ChevronLeft /> กลับไปยังหน้าก่อนหน้า
        </button>
      </div>
    );
  }

  // *** แก้ไข: เชื่อถือ Backend ว่า file_paths เป็น Object หรือ String (ถ้าเป็น String ให้ Parse) ***
  let files = {};
  if (document.file_paths) {
      try {
          files = (typeof document.file_paths === 'string' && document.file_paths.trim().startsWith('{'))
              ? JSON.parse(document.file_paths)
              : document.file_paths; // ถ้าเป็น Object อยู่แล้ว ให้ใช้เลย
      } catch (e) {
          console.error("Failed to parse file_paths JSON:", e);
          files = {};
      }
  }

  const processedFiles = processFilesForTable(files);

  return (
    <div>
    <div className={styles.container}>
    
      <button onClick={() => navigate(-1)} className={styles.backButton}>
        <ChevronLeft size={20} /> กลับไปยังหน้าก่อนหน้า
      </button>
      
      <div className={styles.mainContent}>
        <h1 
          className={styles.title}
          style={{ overflowWrap: 'break-word' }} // เพิ่ม style นี้
        >
          {document.title}
        </h1>
          {document.title_eng && (
            <h2 className={styles.titleEng}>
              {document.title_eng}
            </h2>
          )}
        <p className={styles.documentType}>{document.document_type || 'N/A'}</p>

        {/* --- (แก้ไข) เปลี่ยนจาก Grid เป็น List --- */}
        <div className={styles.detailsList}>
          <div className={styles.listItem}>
            <span className={styles.listLabel}>ผู้แต่ง</span>
            <span className={styles.listValue}>{document.author || 'N/A'}</span>
          </div>
          <div className={styles.listItem}>
            <span className={styles.listLabel}>สาขาวิชา</span>
            <span className={styles.listValue}>{document.department || 'N/A'}</span>
          </div>
          <div className={styles.listItem}>
            <span className={styles.listLabel}>อาจารย์ที่ปรึกษา</span>
            <span className={styles.listValue}>{document.advisorName || 'N/A'}</span>
          </div>
          <div className={styles.listItem}>
            <span className={styles.listLabel}>ปีที่เผยแพร่</span>
            <span className={styles.listValue}>{document.publish_year ? document.publish_year + 543 : 'N/A'}</span>
          </div>
          <div className={styles.listItem}>
            <span className={styles.listLabel}>วันที่อัพโหลด</span>
            <span className={styles.listValue}>{document.scan_date ? new Date(document.scan_date).toLocaleDateString('th-TH') : 'N/A'}</span>
          </div>
          <div className={styles.listItem}>
            <span className={styles.listLabel}>วันแสดงผล</span>
            <span className={styles.listValue}>{document.display_date ? new Date(document.display_date).toLocaleDateString('th-TH') : 'N/A'}</span>
          </div>
        </div>
        {/* --- จบส่วนที่แก้ไข --- */}

        <div className={styles.section}>
          <h2>บทคัดย่อ</h2>
          <p>{document.abstract || 'ไม่มีข้อมูล'}</p>
        </div>

        <div className={styles.section}>
          <h2>คำสำคัญ</h2>
          <div className={styles.keywords}>
            {document.keywords && document.keywords.split(',').map((keyword, index) => (
              <span key={index} className={styles.keywordTag}>{keyword.trim()}</span>
            ))}
          </div>
        </div>

        <div className={styles.section}>
                  <h2>ไฟล์แนบ</h2>
                  {processedFiles.length > 0 ? (
                    <div className={tableStyles.fileTableContainer}>
                      <table className={tableStyles.fileTable}>
                        <thead>
                          <tr>
                            <th>ชื่อ</th>
                            <th>PDF</th>
                            <th>DOC</th>
                            <th>DOCX</th>
                            <th>ZIP</th>
                            <th>RAR</th>
                            <th>EXE</th>
                            <th>PSD</th>
                            <th>JPG/PNG</th>
                            
                          </tr>
                        </thead>
                        <tbody>
                          {processedFiles.map((file, index) => (
                            <tr key={index}>
                              <td className={tableStyles.fileTableName}>{file.name}</td>
                              <td>{renderDownloadLink(file.pdf)}</td>
                              <td>{renderDownloadLink(file.doc)}</td>
                              <td>{renderDownloadLink(file.docx)}</td>
                              <td>{renderDownloadLink(file.zip)}</td>
                              <td>{renderDownloadLink(file.rar)}</td>
                              <td>{renderDownloadLink(file.exe)}</td>
                              <td>{renderDownloadLink(file.psd)}</td>
                              <td>
                                {renderDownloadLink(file.jpg)}
                                {renderDownloadLink(file.png)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
            ) : (
              <p>ไม่พบไฟล์แนบ</p>
            )}
          </div>
        </div>
      </div>
      
      <footer className={styles.footer}>
        <p className={styles.footerText}>© 2023 University Project Hub</p>
        <div className={styles.footerLinks}>
          <a href="#" className={styles.footerLink}>Contact Us</a>
          <a href="#" className={styles.footerLink}>Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
};

export default DocumentDetails;
