// src/components/UserManagement.jsx

// (!!!) 1. Import 'useRef' เพิ่ม
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
// (เพิ่ม) import ฟังก์ชันทั้งหมดจาก api
import { fetchUsers, createUser, updateUser, deleteUser, fetchUserById } from '../api/usersApi';
import styles from '../styles/UserManagement.module.css';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeRole, setActiveRole] = useState('All');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'descending' });//จัดเรียงข้อมูล
    // === (เพิ่ม) State และฟังก์ชันที่ขาดหายไปสำหรับ Modal และ Actions ===
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [currentUser, setCurrentUser] = useState({ // state สำหรับเก็บข้อมูลในฟอร์ม
        username: '', email: '', password: '', first_name: '',
        last_name: '', identification: '', role: 'student', is_active: 1
    });

    // (!!!) 2. สร้าง Ref สำหรับ File Input
    const fileInputRef = useRef(null);

    const loadUsers = () => {
        setLoading(true);
        fetchUsers()
            .then(data => {
                setUsers(data);
                setLoading(false);
            })
            .catch(error => {
                console.error("Failed to fetch users:", error);
                alert("Error fetching user list. Please check the console.");
                setLoading(false);
            });
    };

   
    useEffect(() => {
        loadUsers();
    }, []);

    // ... (ฟังก์ชัน handleInputChange, handleSelectAll, handleEditClick, handleFormSubmit, openAddModal, closeModalAndRefresh, handleDelete, handleDeleteSelected, handleSelectUser อยู่เหมือนเดิม) ...

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? (checked ? 1 : 0) : value;
        setCurrentUser(prev => ({ ...prev, [name]: val }));
    };
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            // ถ้ากดเลือกทั้งหมด ให้เอา id ของทุกคนที่แสดงอยู่ไปใส่ใน state
            const allUserIds = sortedAndFilteredUsers.map(user => user.id);
            setSelectedUsers(allUserIds);
        } else {
            // ถ้ากดยกเลิก ให้ล้างค่าทั้งหมด
            setSelectedUsers([]);
        }
    };
    const handleEditClick = async (user) => { // เมื่อคลิกปุ่ม Edit จะดึงข้อมูลผู้ใช้จาก API
        try {
            const fullUserData = await fetchUserById(user.id);
            setCurrentUser(fullUserData);
            setModalMode('edit');
            setIsModalOpen(true);
        } catch (error) {
            alert('Error fetching user data for editing.');
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalMode === 'edit') {
                await updateUser(currentUser.id, currentUser);
            } else {
                await createUser(currentUser);
            }
            closeModalAndRefresh();
        } catch (error) {
            alert(`Error: Could not ${modalMode} user.`);
        }
    };

    const openAddModal = () => {
        setCurrentUser({
            username: '', email: '', password: '', first_name: '',
            last_name: '', identification: '', role: 'student', is_active: 1
        });
        setModalMode('add');
        setIsModalOpen(true);
    };

    const closeModalAndRefresh = () => {
        setIsModalOpen(false);
        loadUsers();
    };

    const handleDelete = async (userId) => {
        if (window.confirm(`Are you sure you want to delete this user?`)) {
            try {
                await deleteUser(userId);
                loadUsers();
            } catch (error) {
                alert('Error: Could not delete user.');
            }
        }
    };
    const handleDeleteSelected = async () => {
        if (selectedUsers.length === 0) {
            alert("Please select users to delete.");
            return;
        }

        if (window.confirm(`Are you sure you want to delete ${selectedUsers.length} selected users?`)) {
            try {
                // วนลูปเพื่อลบผู้ใช้ทีละคน
                await Promise.all(selectedUsers.map(id => deleteUser(id)));
                setSelectedUsers([]); // ล้างค่าที่เลือกไว้
                loadUsers(); // โหลดข้อมูลใหม่
            } catch (error) {
                alert('Error: Could not delete selected users.');
            }
        }
    };
    const handleSelectUser = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    // (!!!) 3. เพิ่มฟังก์ชันสำหรับจัดการการอัปโหลดไฟล์
    const handleUploadClick = () => {
        // สั่งให้ file input ที่ซ่อนอยู่ทำงาน
        fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            console.log("Selected file:", file.name);
            alert(`เลือกไฟล์: ${file.name}\n\n(ขั้นต่อไป: เพิ่มโค้ดสำหรับอ่านไฟล์ Excel และส่งข้อมูลไปยัง API)`);
            
            // ที่จุดนี้ คุณจะต้องใช้ library เช่น 'xlsx' (sheetjs) เพื่ออ่านข้อมูลในไฟล์
            // แล้วจึงส่งข้อมูล (JSON) ไปยัง API endpoint ใหม่สำหรับ "Bulk Create Users"
            
            // ตัวอย่าง (ต้องติดตั้ง xlsx ก่อน: npm install xlsx)
            /*
            const reader = new FileReader();
            reader.onload = (evt) => {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                console.log(data);
                // ที่จุดนี้ คุณจะ GOTO API เพื่อสร้างผู้ใช้จาก 'data'
                // await bulkCreateUsers(data); 
            };
            reader.readAsBinaryString(file);
            */

            // รีเซ็ตค่าใน input เพื่อให้สามารถอัปโหลดไฟล์ชื่อเดิมซ้ำได้
            e.target.value = null;
        }
    };


    const sortedAndFilteredUsers = useMemo(() => {
        // กรองข้อมูลก่อน
        let filtered = users.filter(user => {
            const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
            const roleMatch = activeRole === 'All' || user.role.toLowerCase() === activeRole.toLowerCase();
            const searchMatch = fullName.includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
            return roleMatch && searchMatch;
        });

        // จากนั้นจึงจัดเรียงข้อมูล
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // ทำให้การเรียงตัวอักษรไม่สน case-sensitive
                if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                if (typeof bValue === 'string') bValue = bValue.toLowerCase();

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return filtered;
    }, [users, activeRole, searchTerm, sortConfig]); // คำนวณใหม่เมื่อค่าเหล่านี้เปลี่ยน

    return (
        <div className={styles.body}>
            <div className={styles.dashboardContainer}>
                              <div className={styles.dashboardContainer}>
                                    <div>
                                        <Link to="/AdminDashboard" className={styles.backButton}>
                                        &larr; กลับไปยังหน้าจัดการข้อมูลแอดมิน
                                        </Link>
                                    </div>
                              </div>
                <div className={styles.usermanagementcontainer}>
                    {/* ... (ส่วน Header, Controls, Searchbar เหมือนเดิม) ... */}
                    
                    <h1>User Management</h1>

                   
                    <div className={styles.controlscontainer}>
                        <div className={styles.actionbuttons}>
                            <button onClick={openAddModal} className={`${styles.btn} ${styles.adduserbtn}`}>
                                + เพิ่มผู้ใช้
                            </button>

                            {/* (!!!) START: 4. เพิ่มปุ่มและ Input ที่ซ่อนอยู่ (!!!) */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                                accept=".xlsx, .xls" // จำกัดให้รับเฉพาะไฟล์ Excel
                            />
                            <button 
                                onClick={handleUploadClick} 
                                // (แนะนำ) เพิ่ม class 'uploadbtn' ใน CSS เพื่อทำเป็นสีเขียว
                                className={`${styles.btn} ${styles.uploadbtn}`} 
                            >
                                อัพโหลด Excel
                            </button>
                            {/* (!!!) END: 4. เพิ่มปุ่มและ Input ที่ซ่อนอยู่ (!!!) */}


                            <button 
                                onClick={handleDeleteSelected} 
                                className={`${styles.btn} ${styles.deleteuserbtn}`}
                                disabled={selectedUsers.length === 0}
                            >
                                ลบผู้ใช้ที่เลือก
                            </button>
                            
                        </div>
                        
                        <div className={styles.roleselector}>
                            
                            <label>Filter by role</label>
                             <div>
                                    <select
                                        onChange={(e) => {
                                            const [key, direction] = e.target.value.split('-');
                                            setSortConfig({ key, direction });
                                        }}
                                        value={`${sortConfig.key}-${sortConfig.direction}`}
                                        className={styles.btna}
                                    >
                                        
                                        <option value="created_at-descending">Date Added (Newest)</option>
                                        <option value="created_at-ascending">Date Added (Oldest)</option>
                                        <option value="role-ascending">Role (A-Z)</option>
                                        <option value="role-descending">Role (Z-A)</option>
                                        <option value="first_name-ascending">Name (A-Z)</option>
                                        <option value="first_name-descending">Name (Z-A)</option>
                                    </select>
                        </div>
                            <div className={styles.roletabs}>
                                <button onClick={() => setActiveRole('All')} className={activeRole === 'All' ? styles.active : ''}>All</button>
                                <button onClick={() => setActiveRole('Admin')} className={activeRole === 'Admin' ? styles.active : ''}>Admin</button>
                                <button onClick={() => setActiveRole('Advisor')} className={activeRole === 'Advisor' ? styles.active : ''}>Advisor</button>
                                <button onClick={() => setActiveRole('Student')} className={activeRole === 'Student' ? styles.active : ''}>Student</button>
                                
                            </div>
                        </div>
                       
                    </div>

                    {/* --- ช่องค้นหา (Search Bar) --- */}
                    <div className={styles.searchbar}>
                        <input 
                            type="text" 
                            placeholder="Search for users by name or email..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {/* Role Selector */}
                    </div>

                    
                    <div className={styles.usertable}>
                        <table>
                            <thead>
                                <tr>
                                    <th>
                                        <input 
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            // เช็คว่าถูกเลือกทั้งหมดหรือไม่ (กรณีที่ไม่มี user เลยให้เป็น false)
                                            checked={sortedAndFilteredUsers.length > 0 && selectedUsers.length === sortedAndFilteredUsers.length}
                                        />
                                    </th> 
                                    {/* (เพิ่ม) th สำหรับ checkbox */}
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    {/* 4. เพิ่มคอลัมน์ Date Added */}
                                    <th>Date Added</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            
                            <tbody>
                                {sortedAndFilteredUsers.map((user) => (
                                    <tr key={user.id}>
                                        {/* (เพิ่ม) td สำหรับ checkbox */}
                                        <td><input type="checkbox" onChange={() => handleSelectUser(user.id)} checked={selectedUsers.includes(user.id)} /></td>
                                        <td>
                                            <div className={styles.userinfo}>
                                                <img className={styles.useravatar} src={`https://i.pravatar.cc/40?u=${user.email}`} alt="avatar" />
                                                <div>
                                                    {/* (แก้ไข) แสดงผลชื่อให้ถูกต้อง */}
                                                    <strong>{user.first_name} {user.last_name}</strong>
                                                    <br />
                                                    <span style={{color: '#6c757d', fontWeight: '400'}}>{user.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`${styles.roleBadge} ${styles['role-' + user.role.toLowerCase().replace(' ', '-')]}`}>{user.role}</span>
                                        </td>
                                        <td>
                                            <span className={`${styles.status} ${user.is_active ? styles.active : styles.inactive}`}>{user.is_active ? 'Active' : 'Inactive'}</span>
                                        </td>
                                        <td>
                                            {user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : 'N/A'}
                                        </td>
                                        
                                        <td>
                                          
                                            <div className={styles.actionCell}>
                                                 <button onClick={() => handleEditClick(user)} className={`${styles.actionBtn} ${styles.editBtn}`}>
                                                    แก้ไข
                                                  </button>
                                                {/* (แก้ไข) ปุ่ม Delete ให้เรียกใช้ handleDelete */}
                                                <button onClick={() => handleDelete(user.id)} className={`${styles.actionBtn} ${styles.deleteuserbtn}`}>ลบผู้ใช้</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- Modal และ Footer --- */}
                {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2>{modalMode === 'edit' ? 'Edit User' : 'Add New User'}</h2>
                        <form onSubmit={handleFormSubmit}>
                            <div className={styles.formGrid}>
                                <input name="username" value={currentUser.username} onChange={handleInputChange} placeholder="Username" required />
                                <input name="email" type="email" value={currentUser.email} onChange={handleInputChange} placeholder="Email" required />
                                <input name="password" type="password" value={currentUser.password} onChange={handleInputChange} placeholder="New Password (leave blank to keep current)" />
                                <input name="identification" value={currentUser.identification} onChange={handleInputChange} placeholder="Identification" />
                                <input name="first_name" value={currentUser.first_name} onChange={handleInputChange} placeholder="First Name" required />
                                <input name="last_name" value={currentUser.last_name} onChange={handleInputChange} placeholder="Last Name" required />
                                
                            </div>
                                <div className={styles.formGroup}>
                                    <label>Role:</label>
                                    <div className={styles.radioGroup}>
                                        {/* === (แก้ไข) อ้างอิงจาก currentUser.role === */}
                                        <label><input type="radio" name="role" value="admin" checked={currentUser.role === 'admin'} onChange={handleInputChange} /> Admin</label>
                                        <label><input type="radio" name="role" value="advisor" checked={currentUser.role === 'advisor'} onChange={handleInputChange} /> Advisor</label>
                                        <label><input type="radio" name="role" value="student" checked={currentUser.role === 'student'} onChange={handleInputChange} /> Student</label>
                                    </div>
                                </div>
                              <div className={styles.formGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input type="checkbox" name="is_active" checked={currentUser.is_active == 1} onChange={handleInputChange} />
                                    User is Active
                                </label>
                              </div>
                                <div className={styles.modalActions}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>Cancel</button>
                                <button type="submit" className={styles.saveBtn}>Save Changes</button>
                            </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
                            <footer className={styles.footer}>
                    <p className={styles.footerText}>© 2025 Your Company. All Rights Reserved.</p>
                    <div className={styles.footerLinks}>
                        <a href="#" className={styles.footerLink}>Contact Us</a>
                        <a href="#" className={styles.footerLink}>Privacy Policy</a>
                    </div>
                </footer>
        </div>
    );
};

export default UserManagement;