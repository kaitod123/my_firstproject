import React, { useEffect, useState } from 'react';
import { Search, Menu, User } from 'lucide-react';

function App() {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        // ดึงข้อมูลจาก Backend API ของคุณ
        const response = await fetch('http://localhost:3001/'); // หรือ URL ที่คุณตั้งค่าไว้

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setDocuments(data);
      } catch (err) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const filteredDocuments = documents.filter(doc =>
    (doc.title || doc.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.author || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.department || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f9fafb', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            border: '2px solid #e5e7eb',
            borderTop: '2px solid #2563eb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280' }}>กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f9fafb', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center', color: '#dc2626' }}>
          <p>เกิดข้อผิดพลาด: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 24px',
  background: 'linear-gradient(135deg, #3b82f6 0%, #3b82f6 100%)',
  color: 'white',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  marginBottom: '24px'
}}></div>

      {/* Header */}
      <header style={{ 
        backgroundColor: 'white', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid #e5e7eb'
      }}>
        
      </header>

      {/* Main Content */}
      <main style={{ 
        maxWidth: '1280px', 
        margin: '0 auto', 
        padding: '32px 16px'
      }}>
        {filteredDocuments.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {filteredDocuments.map(doc => (
              <div key={doc.id} style={{ 
                backgroundColor: 'white', 
                borderRadius: '8px', 
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '24px' }}>
                  {/* Document Info Table */}
                  <div style={{ border: '1px solid #d1d5db' }}>
                    
                    {/* Title Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', borderBottom: '1px solid #d1d5db' }}>
                      <div style={{ 
                        backgroundColor: '#f9fafb', 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#111827',
                        borderRight: '1px solid #d1d5db'
                      }}>
                        ชื่อเรื่อง
                      </div>
                      <div style={{ 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        color: '#374151'
                      }}>
                        {doc.title || doc.name || JSON.stringify(doc)}
                      </div>
                    </div>

                    {/* Author Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', borderBottom: '1px solid #d1d5db' }}>
                      <div style={{ 
                        backgroundColor: '#f9fafb', 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#111827',
                        borderRight: '1px solid #d1d5db'
                      }}>
                        ผู้จัดทำ
                      </div>
                      <div style={{ 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        color: '#374151'
                      }}>
                        {doc.author || doc.name || JSON.stringify(doc)}
                      </div>
                    </div>
                    {/* ID Srudent */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', borderBottom: '1px solid #d1d5db' }}>
                      <div style={{ 
                        backgroundColor: '#f9fafb', 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#111827',
                        borderRight: '1px solid #d1d5db'
                      }}>รหัส</div>
                                            <div style={{ 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        color: '#374151'
                      }}>
                        {doc.author || doc.name || JSON.stringify(doc)}
                      </div>
                    </div>
                    {/* Subject Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', borderBottom: '1px solid #d1d5db' }}>
                      <div style={{ 
                        backgroundColor: '#f9fafb', 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#111827',
                        borderRight: '1px solid #d1d5db'
                      }}>
                        วิชา
                      </div>
                      <div style={{ 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        color: '#374151'
                      }}>
                        {doc.field || doc.name || JSON.stringify(doc)}
                      </div>
                    </div>

                    {/* Department Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', borderBottom: '1px solid #d1d5db' }}>
                      <div style={{ 
                        backgroundColor: '#f9fafb', 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#111827',
                        borderRight: '1px solid #d1d5db'
                      }}>
                        สาขา
                      </div>
                      <div style={{ 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        color: '#374151'
                      }}>
                        {doc.department || doc.name || JSON.stringify(doc)}
                      </div>
                    </div>

                    {/* Advisor Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', borderBottom: '1px solid #d1d5db' }}>
                      <div style={{ 
                        backgroundColor: '#f9fafb', 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#111827',
                        borderRight: '1px solid #d1d5db'
                      }}>
                        อาจารย์ที่ปรึกษา
                      </div>
                      <div style={{ 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        color: '#374151'
                      }}>
                        {doc.advisor || doc.name || JSON.stringify(doc)}
                      </div>
                    </div>

                    {/* Abstract Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', borderBottom: '1px solid #d1d5db' }}>
                      <div style={{ 
                        backgroundColor: '#f9fafb', 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#111827',
                        borderRight: '1px solid #d1d5db'
                      }}>
                        บทคัดย่อ
                      </div>
                      <div style={{ 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        color: '#374151'
                      }}>
                        {doc.abstract || doc.summary || doc.name || JSON.stringify(doc)}
                      </div>
                    </div>

                    {/* Empty space */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', borderBottom: '1px solid #d1d5db' }}>
                      <div style={{ 
                        backgroundColor: '#f9fafb', 
                        padding: '64px 16px', 
                        borderRight: '1px solid #d1d5db'
                      }}>
                      </div>
                      <div style={{ 
                        padding: '64px 16px'
                      }}>
                      </div>
                    </div>

                    {/* Keywords Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', borderBottom: '1px solid #d1d5db' }}>
                      <div style={{ 
                        backgroundColor: '#f9fafb', 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#111827',
                        borderRight: '1px solid #d1d5db'
                      }}>
                        คำสำคัญ
                      </div>
                      <div style={{ 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        color: '#374151'
                      }}>
                        {doc.keywords || doc.name || JSON.stringify(doc)}
                      </div>
                    </div>

                    {/* Publisher Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', borderBottom: '1px solid #d1d5db' }}>
                      <div style={{ 
                        backgroundColor: '#f9fafb', 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#111827',
                        borderRight: '1px solid #d1d5db'
                      }}>
                        ผู้พิมพ์
                      </div>
                      <div style={{ 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        color: '#374151'
                      }}>
                        {doc.publisher || doc.name || JSON.stringify(doc)}
                      </div>
                    </div>

                    {/* Date Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', borderBottom: '1px solid #d1d5db' }}>
                      <div style={{ 
                        backgroundColor: '#f9fafb', 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#111827',
                        borderRight: '1px solid #d1d5db'
                      }}>
                        วันที่
                      </div>
                      <div style={{ 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        color: '#374151'
                      }}>
                        {doc.publishDate || doc.date || doc.created_at || doc.name || JSON.stringify(doc)}
                      </div>
                    </div>

                    {/* Language Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', borderBottom: '1px solid #d1d5db' }}>
                      <div style={{ 
                        backgroundColor: '#f9fafb', 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#111827',
                        borderRight: '1px solid #d1d5db'
                      }}>
                        ประเทศ
                      </div>
                      <div style={{ 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        color: '#374151'
                      }}>
                        {doc.language || doc.country || doc.name || JSON.stringify(doc)}
                      </div>
                    </div>

                    {/* Type Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr' }}>
                      <div style={{ 
                        backgroundColor: '#f9fafb', 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#111827',
                        borderRight: '1px solid #d1d5db'
                      }}>
                        รูปแบบของเอกสาร
                      </div>
                      <div style={{ 
                        padding: '12px 16px', 
                        fontSize: '14px', 
                        color: '#374151'
                      }}>
                        {doc.type || doc.format || doc.name || JSON.stringify(doc)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <p style={{ color: '#6b7280', fontSize: '18px' }}>
              {searchTerm ? `ไม่พบเอกสารที่ตรงกับคำค้นหา "${searchTerm}"` : 'ไม่พบเอกสารใดๆ'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default ShowDataSystem;