import React, { useState, useEffect } from 'react';
import styles from'./UserProfileEdit.module.css'; // Import the CSS file
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom'
// Main component for the User Profile page
function UserProfile() {
    // --- State Management ---
    // State for storing user profile data (name, role)
    const [profile, setProfile] = useState(null);
    // State for storing project summary data (uploaded, approved)
    const [summary, setSummary] = useState(null);
    // State for handling loading status
    const [loading, setLoading] = useState(true);
    // State for handling potential errors
    const [error, setError] = useState(null);

    // --- Configuration ---
    // In a real app, get userId from auth context, props, or URL params.
    const [userId, setUserId] = useState(null);



    useEffect(() => {
        const loggedInUser = localStorage.getItem('user');
        if (loggedInUser) {
            const user = JSON.parse(loggedInUser);
            setUserId(user.id); // ตั้งค่า userId จาก localStorage
        } else {
            // ถ้าไม่มีข้อมูลผู้ใช้ ให้ตั้งค่า error หรือ redirect ไปหน้า login
            setError('User not logged in.');
            setLoading(false);
        }
    }, []);
    // --- Data Fetching ---
    // useEffect runs after the component mounts to fetch data from the API.
     useEffect(() => {
        // 3. เพิ่มเงื่อนไข: ถ้ายังไม่มี userId ให้หยุดทำงาน
        if (!userId) {
            return;
        }

        const controller = new AbortController();
        const signal = controller.signal;

        const fetchData = async () => {
            try {
                const [profileResponse, summaryResponse] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/api/users/${userId}/profile`),
                    fetch(`${import.meta.env.VITE_API_URL}/api/users/${userId}/summary`)
                ]);

                if (!profileResponse.ok || !summaryResponse.ok) {
                    throw new Error('Network response was not ok');
                }

                const profileData = await profileResponse.json();
                const summaryData = await summaryResponse.json();

                setProfile(profileData);
                setSummary(summaryData);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setError('Failed to fetch data. Please try again later.');
                    console.error('Fetch error:', err);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        return () => {
            controller.abort();
        };
    }, [userId]); // The effect depends on userId and will re-run if it changes

    // --- UI Rendering ---

    // Display a loading message while data is being fetched
    if (loading) {
        return <div className="loading-container">Loading profile...</div>;
    }

    // Display an error message if fetching failed
    if (error) {
        return <div className="error-container">{error}</div>;
    }

    // Helper to get user initials for the avatar
    const getInitials = () => {
        if (!profile) return '??';
        const firstNameInitial = profile.first_name?.[0] || '';
        const lastNameInitial = profile.last_name?.[0] || '';
        return `${firstNameInitial}${lastNameInitial}`.toUpperCase();
    };
    
    const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown User';

    return (
        <div>
        <div className={styles.profilebody}>
            <div className={styles.profilecard}>
                {/* Profile Header */}
                <div className={styles.profileheader}>
                    <div className={styles.profileavatar}>{getInitials()}</div>
                    <div className={styles.textcenter}>
                        <h1 className={styles.username}>{fullName}</h1>
                        <p className={styles.userrole}>{profile?.role || 'No role assigned'}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className={styles.actionbuttons}>
                        {/* ปุ่ม Project Status */}
                        <Link to="/ProjectStatus" className={styles.btnbtnprimary}>
                            Edit Project
                        </Link>
                        
                        {/* ปุ่ม Edit Profile - แก้ไขให้ลิงก์ไปยังหน้า edit-profile */}
                        <Link to={`/edit-profile/${userId}`} className={styles.btnbtnsecondary}>
                            Edit Profile
                        </Link>
                    </div>

                <hr />

                {/* Project Summary */}
                <div className={styles.projectsummary}>
                    <h2 className={styles.summarytitle}>Project Summary</h2>
                    <div className={styles.summarystats}>
                        <div className={styles.statitem}>
                            <p className={styles.summaryvalue}>{summary?.uploaded ?? 0}</p>
                            <p className={styles.summarylabel}>Projects Uploaded</p>
                        </div>
                        <div className={styles.statitem}>
                            <p className={styles.summaryvalue}>{summary?.approved ?? 0}</p>
                            <p className={styles.summarylabel}>Approved</p>
                        </div>
                    </div>
                </div>
                
            </div>
            <br />
        </div>
            <footer className={styles.footer}>
                                  <p className={styles.footerText}>© 2023 University Project Hub</p>
                                  <div className={styles.footerLinks}>
                                      <a href="#" className={styles.footerLink}>Contact Us</a>
                                      <a href="#" className={styles.footerLink}>Privacy Policy</a>
                                  </div>
                  </footer>
        </div>
    );
}

export default UserProfile;
