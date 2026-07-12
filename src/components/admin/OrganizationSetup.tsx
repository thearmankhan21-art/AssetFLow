import React, { useEffect, useState } from 'react';
import { Building2, Package, Users, ShieldAlert, Check, Plus, X } from 'lucide-react';

interface Department { department_id: number; name: string; head_name: string | null; status: string; }
interface Category { category_id: number; name: string; }
interface Employee { user_id: number; name: string; email: string; role: string; status: string; }

export default function OrganizationSetup() {
  const [activeTab, setActiveTab] = useState<'departments' | 'categories' | 'employees'>('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal States
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newCatName, setNewCatName] = useState('');

  const fetchMasterData = async () => {
    try {
      const token = localStorage.getItem('assetflow_token');
      const response = await fetch('http://localhost:5005/api/admin/master-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 403) throw new Error('Access Denied. Administrator privileges required.');
      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      setDepartments(data.departments);
      setCategories(data.categories);
      setEmployees(data.employees);
    } catch (err: any) { setError(err.message); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMasterData(); }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    setError(''); setSuccessMsg('');
    try {
      const token = localStorage.getItem('assetflow_token');
      const response = await fetch('http://localhost:5005/api/admin/promote', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ targetUserId: userId, newRole })
      });
      if (!response.ok) throw new Error('Failed to update role');
      setSuccessMsg('Role updated successfully.');
      fetchMasterData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) { setError(err.message); }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    try {
      const token = localStorage.getItem('assetflow_token');
      const response = await fetch('http://localhost:5005/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newDeptName, status: 'Active' })
      });
      if (!response.ok) throw new Error('Failed to create department');
      setSuccessMsg('Department created successfully.');
      setShowDeptModal(false); setNewDeptName('');
      fetchMasterData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) { setError(err.message); }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    try {
      const token = localStorage.getItem('assetflow_token');
      const response = await fetch('http://localhost:5005/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newCatName })
      });
      if (!response.ok) throw new Error('Failed to create category');
      setSuccessMsg('Category created successfully.');
      setShowCatModal(false); setNewCatName('');
      fetchMasterData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) { setError(err.message); }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading master data...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Setup</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage departments, asset categories, and system roles.</p>
        </div>
        
        {/* The contextual Add New Button */}
        <button 
          onClick={() => activeTab === 'departments' ? setShowDeptModal(true) : setShowCatModal(true)}
          disabled={activeTab === 'employees'}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition shadow-sm text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> Add New {activeTab === 'departments' ? 'Department' : activeTab === 'categories' ? 'Category' : ''}
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded-lg flex items-center gap-3">
          <ShieldAlert className="text-destructive" size={20} />
          <p className="text-destructive font-medium text-sm">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border-l-4 border-emerald-500 p-4 rounded-lg flex items-center gap-3">
          <Check className="text-emerald-500" size={20} />
          <p className="text-emerald-600 dark:text-emerald-400 font-medium text-sm">{successMsg}</p>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-border pb-px">
        <TabButton active={activeTab === 'departments'} onClick={() => setActiveTab('departments')} icon={Building2} label="Departments" />
        <TabButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={Package} label="Categories" />
        <TabButton active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} icon={Users} label="Employee Directory" />
      </div>

      {/* Tab Content */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        
        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground text-xs uppercase font-semibold">
                <tr><th className="px-6 py-4">ID</th><th className="px-6 py-4">Department Name</th><th className="px-6 py-4">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {departments.map(dept => (
                  <tr key={dept.department_id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground">#{dept.department_id}</td>
                    <td className="px-6 py-4 font-medium">{dept.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${dept.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                        {dept.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {departments.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">No departments configured yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground text-xs uppercase font-semibold">
                <tr><th className="px-6 py-4">ID</th><th className="px-6 py-4">Category Name</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories.map(cat => (
                  <tr key={cat.category_id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground">#{cat.category_id}</td>
                    <td className="px-6 py-4 font-medium">{cat.name}</td>
                  </tr>
                ))}
                {categories.length === 0 && <tr><td colSpan={2} className="px-6 py-8 text-center text-muted-foreground">No categories configured yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Employees Tab (Unchanged) */}
        {activeTab === 'employees' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground text-xs uppercase font-semibold">
                <tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Role Assignment</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map(emp => (
                  <tr key={emp.user_id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{emp.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{emp.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${emp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        className="bg-background border border-border text-foreground text-sm rounded-md focus:ring-primary focus:border-primary block w-full p-2"
                        value={emp.role}
                        onChange={(e) => handleRoleChange(emp.user_id, e.target.value)}
                      >
                        <option value="Employee">Employee</option>
                        <option value="Asset Manager">Asset Manager</option>
                        <option value="Department Head">Department Head</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALS */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">New Department</h3>
              <button onClick={() => setShowDeptModal(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateDepartment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Department Name</label>
                <input type="text" required autoFocus value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:ring-2 focus:ring-primary focus:outline-none" placeholder="e.g. Engineering" />
              </div>
              <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:opacity-90 transition">Create Department</button>
            </form>
          </div>
        </div>
      )}

      {showCatModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">New Asset Category</h3>
              <button onClick={() => setShowCatModal(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Category Name</label>
                <input type="text" required autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:ring-2 focus:ring-primary focus:outline-none" placeholder="e.g. Laptops" />
              </div>
              <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:opacity-90 transition">Create Category</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: React.ElementType, label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${active ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
      <Icon size={18} /> {label}
    </button>
  );
}