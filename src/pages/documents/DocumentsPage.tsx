import React, { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Download, Trash2, Share2, Loader } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Document {
  _id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  status: string;
  sharedWith: { _id: string; name: string }[];
  uploadedBy: { _id: string; name: string; avatar: string };
  createdAt: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments]   = useState<Document[]>([]);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem('nexus_access_token');

  // ── Fetch documents ──────────────────────────────────────────────────────
  const fetchDocuments = async () => {
    try {
      const res  = await fetch(`${BASE_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) setDocuments(data.documents);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  // ── Upload document ──────────────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('title', file.name);
    formData.append('category', 'other');

    try {
      const res  = await fetch(`${BASE_URL}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setDocuments(prev => [data.document, ...prev]);
        toast.success('Document uploaded successfully! ✅ Saved to Cloudinary');
      } else {
        toast.error(data.message || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Delete document ──────────────────────────────────────────────────────
  const handleDelete = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      const res  = await fetch(`${BASE_URL}/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setDocuments(prev => prev.filter(d => d._id !== docId));
        toast.success('Document deleted');
      }
    } catch {
      toast.error('Delete failed');
    }
  };

  // ── Category badge color ─────────────────────────────────────────────────
  const getCategoryVariant = (category: string) => {
    const map: Record<string, any> = {
      pitch_deck: 'primary',
      contract:   'error',
      financial:  'success',
      legal:      'warning',
      other:      'gray',
    };
    return map[category] || 'gray';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage and share your important files</p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          />
          <Button
            leftIcon={uploading ? <Loader size={18} className="animate-spin" /> : <Upload size={18} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Storage info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Storage</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Files</span>
                <span className="font-medium text-gray-900">{documents.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Size</span>
                <span className="font-medium text-gray-900">
                  {formatSize(documents.reduce((acc, d) => acc + d.fileSize, 0))}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Quick Access</h3>
              <div className="space-y-2">
                {['pitch_deck', 'contract', 'financial', 'legal', 'other'].map(cat => (
                  <button key={cat} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md capitalize">
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Document list */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">All Documents</h2>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader size={32} className="animate-spin text-primary-600" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText size={40} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">No documents yet</p>
                  <p className="text-sm text-gray-500 mt-1">Upload your first document</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div
                      key={doc._id}
                      className="flex items-center p-4 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                    >
                      <div className="p-2 bg-primary-50 rounded-lg mr-4">
                        <FileText size={24} className="text-primary-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {doc.title}
                          </h3>
                          <Badge variant={getCategoryVariant(doc.category)} size="sm">
                            {doc.category.replace('_', ' ')}
                          </Badge>
                          {doc.sharedWith?.length > 0 && (
                            <Badge variant="secondary" size="sm">Shared</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="uppercase">{doc.fileType}</span>
                          <span>{formatSize(doc.fileSize)}</span>
                          <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                          <span>by {doc.uploadedBy?.name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="p-2" aria-label="Download">
                            <Download size={18} />
                          </Button>
                        </a>

                        <Button variant="ghost" size="sm" className="p-2" aria-label="Share">
                          <Share2 size={18} />
                        </Button>

                        {String(doc.uploadedBy?._id) === String(user?._id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-2 text-error-600 hover:text-error-700"
                            aria-label="Delete"
                            onClick={() => handleDelete(doc._id)}
                          >
                            <Trash2 size={18} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};