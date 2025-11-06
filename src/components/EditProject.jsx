import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import styles from '../styles/Ufinal1.module.css'; // (สำคัญ) ใช้ CSS เดียวกับหน้าอัปโหลด

function EditProject() {
    const { id: projectId } = useParams(); // ดึง ID ของโปรเจกต์จาก URL
    const navigate = useNavigate();
    const [userId, setUserId] = useState(null);

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
        // --- ส่วนที่ต่างจาก Ufinal ---
        // เราไม่จำเป็นต้องดึง permission มา เพราะการกดแก้ไขคือการยืนยันสิทธิ์ในตัว
        // เราจะเก็บไฟล์ "ที่มีอยู่" เพื่อแสดงผล
        existing_files: {}, 
        // --- State สำหรับไฟล์ใหม่ (เหมือน Ufinal) ---
        complete_pdf: [],
        complete_doc: [],
        article_files: [],
        program_files: [],
        web_files: [],
        poster_files: [],
        certificate_files: [],
        front_face: [],
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // (เหมือน Ufinal) State สำหรับการค้นหา
    const [advisorSuggestions, setAdvisorSuggestions] = useState([]);
    const [coAdvisorSuggestions, setCoAdvisorSuggestions] = useState([]);
    const [coAuthorSuggestions, setCoAuthorSuggestions] = useState([]);

    // --- (ใหม่) Step 1: ดึงข้อมูลผู้ใช้ และ ID โปรเจกต์ ---
    useEffect(() => {
        const loggedInUser = localStorage.getItem('user');
        if (loggedInUser) {
            const user = JSON.parse(loggedInUser);
            setUserId(user.id);
            // (แก้ไข) ตั้งค่าผู้แต่งหลัก (Author) จาก localStorage ทันที
            // เพราะ API /api/student/documents/:id อาจจะไม่ได้คืนค่า author มา
            setFormData(prevState => ({
                ...prevState,
                author: `${user.first_name || ''} ${user.last_name || ''}`,
            }));
        } else {
            setError("User not logged in.");
            setLoading(false);
        }
    }, []);

    // --- (ใหม่) Step 2: ดึงข้อมูลโปรเจกต์เดิมมาใส่ฟอร์ม ---
    useEffect(() => {
        // ต้องมีทั้ง Project ID และ User ID ก่อนถึงจะดึงข้อมูลได้
        if (!projectId || !userId) return;

        const fetchProjectData = async () => {
            setLoading(true);
            try {
                // (สำคัญ) เราใช้ API นี้ตามที่คุณกำหนดใน server.js (บรรทัด 1032)
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/student/documents/${projectId}?userId=${userId}`);
                
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.message || 'Failed to fetch project data');
                }
                
                const data = await response.json();

                // (สำคัญ) แปลง document_type (ที่เป็น string "A,B,C") กลับเป็น Array
                const docTypesArray = data.document_type ? data.document_type.split(',') : [];

                // (สำคัญ) แยก file_paths ที่มีอยู่
                const existingFiles = data.file_paths || {};

                setFormData(prevState => ({
                    ...prevState,
                    title: data.title || '',
                    title_eng: data.title_eng || '',
                    co_author: data.co_author || '', // ดึงผู้แต่งร่วมเดิม
                    abstract: data.abstract || '',
                    advisorName: data.advisorName || '',
                    department: data.department || '',
                    coAdvisorName: data.coAdvisorName || '',
                    keywords: data.keywords || '',
                    supportAgency: data.supportAgency || '',
                    document_type: docTypesArray,
                    existing_files: existingFiles, // เก็บไฟล์เดิมไว้แสดงผล
                    // author จะถูกตั้งค่าไว้แล้วจาก localStorage
                }));

            } catch (err) {
                console.error('Error fetching project data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProjectData();

    }, [projectId, userId]); // ทำงานเมื่อได้ ID ครบ

    
    // --- (เหมือน Ufinal) ฟังก์ชันค้นหาทั้งหมด ---
    
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
            if (name === 'advisorName') setAdvisorSuggestions(data);
            else if (name === 'coAdvisorName') setCoAdvisorSuggestions(data);
        } catch (error) {
            console.error('Error fetching advisor suggestions:', error);
        }
    };

    // (คงเดิม) ฟังก์ชันค้นหาผู้แต่งคนที่ 2 (นักศึกษา)
    const handleStudentSearch = async (e) => {
        const { name, value } = e.target;
        handleChange(e); 
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

    // (คงเดิม)
    const handleSuggestionClick = (name, suggestion) => {
        setFormData(prevState => ({
            ...prevState,
            [name]: `${suggestion.first_name} ${suggestion.last_name}`,
        }));
        if (name === 'advisorName') setAdvisorSuggestions([]);
        if (name === 'coAdvisorName') setCoAdvisorSuggestions([]);
        if (name === 'co_author') setCoAuthorSuggestions([]);
    };

    // (คงเดิม)
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
             // หน้านี้ไม่มี permission checkbox
            if (name === 'document_type') {
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
            setFormData(prevState => ({ ...prevState, [name]: value }));
        }
    };

    // (คงเดิม)
    const handleFileChange = (e) => {
        const { name, files, accept } = e.target; 
        const allowedExtensions = accept.split(',').map(ext => ext.trim().toLowerCase());

        const validFiles = Array.from(files).filter(file => {
            const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase(); 
            return allowedExtensions.includes(fileExtension);
        });

        if (validFiles.length < files.length) {
            alert(`ไฟล์บางไฟล์มีนามสกุลไม่ถูกต้อง (รองรับเฉพาะ: ${accept})`);
        }

        if (validFiles.length > 0) {
            setFormData(prevState => ({
                ...prevState,
                [name]: [...prevState[name], ...validFiles], 
            }));
        }
        e.target.value = null; 
    };

    // (คงเดิม)
    const handleRemoveFile = (fileName, fileType) => {
        setFormData(prevState => ({
            ...prevState,
            [fileType]: prevState[fileType].filter(file => file.name !== fileName)
        }));
    };
    
    // --- (แก้ไข) Step 3: ปรับ handleSubmit ให้ใช้ PUT ---
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        // (แก้ไข) การตรวจสอบข้อมูลในหน้านี้ เราไม่บังคับ permission
        const missingFields = [];
        if (formData.title.trim() === '') missingFields.push('ชื่อโครงงาน');
        if (formData.title_eng.trim() === '') missingFields.push('ชื่อโครงงานภาษาอังกฤษ');
        if (formData.abstract.trim() === '') missingFields.push('บทคัดย่อ');
        if (formData.keywords.trim() === '') missingFields.push('คำสำคัญ');
        if (formData.advisorName.trim() === '') missingFields.push('ชื่ออาจารย์ที่ปรึกษา');

        if (missingFields.length > 0) {
            alert('กรุณากรอกข้อมูลต่อไปนี้ให้ครบถ้วน:\n\n- ' + missingFields.join('\n- '));
            return; 
        }

        const data = new FormData();
        const fileKeys = [
            'complete_pdf', 'complete_doc', 'article_files', 'program_files', 
            'web_files', 'poster_files', 'certificate_files',
            'front_face'
        ];

        // Append text data (เหมือน Ufinal)
        for (const key in formData) {
            if (!fileKeys.includes(key) && key !== 'existing_files') { // ไม่ส่ง existing_files กลับไป
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

        // Append file data (เฉพาะไฟล์ที่อัปโหลดใหม่)
        fileKeys.forEach(key => {
            if (formData[key] && formData[key].length > 0) {
                formData[key].forEach(file => {
                    data.append(key, file);
                });
            }
        });
        
        console.log('กำลังส่ง FormData (PUT) ที่มี keys:', [...data.keys()]);
        
        try {
            // (สำคัญ) เปลี่ยนเป็น Method PUT และใช้ URL ที่มี ID
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`, { 
                method: 'PUT', // (!!!) เปลี่ยนเป็น PUT (!!!)
                body: data,
                // (!!!) ไม่ต้องใส่ 'Content-Type': 'multipart/form-data'
                // fetch API จะตั้งค่า Boundary ให้เองเมื่อเจอ FormData
            });

            const result = await response.json();
            if (response.ok) {
                alert(result.message || 'บันทึกข้อมูลสำเร็จ');
                // (สำคัญ) เมื่อแก้ไขสำเร็จ ให้เด้งกลับไปหน้าสถานะ
                navigate('/ProjectStatus'); 
            } else {
                alert('เกิดข้อผิดพลาด: ' + (result.message || 'ไม่สามารถบันทึกข้อมูลได้'));
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: ' + (error.message || 'กรุณาตรวจสอบ Console'));
        }
    };

    // --- (แก้ไข) FileUploadZone เพื่อแสดงไฟล์เดิม ---
    const FileUploadZone = ({ name, title, hint, accept }) => {
        // หาว่ามีไฟล์เดิมในช่องนี้หรือไม่
        const existing = formData.existing_files?.[name] || [];
        // หาว่ามีไฟล์ใหม่ที่เพิ่งเลือกในช่องนี้หรือไม่
        const newFiles = formData[name] || [];
        
        return (
            <div className={styles.fileDropzone}>
                <p>{title}</p>
                <p className={styles.fileHint}>{hint}</p>

                {/* (ใหม่) แสดงรายการไฟล์เดิม */}
                {existing.length > 0 && newFiles.length === 0 && (
                    <div className={styles.existingFiles}>
                        <p className={styles.fileHint}>ไฟล์เดิมที่อัปโหลดไว้:</p>
                        <ul className={styles.fileList}>
                            {existing.map((fileUrl, index) => {
                                // พยายามดึงชื่อไฟล์จาก S3 URL
                                const fileName = fileUrl.split('/').pop().substring(14); // ตัด timestamp
                                return (
                                    <li key={index} className={styles.fileItem}>
                                        <span className={styles.fileName}>{fileName || 'ไฟล์เดิม'}</span>
                                    </li>
                                );
                            })}
                        </ul>
                        <p className={styles.fileHint}>(การเลือกไฟล์ใหม่จะอัปโหลดทับไฟล์เดิม)</p>
                    </div>
                )}
                
                {/* ปุ่มเลือกไฟล์ (เหมือนเดิม) */}
                <label className={styles.fileButton}>
                    {newFiles.length > 0 ? "เลือกไฟล์เพิ่ม" : (existing.length > 0 ? "เลือกไฟล์ใหม่ (เพื่อทับไฟล์เดิม)" : "เลือกไฟล์")}
                    <input
                        type="file"
                        name={name}
                        multiple
                        accept={accept}
                        onChange={handleFileChange}
                    />
                </label>

                {/* (ใหม่) แสดงรายการไฟล์ใหม่ (ถ้ามี) */}
                {newFiles.length > 0 && (
                    <ul className={styles.fileList}>
                        {newFiles.map((file, index) => (
                            <li key={index} className={styles.fileItem}>
                                <span className={styles.fileName} style={{ color: '#007bff' }}> (ใหม่) {file.name}</span>
                                <button
                                    type="button"
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
    };

    // --- (ใหม่) ส่วนแสดงผลขณะโหลดหรือมีข้อผิดพลาด ---
    if (loading) {
        return <div className={styles.pageContainer}><h1 className={styles.pageTitle}>กำลังโหลดข้อมูลโปรเจกต์...</h1></div>;
    }

    if (error) {
        return (
            <div className={styles.pageContainer}>
                <h1 className={styles.pageTitle} style={{ color: 'red' }}>เกิดข้อผิดพลาด</h1>
                <p>{error}</p>
                <Link to="/ProjectStatus" className={styles.linkButton}>กลับไปหน้าสถานะ</Link>
            </div>
        );
    }

    // --- (แก้ไข) หน้าฟอร์มหลัก ---
    return (
        <form onSubmit={handleSubmit}>
        <div className={styles.pageContainer}>
            <div className={styles.uploadCard}>
                <h1 className={styles.pageTitle}>แก้ไขโครงงาน</h1>
                <p>ID: {projectId}</p>
                
                 {/* Section 1: ข้อมูลผู้เขียน (เหมือน Ufinal) */}
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
                                        <li key={student.id} onClick={() => handleSuggestionClick('co_author', student)}>
                                            {student.first_name} {student.last_name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 2: ข้อมูลโครงงาน (เหมือน Ufinal) */}
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
                                        <li key={advisor.id} onClick={() => handleSuggestionClick('advisorName', advisor)}>
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
                                        <li key={advisor.id} onClick={() => handleSuggestionClick('coAdvisorName', advisor)}>
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

                {/* Section 3: ประเภทและสาขา (เหมือน Ufinal) */}
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
                            {/* (เหมือน Ufinal) */}
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

                {/* Section 4: อัปโหลดไฟล์ (ใช้ FileUploadZone ที่แก้ไขแล้ว) */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>อัปโหลดไฟล์ (แก้ไข)</h2>
                    
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
                        <FileUploadZone name="article_files" title="ไฟล์บทความสำหรับตีพิมพ์" hint="รองรับไฟล์ .docx และ .pdf" accept=".docx,.pdf" />
                        <FileUploadZone name="program_files" title="ไฟล์โปรแกรมพร้อมติดตั้ง" hint="แนะนำ .zip, .rar, .exe" accept=".zip,.rar,.exe" />
                    </div>
                    <div className={styles.twoColumnGrid}>
                        <FileUploadZone name="web_files" title="File Web (Zip)" hint="รองรับไฟล์ .zip เท่านั้น" accept=".zip" />
                        <FileUploadZone name="poster_files" title="ไฟล์โปสเตอร์" hint="รองรับไฟล์ .psd และ .jpg" accept=".psd,.jpg,.jpeg" />
                    </div>
                    <div className={styles.twoColumnGrid}>
                        <FileUploadZone name="certificate_files" title="ไฟล์ใบผ่านการอบรม (ถ้ามี)" hint="รองรับไฟล์ .pdf, .jpg, .png" accept=".pdf,.jpg,.jpeg,.png" />
                        <FileUploadZone name="front_face" title="หน้าปก" hint="รองรับไฟล์ .jpeg" accept=".jpeg" />
                    </div>
                    
                    {/* (ลบออก) ไม่ต้องมีการยืนยันสิทธิ์ในหน้าแก้ไข 
                        เพราะการกดส่งถือเป็นการยืนยันแล้ว */}
                </div>


                {/* Buttons */}
                <div className={styles.buttonGroup}>
                    <Link to="/ProjectStatus" className={styles.linkButton}>
                        ยกเลิก
                    </Link>
                    <button 
                        type="submit"
                        className={styles.submitButton} 
                    >
                        บันทึกการแก้ไข
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
        </form>
    );
}

export default EditProject;