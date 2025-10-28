import React, { useEffect, useState } from 'react'; // ต้อง import useState และ useEffect

function App() {
  const [documents, setDocuments] = useState([]); // state สำหรับเก็บข้อมูลเอกสาร
  const [error, setError] = useState(null);       // state สำหรับเก็บข้อผิดพลาด (ถ้ามี)
  const [loading, setLoading] = useState(true);   // state สำหรับสถานะการโหลดข้อมูล

  useEffect(() => {
    // ฟังก์ชันนี้จะทำงานเมื่อ Component ถูก Mount (โหลดครั้งแรก)
    const fetchDocuments = async () => {
      try {
        // ดึงข้อมูลจาก Backend API ของคุณ
        // ตรวจสอบให้แน่ใจว่า URL ตรงกับที่คุณรัน Node.js Server
        const response = await fetch('http://localhost:3001/'); // หรือ 'http://localhost:3001/api/documents' ถ้าคุณตั้งชื่อ route แบบนั้น

        if (!response.ok) { // ตรวจสอบว่าการตอบกลับสำเร็จหรือไม่ (status 200-299)
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json(); // แปลง response เป็น JSON
        setDocuments(data); // อัปเดต state ด้วยข้อมูลที่ได้
      } catch (err) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", err);
        setError(err.message); // เก็บข้อความผิดพลาด
      } finally {
        setLoading(false); // ไม่ว่าจะสำเร็จหรือผิดพลาด ก็หยุดสถานะการโหลด
      }
    };

    fetchDocuments(); // เรียกใช้ฟังก์ชันดึงข้อมูล
  }, []); // [] หมายความว่า useEffect จะทำงานแค่ครั้งเดียวเมื่อ Component โหลดเสร็จ

  if (loading) {
    return <div>กำลังโหลดข้อมูล...</div>;
  }

  if (error) {
    return <div>เกิดข้อผิดพลาด: {error}</div>;
  }

  return (
    <div className="App">
      <h1>รายการเอกสาร</h1>
      {documents.length > 0 ? (
        <ul>
          {documents.map(doc => (
            // ตรวจสอบให้แน่ใจว่า 'id' เป็นชื่อ field ที่ถูกต้องในตาราง documents ของคุณ
            // และ 'name'/'title' เป็น field ที่คุณต้องการแสดง
            <li key={doc.id}>
              {doc.name || doc.title || JSON.stringify(doc)} {/* แสดงชื่อหรือหัวข้อ หรือ Object ทั้งหมดถ้าไม่มี */}
            </li>
          ))}
          {documents.map(doc => (
            // ตรวจสอบให้แน่ใจว่า 'id' เป็นชื่อ field ที่ถูกต้องในตาราง documents ของคุณ
            // และ 'name'/'title' เป็น field ที่คุณต้องการแสดง
            <li key={doc.id}>
              {doc.author || doc.title || JSON.stringify(doc)} {/* แสดงชื่อผู้เขียนหรือหัวข้อ หรือ Object ทั้งหมดถ้าไม่มี */}
            </li>
          ))}
          {documents.map(doc => (
            // ตรวจสอบให้แน่ใจว่า 'id' เป็นชื่อ field ที่ถูกต้องในตาราง documents ของคุณ
            // และ 'name'/'title' เป็น field ที่คุณต้องการแสดง
            <li key={doc.id}>
              สาขา: {doc.department || doc.title || JSON.stringify(doc)} {/* แสดงชื่อผู้เขียนหรือหัวข้อ หรือ Object ทั้งหมดถ้าไม่มี */}
            </li>
          ))}
        </ul>
        
      ) : (
        <p>ไม่พบเอกสารใดๆ</p>
      )}
    </div>
    
  );
}

export default App;