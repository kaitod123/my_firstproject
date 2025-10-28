import React, { useState, useEffect} from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/Ufinal1.module.css';

function Ufinal() {
const [formData, setFormData] = useState({
        document_type: '',
        title: '',
        title_eng: '',
        author: '',
        abstract: '',
        advisorName: '',
        department: '',
        coAdvisorName: '',
        keywords: '',
        supportAgency: '',
        permission: false, //ต้องกรอกข้อมูล
        // --- ADDED: New state for additional file types ---
        complete_pdf: [],
        complete_doc: [],
        article_files: [],
        program_files: [],
        web_files: [],
        poster_files: [],
        certificate_files: [],
    });

    const [advisorSuggestions, setAdvisorSuggestions] = useState([]);
    const [coAdvisorSuggestions, setCoAdvisorSuggestions] = useState([]);
    const API_BASE_URL = 'https://my-project-backend-cc73.onrender.com/api/documents?limit=4'; // Define API URLดึงข้อมูลชื่ออาจารย์ที่ปรึกษาแบบอัตโนมัติ

    const handleAdvisorSearch = async (e) => {
        const { name, value } = e.target;
        handleChange(e); // อัปเดต formData

        if (value.length < 3) {
            // ล้างรายการแนะนำถ้าคำค้นหาสั้นเกินไป
            if (name === 'advisorName') setAdvisorSuggestions([]);
            if (name === 'coAdvisorName') setCoAdvisorSuggestions([]);
            return;
        }

        try {
            // เรียก API ใหม่เพื่อค้นหารายชื่ออาจารย์
            const response = await fetch(`${API_BASE_URL}/api/advisors/search?query=${encodeURIComponent(value)}`);
            if (!response.ok) throw new Error("Failed to fetch advisors");
            const data = await response.json();

            // อัปเดต state รายการแนะนำ
            if (name === 'advisorName') {
                setAdvisorSuggestions(data);
            } else if (name === 'coAdvisorName') {
                setCoAdvisorSuggestions(data);
            }
        } catch (error) {
            console.error('Error fetching advisor suggestions:', error);
        }
    };

    const handleSuggestionClick = (name, suggestion) => {
        // อัปเดต formData เมื่อผู้ใช้คลิกเลือก
        setFormData(prevState => ({
            ...prevState,
            [name]: `${suggestion.first_name} ${suggestion.last_name}`,
        }));
        // ล้างรายการแนะนำ
        if (name === 'advisorName') setAdvisorSuggestions([]);
        if (name === 'coAdvisorName') setCoAdvisorSuggestions([]);
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

        // ตรวจสอบว่าเป็น checkbox 'permission' หรือไม่
        if (name === 'permission' && type === 'checkbox') {
            setFormData(prevState => ({
                ...prevState,
                [name]: checked // ใชสถานะ checked (true/false)
            }));
        } 
        // สำหรับ input อื่นๆ ทั้งหมด (text, textarea, และ checkbox ของ document_type)
        else {
            setFormData(prevState => ({
                ...prevState,
                [name]: value // ใช้ค่า value (เหมือนเดิม)
            }));
        }
    };
    const handleFileChange = (e) => {
        const { name, files } = e.target;
        setFormData(prevState => ({
            ...prevState,
            // Use spread syntax to append new files to the existing array
            [name]: [...prevState[name], ...Array.from(files)],
        }));
    };

    const handleRemoveFile = (fileName, fileType) => {
        setFormData(prevState => ({
            ...prevState,
            [fileType]: prevState[fileType].filter(file => file.name !== fileName)
        }));
    };

    const handleSubmit = async () => {
        // --- START: Validation Check ---
        const missingFields = [];
        
        // 1. ตรวจสอบ Text Inputs
        if (formData.title.trim() === '') missingFields.push('ชื่อโครงงาน');
        if (formData.title_eng.trim() === '') missingFields.push('ชื่อโครงงานภาษาอังกฤษ');
        if (formData.abstract.trim() === '') missingFields.push('บทคัดย่อ');
        if (formData.keywords.trim() === '') missingFields.push('คำสำคัญ');
        if (formData.advisorName.trim() === '') missingFields.push('ชื่ออาจารย์ที่ปรึกษา');
        
        // 2. ตรวจสอบ Checkbox ยินยอม
        if (formData.permission === false) missingFields.push('การยืนยันสิทธิ์');

        // 3. ถ้ามีฟิลด์ที่ขาดไป ให้แสดง Alert และหยุดการทำงาน
        if (missingFields.length > 0) {
            const errorMessage = 'กรุณากรอกข้อมูลต่อไปนี้ให้ครบถ้วน:\n\n- ' + missingFields.join('\n- ');
            alert(errorMessage);
            return; // <-- หยุดการทำงาน, ไม่ส่งฟอร์ม
        }
        // --- END: Validation Check ---


        // (ส่วนที่เหลือของฟังก์ชันเหมือนเดิม)
        const data = new FormData();
        const fileKeys = [
            'complete_pdf', 'complete_doc', 'article_files', 'program_files', 
            'web_files', 'poster_files', 'certificate_files'
        ];

        // Append text data
        for (const key in formData) {
            if (!fileKeys.includes(key)) {
                data.append(key, formData[key]);
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
            // NOTE: Ensure your backend endpoint is expecting these new field names.
            const response = await fetch('https://my-project-backend-cc73.onrender.com/api/documents?limit=4/api/upload-project', {
                method: 'POST',
                body: data,
            });

            const result = await response.json();
            if (response.ok) {
                alert(result.message || 'บันทึกข้อมูลสำเร็จ');
            } else {
                // (แก้ไข) แสดง error จาก backend หากมีปัญหา (เช่น ชื่ออาจารย์ผิด)
                alert('เกิดข้อผิดพลาด: ' + (result.message || 'ไม่สามารถบันทึกข้อมูลได้'));
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบ Console');
        }
    };

    // Helper component for rendering file upload zones to avoid repetition
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
            {formData[name].length > 0 && (
                <ul className={styles.fileList}>
                    {formData[name].map((file, index) => (
                        <li key={index} className={styles.fileItem}>
                            <span className={styles.fileName}>{file.name}</span>
                            <button
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
        <div className={styles.pageContainer}>
            <div className={styles.uploadCard}>
                <h1 className={styles.pageTitle}>ส่งคำขออัพโหลด</h1>
                
                {/* Sections 1, 2, 3 remain the same */}
                 {/* Section 1: ข้อมูลผู้เขียน */}
                 <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>ข้อมูลผู้เขียน</h2>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>ชื่อผู้เขียน</label>
                        <input
                            type="text"
                            name="author"
                            value={formData.author}
                            readOnly
                            className={styles.inputField}
                        />
                    </div>
                </div>

                {/* Section 2: ข้อมูลโครงงาน */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>ข้อมูลโครงงาน</h2>
                    <div className={styles.twoColumnGrid}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>ชื่อโครงงาน</label>
                            <input type="text" name="title" placeholder="ชื่อโครงงาน" className={styles.inputField} onChange={handleChange} />
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>ชื่อโครงงานภาษาอังกฤษ</label>
                            <input type="text" name='title_eng' placeholder="ชื่อโครงงานภาษาอังกฤษ" className={styles.inputField} onChange={handleChange} />
                        </div>
                    </div>
                    
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>บทคัดย่อ</label>
                        <textarea name="abstract" rows="4" className={styles.textarea} placeholder="ใส่บทคัดย่อโครงงานที่นี่..." onChange={handleChange}></textarea>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>คำสำคัญ</label>
                        <textarea name="keywords" rows="4" className={styles.textarea} placeholder="ใส่คำสำคัญที่เกี่ยวข้องกับโครงงาน..." onChange={handleChange}></textarea>
                    </div>
                    
                    <div className={styles.twoColumnGrid}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>ชื่ออาจารย์ที่ปรึกษา</label>
                            {/* เปลี่ยน onChange เป็น handleAdvisorSearch */}
                            <input 
                                type="text" 
                                name="advisorName" 
                                className={styles.inputField} 
                                value={formData.advisorName} // ต้องมี value เพื่อผูกกับ state
                                onChange={handleAdvisorSearch} 
                            />
                            {/* เพิ่มส่วนแสดงรายการแนะนำ */}
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
                            {/* เปลี่ยน onChange เป็น handleAdvisorSearch */}
                            <input 
                                type="text" 
                                name="coAdvisorName" 
                                className={styles.inputField} 
                                value={formData.coAdvisorName} // ต้องมี value เพื่อผูกกับ state
                                onChange={handleAdvisorSearch} 
                            />
                            {/* เพิ่มส่วนแสดงรายการแนะนำ */}
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
                        <input type="text" name="supportAgency" placeholder='ชื่อหน่วยงานที่สนับสนุน' className={styles.inputField} onChange={handleChange} />
                    </div>
                </div>

                {/* Section 3: ประเภทและสาขา */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>ประเภทของโครงงานและสาขา</h2>
                    <div className={styles.radioGroup}>
                        <label className={styles.label}>สาขาที่อัปโหลด</label>
                        <div className={styles.cardRadioGrid}>
                            <label className={styles.cardRadio}>
                                <input type="radio" name="department" value="วิทยาการคอมพิวเตอร์" onChange={handleChange} />
                                <span className={styles.cardRadioText}>วิทยาการคอมพิวเตอร์</span>
                            </label>
                            <label className={styles.cardRadio}>
                                <input type="radio" name="department" value="เทคโนโลยีสารสนเทศ" onChange={handleChange} />
                                <span className={styles.cardRadioText}>เทคโนโลยีสารสนเทศ</span>
                            </label>
                            <label className={styles.cardRadio}>
                                <input type="radio" name="department" value="ระบบสารสนเทศเพื่อการจัดการ" onChange={handleChange} />
                                <span className={styles.cardRadioText}>ระบบสารสนเทศเพื่อการจัดการ</span>
                            </label>
                        </div>
                    </div>
                    <div className={styles.radioGroup}>
                        <label className={styles.label}>ประเภท</label>
                        <div className={styles.cardRadioGrid}>
                            <label className={styles.cardRadio}>
                                <input type="checkbox" name="document_type" value="เกม" onChange={handleChange} />
                                <span className={styles.cardRadioText}>เกม</span>
                            </label>
                            <label className={styles.cardRadio}>
                                <input type="checkbox" name="document_type" value="IOT" onChange={handleChange} />
                                <span className={styles.cardRadioText}>IOT</span>
                            </label>
                            <label className={styles.cardRadio}>
                                <input type="checkbox" name="document_type" value="WebSite" onChange={handleChange} />
                                <span className={styles.cardRadioText}>Web Site</span>
                            </label>
                            <label className={styles.cardRadio}>
                                <input type="checkbox" name="document_type" value="WebApp" onChange={handleChange} />
                                <span className={styles.cardRadioText}>Web Application</span>
                            </label>
                                <label className={styles.cardRadio}>
                                <input type="checkbox" name="document_type" value="Application" onChange={handleChange} />
                                <span className={styles.cardRadioText}>Application</span>
                            </label>
                                <label className={styles.cardRadio}>
                                <input type="checkbox" name="document_type" value="AI" onChange={handleChange} />
                                <span className={styles.cardRadioText}>AI</span>
                            </label>
                                <label className={styles.cardRadio}>
                                <input type="checkbox" name="document_type" value="DataMining" onChange={handleChange} />
                                <span className={styles.cardRadioText}>Data Mining</span>
                            </label>
                                <label className={styles.cardRadio}>
                                <input type="checkbox" name="document_type" value="อื่นๆ" onChange={handleChange} />
                                <span className={styles.cardRadioText}>อื่นๆ</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Section 4: อัปโหลดไฟล์ (REVISED) */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>อัปโหลดไฟล์</h2>
                    
                    {/* --- Row 1 --- */}
                    <div className={styles.twoColumnGrid}>
                        <FileUploadZone name="complete_pdf" title="ไฟล์เอกสารฉบับสมบูรณ์ (PDF)" hint="รองรับไฟล์ .pdf เท่านั้น" accept=".pdf" />
                        
                        {/* --- (แก้ไข) เปลี่ยน title, hint, และ accept --- */}
                        <FileUploadZone 
                            name="complete_doc" 
                            title="ไฟล์เอกสารฉบับสมบูรณ์ (DOCX)" 
                            hint="รองรับไฟล์ .docx เท่านั้น" 
                            accept=".docx" 
                        />
                        {/* --- จบส่วนที่แก้ไข --- */}
                    </div>

                     {/* --- Row 2 --- */}
                    <div className={styles.twoColumnGrid}>
                        <FileUploadZone name="article_files" title="ไฟล์บทความสำหรับตีพิมพ์" hint="รองรับไฟล์ .docx และ .pdf" accept=".docx,.pdf" />
                        <FileUploadZone name="program_files" title="ไฟล์โปรแกรมพร้อมติดตั้ง" hint="แนะนำ .zip, .rar, .exe" accept=".zip,.rar,.exe" />
                    </div>

                     {/* --- Row 3 --- */}
                    <div className={styles.twoColumnGrid}>
                        <FileUploadZone name="web_files" title="File Web (Zip)" hint="รองรับไฟล์ .zip เท่านั้น" accept=".zip" />
                        <FileUploadZone name="poster_files" title="ไฟล์โปสเตอร์" hint="รองรับไฟล์ .psd และ .jpg" accept=".psd,.jpg,.jpeg" />
                    </div>

                     {/* --- Row 4 (Single Column) --- */}
                    <div>
                        <FileUploadZone name="certificate_files" title="ไฟล์ใบผ่านการอบรม (ถ้ามี)" hint="รองรับไฟล์ .pdf, .jpg, .png" accept=".pdf,.jpg,.jpeg,.png" />
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
                        className={styles.submitButton} 
                        onClick={handleSubmit}
                    >
                        บันทึก
                    </button>
                </div>
            </div>
            
            {/* Footer */}
            <footer className={styles.footer}>
                <p className={styles.footerText}>© 2023 University Project Hub </p>
                <div className={styles.footerLinks}>
                    <a href="#" className={styles.footerLink}> Contact Us </a>
                    <a href="#" className={styles.footerLink}> Privacy Policy </a>
                </div>
            </footer>
        </div>
    );
}

export default Ufinal;