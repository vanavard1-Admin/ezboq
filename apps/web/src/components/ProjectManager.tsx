import React, { useState } from 'react';
import { Plus, Copy, Trash2, Edit2, Building2, AlertCircle, Check, X, Wand2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ProjectData } from '../utils/projectData';
import { TemplateWizard } from './TemplateWizard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface ProjectManagerProps {
  projects: ProjectData[];
  selectedProjectId: string;
  onProjectsChange: (projects: ProjectData[]) => void;
  onSelectProject: (projectId: string) => void;
}

export function ProjectManager({ 
  projects, 
  selectedProjectId, 
  onProjectsChange, 
  onSelectProject 
}: ProjectManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplateWizard, setShowTemplateWizard] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteProjectId, setPendingDeleteProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectAddress, setNewProjectAddress] = useState('');
  const [newProjectPhone, setNewProjectPhone] = useState('');
  const [newProjectOwner, setNewProjectOwner] = useState('');

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    const newProject: ProjectData = {
      id: `project-${Date.now()}`,
      name: newProjectName,
      address: newProjectAddress || '',
      phone: newProjectPhone || '',
      owner: newProjectOwner || '',
      quotationData: [],
      autoSyncDocuments: true,
    };

    const updatedProjects = [...projects, newProject];
    onProjectsChange(updatedProjects);
    onSelectProject(newProject.id);
    
    // Reset form
    setIsCreating(false);
    setNewProjectName('');
    setNewProjectAddress('');
    setNewProjectPhone('');
    setNewProjectOwner('');
  };

  const handleCopyProject = (projectId: string) => {
    const original = projects.find(p => p.id === projectId);
    if (!original) return;

    const copyName = `${original.name} (Copy)`;
    const newProject: ProjectData = {
      ...original,
      id: `${projectId}-copy-${Date.now()}`,
      name: copyName,
    };

    const updatedProjects = [...projects, newProject];
    onProjectsChange(updatedProjects);
    onSelectProject(newProject.id);
  };

  const handleDeleteProject = (projectId: string) => {
    if (projects.length <= 1) {
      toast.error('ไม่สามารถลบโครงการสุดท้ายได้');
      return;
    }
    setPendingDeleteProjectId(projectId);
  };

  const confirmDeleteProject = () => {
    if (!pendingDeleteProjectId) return;

    const updatedProjects = projects.filter(p => p.id !== pendingDeleteProjectId);
    onProjectsChange(updatedProjects);
    
    // If deleted current project, select first one
    if (selectedProjectId === pendingDeleteProjectId && updatedProjects[0]) {
      onSelectProject(updatedProjects[0].id);
    }
    setPendingDeleteProjectId(null);
  };

  const handleRenameProject = (projectId: string, newName: string) => {
    if (!newName.trim()) return;

    const updatedProjects = projects.map(p => 
      p.id === projectId ? { ...p, name: newName } : p
    );
    onProjectsChange(updatedProjects);
    setEditingId(null);
  };

  return (
    <>
      <AlertDialog open={pendingDeleteProjectId !== null} onOpenChange={(open: boolean) => { if (!open) setPendingDeleteProjectId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบโครงการ</AlertDialogTitle>
            <AlertDialogDescription>
              โครงการนี้จะถูกลบออกจาก workspace และซิงก์ขึ้นระบบกลางด้วย การเปลี่ยนแปลงนี้ย้อนกลับอัตโนมัติไม่ได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              ลบโครงการ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-stone-800">
          <Building2 className="w-5 h-5" />
          จัดการโครงการ
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowTemplateWizard(true)}
            className="flex items-center gap-2 bg-[var(--doc-primary)] hover:bg-[var(--doc-primary-hover)] text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Wand2 className="w-4 h-4" />
            สร้างจาก Template
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            สร้างโครงการเปล่า
          </button>
        </div>
      </div>

      {/* Create New Project Form */}
      {isCreating && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <h3 className="text-sm text-emerald-800 mb-3">สร้างโครงการใหม่</h3>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="ชื่อโครงการ *"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 border border-emerald-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
            <input
              type="text"
              placeholder="ที่อยู่โครงการ"
              value={newProjectAddress}
              onChange={(e) => setNewProjectAddress(e.target.value)}
              className="w-full px-3 py-2 border border-emerald-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="text"
              placeholder="เบอร์โทรศัพท์"
              value={newProjectPhone}
              onChange={(e) => setNewProjectPhone(e.target.value)}
              className="w-full px-3 py-2 border border-emerald-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="text"
              placeholder="ชื่อเจ้าของโครงการ"
              value={newProjectOwner}
              onChange={(e) => setNewProjectOwner(e.target.value)}
              className="w-full px-3 py-2 border border-emerald-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim()}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-3 py-1.5 rounded text-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              สร้าง
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewProjectName('');
                setNewProjectAddress('');
                setNewProjectPhone('');
                setNewProjectOwner('');
              }}
              className="flex items-center gap-1 bg-stone-400 hover:bg-stone-500 text-white px-3 py-1.5 rounded text-sm transition-colors"
            >
              <X className="w-4 h-4" />
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Projects List */}
      <div className="space-y-2">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedProjectId === project.id
                ? 'border-[var(--doc-primary)] bg-[var(--doc-accent-light)]'
                : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {editingId === project.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      defaultValue={project.name}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRenameProject(project.id, e.currentTarget.value);
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      className="flex-1 px-2 py-1 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                      autoFocus
                    />
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-stone-500 hover:text-stone-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectProject(project.id)}
                      className="text-left flex-1"
                    >
                      <h3 className={`text-sm ${
                        selectedProjectId === project.id 
                          ? 'text-stone-900 font-semibold'
                          : 'text-stone-800'
                      }`}>
                        {project.name}
                      </h3>
                      {project.address && (
                        <p className="text-xs text-stone-500 mt-0.5">
                          {project.address}
                        </p>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => setEditingId(project.id)}
                  className="p-1.5 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors"
                  title="แก้ไขชื่อ"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleCopyProject(project.id)}
                  className="p-1.5 text-stone-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                  title="คัดลอกโครงการ"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteProject(project.id)}
                  disabled={projects.length <= 1}
                  className="p-1.5 text-stone-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="ลบโครงการ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-stone-50 border border-stone-200 rounded-lg">
        <div className="flex gap-2 text-xs text-stone-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p>ข้อมูลโครงการจะถูกซิงก์กับระบบกลางและเก็บ cache ใน browser ของบัญชีนี้</p>
            <p className="mt-1 text-stone-500">
              • <Wand2 className="w-3 h-3 inline" /> สร้างจาก Template: เลือกประเภทงาน → กรอกพื้นที่/งบ → สร้าง BOQ อัตโนมัติ
            </p>
            <p className="text-stone-500">
              • แก้ไขชื่อ: คลิกปุ่ม <Edit2 className="w-3 h-3 inline" /> แล้วกด Enter
            </p>
            <p className="text-stone-500">
              • คัดลอก: สร้างโครงการใหม่จากโครงการเดิม
            </p>
          </div>
        </div>
      </div>

      {/* Template Wizard Dialog */}
        <TemplateWizard
          open={showTemplateWizard}
          onOpenChange={setShowTemplateWizard}
          onProjectCreated={(newProject) => {
            const updatedProjects = [...projects, newProject];
            onProjectsChange(updatedProjects);
            onSelectProject(newProject.id);
          }}
        />
      </div>
    </>
  );
}
