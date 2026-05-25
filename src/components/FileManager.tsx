/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  History, 
  Download, 
  Edit3, 
  AlertCircle, 
  ShieldCheck, 
  FileCheck2,
  FolderOpen,
  ArrowLeft,
  Share2,
  Lock
} from 'lucide-react';
import { ClientFolder, UploadedFile, User, FileDocType, FileStatus } from '../types';

interface FileManagerProps {
  folder: ClientFolder;
  currentUser: User;
  token: string;
  onBack: () => void;
  onRefresh: () => void;
}

export function FileManager({ folder, currentUser, token, onBack, onRefresh }: FileManagerProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // File Preview Modal
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [previewFullData, setPreviewFullData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // File Upload State
  const [selectedDocType, setSelectedDocType] = useState<FileDocType>('passport');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // File Rename State
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  // Version Upload State inside Preview
  const [versionUploading, setVersionUploading] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const versionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFiles();
  }, [folder.id]);

  const fetchFiles = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/files?folderId=${folder.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch registered files.');
      }
      setFiles(data.files);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Drag and Drop implementation
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Splitting standard prefix data uri
        const base64Str = String(reader.result).split(',')[1];
        resolve(base64Str);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileProcess = async (file: File) => {
    setUploading(true);
    setErrorMsg(null);
    setUploadSuccess(null);

    // Filter file types
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Document size exceeds 10MB transmission threshold.');
      setUploading(false);
      return;
    }

    try {
      const base64String = await convertToBase64(file);
      const payload = {
        folderId: folder.id,
        fileName: file.name,
        fileType: selectedDocType,
        mimeType: file.type || 'application/octet-stream',
        content: base64String,
        fileSize: file.size
      };

      const res = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to finish file upload.');
      }

      setUploadSuccess(`File "${file.name}" uploaded successfully! Sent to supervisor queue.`);
      fetchFiles();
      onRefresh(); // Refresh parent statistics boxes
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Open Detailed Preview Modal
  const handleOpenPreview = async (file: UploadedFile) => {
    setPreviewLoading(true);
    setPreviewFile(file);
    setPreviewFullData(null);
    try {
      const res = await fetch(`/api/files/${file.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPreviewFullData(data.file);
      } else {
        setErrorMsg(data.error || 'Failed to load file contents.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Review (Approve / Reject) file
  const handleReviewFile = async (fileId: string, status: 'Approved' | 'Rejected') => {
    try {
      const res = await fetch(`/api/files/${fileId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Review submission failed.');
      }

      // Update local array or modal
      fetchFiles();
      onRefresh();
      
      if (previewFile && previewFile.id === fileId) {
        handleOpenPreview(data.file);
      }
    } catch (err: any) {
      alert(`Review Error: ${err.message}`);
    }
  };

  // Upload New Version (For encoders uploading corrections)
  const handleUploadNewVersionChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !previewFile) return;
    const file = e.target.files[0];
    setVersionUploading(true);
    setVersionError(null);

    try {
      const base64String = await convertToBase64(file);
      const res = await fetch(`/api/files/${previewFile.id}/version`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          content: base64String,
          mimeType: file.type || 'application/octet-stream'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to commit new version checkpoint.');
      }

      setVersionUploading(false);
      handleOpenPreview(data.file);
      fetchFiles();
      onRefresh();
    } catch (err: any) {
      setVersionError(err.message);
      setVersionUploading(false);
    }
  };

  // Rename File
  const handleRename = async (fileId: string) => {
    if (!newName.trim()) return;
    try {
      const res = await fetch(`/api/files/${fileId}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newName })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to rename file.');
      }
      setRenamingId(null);
      setNewName('');
      fetchFiles();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Record (Admin Only)
  const handleDeleteFile = async (fileId: string) => {
    if (!window.confirm('CRITICAL ACTION: Are you sure you wish to completely purge this document template from FMS servers? This is irreversible.')) {
      return;
    }

    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Deletion failed.');
      }
      
      setPreviewFile(null);
      fetchFiles();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Helper size formatter
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6" id="file-manager-root">
      
      {/* Back button & folder information banner */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-slate-700/40 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 border-slate-700 text-slate-400 font-mono">
                {folder.department} Department
              </span>
              <span className="text-xs font-mono text-amber-400 font-semibold">{folder.boxNumber}</span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight mt-1">Dossier: {folder.clientName}</h2>
          </div>
        </div>

        <div className="text-xs text-right space-y-1 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80 font-mono">
          <p className="text-slate-400">PASSPORT: <span className="font-bold text-white">{folder.passportNumber}</span></p>
          <p className="text-slate-400">FILE REF: <span className="font-bold text-white">{folder.fileNumber}</span></p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-3 rounded-xl flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {uploadSuccess && (
        <div className="bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 p-3 rounded-xl flex items-start gap-2.5 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Grid Section: File upload form & Drag and drop */}
        <div className="space-y-4">
          
          {/* Quick upload card */}
          <div className="bg-slate-800/25 border border-slate-700/30 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white">Document Clearance Digitizer</h3>
            
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Classification Group</label>
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value as FileDocType)}
                className="w-full bg-slate-900 text-slate-200 border border-slate-750 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="passport">Passport Scan</option>
                <option value="visa">Visa Documents</option>
                <option value="ticket">Travel Reservation Tickets</option>
                <option value="contract">Labor / Service Contracts</option>
                <option value="other">Other clearances / Receipts</option>
              </select>
            </div>

            {/* Drag drop drag box */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 transition cursor-pointer ${dragActive ? 'border-amber-400 bg-amber-500/5' : 'border-slate-700 hover:border-slate-600 bg-slate-900/40'}`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
              />
              <div className="p-3 bg-slate-800 rounded-full text-slate-450 border border-slate-700">
                <Upload className="w-6 h-6 text-slate-350" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-white">Drag and drop file here</p>
                <p className="text-[10px] text-slate-500">or click to browse local storage</p>
              </div>
              <p className="text-[9px] text-slate-500 font-mono">Supports PDF, PNG, JPG (Max 10MB)</p>
            </div>

            {uploading && (
              <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl flex items-center justify-center gap-2.5 text-xs text-amber-400">
                <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"></div>
                <span>Encrypting and digitizing file byte buffers...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Document listing directory */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800/25 border border-slate-700/30 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-slate-400" />
              Allocated Documents ({files.length})
            </h3>

            {loading ? (
              <p className="text-xs text-slate-500 text-center py-8">Reviewing server database entries...</p>
            ) : files.length === 0 ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center">
                <FileText className="w-10 h-10 mb-2.5 text-slate-650" />
                <p className="text-xs font-medium text-slate-400">No document entries digitised for this dossier traveler yet.</p>
                <p className="text-[10px] text-slate-500 mt-1">Select file parameters on the left to complete your first submit.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file) => {
                  
                  // Verification badge configurations
                  let badgeColors = 'bg-slate-800/40 border-slate-700/50 text-slate-300';
                  if (file.status === 'Approved') {
                    badgeColors = 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400';
                  } else if (file.status === 'Rejected') {
                    badgeColors = 'bg-red-950/40 border-red-500/30 text-red-400';
                  } else {
                    badgeColors = 'bg-blue-950/30 border-blue-500/30 text-blue-300';
                  }

                  return (
                    <div 
                      key={file.id} 
                      className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between hover:border-slate-700 transition"
                      id={`file-item-${file.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-slate-800 rounded-xl text-amber-400 shrink-0 border border-slate-700">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          {renamingId === file.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="bg-slate-950 text-white border border-slate-700 px-2 py-1 text-xs rounded-lg focus:outline-none"
                              />
                              <button 
                                onClick={() => handleRename(file.id)}
                                className="bg-emerald-600 px-2 py-1 text-[10px] rounded text-white"
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => setRenamingId(null)}
                                className="bg-slate-755 px-2 py-1 text-[10px] rounded text-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs font-bold text-slate-100 leading-normal flex items-center gap-1.5 break-all">
                              {file.fileName}
                              {currentUser.role !== 'Encoder' && (
                                <button 
                                  onClick={() => {
                                    setRenamingId(file.id);
                                    setNewName(file.fileName);
                                  }}
                                  className="text-slate-450 hover:text-white transition"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-450 font-mono">
                            <span className="capitalize text-slate-400 font-semibold">{file.fileType}</span>
                            <span>•</span>
                            <span>{formatBytes(file.fileSize)}</span>
                            <span>•</span>
                            <span>By: {file.uploadedBy}</span>
                          </div>
                        </div>
                      </div>

                      {/* Operations badge / control row */}
                      <div className="flex sm:flex-col items-end gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono leading-none ${badgeColors}`}>
                          {file.status}
                        </span>

                        <div className="flex gap-1">
                          
                          {/* Viewer Trigger */}
                          <button
                            onClick={() => handleOpenPreview(file)}
                            className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-200 hover:text-white transition flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Preview
                          </button>

                          {/* Approval / Rejection tools for TDP_Supervisor or Visa_Supervisor */}
                          {currentUser.role !== 'Encoder' && (
                            <>
                              <button
                                onClick={() => handleReviewFile(file.id, 'Approved')}
                                className="p-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded-lg transition"
                                title="Approve document"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReviewFile(file.id, 'Rejected')}
                                className="p-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-lg transition"
                                title="Reject / flag document"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Deletion (Admin only) */}
                          {currentUser.role === 'Admin' && (
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="p-1 bg-red-900/20 hover:bg-red-900/30 border border-red-500/20 text-red-400 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Structured File Preview modal incorporating version history sidebar */}
      {previewFile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="document-preview-modal">
          <div className="bg-slate-850 w-full max-w-5xl h-[85vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
            
            {/* Modal Heading block */}
            <div className="p-4 border-b border-slate-700/60 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">{previewFile.fileName}</h3>
                  <p className="text-[10px] text-slate-400">{previewFile.clientName} dossier envelope</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                {/* PDF generation mock download helpers */}
                <a
                  href={`data:${previewFile.mimeType || 'application/pdf'};base64,${previewFullData?.content || ''}`}
                  download={previewFile.fileName}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 border border-slate-700 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Package
                </a>

                <button 
                  onClick={() => setPreviewFile(null)}
                  className="text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body: Left columns (PDF rendering), Right column (Version snapshots history) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* PDF or generic object display screen */}
              <div className="flex-1 bg-slate-900/60 p-4 flex flex-col items-center justify-center border-r border-slate-700/40 relative">
                {previewLoading ? (
                  <div className="space-y-3.5 text-center">
                    <div className="w-6 h-6 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-500">Decrypting document secure content bytes...</p>
                  </div>
                ) : previewFullData ? (
                  // If base64 content exists, embed it or fall back
                  previewFullData.content ? (
                    <iframe
                      src={`data:${previewFullData.mimeType || 'application/pdf'};base64,${previewFullData.content}`}
                      className="w-full h-full rounded-xl border border-slate-850 bg-white"
                      title="File preview screen"
                    />
                  ) : (
                    <div className="text-center text-slate-500 text-xs">
                      No visual preview format configured for this base64 document stream code.
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-400">Failed to render preview. Try downloading instead.</p>
                )}
              </div>

              {/* Version History & Metadata bar sidebar */}
              <div className="w-full md:w-80 bg-slate-900/90 p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">File Metadata</h4>
                  
                  <div className="space-y-1.5 text-[11px] font-mono select-all">
                    <p className="text-slate-400">Classification: <strong className="text-amber-400">{previewFile.fileType.toUpperCase()}</strong></p>
                    <p className="text-slate-400">Box Location: <strong className="text-white">{previewFile.boxNumber}</strong></p>
                    <p className="text-slate-400">Dossier Account: <strong className="text-slate-200">{previewFile.clientName}</strong></p>
                    <p className="text-slate-400">Approval Level: <strong className="text-emerald-400">{previewFile.status}</strong></p>
                    {previewFile.reviewedBy && (
                      <p className="text-slate-450 border-t border-slate-800 pt-1">Validated by: <strong>{previewFile.reviewedBy}</strong></p>
                    )}
                  </div>
                </div>

                {/* Submitting corrections (Enabling upload version option) */}
                {currentUser.role === 'Encoder' && previewFile.status !== 'Approved' && (
                  <div className="border border-slate-800 p-3 rounded-xl bg-slate-850 space-y-2">
                    <h5 className="text-xs font-semibold text-amber-300">Submit Validation Correction</h5>
                    <p className="text-[10px] text-slate-400 leading-normal">Submit corrections according to supervisors rejection notes. Toggling uploads automatically resets status to Pending validations.</p>
                    
                    <input
                      type="file"
                      ref={versionInputRef}
                      onChange={handleUploadNewVersionChange}
                      className="hidden"
                    />
                    
                    <button
                      onClick={() => versionInputRef.current?.click()}
                      disabled={versionUploading}
                      className="w-full py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[10px] rounded-lg transition"
                    >
                      {versionUploading ? 'Committing payload...' : 'Upload Correction Version'}
                    </button>
                    {versionError && <p className="text-[9px] text-red-400 mt-1">{versionError}</p>}
                  </div>
                )}

                {/* Version checkpoints list */}
                <div className="space-y-3 flex-1 flex flex-col">
                  <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-400" />
                    Checkpoint Version Trail ({previewFullData?.versionHistory?.length || 1})
                  </h4>

                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[160px] md:max-h-none custom-scrollbar pr-1">
                    {(previewFullData?.versionHistory || []).slice().reverse().map((version: any, idx: number) => (
                      <div key={idx} className="bg-slate-850 p-2.5 rounded-lg border border-slate-800 text-xs hover:border-slate-700 transition space-y-1">
                        <div className="flex justify-between font-mono text-[10px]">
                          <span className="text-slate-300 font-bold">V{version.version} Checkpoint</span>
                          <span className="text-slate-500">{new Date(version.uploadedAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-300 text-[11px] truncate">{version.fileName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">Digitised by: {version.uploadedBy}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
