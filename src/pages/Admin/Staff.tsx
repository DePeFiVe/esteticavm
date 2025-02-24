import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit, Trash2, Calendar, Briefcase } from 'lucide-react';
import StaffForm from '../../components/Admin/StaffForm';
import StaffSchedule from '../../components/Admin/StaffSchedule';

interface Staff {
  id: string;
  ci: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
}

const Staff = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('first_name', { ascending: true });

      if (error) throw error;
      setStaff(data || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setError('Error al cargar el personal');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este profesional?')) return;

    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchStaff();
    } catch (err) {
      console.error('Error deleting staff:', err);
      setError('Error al eliminar el profesional');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Gestión de Personal</h2>
        <button
          onClick={() => {
            setSelectedStaff(null);
            setShowModal(true);
          }}
          className="bg-primary text-primary-accent px-4 py-2 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Profesional
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid gap-6">
        {staff.map((person) => (
          <div key={person.id} className="bg-white shadow-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold">
                  {person.first_name} {person.last_name}
                </h3>
                <p className="text-gray-600">CI: {person.ci}</p>
                <p className="text-gray-600">Tel: {person.phone}</p>
                {person.email && (
                  <p className="text-gray-600">Email: {person.email}</p>
                )}
              </div>
              
              <div className="flex items-center space-x-4 mt-4 md:mt-0">
                <button
                  onClick={() => {
                    setSelectedStaff(person);
                    setShowScheduleModal(true);
                  }}
                  className="p-2 text-gray-600 hover:text-primary"
                  title="Gestionar horarios"
                >
                  <Calendar className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    setSelectedStaff(person);
                    setShowModal(true);
                  }}
                  className="p-2 text-gray-600 hover:text-primary"
                  title="Editar"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(person.id)}
                  className="p-2 text-red-600 hover:text-red-800"
                  title="Eliminar"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Staff Form Modal */}
      {showModal && (
        <StaffForm
          selectedStaff={selectedStaff || undefined}
          onClose={() => {
            setShowModal(false);
            setSelectedStaff(null);
          }}
          onSuccess={() => {
            fetchStaff();
          }}
        />
      )}

      {/* Staff Schedule Modal */}
      {showScheduleModal && selectedStaff && (
        <StaffSchedule
          staffId={selectedStaff.id}
          staffName={`${selectedStaff.first_name} ${selectedStaff.last_name}`}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedStaff(null);
          }}
          onSuccess={() => {
            // No necesitamos recargar el staff después de actualizar horarios
            setShowScheduleModal(false);
            setSelectedStaff(null);
          }}
        />
      )}
    </div>
  );
}

export default Staff;