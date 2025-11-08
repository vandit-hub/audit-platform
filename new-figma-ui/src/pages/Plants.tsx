import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Badge } from '../components/ui/badge';
import { mockPlants, mockAudits, mockObservations } from '../data/mockData';
import { Plus, Building2, AlertCircle, AlertTriangle, Activity, ClipboardList, Search, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Plant } from '../types';
import { PageContainer } from '../components/PageContainer';
import { PageTitle } from '../components/PageTitle';

export function Plants() {
  const [plants, setPlants] = useState<Plant[]>(mockPlants);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPlant, setNewPlant] = useState({ code: '', name: '' });
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [deletingPlantId, setDeletingPlantId] = useState<string | null>(null);

  const handleCreatePlant = (e: React.FormEvent) => {
    e.preventDefault();
    const plant: Plant = {
      id: Date.now().toString(),
      code: newPlant.code,
      name: newPlant.name,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setPlants([...plants, plant]);
    setNewPlant({ code: '', name: '' });
    setIsDialogOpen(false);
  };

  const handleEditClick = (plant: Plant) => {
    setEditingPlant(plant);
    setIsEditDialogOpen(true);
  };

  const handleEditPlant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlant) return;
    
    setPlants(plants.map(p => 
      p.id === editingPlant.id ? editingPlant : p
    ));
    setEditingPlant(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteClick = (plantId: string) => {
    setDeletingPlantId(plantId);
    setIsDeleteAlertOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deletingPlantId) {
      setPlants(plants.filter(p => p.id !== deletingPlantId));
      setDeletingPlantId(null);
    }
    setIsDeleteAlertOpen(false);
  };

  // Calculate statistics for each plant
  const plantsWithStats = useMemo(() => {
    return plants.map(plant => {
      const plantAudits = mockAudits.filter(a => a.plantId === plant.id);
      const plantObservations = mockObservations.filter(o => o.plantId === plant.id);
      
      const criticalObs = plantObservations.filter(o => o.riskLevel === 'critical').length;
      const highObs = plantObservations.filter(o => o.riskLevel === 'high').length;
      const mediumObs = plantObservations.filter(o => o.riskLevel === 'medium').length;
      const lowObs = plantObservations.filter(o => o.riskLevel === 'low').length;
      
      const openObs = plantObservations.filter(o => o.status === 'open').length;
      const inProgressObs = plantObservations.filter(o => o.status === 'in_progress').length;
      
      const activeAudits = plantAudits.filter(a => !a.isLocked).length;
      const completedAudits = plantAudits.filter(a => a.isLocked).length;
      
      return {
        ...plant,
        stats: {
          totalAudits: plantAudits.length,
          activeAudits,
          completedAudits,
          totalObservations: plantObservations.length,
          criticalObs,
          highObs,
          mediumObs,
          lowObs,
          openObs,
          inProgressObs
        }
      };
    });
  }, [plants]);

  const filteredPlants = plantsWithStats.filter(plant => 
    plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plant.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageContainer className="space-y-6">
      <PageTitle 
        title="Plants" 
        description="Manage plant locations and view summaries"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Plant
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Plant</DialogTitle>
              <DialogDescription>Add a new plant location to the system</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePlant} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Plant Code</Label>
                <Input
                  id="code"
                  placeholder="PLT001"
                  value={newPlant.code}
                  onChange={(e) => setNewPlant({ ...newPlant, code: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Plant Name</Label>
                <Input
                  id="name"
                  placeholder="Manufacturing Plant A"
                  value={newPlant.name}
                  onChange={(e) => setNewPlant({ ...newPlant, name: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Plant</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        }
      />

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--c-texSec)' }} />
        <Input
          placeholder="Search plants by name or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredPlants.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--c-texSec)' }} />
              <h3 style={{ color: 'var(--c-texPri)', marginBottom: '8px' }}>No plants found</h3>
              <p style={{ color: 'var(--c-texSec)', marginBottom: '16px' }}>
                {searchQuery ? 'Try adjusting your search' : 'Get started by creating your first plant'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsDialogOpen(true)}>Create Plant</Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlants.map((plant) => (
            <Card key={plant.id} className="hover:shadow-lg transition-shadow" style={{ background: 'var(--c-bacSec)', border: 'none', borderRadius: 'var(--border-radius-700)' }}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div 
                      className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--c-palUiBlu100)' }}
                    >
                      <Building2 className="h-5 w-5" style={{ color: 'var(--c-palUiBlu600)' }} />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate" style={{ color: 'var(--c-texPri)', fontWeight: 600 }}>
                        {plant.name}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1 truncate">
                        {plant.code}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(plant)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteClick(plant.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Audits Summary */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-texSec)' }}>
                    <ClipboardList className="h-4 w-4" />
                    <span>Audits</span>
                  </div>
                  <div className="flex items-center gap-3 pl-6">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl" style={{ color: 'var(--c-texPri)' }}>
                        {plant.stats.totalAudits}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--c-texSec)' }}>Total</span>
                    </div>
                    {plant.stats.activeAudits > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {plant.stats.activeAudits} Active
                      </Badge>
                    )}
                    {plant.stats.completedAudits > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {plant.stats.completedAudits} Completed
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Observations Summary */}
                <div className="space-y-2 p-3 rounded-lg" style={{ background: 'var(--c-bacPri)' }}>
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-texSec)' }}>
                    <Activity className="h-4 w-4" />
                    <span>Observations</span>
                  </div>
                  <div className="pl-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--c-texSec)' }}>Total</span>
                      <span className="text-sm" style={{ color: 'var(--c-texPri)' }}>
                        {plant.stats.totalObservations}
                      </span>
                    </div>
                    
                    {/* Risk Level Breakdown - only show if there are observations */}
                    {plant.stats.totalObservations > 0 && (
                      <div className="space-y-1.5 pt-1 border-t" style={{ borderColor: 'var(--border-color-regular)' }}>
                        {plant.stats.criticalObs > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full bg-red-500" />
                              <span style={{ color: 'var(--c-texSec)' }}>Critical</span>
                            </div>
                            <span style={{ color: 'var(--c-texPri)' }}>{plant.stats.criticalObs}</span>
                          </div>
                        )}
                        {plant.stats.highObs > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full bg-orange-500" />
                              <span style={{ color: 'var(--c-texSec)' }}>High</span>
                            </div>
                            <span style={{ color: 'var(--c-texPri)' }}>{plant.stats.highObs}</span>
                          </div>
                        )}
                        {plant.stats.mediumObs > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full bg-yellow-500" />
                              <span style={{ color: 'var(--c-texSec)' }}>Medium</span>
                            </div>
                            <span style={{ color: 'var(--c-texPri)' }}>{plant.stats.mediumObs}</span>
                          </div>
                        )}
                        {plant.stats.lowObs > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                              <span style={{ color: 'var(--c-texSec)' }}>Low</span>
                            </div>
                            <span style={{ color: 'var(--c-texPri)' }}>{plant.stats.lowObs}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status indicators */}
                    {(plant.stats.openObs > 0 || plant.stats.inProgressObs > 0) && (
                      <div className="flex items-center gap-2 pt-1">
                        {plant.stats.openObs > 0 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {plant.stats.openObs} Open
                          </Badge>
                        )}
                        {plant.stats.inProgressObs > 0 && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Activity className="h-3 w-3" />
                            {plant.stats.inProgressObs} In Progress
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer with created date */}
                <div className="pt-3 border-t" style={{ borderColor: 'var(--border-color-regular)' }}>
                  <div className="flex items-center justify-between text-xs" style={{ color: 'var(--c-texSec)' }}>
                    <span>Created {plant.createdAt}</span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {filteredPlants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Summary across all plants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>Total Plants</p>
                <p className="text-3xl" style={{ color: 'var(--c-texPri)' }}>
                  {filteredPlants.length}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>Total Audits</p>
                <p className="text-3xl" style={{ color: 'var(--c-texPri)' }}>
                  {filteredPlants.reduce((sum, p) => sum + p.stats.totalAudits, 0)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>Total Observations</p>
                <p className="text-3xl" style={{ color: 'var(--c-texPri)' }}>
                  {filteredPlants.reduce((sum, p) => sum + p.stats.totalObservations, 0)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>Critical Issues</p>
                <p className="text-3xl" style={{ color: 'var(--c-texPri)' }}>
                  {filteredPlants.reduce((sum, p) => sum + p.stats.criticalObs, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Plant Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Plant</DialogTitle>
            <DialogDescription>Update plant information</DialogDescription>
          </DialogHeader>
          {editingPlant && (
            <form onSubmit={handleEditPlant} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Plant Code</Label>
                <Input
                  id="edit-code"
                  placeholder="PLT001"
                  value={editingPlant.code}
                  onChange={(e) => setEditingPlant({ ...editingPlant, code: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Plant Name</Label>
                <Input
                  id="edit-name"
                  placeholder="Manufacturing Plant A"
                  value={editingPlant.name}
                  onChange={(e) => setEditingPlant({ ...editingPlant, name: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the plant
              and remove it from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
