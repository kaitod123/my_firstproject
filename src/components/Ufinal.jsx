import React, { useState, useEffect } from 'react';
// (!!!) 1. Import 'useNavigate' เพิ่ม (!!!)
import { Link, useNavigate } from 'react-router-dom';
// (!!!) 6. แก้ไข Path ของ CSS (คืนค่าเป็น '1') (!!!)
import styles from '../styles/Ufinal1.module.css';

function Ufinal() {
    // (!!!) 2. เรียกใช้ useNavigate (!!!)
    const navigate = useNavigate();

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

    const [advisorSuggestions, setAdvisorSuggestions] = useState([]);
    const [coAdvisorSuggestions, setCoAdvisorSuggestions] = useState([]);
    const [coAuthorSuggestions, setCoAuthorSuggestions] = useState([]);

    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [alertModalContent, setAlertModalContent] = useState({ title: '', message: '' });

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmModalContent, setConfirmModalContent] = useState({ title: '', message: '' });
    const [confirmModalAction, setConfirmModalAction] = useState(() => () => {});

    // (!!!) 3. เพิ่ม State "flag" (!!!)
    // เพิ่ม State นี้เพื่อติดตามว่าการอัปโหลดสำเร็จหรือไม่
    const [uploadWasSuccessful, setUploadWasSuccessful] = useState(false);

    const showAlert = (title, message) => {
        setAlertModalContent({ title, message });
        setIsAlertModalOpen(true);
    };

    const showConfirm = (title, message, onConfirm) => {
        setConfirmModalContent({ title, message });
        setConfirmModalAction(() => onConfirm); // ตั้งค่าฟังก์ชันที่จะรันเมื่อกด "ยืนยัน"
        setIsConfirmModalOpen(true);
    };

    const [userId, setUserId] = useState(null);

    // ดึง User ID จาก localStorage ตอน Component โหลด
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                setUserId(user.id); // เก็บ User ID
            } catch (e) {
                console.error("Failed to parse user data from localStorage", e);
            }
        }
    }, []);

    // Fetching functions (Advisors, Co-Advisors, Authors)
    useEffect(() => {
        // ( ... ขอย่อโค้ดส่วน Fetching ... )
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
                // (สมมติว่าใช้ Endpoint เดียวกับ Author)
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/search-authors?q=${query}`);
                if (response.ok) {
                    const data = await response.json();
                    setSuggestions(data);
                }
            } catch (error) {
                console.error('Error fetching co-authors:', error);
            }
        };
        
        // ( ... ขอย่อโค้ดส่วน Fetching ... )
        if (formData.advisorName.length > 1) fetchAdvisors(formData.advisorName, setAdvisorSuggestions);
        if (formData.coAdvisorName.length > 1) fetchAdvisors(formData.coAdvisorName, setCoAdvisorSuggestions);
        if (formData.co_author.length > 1) fetchCoAuthors(formData.co_author, setCoAuthorSuggestions);

    }, [formData.advisorName, formData.coAdvisorName, formData.co_author]);
    

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
            // (จัดการ Checkbox 'permission')
            if (name === 'permission') {
                 setFormData(prev => ({ ...prev, [name]: checked }));
            }
            // (จัดการ Checkbox 'document_type')
            else {
                 handleCheckboxChange(name, value, checked);
            }
        } 
        // (จัดการ Text/Select)
        else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };
    
    // (ฟังก์ชันสำหรับ 'document_type' โดยเฉพาะ)
    const handleCheckboxChange = (name, value, checked) => {
        setFormData(prev => {
            const currentValues = prev[name] || [];
            if (checked) {
                // เพิ่มค่า (ถ้ายังไม่มี)
                return { ...prev, [name]: [...currentValues, value] };
            } else {
                // ลบค่า
                return { ...prev, [name]: currentValues.filter(item => item !== value) };
            }
        });
    };
    
    const handleSuggestionClick = (field, suggestion) => {
        // (เช่น suggestion = { id: 5, first_name: 'John', last_name: 'Doe' })
        const fullName = `${suggestion.first_name || ''} ${suggestion.last_name || ''}`.trim();
        
        setFormData(prev => ({
            ...prev,
            [field]: fullName // อัปเดตช่อง Input
        }));
        
        // ซ่อน Suggestions
        if (field === 'advisorName') setAdvisorSuggestions([]);
        if (field === 'coAdvisorName') setCoAdvisorSuggestions([]);
        if (field === 'co_author') setCoAuthorSuggestions([]);
    };

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        if (files.length > 0) {
            // รับไฟล์ทั้งหมดที่เลือก (แปลง FileList เป็น Array)
            const fileArray = Array.from(files); 
            
            // (ตรวจสอบขนาดและประเภทไฟล์เบื้องต้น - ขอย่อไว้)
            
            // (อัปเดต State - ให้ 'เพิ่ม' ไฟล์เข้าไป ไม่ใช่ 'แทนที่')
            setFormData(prev => ({
                ...prev,
                // (ใช้ Array.concat เพื่อรวม Array เก่ากับ Array ใหม่)
                [name]: prev[name] ? prev[name].concat(fileArray) : fileArray
            }));
        }
        
        // (เคลียร์ค่าใน <input> เพื่อให้เลือกไฟล์ซ้ำได้)
        e.target.value = null;
    };
    
    // (ฟังก์ชันลบไฟล์ออกจาก State)
    const removeFile = (fieldName, fileIndex) => {
         setFormData(prev => {
            const newFiles = [...prev[fieldName]];
            newFiles.splice(fileIndex, 1); // ลบไฟล์ที่ Index
            return { ...prev, [fieldName]: newFiles };
         });
    };

    // (ฟังก์ชัน Render รายการไฟล์ที่เลือก)
    const renderFileList = (fieldName) => {
        if (!formData[fieldName] || formData[fieldName].length === 0) {
            return null;
        }
        return (
            <ul className={styles.fileList}>
                {formData[fieldName].map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                        <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                        <button 
                            type="button" 
                            onClick={() => removeFile(fieldName, index)}
                            className={styles.removeFileButton}
                        >
                            &times;
                        </button>
                    </li>
                ))}
            </ul>
        );
    };

    const [isSubmitting, setIsSubmitting] = useState(false); // (กันการกดซ้ำ)

    // (!!!) 4. แก้ไข handleSubmit (!!!)
    const handleSubmit = async (e) => {
        e.preventDefault();

        // (ตรวจสอบ User ID)
        if (!userId) {
            showAlert('ข้อผิดพลาด', 'ไม่พบข้อมูลผู้ใช้ (User ID) กรุณาล็อกอินใหม่อีกครั้ง');
            return;
        }
        
        // (ตรวจสอบ Permission)
        if (!formData.permission) {
            showAlert('ข้อผิดพลาด', 'กรุณายอมรับเงื่อนไขและยืนยันว่าเป็นข้อมูลจริง');
            return;
        }
        
        // (ตรวจสอบว่าเลือกไฟล์อย่างน้อย 1 ไฟล์)
        const allFiles = [
            ...formData.complete_pdf, ...formData.complete_doc, ...formData.article_files,
            ...formData.program_files, ...formData.web_files, ...formData.poster_files,
            ...formData.certificate_files, ...formData.front_face
        ];
        if (allFiles.length === 0) {
             showAlert('ข้อผิดพลาด', 'กรุณาอัปโหลดไฟล์โครงงานอย่างน้อย 1 ไฟล์');
             return;
        }
        
        // (ป้องกันการกดซ้ำ)
        if (isSubmitting) return;
        setIsSubmitting(true);
        
        // (รีเซ็ตสถานะ "สำเร็จ")
        setUploadWasSuccessful(false); 

        // (แสดง Modal "กำลังโหลด...")
        showAlert('กำลังอัปโหลด', 'กรุณารอสักครู่... ระบบกำลังบันทึกข้อมูลและไฟล์ของคุณ');

        const data = new FormData();

        // 1. เพิ่มข้อมูล Text (Fields)
        const textFields = [
            'title', 'title_eng', 'author', 'co_author', 'abstract',
            'advisorName', 'department', 'coAdvisorName', 'keywords', 'supportAgency',
            'publish_year', 'scan_date', 'display_date', 'language'
        ];
        
        textFields.forEach(field => {
            if (formData[field]) {
                data.append(field, formData[field]);
            }
        });
        
        // (เพิ่ม document_type - แปลง Array เป็น String)
        const documentTypesString = Array.isArray(formData.document_type)
            ? formData.document_type.join(',')
            : '';
        data.append('document_type', documentTypesString);
        
        // (เพิ่ม User ID)
        data.append('userId', userId);

        // 2. เพิ่มข้อมูล Files
        const fileFields = [
            'complete_pdf', 'complete_doc', 'article_files', 'program_files', 
            'web_files', 'poster_files', 'certificate_files', 'front_face'
        ];
        
        fileFields.forEach(fieldName => {
            if (formData[fieldName] && formData[fieldName].length > 0) {
                // (วนลูปเพิ่มไฟล์ทีละไฟล์)
                formData[fieldName].forEach(file => {
                    data.append(fieldName, file, file.name);
                });
            }
        });

        // 3. ส่งข้อมูล (Fetch)
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload-project`, {
                method: 'POST',
                // (ไม่ต้องใช้ 'Content-Type': 'multipart/form-data', FormData จะจัดการเอง)
                body: data,
                // (ถ้าใช้ Token)
                // headers: {
                //     'Authorization': `Bearer ${token}`
                // }
            });

            const result = await response.json();

            if (response.ok) {
                // (!!!) ตั้งค่าว่า "สำเร็จ"
                setUploadWasSuccessful(true); 
                // (แสดง Modal สำเร็จ)
                showAlert(
                    'อัปโหลดสำเร็จ', 
                    'ระบบบันทึกข้อมูลโครงงานของคุณเรียบร้อยแล้ว'
                );
                // (!!!) ลบ navigate ออกจากตรงนี้ (!!!)
                // navigate('/documents'); // (ลบออก)
            } else {
                // (แสดง Modal ไม่สำเร็จ)
                showAlert(
                    'อัปโหลดไม่สำเร็จ', 
                    `เกิดข้อผิดพลาด: ${result.message || response.statusText}`
                );
            }
        } catch (error) {
            console.error('Submit Error:', error);
            showAlert(
                'เกิดข้อผิดพลาด', 
                `ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: ${error.message}`
            );
        } finally {
            // (ปลดล็อคปุ่ม)
            setIsSubmitting(false);
            // (ถ้า Modal ไม่ใช่ "กำลังโหลด" ก็ไม่ต้องปิด - ปิดเฉพาะ "กำลังโหลด")
            if (alertModalContent.title === 'กำลังอัปโหลด') {
                 // (การ showAlert ใหม่จะทับ "กำลังโหลด" ไปเอง)
                 // setIsAlertModalOpen(false); 
            }
        }
    };


    return (
        <form onSubmit={handleSubmit} className={styles.formContainer}>
            
            {/* ( ... ขอย่อ JSX ส่วนฟอร์ม ... ) */}
            {/* ( ... title, title_eng ... ) */}
            <div className={styles.formGroup}>
                <label htmlFor="title">ชื่อโครงงาน (ภาษาไทย) *</label>
                <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                />
            </div>
            
             <div className={styles.formGroup}>
                <label htmlFor="title_eng">ชื่อโครงงาน (ภาษาอังกฤษ)</label>
                <input
                    type="text"
                    id="title_eng"
                    name="title_eng"
                    value={formData.title_eng}
                    onChange={handleChange}
                />
            </div>

            {/* (!!!) START: แก้ไข (เปลี่ยน className) (!!!) */}
            <div className={styles.buttonGroup}>
            {/* (!!!) END: แก้ไข (!!!) */}
            
                <Link to="/documents" className={styles.linkButton}>กลับหน้าหลัก</Link>
                <button 
                    type="submit" 
                    className={styles.submitButton} 
                    disabled={!formData.permission || isSubmitting}
                >
                    {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการอัปโหลด'}
                </button>
            </div>
            
            
        {/* (!!!) START: 5. แก้ไข Modal JSX (!!!) */}
        
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
                            // (!!!) แก้ไข onClick ที่นี่
                            onClick={() => {
                                // ปิด Modal
                                setIsAlertModalOpen(false); 
                                
                                // (สำคัญ) ถ้าอัปโหลดสำเร็จ ให้ย้ายหน้า
                                if (uploadWasSuccessful) {
                                    // รีเซ็ตสถานะ
                                    setUploadWasSuccessful(false); 
                                    // ย้ายไปหน้า Documents
                                    navigate('/documents'); 
                                }
                                // (ถ้าไม่สำเร็จ ก็แค่ปิด Modal ไป)
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
                        <button 
                            type="button" 
                            onClick={() => setIsConfirmModalOpen(false)} 
                            className={styles.linkButton} 
                        >
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
        {/* (!!!) END: 5. แก้ไข Modal JSX (!!!) */}

        </form>
    );
}

export default Ufinal;