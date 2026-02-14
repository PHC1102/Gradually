import React, { useEffect, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import type { Project } from '../../types';
import { createProject, getMyProjects } from '../../services/projectService';

interface ProjectSwitcherProps {
  orgId: string;
  onSwitch?: () => void;
  compact?: boolean;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#2a2a2a',
  borderRadius: '8px',
  padding: '1.5rem',
  border: '1px solid #3a3a3a',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({ orgId, onSwitch, compact }) => {
  const projects = useProjectStore((s) => s.projects);
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const setProjects = useProjectStore((s) => s.setProjects);
  const setSelectedProjectId = useProjectStore((s) => s.setSelectedProjectId);
  const loading = useProjectStore((s) => s.loading);
  const setLoading = useProjectStore((s) => s.setLoading);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadProjects = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use getMyProjects to only show projects user has access to
        const list = await getMyProjects(orgId);
        if (!mounted) return;
        setProjects(list);
        // Don't auto-select project - let user choose
      } catch (err) {
        if (mounted) setError((err as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadProjects();
    return () => {
      mounted = false;
    };
  }, [orgId, setLoading, setProjects]);

  const handleSwitch = (projectId: string) => {
    setSelectedProjectId(projectId);
    onSwitch?.();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên project');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const projectId = await createProject(orgId, { name });
      // Reload with getMyProjects to ensure proper filtering
      const list = await getMyProjects(orgId);
      setProjects(list);
      setSelectedProjectId(projectId);
      setShowCreate(false);
      setName('');
      onSwitch?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: '#fff', margin: 0 }}>Projects</h3>
        <button
          type="button"
          onClick={() => setShowCreate((prev) => !prev)}
          style={{
            padding: '0.4rem 0.9rem',
            borderRadius: '6px',
            border: '1px solid #3b82f6',
            background: 'transparent',
            color: '#3b82f6',
            cursor: 'pointer',
          }}
        >
          {showCreate ? 'Huỷ' : 'New Project'}
        </button>
      </div>
      {showCreate && (
        <form onSubmit={handleCreate} style={{ ...cardStyle, gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.3rem', color: '#9ca3af' }}>Tên project</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên project..."
              autoFocus
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '6px',
                border: '1px solid #4b5563',
                backgroundColor: '#111827',
                color: '#fff',
              }}
            />
          </div>
          {error && <div style={{ color: '#f87171' }}>{error}</div>}
          <button
            type="submit"
            disabled={creating}
            style={{
              padding: '0.6rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#fff',
              cursor: 'pointer',
              opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? 'Đang tạo...' : 'Tạo Project'}
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ color: '#fff' }}>Loading projects...</div>
      ) : projects.length === 0 ? (
        <div style={{ color: '#9ca3af' }}>Chưa có project nào. Tạo project đầu tiên ngay!</div>
      ) : (
        <div
          style={
            compact
              ? { display: 'flex', flexDirection: 'column', gap: '0.5rem' }
              : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }
          }
        >
          {projects.map((project: Project) => {
            const isSelected = selectedProjectId === project.id;
            return (
              <button
                type="button"
                key={project.id}
                onClick={() => handleSwitch(project.id)}
                style={{
                  ...cardStyle,
                  alignItems: 'flex-start',
                  border: isSelected ? '2px solid #60a5fa' : cardStyle.border,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '1.25rem',
                  }}
                >
                  📁
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 600 }}>{project.name}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{project.description || 'No description'}</div>
                  {isSelected && <div style={{ color: '#60a5fa', fontSize: '0.85rem', marginTop: '0.25rem' }}>✓ Đang mở</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectSwitcher;

