import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ChevronLeft } from 'lucide-react';
import styles from '../styles/DocumentDetails.module.css';
import tableStyles from '../styles/FileTable.module.css';

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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data) setDocument(data);
        else setError('ไม่พบเอกสารนี้');
      } catch (err) {
        setError(`ไม่สามารถดึงข้อมูลเอกสารได้: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchDocumentDetails();
  }, [documentId]);

  const processFilesForTable = (files) => {
    const fileGroupMap = new Map();
    if (!files || typeof files !== 'object' || Array.isArray(files)) return [];

    Object.values(files).flat().forEach(fileName => {
        if (typeof fileName !== 'string' || !fileName) return; 
        let s3Key = fileName;
        const parts = fileName.split('.');
        const extension = parts.pop().toLowerCase(); 
        const nameWithTimestamp = fileName.split('/').pop();
        const baseName = nameWithTimestamp.substring(nameWithTimestamp.indexOf('-') + 1);

        if (!fileGroupMap.has(baseName)) {
            fileGroupMap.set(baseName, { name: baseName, pdf: null, docx: null, zip: null, rar: null, exe: null, psd: null, jpg: null, png: null });
        }
        const fileGroup = fileGroupMap.get(baseName);
        if (['pdf', 'docx', 'zip', 'rar', 'exe', 'psd'].includes(extension)) fileGroup[extension] = s3Key;
        else if (['jpg', 'jpeg'].includes(extension)) fileGroup.jpg = s3Key;
        else if (extension === 'png') fileGroup.png = s3Key;
    });
    return Array.from(fileGroupMap.values());
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner}></div><p>กำลังโหลด...</p></div>;
  if (error) return <div className={styles.errorMessage}><p>Error: {error}</p><button onClick={() => navigate(-1)} className={styles.backButton}><ChevronLeft /> กลับ</button></div>;
  if (!document) return <div className={styles.noDocumentFound}><p>ไม่พบเอกสาร</p></div>;

  let files = {};
  try {
      files = (typeof document.file_paths === 'string') ? JSON.parse(document.file_paths) : document.file_paths || {};
  } catch (e) { files = {}; }

  const processedFiles = processFilesForTable(files);

  const renderDownloadLink = (fileName) => {
    if (!fileName) return <span className={tableStyles.noFile}></span>; 
    const downloadUrl = `${import.meta.env.VITE_API_URL}/api/download?key=${encodeURIComponent(fileName)}`;
    return (
      <a href={downloadUrl} className={tableStyles.downloadLink} target="_blank" rel="noopener noreferrer">
        <Download size={16} /> 
      </a>
    );
  };

  return (
    <div className={styles.container}>
      <button onClick={() => navigate(-1)} className={styles.backButton}><ChevronLeft size={20} /> กลับไปยังหน้าก่อนหน้า</button>
      <div className={styles.mainContent}>
        <h1 className={styles.title}>{document.title}</h1>
        <p className={styles.documentType}>{document.document_type || 'N/A'}</p>
        <div className={styles.detailsList}>
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
          <h2>ไฟล์แนบ</h2>
          {processedFiles.length > 0 ? (
            <div className={tableStyles.fileTableContainer}>
                <table className={tableStyles.fileTable}>
                <thead>
                  <tr><th>ชื่อ</th><th>PDF</th><th>DOCX</th><th>ZIP/RAR</th><th>EXE</th><th>PSD</th><th>IMG</th></tr>
                </thead>
                <tbody>
                  {processedFiles.map((file, index) => (
                    <tr key={index}>
                      <td className={tableStyles.fileTableName}>{file.name}</td>
                      <td>{renderDownloadLink(file.pdf)}</td>
                      <td>{renderDownloadLink(file.docx)}</td>
                      <td>{renderDownloadLink(file.zip)}{renderDownloadLink(file.rar)}</td>
                      <td>{renderDownloadLink(file.exe)}</td>
                      <td>{renderDownloadLink(file.psd)}</td>
                      <td>{renderDownloadLink(file.jpg)}{renderDownloadLink(file.png)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p>ไม่พบไฟล์แนบ</p>}
        </div>
      </div>
      <footer className={styles.footer}><p className={styles.footerText}>Copyright © 2025</p></footer>
    </div>
  );
};
export default DocumentDetails;