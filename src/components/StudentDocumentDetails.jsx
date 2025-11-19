// ... (Import เหมือนเดิม) ...
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ChevronLeft, FileText, User, Clock, Calendar } from 'lucide-react';
import styles from '../styles/DocumentDetails.module.css';
import tableStyles from '../styles/FileTable.module.css';

const StudentDocumentDetails = () => {
  // ... (State & Logic เหมือนเดิม) ...
  const { documentId } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
      // ... (Fetch Logic เหมือนเดิม) ...
      const fetchDocumentDetails = async () => {
      setLoading(true);
      setError(null); 
      
      const userData = JSON.parse(localStorage.getItem('user'));
      if (!userData || !userData.id) {
          console.error("User data not found in localStorage.");
          setError("ไม่พบข้อมูลผู้ใช้ กรุณาล็อกอินใหม่อีกครั้ง"); 
          setLoading(false);
          return;
      }
      const userId = userData.id;

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/student/documents/${documentId}?userId=${userId}`);
        
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
      // ... (Logic เหมือนเดิม) ...
      const fileGroupMap = new Map();

    if (!files || typeof files !== 'object' || Array.isArray(files)) {
        return [];
    }

    Object.values(files).flat().forEach(fileName => {
        if (typeof fileName !== 'string' || !fileName) return; 

        let s3Key = fileName;
        try {
            const url = new URL(fileName);
            s3Key = url.pathname.substring(1); 
        } catch (e) {
        }

        const urlParts = fileName.split('/');
        const nameWithTimestamp = urlParts[urlParts.length - 1]; 
        
        const parts = nameWithTimestamp.split('.');
        const extension = parts.pop().toLowerCase(); 
        const nameWithoutExtension = parts.join('.'); 

        const baseName = nameWithoutExtension.substring(nameWithoutExtension.indexOf('-') + 1);

        if (!fileGroupMap.has(baseName)) {
            fileGroupMap.set(baseName, { 
                name: baseName, pdf: null, docx: null, 
                zip: null, rar: null, exe: null, psd: null, jpg: null, png: null 
            });
        }

        const fileGroup = fileGroupMap.get(baseName);
        
        switch (extension) {
            case 'pdf': fileGroup.pdf = s3Key; break;
            case 'docx': fileGroup.docx = s3Key; break;
            case 'zip': fileGroup.zip = s3Key; break;
            case 'rar': fileGroup.rar = s3Key; break;
            case 'exe': fileGroup.exe = s3Key; break;
            case 'psd': fileGroup.psd = s3Key; break;
            case 'jpg':
            case 'jpeg': 
                fileGroup.jpg = s3Key; 
                break;
            case 'png':
                fileGroup.png = s3Key;
                break;
            default: 
                break;
        }
    });

    return Array.from(fileGroupMap.values());
  };

  // ... (Loading/Error Render เหมือนเดิม) ...
  if (loading) return <div className={styles.loading}><div className={styles.spinner}></div><p>กำลังโหลดรายละเอียดเอกสาร...</p></div>;
  if (error) return <div className={styles.errorMessage}><p>Error: {error}</p><button onClick={() => navigate(-1)} className={styles.backButton}><ChevronLeft /> กลับไปยังหน้าก่อนหน้า</button></div>;
  if (!document) return <div className={styles.noDocumentFound}><p>ไม่พบเอกสารที่คุณกำลังมองหา</p><button onClick={() => navigate(-1)} className={styles.backButton}><ChevronLeft /> กลับไปยังหน้าก่อนหน้า</button></div>;

  let files = {};
  if (document.file_paths) {
      try {
          files = (typeof document.file_paths === 'string' && document.file_paths.trim().startsWith('{'))
              ? JSON.parse(document.file_paths)
              : document.file_paths; 
      } catch (e) {
          files = {};
      }
  }

  const processedFiles = processFilesForTable(files);

  const renderDownloadLink = (fileName) => {
    if (!fileName) return <span className={tableStyles.noFile}></span>; 
    
    // (!!!) FIX: เปลี่ยน Link ให้เป็นแบบ Query Parameter
    // จาก: /api/download/filename
    // เป็น: /api/download?key=filename
    // ใช้ encodeURIComponent เพื่อความชัวร์ในกรณีที่ชื่อไฟล์มีอักขระพิเศษ
    const downloadUrl = `${import.meta.env.VITE_API_URL}/api/download?key=${encodeURIComponent(fileName)}`;
    
    return (
      <a href={downloadUrl} className={tableStyles.downloadLink} target="_blank" rel="noopener noreferrer">
        <Download size={16} /> 
      </a>
    );
  };

  return (
    <div className={styles.container}>
      {/* ... (JSX ส่วน UI เหมือนเดิมทั้งหมด) ... */}
      <button onClick={() => navigate(-1)} className={styles.backButton}>
        <ChevronLeft size={20} /> กลับไปยังหน้าก่อนหน้า
      </button>

      <div className={styles.mainContent}>
        <h1 className={styles.title} style={{ overflowWrap: 'break-word' }}>{document.title}</h1>
        <p className={styles.documentType}>{document.document_type || 'N/A'}</p>

        <div className={styles.detailsList}>
             {/* ... (รายการ Details) ... */}
             <div className={styles.listItem}><span className={styles.listLabel}>ผู้แต่ง</span><span className={styles.listValue}>{document.author || 'N/A'}</span></div>
             <div className={styles.listItem}><span className={styles.listLabel}>ผู้แต่งร่วม</span><span className={styles.listValue}>{document.co_author || 'N/A'}</span></div>
             <div className={styles.listItem}><span className={styles.listLabel}>สาขาวิชา</span><span className={styles.listValue}>{document.department || 'N/A'}</span></div>
             <div className={styles.listItem}><span className={styles.listLabel}>อาจารย์ที่ปรึกษา</span><span className={styles.listValue}>{document.advisorName || document.advisorname || 'N/A'}</span></div>
             <div className={styles.listItem}><span className={styles.listLabel}>อาจารย์ที่ปรึกษาร่วม</span><span className={styles.listValue}>{document.coadvisorName || document.coadvisorname || 'N/A'}</span></div>
             <div className={styles.listItem}><span className={styles.listLabel}>ปีที่เผยแพร่</span><span className={styles.listValue}>{document.publish_year ? document.publish_year + 543 : 'N/A'}</span></div>
             <div className={styles.listItem}><span className={styles.listLabel}>ภาษา</span><span className={styles.listValue}>{document.language || 'N/A'}</span></div>
             <div className={styles.listItem}><span className={styles.listLabel}>วันที่อัพโหลด</span><span className={styles.listValue}>{document.scan_date ? new Date(document.scan_date).toLocaleDateString('th-TH') : 'N/A'}</span></div>
             <div className={styles.listItem}><span className={styles.listLabel}>วันแสดงผล</span><span className={styles.listValue}>{document.display_date ? new Date(document.display_date).toLocaleDateString('th-TH') : 'N/A'}</span></div>
        </div>

        <div className={styles.section}><h2>บทคัดย่อ</h2><p>{document.abstract || 'ไม่มีข้อมูล'}</p></div>

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
                <table className={tableStyles.fileTable} style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                            <th style={{ width: '40%', textAlign: 'left' }}>ชื่อ</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>PDF</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>DOCX</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>ZIP,RAR</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>EXE</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>PSD</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>JPG/PNG</th>
                  </tr>
                </thead>
                <tbody>
                  {processedFiles.map((file, index) => (
                    <tr key={index}>
                      <td className={tableStyles.fileTableName} style={{ wordBreak: 'break-all', textAlign: 'left' }}>{file.name}</td>
                      <td style={{ textAlign: 'center' }}>{renderDownloadLink(file.pdf)}</td>
                      <td style={{ textAlign: 'center' }}>{renderDownloadLink(file.docx)}</td>
                      <td style={{ textAlign: 'center' }}>{renderDownloadLink(file.zip)}{renderDownloadLink(file.rar)}</td>
                      <td style={{ textAlign: 'center' }}>{renderDownloadLink(file.exe)}</td>
                      <td style={{ textAlign: 'center' }}>{renderDownloadLink(file.psd)}</td>
                      <td style={{ textAlign: 'center' }}>{renderDownloadLink(file.jpg)}{renderDownloadLink(file.png)}</td>
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
        <p className={styles.footerText}>Copyright © 2025</p>
        <div className={styles.footerLink}>
          <a className={styles.footerLink}>Designed & Developed by </a>
          <a href="https://informatics.nrru.ac.th/" className={styles.footerLink}>Informatics</a>
        </div>
      </footer>
    </div>
  );
};

export default StudentDocumentDetails;