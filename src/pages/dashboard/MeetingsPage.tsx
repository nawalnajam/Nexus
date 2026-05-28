import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video, User, Check, X, Loader, Plus } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Meeting {
  _id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  type: 'video' | 'audio' | 'in-person';
  roomId: string;
  organizer: { _id: string; name: string; avatar: string; role: string };
  participant: { _id: string; name: string; avatar: string; role: string };
}

interface ScheduleForm {
  title: string;
  participantId: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: string;
  description: string;
}

const statusColors: Record<string, any> = {
  pending:   'warning',
  accepted:  'success',
  rejected:  'error',
  cancelled: 'gray',
  completed: 'primary',
};

export const MeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const [meetings, setMeetings]       = useState<Meeting[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [form, setForm]               = useState<ScheduleForm>({
    title: '', participantId: '', startTime: '', endTime: '',
    duration: 30, type: 'video', description: '',
  });

  const token = localStorage.getItem('nexus_access_token');

  // ── Fetch meetings ─────────────────────────────────────────────────────
  const fetchMeetings = async () => {
    try {
      const res  = await fetch(`${BASE_URL}/meetings`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) setMeetings(data.meetings);
    } catch {
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMeetings(); }, []);

  // ── Schedule meeting ───────────────────────────────────────────────────
  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res  = await fetch(`${BASE_URL}/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      body: JSON.stringify({
  ...form,
  startTime: new Date(form.startTime).toISOString(),
  endTime:   new Date(form.endTime).toISOString(),
}),
      });
      const data = await res.json();
      if (data.success) {
        setMeetings(prev => [data.meeting, ...prev]);
        setShowForm(false);
        setForm({ title: '', participantId: '', startTime: '', endTime: '', duration: 30, type: 'video', description: '' });
        toast.success('Meeting scheduled! ✅');
      } else {
        toast.error(data.message || 'Failed to schedule');
      }
    } catch {
      toast.error('Failed to schedule meeting');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Update status ──────────────────────────────────────────────────────
  const updateStatus = async (meetingId: string, status: string) => {
    try {
      const res  = await fetch(`${BASE_URL}/meetings/${meetingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setMeetings(prev => prev.map(m => m._id === meetingId ? data.meeting : m));
        toast.success(`Meeting ${status}!`);
      }
    } catch {
      toast.error('Failed to update meeting');
    }
  };

  const isOrganizer   = (m: Meeting) => String(m.organizer._id)   === String(user?._id);
  const isParticipant = (m: Meeting) => String(m.participant._id) === String(user?._id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-600">Schedule and manage your meetings</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowForm(!showForm)}>
          Schedule Meeting
        </Button>
      </div>

      {/* Schedule Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Schedule New Meeting</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSchedule} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Meeting title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Participant User ID</label>
                  <input
                    type="text"
                    required
                    value={form.participantId}
                    onChange={e => setForm({ ...form, participantId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="MongoDB user _id"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.startTime}
                    onChange={e => setForm({ ...form, startTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.endTime}
                    onChange={e => setForm({ ...form, endTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="video">Video Call</option>
                    <option value="audio">Audio Call</option>
                    <option value="in-person">In Person</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={form.duration}
                    onChange={e => setForm({ ...form, duration: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min={15} max={180}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Meeting agenda or notes..."
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Scheduling...' : 'Schedule Meeting'}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Meetings List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader size={32} className="animate-spin text-primary-600" />
        </div>
      ) : meetings.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <Calendar size={40} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">No meetings yet</p>
              <p className="text-sm text-gray-500 mt-1">Schedule your first meeting above</p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {meetings.map(meeting => (
            <Card key={meeting._id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-primary-50 rounded-lg">
                      {meeting.type === 'video' ? (
                        <Video size={20} className="text-primary-600" />
                      ) : (
                        <User size={20} className="text-primary-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-gray-900">{meeting.title}</h3>
                      {meeting.description && (
                        <p className="text-sm text-gray-500 mt-1">{meeting.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(meeting.startTime).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' — '}
                          {new Date(meeting.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <span>With: <strong>
                          {isOrganizer(meeting) ? meeting.participant.name : meeting.organizer.name}
                        </strong></span>
                        <span>•</span>
                        <span className="capitalize">{isOrganizer(meeting) ? 'You organized' : 'Invited you'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[meeting.status]}>
                      {meeting.status}
                    </Badge>

                    {/* Participant actions */}
                    {isParticipant(meeting) && meeting.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateStatus(meeting._id, 'accepted')}
                          leftIcon={<Check size={14} />}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(meeting._id, 'rejected')}
                          leftIcon={<X size={14} />}
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    {/* Organizer cancel */}
                    {isOrganizer(meeting) && meeting.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(meeting._id, 'cancelled')}
                      >
                        Cancel
                      </Button>
                    )}

                    {/* Join video call */}
                    {meeting.status === 'accepted' && meeting.type === 'video' && (
                      <Button
                        size="sm"
                        leftIcon={<Video size={14} />}
                        onClick={() => window.open(`/video/${meeting.roomId}`, '_blank')}
                      >
                        Join Call
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};