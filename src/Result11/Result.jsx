import React, { useState, useEffect } from 'react';
import { Code, Coffee, Zap, Heart, Star, Trophy, Play, Pause } from 'lucide-react';

const DocumentInfoPage = () => {
  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ฟังก์ชันดึงข้อมูลจาก PHP API
  const fetchDocumentData = async (documentId = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/document.php?id=${documentId}`);
      
      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลได้');
      }
      
      const data = await response.json();
      setDocumentData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลเมื่อ component โหลด
  useEffect(() => {
    fetchDocumentData();
  }, []);

  // แสดง Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  // แสดง Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => fetchDocumentData()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  // แสดงข้อมูลเมื่อโหลดเสร็จ
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            {documentData?.title || 'ไม่มีข้อมูลหัวเรื่อง'}
          </h1>
        </div>

        {/* Document Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">ข้อมูลเอกสาร</h2>
              <div className="space-y-3">
                <div className="flex">
                  <span className="w-20 text-gray-600">ชื่อเรื่อง:</span>
                  <span className="flex-1 font-medium">{documentData?.document_name || 'ไม่มีข้อมูล'}</span>
                </div>
                <div className="flex">
                  <span className="w-20 text-gray-600">ผู้แต่ง:</span>
                  <span className="flex-1">{documentData?.author || 'ไม่มีข้อมูล'}</span>
                </div>
                <div className="flex">
                  <span className="w-20 text-gray-600">สาขา:</span>
                  <span className="flex-1">{documentData?.department || 'ไม่มีข้อมูล'}</span>
                </div>
                <div className="flex">
                  <span className="w-20 text-gray-600">การแปลงเอกสาร:</span>
                  <span className="flex-1">{documentData?.document_conversion || 'ไม่มีข้อมูล'}</span>
                </div>
                <div className="flex">
                  <span className="w-20 text-gray-600">บทคัดย่อ:</span>
                  <span className="flex-1">{documentData?.abstract || 'ไม่มีข้อมูล'}</span>
                </div>
              </div>
            </div>

            {/* Keywords Section */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">คำสำคัญ</h2>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Keyword:</strong> {documentData?.keywords || 'ไม่มีข้อมูล'}<br/>
                  <strong>ThaiSH:</strong> {documentData?.thai_sh || 'ไม่มีข้อมูล'}<br/>
                  <strong>Classification:</strong> {documentData?.classification || 'ไม่มีข้อมูล'}<br/>
                  <strong>เครื่องมือ:</strong> {documentData?.tools || 'ไม่มีข้อมูล'}<br/>
                  <strong>สาขา:</strong> {documentData?.field || 'ไม่มีข้อมูล'}
                </p>
              </div>
            </div>

            {/* Document Details */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">รายละเอียด</h2>
              <div className="space-y-3">
                <div className="flex">
                  <span className="w-24 text-gray-600">สำนักพิมพ์:</span>
                  <span className="flex-1">{documentData?.publisher || 'ไม่มีข้อมูล'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-gray-600">ปีที่พิมพ์:</span>
                  <span className="flex-1">{documentData?.publish_year || 'ไม่มีข้อมูล'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-gray-600">วันที่สแกน:</span>
                  <span className="flex-1">{documentData?.scan_date || 'ไม่มีข้อมูล'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-gray-600">วันที่แสดง:</span>
                  <span className="flex-1">{documentData?.display_date || 'ไม่มีข้อมูล'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-gray-600">ประเภท:</span>
                  <span className="flex-1">{documentData?.document_type || 'ไม่มีข้อมูล'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-gray-600">ข้อมูลเพิ่มเติม:</span>
                  <span className="flex-1">{documentData?.mime_type || 'ไม่มีข้อมูล'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Profile Image */}
            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center">
                {documentData?.profile_image ? (
                  <img 
                    src={documentData.profile_image} 
                    alt="Profile" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white text-4xl font-bold">
                    {documentData?.author?.charAt(0) || 'S'}
                  </span>
                )}
              </div>
            </div>

            {/* Publication Info */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">ข้อมูลการเผยแพร่</h2>
              <div className="space-y-3">
                <div className="flex">
                  <span className="w-24 text-gray-600">ภาษา:</span>
                  <span className="flex-1">{documentData?.language || 'ไม่มีข้อมูล'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-gray-600">ปีที่เผยแพร่:</span>
                  <span className="flex-1">{documentData?.publication_year || 'ไม่มีข้อมูล'}</span>
                </div>
              </div>
            </div>

            {/* File Attachments */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">ลิงก์ไฟล์เอกสาร</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-600 border-b pb-2">
                  <div className="col-span-1">ลำดับ</div>
                  <div className="col-span-7">ชื่อไฟล์</div>
                  <div className="col-span-4">ขนาดไฟล์</div>
                </div>
                
                {documentData?.files && documentData.files.length > 0 ? (
                  documentData.files.map((file, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 text-sm py-2 border-b">
                      <div className="col-span-1">{index + 1}</div>
                      <div className="col-span-7">
                        <a 
                          href={file.download_url} 
                          className="text-blue-600 hover:underline cursor-pointer"
                          download
                        >
                          {file.filename}
                        </a>
                      </div>
                      <div className="col-span-4">{file.file_size}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    ไม่มีไฟล์แนบ
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>© 2025 Document Management System</span>
            <span>Last updated: {documentData?.updated_at || new Date().toLocaleDateString('th-TH')}</span>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6">
        <button 
          onClick={() => fetchDocumentData()}
          className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors shadow-lg"
          title="รีเฟรชข้อมูล"
        >
          <span className="text-lg font-bold">↻</span>
        </button>
      </div>
    </div>
  );
};

export default DocumentInfoPage;
