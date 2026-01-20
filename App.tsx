import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { ProjectView } from './components/ProjectView';
import { Player } from './components/Player';
import { Login } from './components/Login';
import { Project, ProjectAsset, User } from './types';
import { MOCK_PROJECTS } from './constants';

type ViewState = 
  | { type: 'DASHBOARD' }
  | { type: 'PROJECT_VIEW', projectId: string }
  | { type: 'PLAYER', assetId: string, projectId: string };

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // App Data State
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [view, setView] = useState<ViewState>({ type: 'DASHBOARD' });

  // Navigation handlers
  const handleSelectProject = (project: Project) => {
    setView({ type: 'PROJECT_VIEW', projectId: project.id });
  };

  const handleSelectAsset = (asset: ProjectAsset) => {
    if (view.type === 'PROJECT_VIEW') {
      setView({ type: 'PLAYER', assetId: asset.id, projectId: view.projectId });
    }
  };

  const handleBackToDashboard = () => {
    setView({ type: 'DASHBOARD' });
  };

  const handleBackToProject = () => {
    if (view.type === 'PLAYER') {
      setView({ type: 'PROJECT_VIEW', projectId: view.projectId });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView({ type: 'DASHBOARD' });
  };

  // State Update Handlers
  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleAddProject = (newProject: Project) => {
    setProjects(prev => [newProject, ...prev]);
  };

  // Helpers to get current objects based on IDs
  const currentProject = view.type !== 'DASHBOARD' 
    ? projects.find(p => p.id === view.projectId) 
    : null;

  const currentAsset = (view.type === 'PLAYER' && currentProject)
    ? currentProject.assets.find(a => a.id === view.assetId)
    : null;

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      
      {/* Main Content Router */}
      <main className="h-full">
        {view.type === 'DASHBOARD' && (
          <Dashboard 
            projects={projects} 
            currentUser={currentUser}
            onSelectProject={handleSelectProject}
            onAddProject={handleAddProject}
            onLogout={handleLogout}
          />
        )}

        {view.type === 'PROJECT_VIEW' && currentProject && (
          <ProjectView 
            project={currentProject} 
            currentUser={currentUser}
            onBack={handleBackToDashboard}
            onSelectAsset={handleSelectAsset}
            onUpdateProject={handleUpdateProject}
          />
        )}

        {view.type === 'PLAYER' && currentProject && currentAsset && (
          <Player 
            asset={currentAsset} 
            project={currentProject}
            currentUser={currentUser}
            onBack={handleBackToProject}
            users={currentProject.team}
            onUpdateProject={handleUpdateProject}
          />
        )}
      </main>
    </div>
  );
};

export default App;