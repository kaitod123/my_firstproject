import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from '../styles/Ufinal1.module.css'; // เรียกใช้ CSS ให้ตรงกับชื่อไฟล์จริง

function Ufinal() {
    const navigate = useNavigate();
    const [userId, setUserId] = useState(null);

    // State สำหรับเก็บข้อมูลฟอร์ม
    const [formData, setFormData] = useState({
        document_type: [],
        title: '',
        title_eng: '',
        author: '',
        co_author: '',
        abstract: '',
        advisorName: '',
        department: '',
        coAdvisorName: '',
        keywords: '',
        supportAgency: '',
        permission: false,
        complete_pdf: [],
        complete_doc: [],
        article_files: [],
        program_files: [],
        web_files: [],
        poster_files: [],
        certificate_files: [],
        front_face: [],
    });

    // State สำหรับ Autocomplete
    const [advisorSuggestions, setAdvisorSuggestions] = useState([]);
    const [coAdvisorSuggestions, setCoAdvisorSuggestions] = useState([]);
    const [coAuthorSuggestions, setCoAuthorSuggestions] = useState([]);

    // State สำหรับ Modal และการแจ้งเตือน
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [alertModalContent, setAlertModalContent] = useState({ title: '', message: '' });
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmModalContent, setConfirmModalContent] = useState({ title: '', message: '' });
    const [confirmModalAction, setConfirmModalAction] = useState(() => () => {});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State พิเศษ: เช็คว่าอัปโหลดสำเร็จหรือยัง (เพื่อใช้ตอนกด OK ใน Modal)
    const [uploadWasSuccessful, setUploadWasSuccessful] = useState(false);

    // ดึง User ID จาก LocalStorage
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                setUserId(user.id);
            } catch (e) {
                console.error("Failed to parse user data from localStorage", e);
            }
        }
    }, []);

    // ฟังก์ชันแสดง Alert Modal
    const showAlert = (title, message) => {
        setAlertModalContent({ title, message });
        setIsAlertModalOpen(true);
    };

    // ฟังก์ชัน Fetch Suggestions (อาจารย์/ผู้แต่ง)
    useEffect(() => {
        const fetchAdvisors = async (query, setSuggestions) => {
            if (query.length < 2) {
                setSuggestions([]);
                return;
            }
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/search-advisors?q=${query}`);
                if (response.ok) {
                    const data = await response.json();
                    setSuggestions(data);
                }
            } catch (error) {
                console.error('Error fetching advisors:', error);
            }
        };

        const fetchCoAuthors = async (query, setSuggestions) => {
             if (query.length < 2) {
                setSuggestions([]);
                return;
            }
             try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/search-authors?q=${query}`);
                if (response.ok) {
                    const data = await response.json();
                    setSuggestions(data);
                }
            } catch (error) {
                console.error('Error fetching co-authors:', error);
            }
        };
        
        if (formData.advisorName.length > 1) fetchAdvisors(formData.advisorName, setAdvisorSuggestions);
        if (formData.coAdvisorName.length > 1) fetchAdvisors(formData.coAdvisorName, setCoAdvisorSuggestions);
        if (formData.co_author.length > 1) fetchCoAuthors(formData.co_author, setCoAuthorSuggestions);

    }, [formData.advisorName, formData.coAdvisorName, formData.co_author]);

    // จัดการการเปลี่ยนแปลงข้อมูลใน Input
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            if (name === 'permission') {
                 setFormData(prev => ({ ...prev, [name]: checked }));
            } else {
                 handleCheckboxChange(name, value, checked);
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // จัดการ Checkbox หลายตัวเลือก (Document Type)
    const handleCheckboxChange = (name, value, checked) => {
        setFormData(prev => {
            const currentValues = prev[name] || [];
            if (checked) {
                return { ...prev, [name]: [...currentValues, value] };
            } else {
                return { ...prev, [name]: currentValues.filter(item => item !== value) };
            }
        });
    };

    // เมื่อคลิกเลือกจาก Suggestion
    const handleSuggestionClick = (field, suggestion) => {
        const fullName = `${suggestion.first_name || ''} ${suggestion.last_name || ''}`.trim();
        setFormData(prev => ({ ...prev, [field]: fullName }));
        
        if (field === 'advisorName') setAdvisorSuggestions([]);
        if (field === 'coAdvisorName') setCoAdvisorSuggestions([]);
        if (field === 'co_author') setCoAuthorSuggestions([]);
    };

    // จัดการการเลือกไฟล์
    const handleFileChange = (e) => {
        const { name, files } = e.target;
        if (files.length > 0) {
            const fileArray = Array.from(files); 
            setFormData(prev => ({
                ...prev,
                [name]: prev[name] ? prev[name].concat(fileArray) : fileArray
            }));
        }
        e.target.value = null; // Reset input เพื่อให้เลือกไฟล์เดิมซ้ำได้ถ้าต้องการ
    };
    
    // ลบไฟล์ที่เลือกไว้
    const removeFile = (fieldName, fileIndex) => {
         setFormData(prev => {
            const newFiles = [...prev[fieldName]];
            newFiles.splice(fileIndex, 1);
            return { ...prev, [fieldName]: newFiles };
         });
    };

    // แสดงรายการไฟล์ที่เลือก
    const renderFileList = (fieldName) => {
        if (!formData[fieldName] || formData[fieldName].length === 0) return null;
        return (
            <ul className={styles.fileList}>
                {formData[fieldName].map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                        <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                        <button type="button" onClick={() => removeFile(fieldName, index)} className={styles.removeFileButton}>&times;</button>
                    </li>
                ))}
            </ul>
        );
    };

    // ฟังก์ชันส่งข้อมูล (Submit)
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!userId) {
            showAlert('ข้อผิดพลาด', 'ไม่พบข้อมูลผู้ใช้ (User ID) กรุณาล็อกอินใหม่อีกครั้ง');
            return;
        }
        
        if (!formData.permission) {
            showAlert('ข้อผิดพลาด', 'กรุณายอมรับเงื่อนไขและยืนยันว่าเป็นข้อมูลจริง');
            return;
        }
        
        const allFiles = [
            ...formData.complete_pdf, ...formData.complete_doc, ...formData.article_files,
            ...formData.program_files, ...formData.web_files, ...formData.poster_files,
            ...formData.certificate_files, ...formData.front_face
        ];
        if (allFiles.length === 0) {
             showAlert('ข้อผิดพลาด', 'กรุณาอัปโหลดไฟล์โครงงานอย่างน้อย 1 ไฟล์');
             return;
        }
        
        if (isSubmitting) return;
        setIsSubmitting(true);
        setUploadWasSuccessful(false); 

        showAlert('กำลังอัปโหลด', 'กรุณารอสักครู่... ระบบกำลังบันทึกข้อมูลและไฟล์ของคุณ');

        const data = new FormData();
        const textFields = [
            'title', 'title_eng', 'author', 'co_author', 'abstract',
            'advisorName', 'department', 'coAdvisorName', 'keywords', 'supportAgency',
            'publish_year', 'scan_date', 'display_date', 'language'
        ];
        
        textFields.forEach(field => {
            if (formData[field]) data.append(field, formData[field]);
        });
        
        const documentTypesString = Array.isArray(formData.document_type) ? formData.document_type.join(',') : '';
        data.append('document_type', documentTypesString);
        data.append('userId', userId);

        const fileFields = [
            'complete_pdf', 'complete_doc', 'article_files', 'program_files', 
            'web_files', 'poster_files', 'certificate_files', 'front_face'
        ];
        
        fileFields.forEach(fieldName => {
            if (formData[fieldName] && formData[fieldName].length > 0) {
                formData[fieldName].forEach(file => {
                    data.append(fieldName, file, file.name);
                });
            }
        });

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload-project`, {
                method: 'POST',
                body: data,
            });

            const result = await response.json();

            if (response.ok) {
                setUploadWasSuccessful(true); 
                showAlert('อัปโหลดสำเร็จ', 'ระบบบันทึกข้อมูลโครงงานของคุณเรียบร้อยแล้ว');
            } else {
                showAlert('อัปโหลดไม่สำเร็จ', `เกิดข้อผิดพลาด: ${result.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Submit Error:', error);
            showAlert('เกิดข้อผิดพลาด', `ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.formContainer}>
            
            <div className={styles.formGroup}>
                <label htmlFor="title">ชื่อโครงงาน (ภาษาไทย) *</label>
                <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} required />
            </div>
            
             <div className={styles.formGroup}>
                <label htmlFor="title_eng">ชื่อโครงงาน (ภาษาอังกฤษ)</label>
                <input type="text" id="title_eng" name="title_eng" value={formData.title_eng} onChange={handleChange} />
            </div>

             <div className={styles.formRow}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label htmlFor="author">ผู้จัดทำ (Author) *</label>
                    <input type="text" id="author" name="author" value={formData.author} onChange={handleChange} required />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label htmlFor="co_author">ผู้จัดทำร่วม (Co-Author)</label>
                    <input type="text" id="co_author" name="co_author" value={formData.co_author} onChange={handleChange} autoComplete="off" />
                    {coAuthorSuggestions.length > 0 && (
                        <ul className={styles.suggestionsList}>
                            {coAuthorSuggestions.map(user => (
                                <li key={user.id} onClick={() => handleSuggestionClick('co_author', user)}>
                                    {user.first_name} {user.last_name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

             <div className={styles.formRow}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label htmlFor="advisorName">อาจารย์ที่ปรึกษา *</label>
                    <input type="text" id="advisorName" name="advisorName" value={formData.advisorName} onChange={handleChange} autoComplete="off" required />
                     {advisorSuggestions.length > 0 && (
                        <ul className={styles.suggestionsList}>
                            {advisorSuggestions.map(user => (
                                <li key={user.id} onClick={() => handleSuggestionClick('advisorName', user)}>
                                    {user.first_name} {user.last_name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label htmlFor="coAdvisorName">อาจารย์ที่ปรึกษาร่วม</label>
                    <input type="text" id="coAdvisorName" name="coAdvisorName" value={formData.coAdvisorName} onChange={handleChange} autoComplete="off" />
                    {coAdvisorSuggestions.length > 0 && (
                        <ul className={styles.suggestionsList}>
                            {coAdvisorSuggestions.map(user => (
                                <li key={user.id} onClick={() => handleSuggestionClick('coAdvisorName', user)}>
                                    {user.first_name} {user.last_name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="department">สาขาวิชา *</label>
                <select id="department" name="department" value={formData.department} onChange={handleChange} required>
                    <option value="">เลือกสาขาวิชา</option>
                    <option value="วิทยาการคอมพิวเตอร์">วิทยาการคอมพิวเตอร์</option>
                    <option value="เทคโนโลยีสารสนเทศ">เทคโนโลยีสารสนเทศ</option>
                    <option value="ระบบสารสนเทศเพื่อการจัดการ">ระบบสารสนเทศเพื่อการจัดการ</option>
                </select>
            </div>
            
            <div className={styles.formGroup}>
                <label htmlFor="abstract">บทคัดย่อ (Abstract)</label>
                <textarea id="abstract" name="abstract" value={formData.abstract} onChange={handleChange} rows="6" />
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="keywords">คำสำคัญ (Keywords)</label>
                <input type="text" id="keywords" name="keywords" value={formData.keywords} onChange={handleChange} placeholder="เช่น IOT, AI, DataMining (คั่นด้วย Comma)" />
            </div>
            
            <div className={styles.formGroup}>
                <label>ประเภทของโครงงาน (Document Type) *</label>
                <div className={styles.checkboxGrid}>
                    {['IOT', 'AI', 'DataMining', 'WebSite', 'WebApp', 'Application', 'เกม', 'อื่นๆ'].map(type => (
                        <label key={type}>
                            <input type="checkbox" name="document_type" value={type} checked={formData.document_type.includes(type)} onChange={handleChange} />
                            {type}
                        </label>
                    ))}
                </div>
            </div>
            
             <div className={styles.formGroup}>
                <label htmlFor="supportAgency">หน่วยงานที่สนับสนุน (ถ้ามี)</label>
                <input type="text" id="supportAgency" name="supportAgency" value={formData.supportAgency} onChange={handleChange} />
            </div>
            
            <h2 className={styles.sectionTitle}>อัปโหลดไฟล์โครงงาน</h2>
            <p className={styles.sectionSubtitle}>กรุณาอัปโหลดไฟล์ที่เกี่ยวข้องกับโครงงานของคุณ (เลือกได้หลายไฟล์)</p>

             <div className={styles.fileUploadContainer}>
                <div className={styles.formGroup}>
                    <label htmlFor="complete_pdf">ไฟล์ PDF (ฉบับสมบูรณ์)</label>
                    <input type="file" id="complete_pdf" name="complete_pdf" onChange={handleFileChange} multiple />
                    {renderFileList('complete_pdf')}
                </div>
                
                 <div className={styles.formGroup}>
                    <label htmlFor="complete_doc">ไฟล์ DOCX (ฉบับสมบูรณ์)</label>
                    <input type="file" id="complete_doc" name="complete_doc" onChange={handleFileChange} multiple />
                     {renderFileList('complete_doc')}
                </div>
                
                <div className={styles.formGroup}>
                    <label htmlFor="article_files">ไฟล์บทความ (Article)</label>
                    <input type="file" id="article_files" name="article_files" onChange={handleFileChange} multiple />
                    {renderFileList('article_files')}
                </div>
                
                <div className={styles.formGroup}>
                    <label htmlFor="program_files">ไฟล์โปรแกรม (Program/EXE/Script)</label>
                    <input type="file" id="program_files" name="program_files" onChange={handleFileChange} multiple />
                    {renderFileList('program_files')}
                </div>
                
                <div className={styles.formGroup}>
                    <label htmlFor="web_files">ไฟล์เว็บไซต์ (ZIP/RAR)</label>
                    <input type="file" id="web_files" name="web_files" onChange={handleFileChange} multiple />
                    {renderFileList('web_files')}
                </div>
                
                <div className={styles.formGroup}>
                    <label htmlFor="poster_files">ไฟล์โปสเตอร์ (Image/PDF)</label>
                    <input type="file" id="poster_files" name="poster_files" onChange={handleFileChange} multiple />
                    {renderFileList('poster_files')}
                </div>
                
                 <div className={styles.formGroup}>
                    <label htmlFor="certificate_files">ไฟล์เกียรติบัตร (ถ้ามี)</label>
                    <input type="file" id="certificate_files" name="certificate_files" onChange={handleFileChange} multiple />
                    {renderFileList('certificate_files')}
                </div>
                
                <div className={styles.formGroup}>
                    <label htmlFor="front_face">รูปหน้าปก (Front Image)</label>
                    <input type="file" id="front_face" name="front_face" onChange={handleFileChange} />
                    {renderFileList('front_face')}
                </div>
            </div>

            <div className={styles.formGroup}>
                <label>
                    <input type="checkbox" name="permission" checked={formData.permission} onChange={handleChange} />
                    ข้าพเจ้ายินยอมให้เผยแพร่ข้อมูลและไฟล์เหล่านี้ และยืนยันว่าเป็นข้อมูลจริงทุกประการ *
                </label>
            </div>

            {/* ปุ่มกดยืนยัน (ใช้ buttonGroup เพื่อจัดตำแหน่งปุ่มย้อนกลับไปทางซ้าย) */}
            <div className={styles.buttonGroup}>
                <Link to="/documents" className={styles.linkButton}>กลับหน้าหลัก</Link>
                <button type="submit" className={styles.submitButton} disabled={!formData.permission || isSubmitting}>
                    {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการอัปโหลด'}
                </button>
            </div>
            
            {/* Alert Modal (สำหรับ OK เท่านั้น) */}
            {isAlertModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2>{alertModalContent.title}</h2>
                        <p className={styles.alertMessage}>{alertModalContent.message}</p>
                        <div className={styles.modalActions}>
                            <button 
                                type="button" 
                                className={styles.submitButton}
                                onClick={() => {
                                    setIsAlertModalOpen(false); 
                                    // ถ้าอัปโหลดสำเร็จ ให้ย้ายหน้า
                                    if (uploadWasSuccessful) {
                                        setUploadWasSuccessful(false); 
                                        navigate('/documents'); 
                                    }
                                }}
                            >
                                 ตกลง
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Confirmation Modal (สำหรับ Confirm/Cancel) */}
            {isConfirmModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2>{confirmModalContent.title}</h2>
                        <p className={styles.alertMessage}>{confirmModalContent.message}</p>
                        <div className={styles.modalActions}>
                            <button type="button" onClick={() => setIsConfirmModalOpen(false)} className={styles.linkButton}>
                                ยกเลิก
                            </button>
                            <button 
                                type="button" 
                                onClick={() => {
                                    confirmModalAction();
                                    setIsConfirmModalOpen(false); 
                                }} 
                                className={styles.submitButton}
                            >
                                ยืนยัน
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}

export default Ufinal;