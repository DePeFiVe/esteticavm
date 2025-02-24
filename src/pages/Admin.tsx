import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isAdmin } from '../lib/auth';
import { format, parseISO, addMinutes } from 'date-fns';
import { Calendar, Clock, CheckCircle, XCircle, BarChart2, Calendar as CalendarIcon, Lock, X, Users } from 'lucide-react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format as formatDate, parse, startOfWeek, getDay } from 'date-fns';
import es from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Staff from './Admin/Staff';
import NotificationStatus from '../components/NotificationStatus';
import { createBlockedTime, deleteBlockedTime } from '../lib/admin';

interface AppointmentWithDetails {
  id: string;
  date: string;
  status: string;
  service: {
    name: string;
    duration: number;
    price: number;
  };
  user: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
  first_name?: string;
  last_name?: string;
  phone?: string;
  isGuest?: boolean;
}

interface ServiceStats {
  name: string;
  count: number;
  revenue: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    client?: string;
    phone?: string;
    service?: string;
    duration?: number;
    isBlocked?: boolean;
    reason?: string;
  };
}

const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format: formatDate,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const Admin = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [stats, setStats] = useState<ServiceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'calendar' | 'pending' | 'stats' | 'staff'>('calendar');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<AppointmentWithDetails[]>([]);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockForm, setBlockForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    reason: ''
  });

  useEffect(() => {
    // Check if user is admin
    if (!isAdmin()) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch appointments
        const [
          { data: appointmentsData, error: appointmentsError },
          { data: guestAppointmentsData, error: guestAppointmentsError },
          { data: blockedTimesData, error: blockedTimesError }
        ] = await Promise.all([
          supabase
            .from('appointments')
            .select(`
              id,
              date,
              status,
              service:services (
                name,
                duration,
                price
              ),
              user:users (
                first_name,
                last_name,
                phone
              )
            `)
            .order('date', { ascending: true }),
          supabase
            .from('guest_appointments')
            .select(`
              id,
              date,
              status,
              service:services (
                name,
                duration,
                price
              ),
              first_name,
              last_name,
              phone
            `)
            .order('date', { ascending: true }),
          supabase
            .from('blocked_times')
            .select('*')
            .order('start_time', { ascending: true })
        ]);

        if (appointmentsError) throw appointmentsError;
        if (guestAppointmentsError) throw guestAppointmentsError;
        if (blockedTimesError) throw blockedTimesError;

        // Combine and format appointments
        const allAppointments = [
          ...(appointmentsData || []).map(apt => ({
            ...apt,
            isGuest: false
          })),
          ...(guestAppointmentsData || []).map(apt => ({
            ...apt,
            isGuest: true,
            user: null
          }))
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setAppointments(allAppointments);

        // Separate pending appointments
        const pending = allAppointments.filter(apt => apt.status === 'pending');
        setPendingAppointments(pending);

        // Create calendar events from confirmed appointments and blocked times
        const confirmedEvents = allAppointments
          .filter(apt => apt.status === 'confirmed')
          .map(apt => {
            const startDate = parseISO(apt.date);
            const endDate = addMinutes(startDate, apt.service.duration);
            const clientName = apt.user 
              ? `${apt.user.first_name} ${apt.user.last_name}`
              : `${apt.first_name} ${apt.last_name}`;
            const clientPhone = apt.user ? apt.user.phone : apt.phone;

            return {
              id: apt.id,
              title: apt.service.name,
              start: startDate,
              end: endDate,
              resource: {
                client: clientName,
                phone: clientPhone,
                service: apt.service.name,
                duration: apt.service.duration
              }
            };
          });

        // Add blocked times as events
        const blockedEvents = (blockedTimesData || []).map(block => ({
          id: block.id,
          title: 'BLOQUEADO',
          start: new Date(block.start_time),
          end: new Date(block.end_time),
          resource: {
            isBlocked: true,
            reason: block.reason
          }
        }));

        setEvents([...confirmedEvents, ...blockedEvents]);

        // Calculate service statistics
        const serviceStats = allAppointments.reduce((acc: ServiceStats[], apt) => {
          const existingService = acc.find(s => s.name === apt.service.name);
          if (existingService) {
            existingService.count += 1;
            existingService.revenue += apt.service.price;
          } else {
            acc.push({
              name: apt.service.name,
              count: 1,
              revenue: apt.service.price
            });
          }
          return acc;
        }, []);

        setStats(serviceStats.sort((a, b) => b.count - a.count));
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleStatusUpdate = async (appointmentId: string, newStatus: string, isGuest: boolean) => {
    try {
      const table = isGuest ? 'guest_appointments' : 'appointments';
      const { error: updateError } = await supabase
        .from(table)
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // Update local state
      const updatedAppointments = appointments.map(apt => {
        if (apt.id === appointmentId) {
          const updatedApt = { ...apt, status: newStatus };
          
          // If confirmed, add to calendar events
          if (newStatus === 'confirmed') {
            const startDate = parseISO(apt.date);
            const endDate = addMinutes(startDate, apt.service.duration);
            const clientName = apt.user 
              ? `${apt.user.first_name} ${apt.user.last_name}`
              : `${apt.first_name} ${apt.last_name}`;
            const clientPhone = apt.user ? apt.user.phone : apt.phone;

            const newEvent: CalendarEvent = {
              id: apt.id,
              title: apt.service.name,
              start: startDate,
              end: endDate,
              resource: {
                client: clientName,
                phone: clientPhone,
                service: apt.service.name,
                duration: apt.service.duration
              }
            };
            setEvents(prev => [...prev, newEvent]);
          }

          return updatedApt;
        }
        return apt;
      });

      setAppointments(updatedAppointments);
      setPendingAppointments(updatedAppointments.filter(apt => apt.status === 'pending'));

    } catch (err) {
      console.error('Error updating appointment:', err);
      setError('Error al actualizar la cita');
    }
  };

  const handleBlockTime = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError(null);
      setLoading(true);

      const startDateTime = new Date(`${blockForm.date}T${blockForm.startTime}`);
      const endDateTime = new Date(`${blockForm.date}T${blockForm.endTime}`);

      if (endDateTime <= startDateTime) {
        setError('La hora de fin debe ser posterior a la hora de inicio');
        return;
      }

      await createBlockedTime(startDateTime, endDateTime, blockForm.reason);

      setShowBlockModal(false);
      setBlockForm({
        date: '',
        startTime: '',
        endTime: '',
        reason: ''
      });

      // Actualizar la lista de eventos
      const { data: blockedTimesData } = await supabase
        .from('blocked_times')
        .select('*')
        .order('start_time', { ascending: true });

      if (blockedTimesData) {
        const newBlockedEvents = blockedTimesData.map(block => ({
          id: block.id,
          title: 'BLOQUEADO',
          start: new Date(block.start_time),
          end: new Date(block.end_time),
          resource: {
            isBlocked: true,
            reason: block.reason
          }
        }));

        setEvents(prev => [
          ...prev.filter(event => !event.resource?.isBlocked),
          ...newBlockedEvents
        ]);
      }

    } catch (err) {
      console.error('Error blocking time:', err);
      setError(err instanceof Error ? err.message : 'Error al bloquear el horario');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlock = async (eventId: string) => {
    try {
      await deleteBlockedTime(eventId);
      setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (err) {
      console.error('Error deleting blocked time:', err);
      setError(err instanceof Error ? err.message : 'Error al eliminar el bloqueo');
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

  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    if (event.resource?.isBlocked) {
      return (
        <div className="p-1">
          <div className="font-semibold flex items-center">
            <Lock className="h-4 w-4 mr-1" />
            BLOQUEADO
          </div>
          <div className="text-sm">
            <div>{event.resource.reason}</div>
            <div>{format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteBlock(event.id);
            }}
            className="text-xs text-red-500 hover:text-red-700 mt-1"
          >
            Eliminar bloqueo
          </button>
        </div>
      );
    }

    return (
      <div className="p-1">
        <div className="font-semibold">{event.resource?.service}</div>
        <div className="text-sm">
          <div>{event.resource?.client}</div>
          <div>{event.resource?.phone}</div>
          <div>{format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}</div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen py-16 flex items-center justify-center">
        <div className="text-xl text-black">Cargando datos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-16 flex items-center justify-center">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-black">Panel de Administración</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 flex items-center ${
                view === 'calendar' 
                  ? 'bg-primary text-primary-accent' 
                  : 'bg-gray-200 text-black'
              }`}
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Calendario
            </button>
            <button
              onClick={() => setView('pending')}
              className={`px-4 py-2 flex items-center ${
                view === 'pending' 
                  ? 'bg-primary text-primary-accent' 
                  : 'bg-gray-200 text-black'
              }`}
            >
              <Clock className="w-4 h-4 mr-2" />
              Pendientes ({pendingAppointments.length})
            </button>
            <button
              onClick={() => setView('stats')}
              className={`px-4 py-2 flex items-center ${
                view === 'stats' 
                  ? 'bg-primary text-primary-accent' 
                  : 'bg-gray-200 text-black'
              }`}
            >
              <BarChart2 className="w-4 h-4 mr-2" />
              Estadísticas
            </button>
            <button
              onClick={() => setView('staff')}
              className={`px-4 py-2 flex items-center ${
                view === 'staff' 
                  ? 'bg-primary text-primary-accent' 
                  : 'bg-gray-200 text-black'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Personal
            </button>
          </div>
        </div>

        {view === 'calendar' && (
          <div className="bg-white shadow-lg p-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowBlockModal(true)}
                className="bg-primary text-primary-accent px-4 py-2 flex items-center"
              >
                <Lock className="w-4 h-4 mr-2" />
                Bloquear Horario
              </button>
            </div>
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 'calc(100vh - 200px)' }}
              components={{
                event: EventComponent
              }}
              messages={{
                next: "Siguiente",
                previous: "Anterior",
                today: "Hoy",
                month: "Mes",
                week: "Semana",
                day: "Día",
                agenda: "Agenda",
                date: "Fecha",
                time: "Hora",
                event: "Evento",
                noEventsInRange: "No hay citas en este rango"
              }}
            />
          </div>
        )}

        {showBlockModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-black">Bloquear Horario</h2>
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="text-black hover:text-primary"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleBlockTime} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={blockForm.date}
                    onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Hora de inicio
                  </label>
                  <input
                    type="time"
                    value={blockForm.startTime}
                    onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Hora de fin
                  </label>
                  <input
                    type="time"
                    value={blockForm.endTime}
                    onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Motivo
                  </label>
                  <input
                    type="text"
                    value={blockForm.reason}
                    onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                {error && (
                  <p className="text-red-600 text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  className="w-full bg-primary text-primary-accent py-2 px-4 hover:bg-black/90"
                >
                  Confirmar Bloqueo
                </button>
              </form>
            </div>
          </div>
        )}

        {view === 'pending' && (
          <div className="grid gap-6">
            {pendingAppointments.length === 0 ? (
              <div className="text-center py-8 bg-white shadow-lg">
                <p className="text-xl text-gray-600">No hay citas pendientes</p>
              </div>
            ) : (
              pendingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="bg-white shadow-lg p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2 mb-4 md:mb-0">
                      <h3 className="text-xl font-semibold text-black">
                        {appointment.service.name}
                      </h3>
                      <p className="text-gray-600">
                        {appointment.user 
                          ? `${appointment.user.first_name} ${appointment.user.last_name}`
                          : `${appointment.first_name} ${appointment.last_name} (Invitado)`}
                      </p>
                      <p className="text-gray-600">
                        {appointment.user?.phone || appointment.phone}
                      </p>
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
                          <NotificationStatus 
                            appointmentId={appointment.id} 
                            isGuest={!!appointment.isGuest} 
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end space-y-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-black">
                          ${appointment.service.price}
                        </p>
                        <p className="text-sm text-gray-600">
                          {appointment.service.duration} minutos
                        </p>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStatusUpdate(appointment.id, 'confirmed', !!appointment.isGuest)}
                          className="p-2 text-green-600 hover:text-green-800"
                          title="Confirmar cita"
                        >
                          <CheckCircle className="h-6 w-6" />
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(appointment.id, 'cancelled', !!appointment.isGuest)}
                          className="p-2 text-red-600 hover:text-red-800"
                          title="Cancelar cita"
                        >
                          <XCircle className="h-6 w-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {view === 'stats' && (
          <div className="grid gap-8">
            <div className="bg-white shadow-lg p-6">
              <h2 className="text-2xl font-bold text-black mb-6 flex items-center">
                <BarChart2 className="h-6 w-6 mr-2" />
                Estadísticas de Servicios
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Servicio</th>
                      <th className="text-right py-2 px-4">Citas</th>
                      <th className="text-right py-2 px-4">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((stat, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-2 px-4">{stat.name}</td>
                        <td className="text-right py-2 px-4">{stat.count}</td>
                        <td className="text-right py-2 px-4">${stat.revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === 'staff' && <Staff />}
      </div>
    </div>
  );
};

export default Admin;