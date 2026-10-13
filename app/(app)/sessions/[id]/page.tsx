import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { getSession, canManageSession } from '@/lib/sessions';
import { listMaterials } from '@/lib/materials';
import {
  getSessionAttendanceRoster,
  getMySessionAttendance,
} from '@/lib/attendance';
import { youtubeId } from '@/lib/youtube';
import Avatar from '@/components/Avatar';
import Program from '@/models/Program';
import { db } from '@/lib/db';
import SessionForm from '../SessionForm';
import MaterialsPanel from './MaterialsPanel';
import AttendancePanel from './AttendancePanel';

export const dynamic = 'force-dynamic';

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  const session = await getSession(user.orgId, id);
  if (!session) notFound();

  const canManage =
    user.role !== 'student' &&
    (await canManageSession(
      user.orgId,
      user,
      session.mentorId,
      session.programId
    ));

  const [materials, attendanceRoster, myAttendance] = await Promise.all([
    listMaterials(user.orgId, session.id),
    user.role === 'student'
      ? Promise.resolve([])
      : getSessionAttendanceRoster(
          user.orgId,
          session.programId,
          session.id
        ),
    user.role === 'student'
      ? getMySessionAttendance(user.orgId, session.id, user.id)
      : Promise.resolve(null),
  ]);

  const start = new Date(session.startsAt);
  const end = new Date(session.endsAt);
  const fmt = (d: Date) =>
    d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const ytId = youtubeId(session.recordingUrl);

  let programOptions: { id: string; name: string }[] = [];
  if (canManage) {
    await db();
    const query: Record<string, unknown> = { orgId: user.orgId };
    if (user.role === 'mentor') query.mentors = user.id;
    const rows = await Program.find(query).select('_id name').sort({ name: 1 }).lean();
    programOptions = rows.map((p) => ({
      id: String(p._id),
      name: p.name as string,
    }));
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/sessions" className="text-sm text-muted hover:underline">
          ← All sessions
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{session.title}</h1>
          <p className="text-sm text-muted">
            {session.programName} · {fmt(start)} – {fmt(end)}
          </p>
        </div>
        <StatusBadge status={session.status} />
      </div>

      <div className="card flex items-center gap-3">
        <Avatar name={session.mentorName} src={session.mentorAvatar} size={40} />
        <div>
          <p className="text-sm font-medium">{session.mentorName}</p>
          <p className="text-xs text-muted">Mentor</p>
        </div>
      </div>

      {session.agenda && (
        <div className="card">
          <h2 className="font-semibold mb-2">Agenda</h2>
          <p className="text-sm whitespace-pre-wrap">{session.agenda}</p>
        </div>
      )}

      {session.meetingUrl && session.status === 'scheduled' && (
        <div className="card">
          <h2 className="font-semibold mb-2">Join</h2>
          <a
            href={session.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Open meeting link
          </a>
        </div>
      )}

      {ytId && (
        <div className="card">
          <h2 className="font-semibold mb-3">Recording</h2>
          <div className="aspect-video w-full rounded-md overflow-hidden bg-black">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${ytId}`}
              title={session.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <p className="text-xs text-muted mt-2">
            If the video says "unavailable", the owner must allow embedding.
          </p>
        </div>
      )}

      <MaterialsPanel
        sessionId={session.id}
        materials={materials}
        canManage={canManage}
      />

      <AttendancePanel
        sessionId={session.id}
        roster={attendanceRoster}
        canManage={canManage}
        myAttendance={myAttendance}
        viewerIsStudent={user.role === 'student'}
      />

      {user.role === 'student' && (
        <div className="card flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold">Have a question?</h2>
            <p className="text-xs text-muted">
              Start a thread tied to this session — your mentors will be notified.
            </p>
          </div>
          <Link
            href={`/queries/new?sessionId=${session.id}`}
            className="btn-primary text-sm"
          >
            Ask a question
          </Link>
        </div>
      )}

      {canManage && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold pt-4 border-t border-border">
            Edit session
          </h2>
          <SessionForm
            programs={programOptions}
            initial={session}
            canDelete
          />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <span className="badge-success">completed</span>;
  if (status === 'cancelled') return <span className="badge-danger">cancelled</span>;
  return <span className="badge-muted">scheduled</span>;
}