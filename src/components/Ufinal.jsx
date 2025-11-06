import React, { useState, useEffect } from 'react';
// (!!!) 1. Import 'useNavigate' เพิ่ม (!!!)
import { Link, useNavigate } from 'react-router-dom';
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
    const [uploadWasSuccessful, setUploadWasSuccessful] = useState(false);

    const showAlert = (title, message) => {
        setAlertModalContent({ title, message });
        setIsAlertModalOpen(true);
    };

    // (คงเดิม) ฟังก์ชันค้นหาอาจารย์
    const handleAdvisorSearch = async (e) => {
        const { name, value } = e.target;
        handleChange(e); 

        if (value.length < 3) {
            if (name === 'advisorName') setAdvisorSuggestions([]);
            if (name === 'coAdvisorName') setCoAdvisorSuggestions([]);
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/advisors/search?query=${encodeURIComponent(value)}`);
            if (!response.ok) throw new Error("Failed to fetch advisors");
            const data = await response.json();

            if (name === 'advisorName') {
                setAdvisorSuggestions(data);
            } else if (name === 'coAdvisorName') {
                setCoAdvisorSuggestions(data);
            }
        } catch (error) {
            console.error('Error fetching advisor suggestions:', error);
        }
    };

    // (คงเดิม) ฟังก์ชันค้นหาผู้แต่งคนที่ 2 (นักศึกษา)
    const handleStudentSearch = async (e) => {
        const { name, value } = e.target;
        handleChange(e); // อัปเดต formData

        if (value.length < 3) {
            setCoAuthorSuggestions([]);
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/students/search?query=${encodeURIComponent(value)}`);
            if (!response.ok) throw new Error("Failed to fetch students");
            const data = await response.json();
            setCoAuthorSuggestions(data);
        } catch (error) {
            console.error('Error fetching student suggestions:', error);
        }
    };


    const handleSuggestionClick = (name, suggestion) => {
        setFormData(prevState => ({
            ...prevState,
            [name]: `${suggestion.first_name} ${suggestion.last_name}`,
        }));
        
        if (name === 'advisorName') setAdvisorSuggestions([]);
        if (name === 'coAdvisorName') setCoAdvisorSuggestions([]);
        if (name === 'co_author') setCoAuthorSuggestions([]);
    };

    useEffect(() => {
        const loggedInUser = localStorage.getItem('user');
        if (loggedInUser) {
            const user = JSON.parse(loggedInUser);
            setFormData(prevState => ({
                ...prevState,
                author: `${user.first_name || ''} ${user.last_name || ''}`,
            }));
        }
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
            if (name === 'permission') {
                setFormData(prevState => ({ ...prevState, [name]: checked }));
            } else if (name === 'document_type') {
                setFormData(prevState => {
                    const currentTypes = prevState.document_type || []; 
                    if (checked) {
                        return { ...prevState, document_type: [...currentTypes, value] };
                    } else {
                        return { ...prevState, document_type: currentTypes.filter(type => type !== value) };
                    }
                });
            }
        } else {
            if (name === 'advisorName' && advisorSuggestions.length > 0) {
                 setFormData(prevState => ({ ...prevState, [name]: value }));
            } else if (name === 'coAdvisorName' && coAdvisorSuggestions.length > 0) {
                 setFormData(prevState => ({ ...prevState, [name]: value }));
            } else if (name === 'co_author' && coAuthorSuggestions.length > 0) {
                 setFormData(prevState => ({ ...prevState, [name]: value }));
            } else {
                 setFormData(prevState => ({ ...prevState, [name]: value }));
            }
        }
    };

    const handleFileChange = (e) => {
        const { name, files, accept } = e.target; 
        const allowedExtensions = accept.split(',').map(ext => ext.trim().toLowerCase());

        const validFiles = Array.from(files).filter(file => {
            const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase(); 
            return allowedExtensions.includes(fileExtension);
        });

        if (validFiles.length < files.length) {
            const invalidCount = files.length - validFiles.length;
            // (!!!) รีเซ็ต flag เมื่อมี Alert อื่น (!!!)
            setUploadWasSuccessful(false); 
            showAlert(
                'ไฟล์ไม่ถูกต้อง', 
                `${invalidCount} ไฟล์ที่คุณเลือกมีนามสกุลไม่ถูกต้องสำหรับช่องนี้ และจะไม่ถูกเพิ่ม (ช่องนี้รองรับเฉพาะ: ${accept})`
            );
        }

        if (validFiles.length > 0) {
            setFormData(prevState => ({
                ...prevState,
                [name]: [...prevState[name], ...validFiles], 
            }));
        }
        
        e.target.value = null; 
    };

    const handleRemoveFile = (fileName, fileType) => {
        setFormData(prevState => ({
            ...prevState,
            [fileType]: prevState[fileType].filter(file => file.name !== fileName)
        }));
    };

    
    const handleSaveClick = (e) => {
        if (e) e.preventDefault();
        
        const missingFields = [];
        if (formData.title.trim() === '') missingFields.push('ชื่อโครงงาน');
        if (formData.title_eng.trim() === '') missingFields.push('ชื่อโครงงานภาษาอังกฤษ');
        if (formData.abstract.trim() === '') missingFields.push('บทคัดย่อ');
        if (formData.keywords.trim() === '') missingFields.push('คำสำคัญ');
        if (formData.advisorName.trim() === '') missingFields.push('ชื่ออาจารย์ที่ปรึกษา');
        if (formData.department === undefined || formData.department.trim() === '') missingFields.push('สาขาที่อัปโหลด');
        if (formData.permission === false) missingFields.push('การยืนยันสิทธิ์');

        if (missingFields.length > 0) {
            const errorMessage = 'กรุณากรอกข้อมูลต่อไปนี้ให้ครบถ้วน:\n\n- ' + missingFields.join('\n- ');
            // (!!!) รีเซ็ต flag เมื่อมี Alert อื่น (!!!)
            setUploadWasSuccessful(false); 
            showAlert('ข้อมูลไม่ครบถ้วน', errorMessage);
            return; 
        }

        setConfirmModalContent({
            title: 'ยืนยันการบันทึก',
            message: 'คุณแน่ใจหรือไม่ว่าต้องการบันทึกข้อมูลโครงงานนี้?'
        });
        setConfirmModalAction(() => () => handleSubmit()); 
        setIsConfirmModalOpen(true);
    };

    const handleSubmit = async () => {
        const data = new FormData();
        const fileKeys = [
            'complete_pdf', 'complete_doc', 'article_files', 'program_files', 
            'web_files', 'poster_files', 'certificate_files',
            'front_face'
        ];

        // Append text data
        for (const key in formData) {
            if (!fileKeys.includes(key)) {
                if (key === 'document_type') {
                    const documentTypesString = Array.isArray(formData.document_type) 
                        ? formData.document_type.join(',') 
                        : ''; 
                    data.append(key, documentTypesString);
                } else {
                    data.append(key, formData[key]);
                }
            }
        }

        // Append file data
        fileKeys.forEach(key => {
            if (formData[key] && formData[key].length > 0) {
                formData[key].forEach(file => {
                    data.append(key, file);
                });
            }
        });
        
        console.log('กำลังส่ง FormData ที่มี keys:', [...data.keys()]);
        
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload-project`, { 
                method: 'POST',
                body: data,
            });

            const result = await response.json();
            if (response.ok) {
                // (!!!) 4. ตั้งค่า Flag เป็น true เมื่อสำเร็จ (!!!)
                setUploadWasSuccessful(true); 
                showAlert('สำเร็จ', result.message || 'บันทึกข้อมูลสำเร็จ');
                
                // ล้างฟอร์ม
                setFormData({
                    document_type: [], title: '', title_eng: '', author: formData.author,
                    co_author: '', abstract: '', advisorName: '', department: '',
                    coAdvisorName: '', keywords: '', supportAgency: '', permission: false,
                    complete_pdf: [], complete_doc: [], article_files: [], program_files: [],
                    web_files: [], poster_files: [], certificate_files: [], front_face: [],
                });
            } else {
                // (!!!) รีเซ็ต flag เมื่อมี Alert อื่น (!!!)
                setUploadWasSuccessful(false); 
                showAlert('เกิดข้อผิดพลาด', result.message || 'ไม่สามารถบันทึกข้อมูลได้');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            // (!!!) รีเซ็ต flag เมื่อมี Alert อื่น (!!!)
            setUploadWasSuccessful(false); 
            showAlert('ไม่สามารถเชื่อมต่อได้', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: ' + (error.message || 'กรุณาตรวจสอบ Console'));
        }
    };


    const FileUploadZone = ({ name, title, hint, accept }) => (
        <div className={styles.fileDropzone}>
            <p>{title}</p>
            <p className={styles.fileHint}>{hint}</p>
            <label className={styles.fileButton}>
                เลือกไฟล์
                <input
                    type="file"
                    name={name}
                    multiple
                    accept={accept}
                    onChange={handleFileChange}
                />
            </label>
            {formData[name] && Array.isArray(formData[name]) && formData[name].length > 0 && (
                <ul className={styles.fileList}>
                    {formData[name].map((file, index) => (
                        <li key={index} className={styles.fileItem}>
                            <span className={styles.fileName}>{file.name}</span>
                            <button
                                type="button" // Important for forms
                                className={styles.removeFileButton}
                                onClick={() => handleRemoveFile(file.name, name)} 
                            >
                                ลบ
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );

    return (
        <form>
        <div className={styles.pageContainer}>
            <div className={styles.uploadCard}>
                <h1 className={styles.pageTitle}>ส่งคำขออัพโหลด</h1>
                
                 {/* Section 1: ข้อมูลผู้เขียน */}
                 <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>ข้อมูลผู้เขียน</h2>
                    <div className={styles.twoColumnGrid}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>ผู้แต่ง (หลัก)</label>
                            <input
                                type="text"
                                name="author"
                                value={formData.author}
                                readOnly
                                className={styles.inputField}
                            />
                        </div>
                        
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>ผู้แต่งคนที่ 2 (ถ้ามี)</label>
                            <input 
                                type="text" 
                                name="co_author" 
                                placeholder="ค้นหาชื่อนักศึกษา..."
                                className={styles.inputField} 
                                value={formData.co_author}
                                onChange={handleStudentSearch}
                                autoComplete="off"
                            />
                            {coAuthorSuggestions.length > 0 && (
                                <ul className={styles.suggestionsList}>
                                    {coAuthorSuggestions.map((student) => (
                                        <li 
                                            key={student.id} 
                                            onClick={() => handleSuggestionClick('co_author', student)}
                                        >
                                            {student.first_name} {student.last_name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 2: ข้อมูลโครงงาน */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>ข้อมูลโครงงาน</h2>
                    <div className={styles.twoColumnGrid}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>ชื่อโครงงาน</label>
                            <input type="text" name="title" placeholder="ชื่อโครงงาน" className={styles.inputField} onChange={handleChange} value={formData.title} />
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>ชื่อโครงงานภาษาอังกฤษ</label>
                            <input type="text" name='title_eng' placeholder="ชื่อโครงงานภาษาอังกฤษ" className={styles.inputField} onChange={handleChange} value={formData.title_eng} />
                        </div>
                    </div>
                    
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>บทคัดย่อ</label>
                        <textarea name="abstract" rows="4" className={styles.textarea} placeholder="ใส่บทคัดย่อโครงงานที่นี่..." onChange={handleChange} value={formData.abstract}></textarea>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>คำสำคัญ</label>
                        <textarea name="keywords" rows="4" className={styles.textarea} placeholder="ใส่คำสำคัญที่เกี่ยวข้องกับโครงงาน..." onChange={handleChange} value={formData.keywords}></textarea>
                    </div>
                    
                    <div className={styles.twoColumnGrid}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>ชื่ออาจารย์ที่ปรึกษา</label>
                            <input 
                                type="text" 
                                name="advisorName" 
                                placeholder="ค้นหาชื่ออาจารย์..."
                                className={styles.inputField} 
                                value={formData.advisorName} 
                                onChange={handleAdvisorSearch} 
                                autoComplete="off"
                            />
                            {advisorSuggestions.length > 0 && (
                                <ul className={styles.suggestionsList}>
                                    {advisorSuggestions.map((advisor) => (
                                        <li 
                                            key={advisor.id} 
                                            onClick={() => handleSuggestionClick('advisorName', advisor)}
                                        >
                                            {advisor.first_name} {advisor.last_name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>ชื่ออาจารย์ที่ปรึกษาร่วม (ถ้ามี)</label>
                            <input 
                                type="text" 
                                name="coAdvisorName" 
                                placeholder="ค้นหาชื่ออาจารย์..."
                                className={styles.inputField} 
                                value={formData.coAdvisorName} 
                                onChange={handleAdvisorSearch} 
                                autoComplete="off"
                            />
                            {coAdvisorSuggestions.length > 0 && (
                                <ul className={styles.suggestionsList}>
                                    {coAdvisorSuggestions.map((advisor) => (
                                        <li 
                                            key={advisor.id} 
                                            onClick={() => handleSuggestionClick('coAdvisorName', advisor)}
                                        >
                                            {advisor.first_name} {advisor.last_name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>หน่วยงานที่สนับสนุน (ถ้ามี)</label>
                        <input type="text" name="supportAgency" placeholder='ชื่อหน่วยงานที่สนับสนุน' className={styles.inputField} onChange={handleChange} value={formData.supportAgency} />
                    </div>
                </div>

                {/* Section 3: ประเภทและสาขา */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>ประเภทของโครงงานและสาขา</h2>
                    <div className={styles.radioGroup}>
                        <label className={styles.label}>สาขาที่อัปโหลด</label>
                        <div className={styles.cardRadioGrid}>
                            <label className={styles.cardRadio}>
                                <input type="radio" name="department" value="วิทยาการคอมพิวเตอร์" onChange={handleChange} checked={formData.department === "วิทยาการคอมพิวเตอร์"} />
                                <span className={styles.cardRadioText}>วิทยาการคอมพิวเตอร์</span>
                            </label>
                            <label className={styles.cardRadio}>
                                <input type="radio" name="department" value="เทคโนโลยีสารสนเทศ" onChange={handleChange} checked={formData.department === "เทคโนโลยีสารสนเทศ"} />
                                <span className={styles.cardRadioText}>เทคโนโลยีสารสนเทศ</span>
                            </label>
                            <label className={styles.cardRadio}>
                                <input type="radio" name="department" value="ระบบสารสนเทศเพื่อการจัดการ" onChange={handleChange} checked={formData.department === "ระบบสารสนเทศเพื่อการจัดการ"} />
                                <span className={styles.cardRadioText}>ระบบสารสนเทศเพื่อการจัดการ</span>
                            </label>
                        </div>
                    </div>
                    <div className={styles.radioGroup}>
                        <label className={styles.label}>ประเภท</label>
                        <div className={styles.cardRadioGrid}>
                            <label className={styles.cardRadio}>
                                <input type="checkbox" name="document_type" value="เกม" onChange={handleChange} checked={formData.document_type.includes("เกม")} />
                                <span className={styles.cardRadioText}>เกม</span>
                            </label>
                            <label className={styles.cardRadio}>
                                <input type="checkbox" name="document_type" value="IOT" onChange={handleChange} checked={formData.document_type.includes("IOT")} />
                                <span className={styles.cardRadioText}>IOT</span>
                            </label>
                            <label className={styles.cardRadio}>
                                <input type="checkbox" name="document_type" value="WebSite" onChange={handleChange} checked={formData.document_type.includes("WebSite")} />
                                <span className={styles.cardRadioText}>Web Site</span>
                            </label>
                            <label className={styles.cardRadio}>
                                <input type="checkbox" name="document_type" value="WebApp" onChange={handleChange} checked={formData.document_type.includes("WebApp")} />
                                <span className={styles.cardRadioText}>Web Application</span>
                            </label>
                                <label className={styles.cardRadio}>
                                <input type="checkbox" name="document_type" value="Application" onChange={handleChange} checked={formData.document_type.includes("Application")} />
                                <span className={styles.cardRadioText}>Application</span>
                            </label>
                                <label className={styles.cardRadio}>
                                <input type="checkbox" name="document_type" value="AI" onChange={handleChange} checked={formData.document_type.includes("AI")} />
                                <span className={styles.cardRadioText}>AI</span>
                            </label>
                                <label className={styles.cardRadio}>
                                <input type="checkbox" name="document_type" value="DataMining" onChange={handleChange} checked={formData.document_type.includes("DataMining")} />
                                <span className={styles.cardRadioText}>Data Mining</span>
                            </label>
                                <label className={styles.cardRadio}>
                                <input type="checkbox" name="document_type" value="อื่นๆ" onChange={handleChange} checked={formData.document_type.includes("อื่นๆ")} />
                                <span className={styles.cardRadioText}>อื่นๆ</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Section 4: อัปโหลดไฟล์ (REVISED) */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>อัปโหลดไฟล์</h2>
                    
                    <div className={styles.twoColumnGrid}>
                        <FileUploadZone name="complete_pdf" title="ไฟล์เอกสารฉบับสมบูรณ์ (PDF)" hint="รองรับไฟล์ .pdf เท่านั้น" accept=".pdf" />
                        <FileUploadZone 
                            name="complete_doc" 
                            title="ไฟล์เอกสารฉบับสมบูรณ์ (DOCX)" 
                            hint="รองรับไฟล์ .docx เท่านั้น" 
                            accept=".docx" 
                        />
                    </div>

                    <div className={styles.twoColumnGrid}>
                        <FileUploadZone name="article_files" title="ไฟล์บทความสำหรับตีพิมพ์(ต้องมีทั้งไฟล์DOCXและPDF)" hint="รองรับไฟล์ .docx และ .pdf" accept=".docx,.pdf" />
                        <FileUploadZone name="program_files" title="ไฟล์โปรแกรมพร้อมติดตั้ง(ถ้ามี)" hint="แนะนำ .zip, .rar" accept=".zip,.rar" />
                    </div>

                    <div className={styles.twoColumnGrid}>
                        <FileUploadZone name="web_files" title="ไฟล์ซอร์ฺสโค้ดที่สมบูรณ์ทั้งหมดของโครงงาน (Zip)" hint="รองรับไฟล์ .zip เท่านั้น" accept=".zip" />
                        <FileUploadZone name="poster_files" title="ไฟล์โปสเตอร์(80*120cm)" hint="รองรับไฟล์ .psd และ .pdf" accept=".psd,.pdf" />
                    </div>

                    <div className={styles.twoColumnGrid}>
                        <FileUploadZone name="certificate_files" title="ไฟล์ใบผ่านการอบรม(จริยธรรมการวิจัยในคน)" hint="รองรับไฟล์ .pdf, .jpg, .png" accept=".pdf,.jpg,.jpeg,.png" />
                        <FileUploadZone name="front_face" title="หน้าปก" hint="รองรับไฟล์ .jpeg" accept=".jpeg" />
                    </div>
                    <div className={styles.checkboxGroup}>
                        <label className={styles.label}>ยืนยันสิทธิ์ต่างๆ</label>
                            <label className={styles.checkboxLabel}>
                            <input 
                                type="checkbox" 
                                name="permission" 
                                required 
                                className={styles.checkboxInput}
                                onChange={handleChange}    
                                checked={formData.permission}
                                />
                                <span className={styles.checkboxText}>ยืนยันการให้สิทธิ์ในการเผยแพร่</span>
                            </label>
                    </div>
                </div>


                {/* Buttons */}
                <div className={styles.buttonGroup}>
                    <Link to="/" className={styles.linkButton}>
                        กลับ
                    </Link>
                    <button
                        onClick={handleSaveClick} 
                        type="button" 
                        className={styles.submitButton} 
                    >
                        บันทึก
                    </button>
                </div>
            </div>
        
            {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>Copyright © 2025</p>
        <div className={styles.footerLink}>
          <a className={styles.footerLink}>Designed & Developed by </a>
          <a href="https://informatics.nrru.ac.th/" className={styles.footerLink}>Informatics</a>
        </div>
      </footer>
        </div>
        
        {/* (!!!) START: 5. แก้ไข Modal JSX (!!!) */}

        {/* Alert Modal (สำหรับ OK) */}
        {isAlertModalOpen && (
            <div className={styles.modalOverlay}>
                <div className={styles.modalContent}>
                    <h2>{alertModalContent.title}</h2>
                    <p className={styles.alertMessage}>{alertModalContent.message}</p>
                    <div className={styles.modalActions}>
                        {/* (!!!) นี่คือปุ่มที่แก้ไข (!!!) */}
                        <button 
                            type="button" 
                            onClick={() => {
                                setIsAlertModalOpen(false);
                                if (uploadWasSuccessful) {
                                    navigate('/'); // (!!!) กลับไปหน้า Home
                                    setUploadWasSuccessful(false); // (!!!) รีเซ็ต flag
                                }
                            }} 
                            className={styles.submitButton}
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