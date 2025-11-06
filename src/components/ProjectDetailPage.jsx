import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
// (แนะนำ) สร้างไฟล์ CSS ของคุณเองสำหรับหน้านี้
import styles from '../styles/ProjectDetailPage.module.css'; 

const ProjectDetailPage = () => {
  // 1. ดึงเลข id จาก URL (เช่น /documents/5)
  const { id } = useParams(); 
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 2. ฟังก์ชันสำหรับดึงข้อมูล
    const fetchDocument = async () => {
      setLoading(true);
      setError(null);
      console.log(`Attempting to fetch document with id: ${id}`); // Log นี้จะช่วยคุณ
      try {
        
        // (!!!) นี่คือส่วนที่แก้ไข (!!!)
        // เราเรียกไปที่ /api/documents/:id ไม่ใช่ /documents/:id
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/documents/${id}`
        );
        
        console.log("Fetch successful:", response.data); // Log นี้จะช่วยคุณ
        setDocument(response.data);

      } catch (err) {
        console.error("Error fetching document:", err);
        // (!!!) นี่คือ Log "Ze" ที่คุณเห็นครับ (เกิดจาก Error)
        // มันจะหายไปเมื่อ URL ถูกต้อง
        setError('ไม่พบเอกสาร หรือเกิดข้อผิดพลาดในการโหลด');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDocument();
    }
  }, [id]); // 3. ให้ดึงข้อมูลใหม่ทุกครั้งที่ id ใน URL เปลี่ยน

  if (loading) {
    return <div style={{ padding: '20px' }}>กำลังโหลดข้อมูล...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
  }

  if (!document) {
    return <div style={{ padding: '20px' }}>ไม่พบข้อมูล</div>;
  }

  // 4. เมื่อโหลดสำเร็จ ให้แสดงผลข้อมูล
  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <Link to="/DeleteDashboard" style={{ color: '#007bff', textDecoration: 'none' }}>
        &larr; กลับไปหน้าจัดการ
      </Link>
      
      <h1 style={{ marginTop: '20px' }}>{document.title}</h1>
      <p><strong>ผู้จัดทำ:</strong> {document.author}</p>
      <p><strong>สาขาวิชา:</strong> {document.department}</p>
      <p><strong>ปีที่เผยแพร่:</strong> {document.publish_year ? document.publish_year + 543 : 'N/A'}</p>
      
      <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '5px', marginTop: '30px' }}>บทคัดย่อ</h3>
      <p style={{ lineHeight: '1.6' }}>{document.abstract || 'ไม่มีบทคัดย่อ'}</p>

      {/* คุณสามารถเพิ่มการแสดงผลไฟล์ PDF, รูปภาพ หรืออื่นๆ 
        จาก document.file_paths ได้ที่นี่ 
      */}
    </div>
  );
};

export default ProjectDetailPage;