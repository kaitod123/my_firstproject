
import React, { useState, useEffect } from 'react';
import { Search, User, Clock, FileText, Download, Filter } from 'lucide-react';

const DocumentManagementSystem = () => {
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Sample data  
  const sampleDocuments = [
    {
      id: 1,
      title: "สภาพแวดล้อมเพื่อพัฒนาในการสร้างฐานข้อมูลรายงานเพื่อความพร้อมด้านความปลอดภัยสำหรับหน่วยงานรัฐในเทศกาลสำคัญสาขาวิชาวิศวกรรมศาสตร์คอมพิวเตอร์และวิศวกรรมศาสตร์",
      document_name: "Name: สมคิด ชุมแสง",
      author: "สมคิด ชุมแสง",
      department: "วิทยาการคอมพิวเตอร์",
      publish_year: 2550,
      document_type: "IOT",
      language: "ไทย",
      created_at: "2553-06-05",
      keywords: "ความเพื่อพัฒนาในการสร้างฐานข้อมูล",
      files: [
        { name: "unuresearch52-04-top.pdf", size: "14.48 KB", type: "pdf" },
        { name: "File_Web_site.zip", size: "2.20 MB", type: "zip" },
        { name: "poster", size: "20.50 KB", type: "image" },
        { name: "unuresearch52-04-top.docx", size: "14.48 KB", type: "docx" },
        { name: "program", size: "1.2 MB", type: "program" }
      ],
      categories: ["วิทยาการคอมพิวเตอร์", "ฐานข้อมูล", "ความปลอดภัย", "IOT"]
    },
    {
      id: 2,
      title: "การพัฒนาระบบจัดการข้อมูลออนไลน์สำหรับสถาบันการศึกษา",
      document_name: "ระบบจัดการข้อมูล",
      author: "นางสาวสมใจ ใจดี",
      department: "วิทยาการคอมพิวเตอร์",
      publish_year: 2552,
      document_type: "Research",
      language: "ไทย",
      created_at: "2552-08-15",
      keywords: "ระบบจัดการข้อมูล, การศึกษา, ออนไลน์",
      files: [
        { name: "research_report.pdf", size: "5.2 MB", type: "pdf" },
        { name: "source_code.zip", size: "850 KB", type: "zip" }
      ],
      categories: ["วิทยาการคอมพิวเตอร์", "ระบบจัดการ"]
    },
    {
      id: 3,
      title: "การศึกษาเปรียบเทียบอัลกอริทึมการเรียนรู้ของเครื่องสำหรับการจำแนกข้อมูล",
      document_name: "Machine Learning Algorithms",
      author: "ผศ.ดร.วิชาญ เก่งมาก",
      department: "ระบบสารสนเทศเพื่อการจัดการ",
      publish_year: 2551,
      document_type: "Thesis",
      language: "ไทย",
      created_at: "2551-12-20",
      keywords: "machine learning, อัลกอริทึม, การจำแนก",
      files: [
        { name: "thesis_full.pdf", size: "12.8 MB", type: "pdf" },
        { name: "presentation.pptx", size: "3.4 MB", type: "pptx" },
        { name: "dataset.csv", size: "2.1 MB", type: "csv" }
      ],
      categories: ["ระบบสารสนเทศเพื่อการจัดการ", "Machine Learning", "วิทยานิพนธ์"]
    },
    {
      id: 4,
      title: "การออกแบบและพัฒนาระบบการจัดการคลังสินค้าอัตโนมัติ",
      document_name: "Automated Warehouse Management",
      author: "นายพิชัย เทคโนโลยี",
      department: "เทคโนโลยีสารสนเทศ",
      publish_year: 2553,
      document_type: "IOT",
      language: "ไทย",
      created_at: "2553-11-10",
      keywords: "การจัดการคลังสินค้า, อัตโนมัติ, IoT",
      files: [
        { name: "warehouse_system.pdf", size: "8.5 MB", type: "pdf" },
        { name: "demo_video.mp4", size: "25.3 MB", type: "video" },
        { name: "source_code.zip", size: "1.8 MB", type: "zip" }
      ],
      categories: ["เทคโนโลยีสารสนเทศ", "IOT", "ระบบอัตโนมัติ"]
    },
    {
      id: 5,
      title: "การวิเคราะห์และออกแบบเว็บแอปพลิเคชันสำหรับการเรียนการสอนออนไลน์",
      document_name: "E-Learning Web Application",
      author: "อ.ดร.สมศรี เก่งเว็บ",
      department: "วิทยาการคอมพิวเตอร์",
      publish_year: 2552,
      document_type: "WebSite",
      language: "ไทย",
      created_at: "2552-05-20",
      keywords: "e-learning, web application, การเรียนการสอน",
      files: [
        { name: "elearning_WebSite.pdf", size: "6.7 MB", type: "pdf" },
        { name: "prototype.zip", size: "4.2 MB", type: "zip" },
        { name: "user_manual.pdf", size: "1.5 MB", type: "pdf" }
      ],
      categories: ["วิทยาการคอมพิวเตอร์", "E-Learning", "Web Development"]
    },
    {
      id: 6,
      title: "การออกแบบระบบเกมวางแผนการรบแบบเรียลไทม์",
      document_name: "E-Learning Web Application",
      author: "อ.ดร.สมศรี เก่งเว็บ",
      department: "วิทยาการคอมพิวเตอร์",
      publish_year: 2552,
      document_type: "Game",
      language: "ไทย",
      created_at: "2552-05-20",
      keywords: "e-learning, web application, การเรียนการสอน",
      files: [
        { name: "elearning_WebSite.pdf", size: "6.7 MB", type: "pdf" },
        { name: "prototype.zip", size: "4.2 MB", type: "zip" },
        { name: "user_manual.pdf", size: "1.5 MB", type: "pdf" }
      ],
      categories: ["วิทยาการคอมพิวเตอร์", "E-Learning", "Web Development"]
    }
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setDocuments(sampleDocuments);
      setFilteredDocuments(sampleDocuments);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [searchTerm, departmentFilter, yearFilter, typeFilter, documents]);

  const filterDocuments = () => {
    let filtered = documents.filter(doc => {
      const matchesSearch = !searchTerm || 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.keywords.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDepartment = !departmentFilter || doc.department === departmentFilter;
      const matchesYear = !yearFilter || doc.publish_year.toString() === yearFilter;
      const matchesType = !typeFilter || doc.document_type === typeFilter;

      return matchesSearch && matchesDepartment && matchesYear && matchesType;
    });

    setFilteredDocuments(filtered);
  };

  const getStats = () => {
    const totalFiles = filteredDocuments.reduce((sum, doc) => sum + doc.files.length, 0);
    const totalSize = filteredDocuments.reduce((sum, doc) => {
      return sum + doc.files.reduce((fileSum, file) => {
        const size = parseFloat(file.size.replace(/[^\d.]/g, ''));
        const unit = file.size.match(/[A-Z]+/)?.[0];
        return fileSum + (unit === 'MB' ? size : size / 1024);
      }, 0);
    }, 0);

    const totalCategories = [...new Set(filteredDocuments.flatMap(doc => doc.categories))].length;

    return {
      totalDocuments: filteredDocuments.length,
      totalFiles,
      totalCategories,
      totalSize: totalSize.toFixed(2)
    };
  };

  const stats = getStats();

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f3e8ff 0%, #e0e7ff 100%)',
      fontFamily: 'Arial, sans-serif'
    },
    wrapper: {
      maxWidth: 'auto',
      margin: '0 auto',
      padding: '32px 16px'
    },
    header: {
      background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
      color: 'white',
      borderRadius: '16px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      padding: '48px 530px',
      marginBottom: '32px',
      textAlign: 'center'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      marginBottom: '16px',
      margin: 0
    },
    subtitle: {
      fontSize: '1.25rem',
      opacity: 0.9,
      margin: 0
    },
    searchSection: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      padding: '24px',
      marginBottom: '32px'
    },
    searchContainer: {
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
      flexWrap: 'wrap'
    },
    searchInputWrapper: {
      flex: 1,
      position: 'relative',
      minWidth: '300px'
    },
    searchInput: {
      width: '100%',
      paddingLeft: '40px',
      paddingRight: '16px',
      paddingTop: '12px',
      paddingBottom: '12px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '16px',
      outline: 'none',
      transition: 'all 0.2s',
      boxSizing: 'border-box'
    },
    searchIcon: {
      position: 'absolute',
      left: '12px',
      top: '12px',
      color: '#9ca3af',
      width: '20px',
      height: '20px'
    },
    searchButton: {
      padding: '12px 32px',
      background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s',
      minWidth: 'auto'
    },
    filterContainer: {
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    filterLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151'
    },
    select: {
      padding: '8px 12px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer',
      backgroundColor: 'white'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '24px',
      marginBottom: '32px'
    },
    statCard: {
      padding: '24px',
      borderRadius: '12px',
      color: 'white',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      textAlign: 'center'
    },
    statNumber: {
      fontSize: '2rem',
      fontWeight: 'bold',
      marginBottom: '8px'
    },
    statLabel: {
      fontSize: '14px',
      opacity: 0.9
    },
    documentsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
      gap: '24px'
    },
    documentCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      border: '1px solid #f3f4f6',
      transition: 'all 0.3s',
      cursor: 'pointer'
    },
    cardHeader: {
      height: '4px',
      background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)'
    },
    cardContent: {
      padding: '24px'
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '16px',
      lineHeight: '1.4'
    },
    cardDetails: {
      marginBottom: '16px'
    },
    cardDetail: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      color: '#6b7280',
      marginBottom: '8px'
    },
    cardIcon: {
      width: '16px',
      height: '16px',
      color: '#6366f1'
    },
    filesSection: {
      borderTop: '1px solid #e5e7eb',
      paddingTop: '16px'
    },
    filesTitle: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '8px'
    },
    fileItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px',
      color: '#6b7280',
      marginBottom: '4px'
    },
    fileIcon: {
      width: '12px',
      height: '12px',
      color: '#10b981'
    },
    categories: {
      marginTop: '16px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px'
    },
    categoryTag: {
      padding: '4px 8px',
      background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
      color: 'white',
      fontSize: '12px',
      borderRadius: '12px'
    },
    loading: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 0',
      textAlign: 'center'
    },
    spinner: {
      width: '48px',
      height: '48px',
      border: '3px solid #f3f4f6',
      borderTop: '3px solid #3b82f6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '16px'
    },
    noResults: {
      textAlign: 'center',
      padding: '48px 0'
    },
    noResultsIcon: {
      width: '64px',
      height: '64px',
      color: '#d1d5db',
      margin: '0 auto 16px'
    },
    noResultsTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '8px'
    },
    noResultsText: {
      color: '#6b7280'
    }
  };

  const StatCard = ({ number, label, gradient }) => (
    <div style={{
      ...styles.statCard,
      background: gradient
    }}>
      <div style={styles.statNumber}>{number}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );

  const DocumentCard = ({ doc }) => (
    <div 
      style={styles.documentCard}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      }}
    >
      <div style={styles.cardHeader}></div>
      <div style={styles.cardContent}>
        <h3 style={styles.cardTitle}>{doc.title}</h3>
        
        <div style={styles.cardDetails}>
          <div style={styles.cardDetail}>
            <User style={styles.cardIcon} />
            <span><strong>ผู้แต่ง:</strong> {doc.author}</span>
          </div>
          <div style={styles.cardDetail}>
            <Clock style={styles.cardIcon} />
            <span><strong>แผนก:</strong> {doc.department}</span>
          </div>
          <div style={styles.cardDetail}>
            <FileText style={styles.cardIcon} />
            <span><strong>ปี:</strong> {doc.publish_year} | <strong>ประเภท:</strong> {doc.document_type}</span>
          </div>
        </div>

        <div style={styles.filesSection}>
          <div style={styles.filesTitle}>
            ไฟล์แนบ ({doc.files.length} ไฟล์)
          </div>
          <div>
            {doc.files.slice(0, 3).map((file, index) => (
              <div key={index} style={styles.fileItem}>
                <Download style={styles.fileIcon} />
                <span>{file.name} ({file.size})</span>
              </div>
            ))}
            {doc.files.length > 3 && (
              <div style={{...styles.fileItem, color: '#9ca3af'}}>
                และอีก {doc.files.length - 3} ไฟล์...
              </div>
            )}
          </div>
        </div>

        <div style={styles.categories}>
          {doc.categories.map((category, index) => (
            <span key={index} style={styles.categoryTag}>
              {category}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const LoadingSpinner = () => (
    <div style={styles.loading}>
      <div style={styles.spinner}></div>
      <p style={{color: '#6b7280'}}>กำลังโหลดข้อมูล...</p>
    </div>
  );

  const NoResults = () => (
    <div style={styles.noResults}>
      <Search style={styles.noResultsIcon} />
      <h3 style={styles.noResultsTitle}>ไม่พบเอกสารที่ค้นหา</h3>
      <p style={styles.noResultsText}>กรุณาลองเปลี่ยนคำค้นหาหรือเงื่อนไขการกรอง</p>
    </div>
  );

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      <div style={styles.wrapper}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>ระบบจัดการเอกสาร</h1>
          <p style={styles.subtitle}>ค้นหาและจัดการเอกสารงานวิจัยอย่างมีประสิทธิภาพ</p>
        </div>

        {/* Search and Filters */}
        <div style={styles.searchSection}>
          <div style={styles.searchContainer}>
            <div style={styles.searchInputWrapper}>
              <Search style={styles.searchIcon} />
              <input
                type="text"
                placeholder="ค้นหาเอกสาร, ผู้แต่ง, หรือคำสำคัญ..."
                style={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            <button 
              style={styles.searchButton}
              onMouseEnter={(e) => e.target.style.background = 'linear-gradient(135deg, #6d28d9 0%, #2563eb 100%)'}
              onMouseLeave={(e) => e.target.style.background = 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)'}
            >
              <Search style={{width: '20px', height: '20px'}} />
              ค้นหา
            </button>
          </div>

          <div style={styles.filterContainer}>
            <div style={styles.filterLabel}>
              <Filter style={{width: '16px', height: '16px', color: '#6b7280'}} />
              <span>กรองตาม:</span>
            </div>
            <select
              style={styles.select}
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="" >สาขา</option>
              <option value="วิทยาการคอมพิวเตอร์">วิทยาการคอมพิวเตอร์</option>
              <option value="เทคโนโลยีสารสนเทศ">เทคโนโลยีสารสนเทศ</option>
              <option value="ระบบสารสนเทศเพื่อการจัดการ">ระบบสารสนเทศเพื่อการจัดการ</option>
            </select>
            <select
              style={styles.select}
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="">ทุกปี</option>
              <option value="2553">2553</option>
              <option value="2552">2552</option>
              <option value="2551">2551</option>
              <option value="2550">2550</option>
            </select>
            <select
              style={styles.select}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">ทุกประเภท</option>
              <option value="IOT">IOT</option>
              <option value="WebSite">เว็บไซต์</option>
              <option value="Game">เกม</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.statsGrid}>
          <StatCard 
            number={stats.totalDocuments} 
            label="เอกสารทั้งหมด"
            gradient="linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)"
          />
          <StatCard 
            number={stats.totalFiles} 
            label="ไฟล์ทั้งหมด"
            gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
          />
          <StatCard 
            number={stats.totalCategories} 
            label="หมวดหมู่"
            gradient="linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)"
          />
          <StatCard 
            number={`${stats.totalSize} MB`} 
            label="ขนาดไฟล์รวม"
            gradient="linear-gradient(135deg, #ec4899 0%, #be185d 100%)"
          />
        </div>

        {/* Documents */}
        {loading ? (
          <LoadingSpinner />
        ) : filteredDocuments.length === 0 ? (
          <NoResults />
        ) : (
          <div style={styles.documentsGrid}>
            {filteredDocuments.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default DocumentManagementSystem;