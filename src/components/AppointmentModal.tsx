import React, { useState, useEffect } from 'react';
import { format, addMinutes, isBefore, setHours, setMinutes, parseISO } from 'date-fns';
import { X, Clock, CheckCircle, Lock, Bell, AlertCircle, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import type { Service } from '../types';
import { validatePhone, formatPhone } from '../utils/validation';

interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string;
}

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
}

interface AppointmentModalProps {
  service: Service;
  isOpen: boolean;
  onClose: () => void;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({ service, isOpen, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [success, setSuccess] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [guestInfo, setGuestInfo] = useState({
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [validationErrors, setValidationErrors] = useState<{
    phone?: string;
  }>({});

  const user = getCurrentUser();

  useEffect(() => {
    if (!isOpen) {
      setSelectedDate('');
      setSelectedTime('');
      setSelectedStaff('');
      setError(null);
      setSuccess(false);
      setGuestInfo({
        firstName: '',
        lastName: '',
        phone: ''
      });
      setValidationErrors({});
    } else {
      fetchStaff();
    }
  }, [isOpen]);

  useEffect(() => {
    let closeTimeout: NodeJS.Timeout;
    if (success) {
      closeTimeout = setTimeout(() => {
        onClose();
      }, 6000);
    }
    return () => {
      if (closeTimeout) {
        clearTimeout(closeTimeout);
      }
    };
  }, [success, onClose]);

  const fetchStaff = async () => {
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('staff_services')
        .select(`
          staff:staff_id (
            id,
            first_name,
            last_name
          )
        `)
        .eq('service_id', service.id);

      if (staffError) throw staffError;

      if (staffData) {
        const uniqueStaff = staffData
          .map(item => item.staff)
          .filter((staff, index, self) => 
            index === self.findIndex(s => s.id === staff.id)
          );
        setStaff(uniqueStaff);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
      setError('Error al cargar los profesionales disponibles');
    }
  };

  if (!isOpen) return null;

  const businessHours = {
    start: 9, // 9 AM
    end: 20, // 8 PM
  };

  const createDateWithTime = (date: string, time: string): Date => {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(Date.UTC(
      parseInt(date.split('-')[0]), // año
      parseInt(date.split('-')[1]) - 1, // mes (0-11)
      parseInt(date.split('-')[2]), // día
      hours,
      minutes,
      0,
      0
    ));
    return result;
  };

  const updateTimeSlots = async () => {
    if (!selectedStaff) return;

    try {
      setLoading(true);
      setError(null);

      const selectedDateObj = new Date(selectedDate);
      const dayStart = new Date(Date.UTC(
        selectedDateObj.getFullYear(),
        selectedDateObj.getMonth(),
        selectedDateObj.getDate(),
        0, 0, 0, 0
      ));
      const dayEnd = new Date(Date.UTC(
        selectedDateObj.getFullYear(),
        selectedDateObj.getMonth(),
        selectedDateObj.getDate(),
        23, 59, 59, 999
      ));

      // Obtener horarios del profesional para ese día
      const { data: schedules, error: schedulesError } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('staff_id', selectedStaff)
        .eq('day_of_week', selectedDateObj.getDay());

      if (schedulesError) throw schedulesError;

      const staffSchedule = schedules?.[0];
      if (!staffSchedule) {
        setTimeSlots([]);
        setError('El profesional no atiende este día');
        setLoading(false);
        return;
      }

      const [
        { data: appointments, error: appError },
        { data: guestAppointments, error: guestError },
        { data: blockedTimes, error: blockedError }
      ] = await Promise.all([
        supabase
          .from('appointments')
          .select('date, service:services(name, duration)')
          .eq('status', 'confirmed')
          .eq('staff_id', selectedStaff)
          .gte('date', dayStart.toISOString())
          .lte('date', dayEnd.toISOString()),
        supabase
          .from('guest_appointments')
          .select('date, service:services(name, duration)')
          .eq('status', 'confirmed')
          .eq('staff_id', selectedStaff)
          .gte('date', dayStart.toISOString())
          .lte('date', dayEnd.toISOString()),
        supabase
          .from('blocked_times')
          .select('start_time, end_time, reason')
          .or(`start_time.lte.${dayEnd.toISOString()},end_time.gte.${dayStart.toISOString()}`)
      ]);

      if (appError) throw appError;
      if (guestError) throw guestError;
      if (blockedError) throw blockedError;

      const allAppointments = [
        ...(appointments || []).map(apt => ({
          start: parseISO(apt.date),
          end: addMinutes(parseISO(apt.date), apt.service.duration),
          name: apt.service.name
        })),
        ...(guestAppointments || []).map(apt => ({
          start: parseISO(apt.date),
          end: addMinutes(parseISO(apt.date), apt.service.duration),
          name: apt.service.name
        }))
      ];

      const allBlockedTimes = (blockedTimes || []).map(block => ({
        start: parseISO(block.start_time),
        end: parseISO(block.end_time),
        reason: block.reason
      }));

      const slots: TimeSlot[] = [];
      const now = new Date();
      const isToday = selectedDate === now.toISOString().split('T')[0];

      // Convertir horarios del profesional a números para comparación
      const [startHour, startMinute] = staffSchedule.start_time.split(':').map(Number);
      const [endHour, endMinute] = staffSchedule.end_time.split(':').map(Number);

      for (let hour = startHour; hour < endHour || (hour === endHour && minute < endMinute); hour++) {
        for (let minute = (hour === startHour ? startMinute : 0); minute < 60; minute += 30) {
          if (hour === endHour && minute >= endMinute) break;

          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const slotStart = createDateWithTime(selectedDate, timeString);
          const slotEnd = addMinutes(slotStart, service.duration);

          if (isToday && isBefore(slotStart, now)) {
            continue;
          }

          let available = true;
          let reason: string | undefined;

          for (const block of allBlockedTimes) {
            if (
              (slotStart >= block.start && slotStart < block.end) ||
              (slotEnd > block.start && slotEnd <= block.end) ||
              (slotStart <= block.start && slotEnd >= block.end)
            ) {
              available = false;
              reason = `Bloqueado: ${block.reason}`;
              break;
            }
          }

          if (available) {
            for (const apt of allAppointments) {
              if (
                (slotStart >= apt.start && slotStart < apt.end) ||
                (slotEnd > apt.start && slotEnd <= apt.end) ||
                (slotStart <= apt.start && slotEnd >= apt.end)
              ) {
                available = false;
                reason = 'No disponible';
                break;
              }
            }
          }

          slots.push({
            time: timeString,
            available,
            reason
          });
        }
      }

      setTimeSlots(slots);
      
      if (selectedTime) {
        const currentSlot = slots.find(slot => slot.time === selectedTime);
        if (!currentSlot?.available) {
          setSelectedTime('');
        }
      }
    } catch (err) {
      console.error('Error checking availability:', err);
      setError('Error al verificar disponibilidad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate && selectedStaff) {
      updateTimeSlots();
    }
  }, [selectedDate, selectedStaff, service.duration]);

  const validateGuestInfo = () => {
    const errors: { phone?: string } = {};

    if (!validatePhone(guestInfo.phone)) {
      errors.phone = 'Ingresa un número de teléfono válido (ej: 099123456 o 24875632)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedDate || !selectedTime || !selectedStaff) {
      setError('Por favor selecciona profesional, fecha y hora');
      setLoading(false);
      return;
    }

    try {
      const slot = timeSlots.find(s => s.time === selectedTime);
      if (!slot?.available) {
        throw new Error('Lo sentimos, este horario ya no está disponible. Por favor selecciona otro horario.');
      }

      const appointmentDate = createDateWithTime(selectedDate, selectedTime);

      if (user) {
        const { error: insertError } = await supabase
          .from('appointments')
          .insert({
            service_id: service.id,
            staff_id: selectedStaff,
            user_id: user.id,
            date: appointmentDate.toISOString(),
            status: 'pending'
          });

        if (insertError) {
          const errorMessage = insertError.message.match(/ERROR: (.+)/)?.[1] || insertError.message;
          throw new Error(errorMessage);
        }
      } else {
        if (!guestInfo.firstName || !guestInfo.lastName || !guestInfo.phone) {
          setError('Por favor completa todos los campos');
          setLoading(false);
          return;
        }

        if (!validateGuestInfo()) {
          setLoading(false);
          return;
        }

        const { error: insertError } = await supabase
          .from('guest_appointments')
          .insert({
            service_id: service.id,
            staff_id: selectedStaff,
            first_name: guestInfo.firstName,
            last_name: guestInfo.lastName,
            phone: formatPhone(guestInfo.phone),
            date: appointmentDate.toISOString(),
            status: 'pending'
          });

        if (insertError) {
          const errorMessage = insertError.message.match(/ERROR: (.+)/)?.[1] || insertError.message;
          throw new Error(errorMessage);
        }
      }

      setSuccess(true);
      setLoading(false);

      setTimeout(() => {
        onClose();
      }, 6000);
    } catch (err) {
      console.error('Error creating appointment:', err);
      setError(err instanceof Error ? err.message : 'Error al crear la cita');
      setLoading(false);
      
      if (err instanceof Error && (
        err.message.includes('superpone') || 
        err.message.includes('horario') ||
        err.message.includes('bloqueado')
      )) {
        updateTimeSlots();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4 animate-bounce" />
            <h2 className="text-xl font-semibold text-black mb-4">¡Reserva Exitosa!</h2>
            <p className="text-gray-600 mb-4">
              Tu cita ha sido registrada. Te enviaremos una notificación por {user?.phone?.startsWith('09') ? 'WhatsApp' : 'SMS'} cuando sea confirmada.
            </p>
            <div className="flex items-center justify-center text-gray-500">
              <Bell className="h-5 w-5 mr-2" />
              <span>Recibirás un recordatorio 24 horas antes de tu cita</span>
            </div>
            <p className="text-sm text-gray-400 mt-4">
              Esta ventana se cerrará automáticamente en unos segundos...
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black">Reservar Cita</h2>
              <button
                onClick={onClose}
                className="text-black hover:text-primary"
                aria-label="Cerrar modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <h3 className="font-medium text-black">{service.name}</h3>
              <p className="text-gray-600">Duración: {service.duration} minutos</p>
              <p className="text-gray-600">Precio: ${service.price}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!user && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={guestInfo.firstName}
                      onChange={(e) => setGuestInfo({ ...guestInfo, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Apellido
                    </label>
                    <input
                      type="text"
                      value={guestInfo.lastName}
                      onChange={(e) => setGuestInfo({ ...guestInfo, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={guestInfo.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setGuestInfo({ ...guestInfo, phone: value });
                        if (validationErrors.phone) {
                          setValidationErrors({});
                        }
                      }}
                      placeholder="099123456"
                      className={`w-full px-3 py-2 border ${
                        validationErrors.phone 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:border-primary focus:ring-primary'
                      }`}
                      required
                    />
                    {validationErrors.phone && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Profesional
                </label>
                <select
                  value={selectedStaff}
                  onChange={(e) => {
                    setSelectedStaff(e.target.value);
                    setSelectedTime('');
                    setError(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="">Selecciona un profesional</option>
                  {staff.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.first_name} {person.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime('');
                    setError(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Hora
                </label>
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-gray-600">Verificando disponibilidad...</p>
                  </div>
                ) : selectedDate && selectedStaff ? (
                  timeSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.map(({ time, available, reason }) => (
                        <div
                          key={time}
                          className="relative group"
                          title={reason}
                        >
                          <button
                            type="button"
                            onClick={() => available && setSelectedTime(time)}
                            className={`
                              w-full py-2 text-sm border
                              ${available 
                                ? selectedTime === time
                                  ? 'border-primary bg-primary text-primary-accent'
                                  : 'border-gray-300 hover:border-primary hover:bg-primary/5'
                                : 'border-gray-200 bg-gray-50 cursor-not-allowed'}
                            `}
                            disabled={!available}
                          >
                            {time}
                            {!available && (
                              <Lock className="h-3 w-3 absolute top-1 right-1 text-gray-400" />
                            )}
                            {selectedTime === time && available && (
                              <CheckCircle className="h-3 w-3 absolute top-1 right-1 text-primary-accent" />
                            )}
                          </button>
                          {!available && reason && (
                            <div className="absolute z-10 invisible group-hover:visible bg-black text-white text-xs p-2 rounded mt-1 w-32">
                              {reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-red-600 text-sm mt-1">
                      No hay horarios disponibles para esta fecha
                    </p>
                  )
                ) : (
                  <p className="text-gray-600 text-sm mt-1">
                    Selecciona un profesional y una fecha para ver los horarios disponibles
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !selectedDate || !selectedTime || !selectedStaff}
                className="w-full bg-primary text-primary-accent py-2 px-4 hover:bg-black/90 disabled:bg-primary/50 mt-4"
              >
                {loading ? 'Reservando...' : 'Confirmar Reserva'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AppointmentModal;