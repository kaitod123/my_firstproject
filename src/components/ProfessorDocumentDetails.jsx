// src/components/ProfessorDocumentDetails.jsx
import React, { useState, useEffect } from 'react';
// --- (แก้ไข) 1. Import useNavigate ---
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ChevronLeft, FileText, User, Clock, Calendar } from 'lucide-react';
import styles from '../styles/DocumentDetails.module.css';
import tableStyles from '../styles/FileTable.module.css';

const ProfessorDocumentDetails = () => {
  const { documentId } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // --- (เพิ่ม) 2. เพิ่ม state สำหรับ error ---
  const navigate = useNavigate(); // --- (เพิ่ม) 3. Initialize navigate ---


  useEffect(() => {
    const fetchDocumentDetails = async () => {
      setLoading(true);
      setError(null); // --- (เพิ่ม)
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/professor/documents/${documentId}`);
        if (!response.ok) {
           throw new Error(`HTTP error! status: ${response.status}`); // --- (แก้ไข)
        }
        const data = await response.json();
        
        if (data) {
          setDocument(data);
        } else {
          setError('ไม่พบเอกสารนี้'); // --- (เพิ่ม)
        }
      } catch (err) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูลเอกสาร:", err);
        setError(`ไม่สามารถดึงข้อมูลเอกสารได้: ${err.message}`); // --- (แก้ไข)
      } finally {
        setLoading(false);
      }
    };
    fetchDocumentDetails();
  }, [documentId]);
  
  const processFilesForTable = (files) => {
    const fileGroupMap = new Map();

    Object.values(files).flat().forEach(fileName => {
        const baseName = fileName.substring(fileName.indexOf('-') + 1).replace(/\.[^/.]+$/, "");
        const extension = fileName.split('.').pop().toLowerCase();

        if (!fileGroupMap.has(baseName)) {
            fileGroupMap.set(baseName, { 
                name: baseName, pdf: null, doc: null, docx: null, 
                zip: null, rar: null, exe: null, psd: null, jpg: null 
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
            case 'jpg': fileGroup.jpg = fileName; break;
            case 'jpeg': fileGroup.jpg = fileName; break;
            default: 
                break;
        }
    });

    return Array.from(fileGroupMap.values());
  };

  // --- (เพิ่ม) 4. เพิ่มส่วน Loading, Error, Not Found ---
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
  // --- (จบส่วนที่เพิ่ม) ---

  let files = {};
  try {
    if (document.file_paths && typeof document.file_paths === 'string') {
      files = JSON.parse(document.file_paths);
    }
  } catch (e) {
    console.error("Failed to parse file_paths JSON:", e);
    files = {};
  }

  const processedFiles = processFilesForTable(files);

  const renderDownloadLink = (fileName) => {
    if (!fileName) return <span className={tableStyles.noFile}>-</span>;
    return (
      <a href={`${import.meta.env.VITE_API_URL}/api/download/${fileName}`} className={tableStyles.downloadLink} download>
        <Download size={16} /> ดาวน์โหลด
      </a>
    );
  };

  return (
    <div className={styles.container}>
      {/* --- (แก้ไข) 5. เปลี่ยน Link เป็น button navigate(-1) --- */}
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
        <p className={styles.documentType}>{document.document_type || 'N/A'}</p>

        <div className={styles.detailsList}>
          <div className={styles.listItem}>
            <span className={styles.listLabel}>ผู้แต่ง</span>
            <span className={styles.listValue}>{document.author || 'N/A'}</span>
          </div>
          <div className={styles.listItem}>
            <span className={styles.listLabel}>สาขาวิชา</span>
            <span className={styles.listValue}>{document.department || 'N/A'}</span>
          </div>
          
          {/* --- (เพิ่ม) 6. เพิ่มข้อมูล Advisor ที่ขาดไป --- */}
          <div className={styles.listItem}>
            <span className={styles.listLabel}>อาจารย์ที่ปรึกษา</span>
            <span className={styles.listValue}>{document.advisorName || 'N/A'}</span>
          </div>

          <div className={styles.listItem}>
            <span className={styles.listLabel}>ปีที่เผยแพร่</span>
            <span className={styles.listValue}>{document.publish_year ? document.publish_year + 543 : 'N/A'}</span>
          </div>
          <div className={styles.listItem}>
            <span className={styles.listLabel}>ภาษา</span>
            <span className={styles.listValue}>{document.language || 'N/A'}</span>
          </div>
          <div className={styles.listItem}>
            <span className={styles.listLabel}>วันสแกน</span>
            <span className={styles.listValue}>{document.scan_date ? new Date(document.scan_date).toLocaleDateString('th-TH') : 'N/A'}</span>
          </div>
          <div className={styles.listItem}>
            <span className={styles.listLabel}>วันแสดงผล</span>
            <span className={styles.listValue}>{document.display_date ? new Date(document.display_date).toLocaleDateString('th-TH') : 'N/A'}</span>
          </div>
        </div>


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
                    <th>JPG</th>
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
                      <td>{renderDownloadLink(file.jpg)}</td>
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

export default ProfessorDocumentDetails;