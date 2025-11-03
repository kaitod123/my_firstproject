// src/components/DocumentManagementSystem.jsx
import React, { useState, useEffect } from 'react';
// (เพิ่ม) Import Icon อาจารย์ที่ปรึกษา (สมมติว่าใช้ User)
import { Search, User, Clock, FileText, Download, Filter, CircuitBoard, Globe, Gamepad2, AppWindowIcon, Apple, Bot, Database, Menu } from 'lucide-react'; 
import { useNavigate, useLocation } from 'react-router-dom';
import styles from '../styles/DocumentManagementSystem.module.css';

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const DocumentManagementSystem = () => {
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  // (แก้ไข) FIX: ใช้ useState(null)
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const categories = [
    { label: 'ทั้งหมด', value: '', icon: null }, 
    { label: 'IOT', value: 'IOT', icon: CircuitBoard },
    { label: 'Website', value: 'Website', icon: Globe },
    { label: 'เกม', value: 'Game', icon: Gamepad2 },
     { label: 'Web Application', value: 'WebApplication', icon:AppWindowIcon },
    { label: 'Application', value: 'Application', icon: Apple },
    { label: 'AI', value: 'AI', icon: Bot },
     { label: 'Data Mining', value: 'DataMining', icon:Database },
    { label: 'อื่นๆ', value: 'อื่นๆ', icon: Menu },

  ];

  const categoryContainerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '15px', 
    paddingBottom: '15px',
    borderBottom: '1px solid #eee' 
  };

  const getCategoryButtonStyle = (categoryValue) => {
    const isActive = typeFilter === categoryValue;
    return {
      padding: '8px 16px',
      borderRadius: '20px',
      border: '1px solid #ddd',
      backgroundColor: isActive ? '#4f46e5' : '#ffffff', 
      color: isActive ? '#ffffff' : '#333',
      cursor: 'pointer',
      fontWeight: isActive ? 'bold' : 'normal',
      transition: 'all 0.2s ease',
      fontSize: '14px',
      display: 'flex',       
      alignItems: 'center', 
      gap: '8px'             
    };
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlSearchTerm = params.get('search') || '';
    setSearchTerm(urlSearchTerm);
  }, [location.search]);

  useEffect(() => {
     const fetchDocuments = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        queryParams.append('status', 'active');
        if (searchTerm) queryParams.append('search', searchTerm);
        if (departmentFilter) queryParams.append('department', departmentFilter);
        if (yearFilter) {
          const christianYear = parseInt(yearFilter, 10) - 543;
          queryParams.append('year', christianYear.toString());
        }
        if (typeFilter) queryParams.append('type', typeFilter); 

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/documents?${queryParams.toString()}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        const processedDocuments = data.map(doc => {
            let categories = [];
            if (doc.document_type && typeof doc.document_type === 'string') {
                categories = doc.document_type
                                .split(',') 
                                .map(cat => cat.trim()) 
                                .filter(cat => cat.length > 0); 
            }

            // (!! แก้ไข !!) เราจะเก็บ S3 Key (Path) แทน S3 URL เต็ม
            let frontFaceKey = null; 
            let filePathsObject = {};
            
            try {
                if (doc.file_paths) {
                    filePathsObject = (typeof doc.file_paths === 'string' && doc.file_paths.trim().startsWith('{')) 
                                        ? JSON.parse(doc.file_paths) 
                                        : doc.file_paths;

                    if (filePathsObject && filePathsObject.front_face && filePathsObject.front_face.length > 0) {
                        const fullUrl = filePathsObject.front_face[0]; // นี่คือ URL เต็ม (https://...)
                        
                        // (!! แก้ไข !!) แปลง URL เต็ม ให้เป็น S3 Key (ลบ https://.../ ออก)
                        try {
                             const url = new URL(fullUrl);
                             // Key จะเป็น /projects/field/timestamp-filename.ext (ต้องลบ / ตัวแรกออก)
                             frontFaceKey = url.pathname.substring(1); // ได้ "projects/front_face/..."
                        } catch (e) {
                             // ถ้าไม่ใช่ URL (อาจจะเป็น Key อยู่แล้ว)
                             frontFaceKey = fullUrl;
                        }
                    }
                }
            } catch (e) {
                console.error("Could not parse file_paths JSON for document ID:", doc.id, e); 
            }
            
            return {
                ...doc,
                keywords: doc.keywords || '',
                categories: categories, 
                files: [], 
                // (!! แก้ไข !!) เก็บ S3 Key แทน URL
                front_face_key: frontFaceKey 
            };
        });

        setDocuments(processedDocuments);
      } catch (err) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", err);
        setError(`ไม่สามารถดึงข้อมูลเอกสารได้: ${err.message}`);
        setDocuments([]); 
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [searchTerm, departmentFilter, yearFilter, typeFilter]); 

  const handleSearch = (e) => {
    e.preventDefault(); 
    const newSearchTerm = searchTerm.trim();
    const params = new URLSearchParams(location.search);
    if (newSearchTerm) {
      params.set('search', newSearchTerm);
    } else {
      params.delete('search');
    }
    navigate(`${location.pathname}?${params.toString()}`);
  };

  const generateYearOptions = () => {
    const currentBuddhistYear = new Date().getFullYear() + 543;
    const years = [];
    for (let i = 0; i < 15; i++) {
        years.push(currentBuddhistYear - i);
    }
    return years.map(year => <option key={year} value={year}>{year}</option>);
  };
    
  const getStats = () => {
    const totalFiles = documents.reduce((sum, doc) => sum + (doc.files ? doc.files.length : 0), 0);
    const totalSize = documents.reduce((sum, doc) => {
      return sum + (doc.files ? doc.files.reduce((fileSum, file) => {
        const size = parseFloat(file.size?.replace(/[^\d.]/g, '') || '0');
        const unit = file.size?.match(/[A-Z]+/)?.[0];
        return fileSum + (unit === 'MB' ? size : size / 1024);
      }, 0) : 0);
    }, 0);
    const totalCategories = [...new Set(documents.flatMap(doc => doc.categories || []))].length;

    return {
      totalDocuments: documents.length,
      totalFiles,
      totalCategories,
      totalSize: totalSize.toFixed(2)
    };
  };

  const stats = getStats();

  const reloadDocuments = () => {
    window.location.reload();
  };

  const StatCard = ({ number, label, gradient }) => (
    <div className={styles.statCard} style={{ background: gradient }}>
      <div className={styles.statNumber}>{number}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );


  const DocumentCard = ({ doc }) => {
    
    const handleClick = () => {
        const userData = JSON.parse(localStorage.getItem('user'));
        const userRole = userData ? userData.role : null;
        
        if (userRole === 'student') {
            navigate(`/student/documents/${doc.id}`); 
        } else if (userRole === 'admin' || userRole === 'advisor') {
            navigate(`/professor/documents/${doc.id}`);
        } else {
            navigate(`/documents/${doc.id}`);
        }
    };

    return (
      <div
        className={styles.documentCard}
        onClick={handleClick}
        style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }} //
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        }}
      >
        <div className={styles.cardHeader}></div>
        <div className={styles.cardContent} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '15px' }}> 
          
          <h3 
            className={styles.cardTitle}
            style={{ 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              maxWidth: '100%',
              fontSize: '16px', 
              lineHeight: '1.4',
              marginBottom: '10px' 
            }}
            title={doc.title} 
          >
            {doc.title}
          </h3>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '10px', minHeight: '170px' }}> 
            
            {/* 1. รูปภาพหน้าปก (ซ้ายมือ) */}
            <div className={styles.frontFaceContainer} style={{ width: '120px', minWidth: '120px', height: '170px', overflow: 'hidden', borderRadius: '4px', border: '1px solid #eee' }}>
              
              {/* (!! แก้ไข !!) ตรวจสอบ doc.front_face_key (S3 Key) */}
              {doc.front_face_key ? (
                  <img 
                      // (!! แก้ไข !!) src ชี้ไปที่ API Download ของเราแทน S3 URL ตรงๆ
                      src={`${import.meta.env.VITE_API_URL}/api/download/${doc.front_face_key}`} 
                      alt={`หน้าปกโครงงาน: ${doc.title}`} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { 
                          e.target.onerror = null; 
                          e.target.closest('div').innerHTML = '<div style="width:100%; height:100%; background:#f3f4f6; display:flex; align-items:center; justify-content:center; font-size:12px; color:#9ca3af; text-align:center;">Load Error</div>'; 
                      }} 
                  />
              ) : (
                  <div style={{ width: '100%', height: '100%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '12px', textAlign: 'center' }}>
                      [ ไม่มีหน้าปก ]
                  </div>
              )}
            </div>

            {/* 2. รายละเอียดเอกสาร (ขวามือ) */}
            <div className={styles.cardDetails} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              
              <div className={styles.cardDetail}>
                <Clock className={styles.cardIcon} style={{ width: '16px', height: '16px' }} />
                <span><strong>สาขาวิชา:</strong> {doc.department}</span>
              </div>
              <div className={styles.cardDetail}>
                <FileText className={styles.cardIcon} style={{ width: '16px', height: '16px' }} />
                <span><strong>ปีที่เผยแพร่:</strong> {doc.publish_year ? doc.publish_year + 543 : 'N/A'} </span>
              </div>
            </div>
          </div>

          <div className={styles.cardAuthorSection} style={{ 
              marginTop: '15px', 
              paddingTop: '10px', 
              borderTop: '1px solid #f0f0f0', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px', 
              fontSize: '14px' 
          }}>
            <div className={styles.cardDetail}>
              <User className={styles.cardIcon} style={{ width: '16px', height: '16px' }} />
              <span><strong>ผู้แต่ง:</strong> {doc.author}</span>
            </div>
            <div className={styles.cardDetail}>
              <User className={styles.cardIcon} style={{ width: '16px', height: '16px' }} />
              <span><strong>ที่ปรึกษา:</strong> {doc.advisorName || doc.advisorname || 'N/A'}</span>
            </div>
          </div>
          <div 
            className={styles.categoryTagsContainer} 
            style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #eee' }}
          >
            {Array.isArray(doc.keywords) && doc.keywords.map((category, index) => (
                <span key={index} className={styles.categoryTag}>
                    {category}
                </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const LoadingSpinner = () => (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      <p style={{ color: '#6b7280' }}>กำลังโหลดข้อมูล...</p>
    </div>
  );

  const NoResults = () => (
    <div className={styles.noResults}>
      <Search className={styles.noResultsIcon} />
      <h3 className={styles.noResultsTitle}>ไม่พบเอกสารที่ค้นหา</h3>
      <p className={styles.noResultsText}>กรุณาลองเปลี่ยนคำค้นหาหรือเงื่อนไขการกรอง</p>
    </div>
  );

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className={styles.container} style={{ flex: 1 }}>
        <div className={styles.wrapper} style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '20px' }}>
          <div className={styles.searchSection}>
            <form className={styles.searchBar} onSubmit={handleSearch} style={{ display: 'flex', width: '100%', gap: '10px' }}>
              <input
                type="text"
                placeholder="ค้นหาชื่อโครงงาน, ผู้แต่ง, หรือคำสำคัญ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
                style={{ flex: 1, minWidth: 0 }} 
              />
              <button type="submit" className={styles.searchButton} aria-label="Search">
                <Search style={{ width: '20px', height: '20px' }} />
                <span>ค้นหา</span>
              </button>
            </form>
            
            <div className={styles.filterContainer} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginTop: '15px' }}>
              <div className={styles.filterLabel}>
                <Filter style={{width: '16px', height: '16px', color: '#6b7280'}} />
                <span>กรองตาม:</span>
              </div>
              <select
                className={styles.select}
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                style={{ flex: 1, minWidth: '150px' }} 
              >
                <option value="">ทุกสาขา</option>
                <option value="วิทยาการคอมพิวเตอร์">วิทยาการคอมพิวเตอร์</option>
                <option value="เทคโนโลยีสารสนเทศ">เทคโนโลยีสารสนเทศ</option>
                <option value="ระบบสารสนเทศเพื่อการจัดการ">ระบบสารสนเทศเพื่อการจัดการ</option>
              </select>
              <select
                className={styles.select}
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                style={{ flex: 1, minWidth: '150px' }} 
              >
                <option value="">ทุกปี</option>
                {generateYearOptions()}
              </select>
              
            </div>

            <div style={categoryContainerStyle}>
              {categories.map((category) => {
                const IconComponent = category.icon; 
                return (
                  <button
                    key={category.value}
                    style={getCategoryButtonStyle(category.value)}
                    onClick={() => setTypeFilter(category.value)} 
                  >
                    {IconComponent && <IconComponent size={18} />} 
                    <span>{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          

          {error ? (
              <div className={styles.errorMessage}>
                  <p>Error: {error}</p>
                  <button onClick={reloadDocuments} className={styles.reloadButton}>ลองใหม่อGีกครั้ง</button>
              </div>
          ) : loading ? (
            <LoadingSpinner />
          ) : documents.length === 0 ? (
            <NoResults />
          ) : (
            <div 
              className={styles.documentsGrid} 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '20px', 
                marginTop: '20px' 
              }}
            >
              {documents.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </div>
      </div>
      <footer className={styles.footer} style={{ marginTop: 'auto' }}>
        <p className={styles.footerText}>© 2023 University Project Hub</p>
        <div className={styles.footerLinks}>
          <a href="#" className={styles.footerLink}>Contact Us</a>
          <a href="#" className={styles.footerLink}>Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
};

export default DocumentManagementSystem;

