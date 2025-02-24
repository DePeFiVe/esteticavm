import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import { format } from 'date-fns';
import { Calendar, Clock, X, AlertCircle, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationStatus from '../components/NotificationStatus';

interface AppointmentWithService {
  id: string;
  date: string;
  status: string;
  service: {
    name: string;
    duration: number;
    price: number;
  };
}

const Appointments = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<AppointmentWithService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = getCurrentUser();

  useEffect(() => {
    // Redirigir si no hay usuario
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchAppointments = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener las citas usando el ID del usuario
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            id,
            date,
            status,
            service:services (
              name,
              duration,
              price
            )
          `)
          .eq('user_id', user.id)
          .order('date', { ascending: true });

        if (appointmentsError) {
          if (appointmentsError.message.includes('JWT')) {
            // Token expirado o inválido
            localStorage.removeItem('user');
            navigate('/login');
            return;
          }
          throw appointmentsError;
        }

        setAppointments(appointmentsData || []);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError('Error al cargar las citas. Por favor, intenta de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user, navigate]);

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId)
        .eq('user_id', user.id);

      if (updateError) {
        if (updateError.message.includes('JWT')) {
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }
        throw updateError;
      }

      setAppointments(appointments.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, status: 'cancelled' }
          : apt
      ));
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      setError('Error al cancelar la cita. Por favor, intenta de nuevo.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'confirmed':
        return 'Confirmada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  // Retornar null si no hay usuario (el useEffect redirigirá)
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen py-16 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <div className="text-xl text-black">Cargando citas...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start">
            <AlertCircle className="h-6 w-6 text-red-500 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 transition-colors"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-black mb-8">Mis Citas</h1>

        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xl text-gray-600">No tienes citas programadas</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white shadow-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-2 mb-4 md:mb-0">
                  <h3 className="text-xl font-semibold text-black">
                    {appointment.service.name}
                  </h3>
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-5 w-5 mr-2" />
                    <span>
                      {format(new Date(appointment.date), 'dd/MM/yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-5 w-5 mr-2" />
                    <span>
                      {format(new Date(appointment.date), 'HH:mm')}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-3 py-1 rounded-sm text-sm ${getStatusColor(appointment.status)}`}>
                      {getStatusText(appointment.status)}
                    </span>
                  </div>
                  {appointment.status === 'confirmed' && (
                    <div className="mt-2">
                      <NotificationStatus appointmentId={appointment.id} />
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-lg font-semibold text-black">
                      ${appointment.service.price}
                    </p>
                    <p className="text-sm text-gray-600">
                      {appointment.service.duration} minutos
                    </p>
                  </div>
                  
                  {appointment.status === 'pending' && (
                    <button
                      onClick={() => handleCancelAppointment(appointment.id)}
                      className="p-2 text-red-600 hover:text-red-800"
                      title="Cancelar cita"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Appointments;