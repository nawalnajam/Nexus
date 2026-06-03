import React, { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Download, Trash2, Share2, Loader, PenTool, X } from 'lucide-react';
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
  signatures: { signedBy: { _id: string; name: string }; signedAt: string; signatureUrl: string }[];
  createdAt: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments]     = useState<Document[]>([]);
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [signingDoc, setSigningDoc]   = useState<Document | null>(null);
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const canvasRef                     = useRef<HTMLCanvasElement>(null);
  const isDrawing                     = useRef(false);

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

  // ── Canvas drawing ───────────────────────────────────────────────────────
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    const rect   = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    const rect   = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => { isDrawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // ── Submit signature ─────────────────────────────────────────────────────
  const handleSign = async () => {
    if (!signingDoc) return;
    const canvas = canvasRef.current!;

    // Check if canvas is empty
    const ctx  = canvas.getContext('2d')!;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const isEmpty = !data.some(channel => channel !== 0);
    if (isEmpty) { toast.error('Please draw your signature first'); return; }

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.append('signature', blob, 'signature.png');

      try {
        const res  = await fetch(`${BASE_URL}/documents/${signingDoc._id}/sign`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
          body:    formData,
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Document signed successfully! ✅');
          setSigningDoc(null);
          fetchDocuments();
        } else {
          toast.error(data.message || 'Signing failed');
        }
      } catch {
        toast.error('Signing failed');
      }
    }, 'image/png');
  };

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
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
        body:    formData,
      });
      const data = await res.json();
      if (data.success) {
        setDocuments(prev => [data.document, ...prev]);
        toast.success('Document uploaded! ✅ Saved to Cloudinary');
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
        method:  'DELETE',
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

  const getCategoryVariant = (category: string) => {
    const map: Record<string, any> = {
      pitch_deck: 'primary', contract: 'error',
      financial: 'success',  legal: 'warning', other: 'gray',
    };
    return map[category] || 'gray';
  };

  const alreadySigned = (doc: Document) =>
    doc.signatures?.some(s => String(s.signedBy?._id) === String(user?._id));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage and sign your important files</p>
        </div>
        <div>
          <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" />
          <Button
            leftIcon={uploading ? <Loader size={18} className="animate-spin" /> : <Upload size={18} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </div>

      {/* Document list */}
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
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc._id} className="flex items-center p-4 hover:bg-gray-50 rounded-lg">
                  <div className="p-2 bg-primary-50 rounded-lg mr-4">
                    <FileText size={24} className="text-primary-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{doc.title}</h3>
                      <Badge variant={getCategoryVariant(doc.category)} size="sm">
                        {doc.category.replace('_', ' ')}
                      </Badge>
                      {doc.signatures?.length > 0 && (
                        <Badge variant="success" size="sm">
                          ✍️ {doc.signatures.length} signature(s)
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="uppercase">{doc.fileType}</span>
                      <span>{formatSize(doc.fileSize)}</span>
                      <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="p-2">
                        <Download size={18} />
                      </Button>
                    </a>

                    {/* Sign button */}
                    {!alreadySigned(doc) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSigningDoc(doc)}
                        leftIcon={<PenTool size={14} />}
                      >
                        Sign
                      </Button>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">✅ Signed</span>
                    )}

                    {String(doc.uploadedBy?._id) === String(user?._id) && (
                      <Button
                        variant="ghost" size="sm"
                        className="p-2 text-red-600 hover:text-red-700"
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

      {/* E-Signature Modal */}
      {signingDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Sign Document</h3>
              <button onClick={() => setSigningDoc(null)}>
                <X size={20} className="text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Signing: <strong>{signingDoc.title}</strong>
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-lg mb-4">
              <canvas
                ref={canvasRef}
                width={400}
                height={150}
                className="w-full cursor-crosshair rounded-lg"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>

            <p className="text-xs text-gray-400 mb-4 text-center">
              Draw your signature above using mouse
            </p>

            <div className="flex gap-3">
              <Button onClick={handleSign} fullWidth leftIcon={<PenTool size={16} />}>
                Submit Signature
              </Button>
              <Button variant="outline" onClick={clearCanvas}>
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};